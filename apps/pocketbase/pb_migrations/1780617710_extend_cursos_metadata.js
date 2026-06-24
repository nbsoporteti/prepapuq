/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — extiende `cursos` con metadata académica del LMS PAES.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("cursos");

  const addIfMissing = (name, factory) => {
    if (!collection.fields.getByName(name)) {
      collection.fields.add(factory());
    }
  };

  addIfMissing("materia", () => new SelectField({
    name: "materia",
    required: false,
    maxSelect: 1,
    values: [
      "matematica_m1",
      "matematica_m2",
      "competencia_lectora",
      "ciencias",
      "historia",
      "ingles",
      "otra",
    ],
  }));

  addIfMissing("nivel", () => new SelectField({
    name: "nivel",
    required: false,
    maxSelect: 1,
    values: ["basico", "intermedio", "avanzado"],
  }));

  addIfMissing("modalidad_default", () => new SelectField({
    name: "modalidad_default",
    required: false,
    maxSelect: 1,
    values: ["presencial", "online", "mixta"],
  }));

  addIfMissing("anio_lectivo", () => new NumberField({
    name: "anio_lectivo",
    required: false,
    min: 2024,
    max: 2099,
    onlyInt: true,
  }));

  addIfMissing("syllabus_markdown", () => new EditorField({
    name: "syllabus_markdown",
    required: false,
    maxSize: 100000,
  }));

  addIfMissing("color_tema", () => new TextField({
    name: "color_tema",
    required: false,
    max: 32,
  }));

  addIfMissing("icono", () => new TextField({
    name: "icono",
    required: false,
    max: 64,
  }));

  addIfMissing("activo", () => new BoolField({
    name: "activo",
    required: false,
  }));

  addIfMissing("orden", () => new NumberField({
    name: "orden",
    required: false,
    onlyInt: true,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("cursos");
  for (const name of [
    "materia",
    "nivel",
    "modalidad_default",
    "anio_lectivo",
    "syllabus_markdown",
    "color_tema",
    "icono",
    "activo",
    "orden",
  ]) {
    if (collection.fields.getByName(name)) {
      collection.fields.removeByName(name);
    }
  }
  app.save(collection);
});
