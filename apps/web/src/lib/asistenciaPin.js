import pb from '@/lib/pocketbaseClient';

// API de confirmación de asistencia con PIN (verificación server-side).
// El PIN nunca se guarda ni se compara en el cliente: solo se manda al backend.

export const getPinEstado = () => pb.send('/api/asistencia/pin-estado', { method: 'GET' });

export const setPin = (pin, actual) =>
  pb.send('/api/asistencia/pin', { method: 'POST', body: { pin, actual } });

// payload: { scope: 'clase', claseId, estados } | { scope: 'curso', cursoId, fecha, estados }
export const confirmarAsistencia = (payload, pin) =>
  pb.send('/api/asistencia/confirmar', { method: 'POST', body: { ...payload, pin } });

// Fecha local → 'YYYY-MM-DD' (sin corrimiento por zona horaria).
export const ymd = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Rango UTC [d0, d1) del día YYYY-MM-DD, para filtrar por `fecha` en PocketBase.
export const rangoDia = (ymdStr) => {
  const dt = new Date(`${ymdStr}T00:00:00.000Z`);
  return { d0: dt.toISOString(), d1: new Date(dt.getTime() + 86400000).toISOString() };
};
