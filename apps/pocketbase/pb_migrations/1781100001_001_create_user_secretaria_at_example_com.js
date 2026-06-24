/// <reference path="../pb_data/types.d.ts" />
// Seed demo — usuario ADMINISTRATIVO (secretaría) para testear el panel admin.
//
// Mismo patrón que el seed de profesor: `rol` legacy es required y no admite
// "administrativo", así que va un placeholder "estudiante" y el rol real vive en
// `roles`, que es lo que leen el frontend y las reglas de las colecciones nuevas
// (`@request.auth.roles ~ 'administrativo'`).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  const record = new Record(collection);
  record.set("email", "secretaria@example.com");
  record.setPassword("Secretaria123!");
  record.set("name", "Secretaría Demo");
  record.set("rol", "estudiante"); // placeholder: `rol` no admite "administrativo"
  record.set("roles", ["administrativo"]); // rol efectivo real
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
    const record = app.findFirstRecordByData("users", "email", "secretaria@example.com");
    app.delete(record);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Auth record not found, skipping rollback");
      return;
    }
    throw e;
  }
})
