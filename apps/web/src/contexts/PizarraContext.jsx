import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * Estado global de la pizarra lateral de apoyo. Solo controla la visibilidad
 * del panel; el contenido (dibujo + notas) lo persiste el propio panel en
 * localStorage por usuario.
 */
const PizarraContext = createContext(null);

export const PizarraProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <PizarraContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </PizarraContext.Provider>
  );
};

export const usePizarra = () => {
  const ctx = useContext(PizarraContext);
  if (!ctx) {
    throw new Error('usePizarra debe usarse dentro de <PizarraProvider>');
  }
  return ctx;
};

export default PizarraContext;
