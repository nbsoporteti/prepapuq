/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.listRule = "id = @request.auth.id || @request.auth.role = \"admin\"";
  collection.viewRule = "@request.auth.role = 'apoderado' || id = @request.auth.id";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.listRule = "id = @request.auth.id || @request.auth.rol = \"admin\"";
  collection.viewRule = "@request.auth.rol = 'apoderado' || id = @request.auth.id";
  return app.save(collection);
})