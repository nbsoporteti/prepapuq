import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

const AuthContext = createContext();

const ROL_ACTIVO_KEY = 'prepa:rolActivo';

// Normaliza los roles efectivos de un user: si tiene `roles[]` los usa; si no,
// cae al `rol` legacy single-string. Filtra valores vacíos.
const computeRolesEffective = (user) => {
  if (!user) return [];
  const list = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles
    : (user.rol ? [user.rol] : []);
  return list.filter(Boolean);
};

const readPersistedRol = () => {
  try {
    return localStorage.getItem(ROL_ACTIVO_KEY) || null;
  } catch (_e) {
    return null;
  }
};

const writePersistedRol = (rol) => {
  try {
    if (rol) localStorage.setItem(ROL_ACTIVO_KEY, rol);
    else localStorage.removeItem(ROL_ACTIVO_KEY);
  } catch (_e) {}
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(pb.authStore.model);
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid);
  const [isLoading, setIsLoading] = useState(true);
  const [rolActivo, setRolActivoState] = useState(() => readPersistedRol());

  const rolesEffective = useMemo(() => computeRolesEffective(currentUser), [currentUser]);

  useEffect(() => {
    setIsAuthenticated(pb.authStore.isValid);
    setCurrentUser(pb.authStore.model);
    setIsLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setIsAuthenticated(!!token);
      setCurrentUser(model);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Cuando cambian los roles efectivos del user, validar/ajustar el rol activo:
  // - si solo tiene un rol → autoset
  // - si el rolActivo persistido ya no es válido → caer al primero
  // - si no hay rolActivo y hay roles → primer rol
  useEffect(() => {
    if (rolesEffective.length === 0) {
      if (rolActivo) {
        setRolActivoState(null);
        writePersistedRol(null);
      }
      return;
    }
    if (!rolActivo || !rolesEffective.includes(rolActivo)) {
      const next = rolesEffective[0];
      setRolActivoState(next);
      writePersistedRol(next);
    }
  }, [rolesEffective, rolActivo]);

  const switchRol = useCallback((rol) => {
    if (!rol) return;
    if (!rolesEffective.includes(rol)) {
      console.warn('[AuthContext] switchRol: rol no disponible para este usuario:', rol);
      return;
    }
    setRolActivoState(rol);
    writePersistedRol(rol);
  }, [rolesEffective]);

  const login = useCallback(async (email, password) => {
    const authData = await pb.collection('users').authWithPassword(email, password, {
      $autoCancel: false,
    });
    return authData;
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setRolActivoState(null);
    writePersistedRol(null);
  }, []);

  // Helper simple para que componentes pregunten "¿este user tiene rol X?"
  const hasRole = useCallback((rol) => rolesEffective.includes(rol), [rolesEffective]);

  const value = useMemo(() => ({
    currentUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
    // multi-rol
    rolesEffective,
    rolActivo,
    switchRol,
    hasRole,
  }), [currentUser, isAuthenticated, isLoading, login, logout, rolesEffective, rolActivo, switchRol, hasRole]);

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};
