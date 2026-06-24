/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — extiende `materiales` con seccion_id (nullable, para mantener compat
// con los materiales legacy creados antes de existir secciones), flag publicado
// y tags JSON.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("materiales");
  const seccionesId = app.findCollectionByNameOrId("secciones_curso").id;

  const addIfMissing = (name, factory) => {
    if (!collection.fields.getByName(name)) {
      collection.fields.add(factory());
    }
  };

  addIfMissing("seccion_id", () => new RelationField({
    name: "seccion_id",
    required: false,
    collectionId: seccionesId,
    cascadeDelete: false,
    maxSelect: 1,
  }));

  addIfMissing("publicado", () => new BoolField({
    name: "publicado",
    required: false,
  }));

  addIfMissing("tags", () => new JSONField({
    name: "tags",
    required: false,
    maxSize: 2048,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("materiales");
  for (const name of ["seccion_id", "publicado", "tags"]) {
    if (collection.fields.getByName(name)) {
      collection.fields.removeByName(name);
    }
  }
  app.save(collection);
});
