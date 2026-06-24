/// <reference path="../pb_data/types.d.ts" />
// Seed demo — usuario ADMIN de la app (rol "admin"), distinto del superuser de
// PocketBase (_superusers, panel /_/). Este logea en la web y entra a
// /dashboard/admin. Acá `rol` y `roles` coinciden ("admin" es valor válido en
// ambos campos), así que no hace falta placeholder.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  const record = new Record(collection);
  record.set("email", "admin@example.com");
  record.setPassword("Admin123!");
  record.set("name", "Admin Demo");
  record.set("rol", "admin");
  record.set("roles", ["admin"]);
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
    const record = app.findFirstRecordByData("users", "email", "admin@example.com");
    app.delete(record);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Auth record not found, skipping rollback");
      return;
    }
    throw e;
  }
})
