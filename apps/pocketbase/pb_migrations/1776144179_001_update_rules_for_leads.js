/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("leads");
  collection.listRule = "@request.auth.id != \"\"";
  collection.viewRule = "";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("leads");
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "";
  return app.save(collection);
})