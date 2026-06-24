// Matriz de quién puede iniciar un thread 1-a-1 con quién.
// El admin se omite acá porque puede iniciar con cualquiera por las reglas server-side.
//
// Bloquea explícitamente: apoderado ↔ alumno (su propio pupilo) — para eso
// existe WhatsApp. La idea es que las conversaciones académicas queden en
// el sistema.

const REGLAS = {
  estudiante: ['profesor', 'administrativo'],
  apoderado: ['profesor', 'administrativo'],
  profesor: ['estudiante', 'apoderado', 'profesor', 'administrativo', 'admin'],
  administrativo: ['estudiante', 'apoderado', 'profesor', 'administrativo', 'admin'],
  admin: ['estudiante', 'apoderado', 'profesor', 'administrativo', 'admin'],
};

export const puedeIniciar = (rolActor, rolDestinatario) => {
  if (!rolActor) return false;
  const permitidos = REGLAS[rolActor] || [];
  return permitidos.includes(rolDestinatario);
};

export const filtroDestinatariosPermitidos = (rolActor) => {
  const permitidos = REGLAS[rolActor] || [];
  if (permitidos.length === 0) return null;
  return permitidos.map((r) => `roles ~ "${r}"`).join(' || ');
};
