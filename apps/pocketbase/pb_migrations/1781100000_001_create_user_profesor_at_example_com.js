/// <reference path="../pb_data/types.d.ts" />
// Seed demo — usuario PROFESOR para testear el panel docente.
//
// El campo legacy `rol` (required) solo admite estudiante|apoderado|admin, así
// que se setea un placeholder de mínimo privilegio ("estudiante") y el rol real
// vive en `roles` (multi-select). Eso es lo que leen tanto el frontend
// (computeRolesEffective → ProtectedRoute) como las reglas de las colecciones
// nuevas (`@request.auth.roles ~ 'profesor'`). El `rol` placeholder es ignorado
// por el front cuando `roles` no está vacío.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  const record = new Record(collection);
  record.set("email", "profesor@example.com");
  record.setPassword("Profesor123!");
  record.set("name", "Profesor Demo");
  record.set("rol", "estudiante"); // placeholder: `rol` no admite "profesor"
  record.set("roles", ["profesor"]); // rol efectivo real
  record.set("activo", true);
  try {
    return app.save(record);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const record = app.findFirstRecordByData("users", "email", "profesor@example.com");
    app.delete(record);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Auth record not found, skipping rollback");
      return;
    }
    throw e;
  }
})
