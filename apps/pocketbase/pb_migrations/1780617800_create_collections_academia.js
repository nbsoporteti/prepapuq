/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — colecciones núcleo de academia:
//   profesores_extra      perfil profesional 1-1 con users
//   administrativos_extra perfil del rol administrativo
//   secciones_curso       grupo concreto de un curso (Mate-A Mañana 2026)
//   horarios              bloques semanales recurrentes de una sección
//   matriculas_seccion    alumno ↔ sección (reemplaza el plano `asignaciones`)
//
// Reglas conservadoras: admin = full CRUD; el resto es read-only auth para listar.
// Las reglas finas (profesor edita solo su sección, apoderado ve solo su pupilo, etc.)
// se afinan en migraciones posteriores cuando los dashboards las consuman.
migrate((app) => {
  const usersId = app.findCollectionByNameOrId("users").id;
  const cursosId = app.findCollectionByNameOrId("cursos").id;

  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";
  const authOnly = "@request.auth.id != ''";

  const saveCol = (config) => {
    const existing = (() => { try { return app.findCollectionByNameOrId(config.name); } catch (_e) { return null; } })();
    if (existing) {
      console.log("[1780617800] skipping " + config.name + " (already exists)");
      return;
    }
    const col = new Collection(config);
    app.save(col);
  };

  // -- profesores_extra -----------------------------------------------------
  saveCol({
    name: "profesores_extra",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: adminOnly,
    updateRule: "@request.auth.id = user_id || " + adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "user_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
      { name: "bio", type: "text", required: false, max: 1500 },
      { name: "especialidad", type: "text", required: false, max: 200 },
      { name: "universidad_origen", type: "text", required: false, max: 200 },
      { name: "anio_egreso", type: "number", required: false, onlyInt: true, min: 1970, max: 2099 },
      { name: "titulo_profesional", type: "text", required: false, max: 200 },
      { name: "magister", type: "text", required: false, max: 200 },
      { name: "frase_destacada", type: "text", required: false, max: 300 },
      { name: "redes_sociales", type: "json", required: false, maxSize: 2048 },
      { name: "horarios_tutoria", type: "json", required: false, maxSize: 2048 },
      { name: "mostrar_publico", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_prof_extra_user ON profesores_extra (user_id)"],
  });

  // -- administrativos_extra ------------------------------------------------
  saveCol({
    name: "administrativos_extra",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: adminOnly,
    updateRule: "@request.auth.id = user_id || " + adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "user_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
      { name: "sub_rol", type: "select", required: false, maxSelect: 1, values: ["secretaria", "finanzas", "atencion_apoderado", "coordinador_academico"] },
      { name: "puede_registrar_pagos", type: "bool", required: false },
      { name: "puede_gestionar_matriculas", type: "bool", required: false },
      { name: "notas_internas", type: "text", required: false, max: 2000 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_adm_extra_user ON administrativos_extra (user_id)"],
  });

  // -- secciones_curso ------------------------------------------------------
  saveCol({
    name: "secciones_curso",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "curso_id", type: "relation", required: true, collectionId: cursosId, cascadeDelete: false, maxSelect: 1 },
      { name: "nombre", type: "text", required: true, max: 100 },
      { name: "letra", type: "text", required: false, max: 8 },
      { name: "profesor_id", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "profesores_ayudantes", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 5 },
      { name: "modalidad", type: "select", required: false, maxSelect: 1, values: ["presencial", "online", "mixta"] },
      { name: "capacidad", type: "number", required: false, onlyInt: true, min: 1, max: 200 },
      { name: "anio_lectivo", type: "number", required: true, onlyInt: true, min: 2024, max: 2099 },
      { name: "estado", type: "select", required: false, maxSelect: 1, values: ["activa", "archivada", "cancelada"] },
      { name: "sala_default", type: "text", required: false, max: 100 },
      { name: "link_default", type: "url", required: false },
      { name: "color_tema", type: "text", required: false, max: 32 },
      { name: "notas_internas", type: "text", required: false, max: 2000 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  const seccionesId = app.findCollectionByNameOrId("secciones_curso").id;

  // -- horarios -------------------------------------------------------------
  saveCol({
    name: "horarios",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "seccion_id", type: "relation", required: true, collectionId: seccionesId, cascadeDelete: true, maxSelect: 1 },
      { name: "dia_semana", type: "select", required: true, maxSelect: 1, values: ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] },
      { name: "hora_inicio", type: "text", required: true, max: 5, pattern: "^[0-2][0-9]:[0-5][0-9]$" },
      { name: "hora_fin", type: "text", required: true, max: 5, pattern: "^[0-2][0-9]:[0-5][0-9]$" },
      { name: "sala", type: "text", required: false, max: 100 },
      { name: "link_meet", type: "url", required: false },
      { name: "vigente_desde", type: "date", required: false },
      { name: "vigente_hasta", type: "date", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  // -- matriculas_seccion ---------------------------------------------------
  saveCol({
    name: "matriculas_seccion",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    createRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo'",
    updateRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo'",
    deleteRule: adminOnly,
    fields: [
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "seccion_id", type: "relation", required: true, collectionId: seccionesId, cascadeDelete: false, maxSelect: 1 },
      { name: "fecha_matricula", type: "date", required: false },
      { name: "estado", type: "select", required: false, maxSelect: 1, values: ["pre_inscrito", "matriculado", "retirado", "suspendido"] },
      { name: "motivo_retiro", type: "text", required: false, max: 500 },
      { name: "matriculado_por", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "notas", type: "text", required: false, max: 1000 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_matric_alumno_seccion ON matriculas_seccion (alumno_id, seccion_id)"],
  });

}, (app) => {
  for (const name of ["matriculas_seccion", "horarios", "secciones_curso", "administrativos_extra", "profesores_extra"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_e) {}
  }
});
