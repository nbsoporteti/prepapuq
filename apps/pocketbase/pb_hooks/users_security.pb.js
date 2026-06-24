/// <reference path="../pb_data/types.d.ts" />
// Bloquea la auto-escalación de privilegios: un usuario no-admin no puede
// modificar su propio campo `roles` ni su `rol` legacy. Solo un admin puede
// asignar/cambiar roles.
onRecordUpdateRequest((e) => {
  const auth = e.auth;
  // Si no hay auth (caso edge de un PATCH sin token) o es admin, dejar pasar.
  if (!auth) {
    return e.next();
  }
  const isAdmin = (auth.get("rol") === "admin") ||
    ((auth.get("roles") || []).indexOf("admin") !== -1);

  if (isAdmin) {
    return e.next();
  }

  // Lee el body que está enviando el usuario.
  let body = {};
  try {
    body = (e.requestInfo && e.requestInfo.body) || {};
  } catch (_e) {}

  // Si intenta cambiar `roles` o `rol`, bloquear.
  const tryingRoles = Object.prototype.hasOwnProperty.call(body, "roles");
  const tryingRol = Object.prototype.hasOwnProperty.call(body, "rol");
  if (tryingRoles || tryingRol) {
    if (typeof $writeAudit === "function") {
      $writeAudit({
        actor_id: auth.id,
        actor_rol_activo: auth.get("rol") || "",
        accion: "intento_self_escalation",
        recurso_coleccion: "users",
        recurso_id: e.record.id,
        motivo: "PATCH a roles/rol bloqueado por users_security hook",
        payload: { roles: body.roles, rol: body.rol },
      });
    }
    throw new ForbiddenError("No puedes modificar tu propio rol. Pídeselo a un administrador.");
  }

  e.next();
}, "users");
