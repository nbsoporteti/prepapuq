/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.viewRule = "@request.auth.rol = 'apoderado' || id = @request.auth.id";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.viewRule = "id = @request.auth.id || @request.auth.rol = \"admin\"";
  return app.save(collection);
})