/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.listRule = "id = @request.auth.id || @request.auth.rol = \"admin\"";
  collection.viewRule = "id = @request.auth.id || @request.auth.rol = \"admin\"";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.listRule = "@request.auth.rol = \"admin\" || id = @request.auth.id";
  collection.viewRule = "id = @request.auth.id";
  return app.save(collection);
})