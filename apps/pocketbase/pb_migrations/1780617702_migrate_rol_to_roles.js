/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — siembra el campo `roles` (multi-select) a partir del `rol` legacy
// para todos los users existentes que aún no tengan `roles` poblado.
// Idempotente: si `roles` ya tiene valor, no toca el registro.
migrate((app) => {
  let users;
  try {
    users = app.findAllRecords("users");
  } catch (e) {
    console.log("[1780617702] no users to migrate yet, skipping");
    return;
  }

  let updated = 0;
  for (const user of users) {
    const rolLegacy = user.getString("rol");
    const rolesActuales = user.get("roles");
    const yaTieneRoles = Array.isArray(rolesActuales) && rolesActuales.length > 0;
    if (yaTieneRoles || !rolLegacy) {
      continue;
    }
    user.set("roles", [rolLegacy]);
    try {
      app.saveNoValidate(user);
      updated++;
    } catch (e) {
      console.log("[1780617702] failed to migrate user " + user.id + ": " + e.message);
    }
  }
  console.log("[1780617702] migrated " + updated + " users from rol → roles[]");
}, (app) => {
  // Down: limpiar `roles` en todos los users (irreversible si se borró el campo `rol`)
  let users;
  try {
    users = app.findAllRecords("users");
  } catch (_e) {
    return;
  }
  for (const user of users) {
    user.set("roles", []);
    try {
      app.saveNoValidate(user);
    } catch (_e) {}
  }
});
