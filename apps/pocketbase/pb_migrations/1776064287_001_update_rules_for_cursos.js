/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("cursos");
  collection.viewRule = "@request.auth.rol = 'estudiante'";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("cursos");
  collection.viewRule = "";
  return app.save(collection);
})