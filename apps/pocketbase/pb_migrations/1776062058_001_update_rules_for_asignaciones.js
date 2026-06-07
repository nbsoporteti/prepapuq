/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("asignaciones");
  collection.listRule = "@request.auth.rol = \"admin\"";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("asignaciones");
  collection.listRule = "@request.auth.rol = \"admin\"";
  return app.save(collection);
})