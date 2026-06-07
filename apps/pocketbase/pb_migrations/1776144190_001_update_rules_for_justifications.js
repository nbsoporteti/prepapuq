/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("justifications");
  collection.listRule = "@request.auth.role = \"admin\" || @request.auth.id = user_id";
  collection.viewRule = "@request.auth.role = \"admin\" || @request.auth.id = user_id";
  collection.createRule = "@request.auth.id != \"\"";
  collection.updateRule = "@request.auth.role = \"admin\"";
  collection.deleteRule = "@request.auth.role = \"admin\"";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("justifications");
  collection.listRule = "@request.auth.rol = \"admin\" || @request.auth.id = user_id";
  collection.viewRule = "@request.auth.rol = \"admin\" || @request.auth.id = user_id";
  collection.createRule = "@request.auth.id != \"\"";
  collection.updateRule = "@request.auth.rol = \"admin\"";
  collection.deleteRule = "@request.auth.rol = \"admin\"";
  return app.save(collection);
})