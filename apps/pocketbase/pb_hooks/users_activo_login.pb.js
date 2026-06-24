/// <reference path="../pb_data/types.d.ts" />
// Soft-disable de usuarios. El panel de administración usa el campo `activo`
// como "deshabilitar sin borrar": en vez de eliminar a alguien, se lo marca
// inactivo, deja de poder entrar, pero su historial (asistencia, notas, pagos)
// queda intacto.
//
// Dos enganches:
//
// 1) onRecordAuthRequest("users"): corre tras autenticar y antes de emitir el
//    token (password / oauth / authRefresh). Si el usuario está inactivo, corta
//    el login. Como también corre en authRefresh, un usuario marcado inactivo
//    durante su sesión deja de entrar apenas el front refresca el token.
//
//    Nota de seguridad: los superusers de PocketBase autentican contra la
//    colección `_superusers`, NO `users`, así que este gate nunca los afecta.
//    Si por error se deshabilitara a todos los admin, el superuser de PB siempre
//    puede entrar al admin y reactivarlos. Es la red de seguridad anti-lockout.
//
// 2) onRecordCreateRequest("users"): si la request no trae el campo `activo`,
//    lo default a true. Así un usuario creado por SDK/API sin ese campo queda
//    activo y no se autobloquea por el zero-value (false) del bool. Si la request
//    lo manda explícito (el panel manda true/false), se respeta tal cual.
onRecordAuthRequest((e) => {
  if (e.record && e.record.getBool("activo") === false) {
    throw new ForbiddenError(
      "Tu cuenta está deshabilitada. Contactá a la administración de PrePa."
    );
  }
  e.next();
}, "users");

onRecordCreateRequest((e) => {
  let body = {};
  try {
    body = (e.requestInfo && e.requestInfo.body) || {};
  } catch (_e) {}
  const mandoActivo = Object.prototype.hasOwnProperty.call(body, "activo");
  if (!mandoActivo && e.record) {
    e.record.set("activo", true);
  }
  e.next();
}, "users");
