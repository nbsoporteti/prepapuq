/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — extiende `users` con multi-rol y datos personales del LMS.
// El campo legacy `rol` (single select) se mantiene durante 1 release para
// no romper código que aún lo lee. La migración hermana 1780617702 sincroniza
// `roles` desde `rol` para los users existentes.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const addIfMissing = (name, factory) => {
    if (!collection.fields.getByName(name)) {
      collection.fields.add(factory());
    }
  };

  // ---- multi-rol ----------------------------------------------------------
  // Extiende el rol legacy (estudiante/apoderado/admin) con dos nuevos:
  // profesor y administrativo. NO toca el campo `rol` para no romper código
  // legacy; ese campo sigue existiendo y se sincroniza al primero de `roles`.
  addIfMissing("roles", () => new SelectField({
    name: "roles",
    required: false,
    maxSelect: 5,
    values: ["estudiante", "apoderado", "profesor", "administrativo", "admin"],
  }));

  // ---- datos personales ---------------------------------------------------
  addIfMissing("foto", () => new FileField({
    name: "foto",
    required: false,
    maxSelect: 1,
    maxSize: 5242880, // 5MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    thumbs: ["100x100", "300x300"],
  }));

  addIfMissing("telefono", () => new TextField({
    name: "telefono",
    required: false,
    max: 32,
  }));

  // RUT chileno, formato libre (validación visual en frontend). Único.
  addIfMissing("rut", () => new TextField({
    name: "rut",
    required: false,
    max: 16,
  }));

  addIfMissing("fecha_nacimiento", () => new DateField({
    name: "fecha_nacimiento",
    required: false,
  }));

  addIfMissing("direccion", () => new TextField({
    name: "direccion",
    required: false,
    max: 200,
  }));

  addIfMissing("comuna", () => new TextField({
    name: "comuna",
    required: false,
    max: 80,
  }));

  addIfMissing("region", () => new TextField({
    name: "region",
    required: false,
    max: 80,
  }));

  // ---- contexto académico (alumno) ---------------------------------------
  addIfMissing("anio_que_cursa", () => new SelectField({
    name: "anio_que_cursa",
    required: false,
    maxSelect: 1,
    values: ["3medio", "4medio", "egresado"],
  }));

  addIfMissing("colegio_procedencia", () => new TextField({
    name: "colegio_procedencia",
    required: false,
    max: 120,
  }));

  // ---- estado y preferencias ---------------------------------------------
  addIfMissing("activo", () => new BoolField({
    name: "activo",
    required: false,
  }));

  addIfMissing("acepta_comunicaciones", () => new BoolField({
    name: "acepta_comunicaciones",
    required: false,
  }));

  addIfMissing("preferencias_notificacion", () => new JSONField({
    name: "preferencias_notificacion",
    required: false,
    maxSize: 8192,
  }));

  addIfMissing("ultimo_login", () => new DateField({
    name: "ultimo_login",
    required: false,
  }));

  // Índice único soft para RUT (acepta vacío múltiple).
  if (typeof collection.addIndex === "function") {
    try {
      collection.addIndex("idx_users_rut_unique", true, "rut", "rut != ''");
    } catch (_e) {
      // si ya existe, ignorar
    }
  }

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  for (const name of [
    "roles",
    "foto",
    "telefono",
    "rut",
    "fecha_nacimiento",
    "direccion",
    "comuna",
    "region",
    "anio_que_cursa",
    "colegio_procedencia",
    "activo",
    "acepta_comunicaciones",
    "preferencias_notificacion",
    "ultimo_login",
  ]) {
    if (collection.fields.getByName(name)) {
      collection.fields.removeByName(name);
    }
  }
  if (typeof collection.removeIndex === "function") {
    try {
      collection.removeIndex("idx_users_rut_unique");
    } catch (_e) {}
  }
  app.save(collection);
});
