import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

// Mapa rol → dashboard por default (para redirect cuando el usuario llega a
// una ruta para la que no tiene permiso pero sí tiene algún otro rol válido).
const DEFAULT_DASHBOARD_BY_ROL = {
  estudiante: '/dashboard/estudiante',
  apoderado: '/dashboard/apoderado',
  profesor: '/dashboard/profesor',
  administrativo: '/dashboard/administrativo',
  admin: '/dashboard/admin',
};

const ProtectedRoute = ({ children, allowedRole, allowedRoles }) => {
  const { isAuthenticated, rolesEffective, rolActivo, isLoading } = useAuth();
  const location = useLocation();

  // Normaliza la lista de roles permitidos. Soporta:
  //   <ProtectedRoute allowedRole="profesor">  (legacy, 1 rol)
  //   <ProtectedRoute allowedRoles={["profesor", "admin"]}>  (nuevo)
  //   <ProtectedRoute>  (cualquier autenticado)
  const allow = (allowedRoles && allowedRoles.length > 0)
    ? allowedRoles
    : (allowedRole ? [allowedRole] : null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si no se requiere un rol específico, basta con estar autenticado.
  if (!allow) {
    return children;
  }

  // ¿El usuario tiene alguno de los roles permitidos?
  const matchesAllowed = rolesEffective.some((r) => allow.includes(r));
  if (matchesAllowed) {
    return children;
  }

  // No tiene el rol. Redirigir al dashboard del rol activo o del primer rol disponible.
  const fallback = DEFAULT_DASHBOARD_BY_ROL[rolActivo]
    || DEFAULT_DASHBOARD_BY_ROL[rolesEffective[0]]
    || '/';
  return <Navigate to={fallback} replace />;
};

export default ProtectedRoute;
