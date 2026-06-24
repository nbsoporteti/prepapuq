/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — extiende `justifications` con archivo adjunto (certificado médico)
// y campos de workflow de revisión por administrativo.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("justifications");

  const addIfMissing = (name, factory) => {
    if (!collection.fields.getByName(name)) {
      collection.fields.add(factory());
    }
  };

  addIfMissing("archivo_adjunto", () => new FileField({
    name: "archivo_adjunto",
    required: false,
    maxSelect: 3,
    maxSize: 5242880, // 5MB
    mimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  }));

  addIfMissing("fecha_revision", () => new DateField({
    name: "fecha_revision",
    required: false,
  }));

  addIfMissing("revisada_por", () => new RelationField({
    name: "revisada_por",
    required: false,
    collectionId: app.findCollectionByNameOrId("users").id,
    cascadeDelete: false,
    maxSelect: 1,
  }));

  addIfMissing("comentario_revisor", () => new TextField({
    name: "comentario_revisor",
    required: false,
    max: 1000,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("justifications");
  for (const name of ["archivo_adjunto", "fecha_revision", "revisada_por", "comentario_revisor"]) {
    if (collection.fields.getByName(name)) {
      collection.fields.removeByName(name);
    }
  }
  app.save(collection);
});
