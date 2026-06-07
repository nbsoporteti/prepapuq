/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("materiales");
  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "@request.auth.role = \"admin\"";
  collection.updateRule = "@request.auth.role = \"admin\"";
  collection.deleteRule = "@request.auth.role = \"admin\"";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("materiales");
  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "@request.auth.rol = \"admin\"";
  collection.updateRule = "@request.auth.rol = \"admin\"";
  collection.deleteRule = "@request.auth.rol = \"admin\"";
  return app.save(collection);
})