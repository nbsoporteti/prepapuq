/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — extiende `asistencia` (legacy diaria) con vínculo opcional a la
// clase_vivo concreta, para evolutivamente migrar a registrar asistencia por
// sesión en vez de "por día".
migrate((app) => {
  const collection = app.findCollectionByNameOrId("asistencia");
  const clasesVivoId = app.findCollectionByNameOrId("clases_vivo").id;
  const seccionesId = app.findCollectionByNameOrId("secciones_curso").id;
  const usersId = app.findCollectionByNameOrId("users").id;

  const addIfMissing = (name, factory) => {
    if (!collection.fields.getByName(name)) {
      collection.fields.add(factory());
    }
  };

  addIfMissing("clase_vivo_id", () => new RelationField({
    name: "clase_vivo_id",
    required: false,
    collectionId: clasesVivoId,
    cascadeDelete: false,
    maxSelect: 1,
  }));

  addIfMissing("seccion_id", () => new RelationField({
    name: "seccion_id",
    required: false,
    collectionId: seccionesId,
    cascadeDelete: false,
    maxSelect: 1,
  }));

  addIfMissing("marcada_por", () => new RelationField({
    name: "marcada_por",
    required: false,
    collectionId: usersId,
    cascadeDelete: false,
    maxSelect: 1,
  }));

  addIfMissing("hora_marca", () => new DateField({
    name: "hora_marca",
    required: false,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("asistencia");
  for (const name of ["clase_vivo_id", "seccion_id", "marcada_por", "hora_marca"]) {
    if (collection.fields.getByName(name)) {
      collection.fields.removeByName(name);
    }
  }
  app.save(collection);
});
