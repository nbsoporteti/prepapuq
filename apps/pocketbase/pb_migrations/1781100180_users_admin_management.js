/// <reference path="../pb_data/types.d.ts" />
// Fase 2.3 — habilita la gestión de usuarios desde el panel de administración.
//
// Hasta acá la colección `users` solo definía listRule/viewRule (migración
// 1780617600). create/update/deleteRule quedaron en el default del sistema, que
// para una colección auth equivale a "solo el propio dueño / superuser". Como el
// "admin" de PrePa es un user normal con rol="admin" (NO un superuser de PB), no
// podía crear, editar ni dar de baja a otros usuarios vía la API.
//
// Reglas nuevas (mismo patrón `adminOnly` que el resto de las colecciones):
//   createRule: solo admin.
//   updateRule: admin O el propio dueño  → preserva la edición de perfil propio
//               (PerfilGeneral). El hook users_security.pb.js sigue impidiendo que
//               un no-admin se cambie su propio rol/roles, así que abrir el update
//               al dueño no permite escalar privilegios.
//   deleteRule: solo admin.
//   manageRule: solo admin. En colecciones auth, este rule habilita a un user que
//               NO es superuser a "administrar" otros records: fijar `verified`,
//               resetear la contraseña ajena sin la actual y cambiar el email sin
//               el flujo de confirmación. Sin él, el panel no podría crear usuarios
//               verificados ni resetear contraseñas.
//
// Backfill en los users existentes:
//   - emailVisibility=true: el admin no es superuser y PocketBase oculta el email
//     de terceros salvo que el flag esté activo, así que sin esto la lista saldría
//     sin correo. La listRule ya restringe la lectura a admin + dueño.
//   - activo=true: el campo `activo` (Fase 0) es un BoolField sin default → todos
//     los users existentes quedaron en false. El soft-disable del panel (y el hook
//     users_activo_login) tratan false = deshabilitado, así que hay que poner true
//     a los actuales para no dejar a nadie afuera.
migrate((app) => {
  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";

  const c = app.findCollectionByNameOrId("users");
  c.createRule = adminOnly;
  c.updateRule = `(${adminOnly}) || id = @request.auth.id`;
  c.deleteRule = adminOnly;
  c.manageRule = adminOnly;
  app.save(c);

  // Backfill emailVisibility + activo (mismo patrón probado que 1780617702).
  let users;
  try {
    users = app.findAllRecords("users");
  } catch (e) {
    console.log("[1781100180] no users to backfill, skipping");
    return;
  }
  let updated = 0;
  for (const user of users) {
    const faltaEmail = !user.getBool("emailVisibility");
    const faltaActivo = !user.getBool("activo");
    if (!faltaEmail && !faltaActivo) continue;
    if (faltaEmail) user.set("emailVisibility", true);
    if (faltaActivo) user.set("activo", true);
    try {
      app.saveNoValidate(user);
      updated++;
    } catch (e) {
      console.log("[1781100180] failed backfill on " + user.id + ": " + e.message);
    }
  }
  console.log("[1781100180] backfill emailVisibility/activo en " + updated + " users");
}, (app) => {
  // Down: volver a un estado seguro de self-service (no al null original, que
  // dejaría sin poder editar el perfil propio).
  const c = app.findCollectionByNameOrId("users");
  c.createRule = null;                    // solo superuser crea
  c.updateRule = "id = @request.auth.id"; // el dueño edita su perfil
  c.deleteRule = "id = @request.auth.id"; // el dueño borra su cuenta
  c.manageRule = null;                    // solo superuser administra otros records
  app.save(c);
});
