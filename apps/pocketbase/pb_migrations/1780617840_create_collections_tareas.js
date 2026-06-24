/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — colecciones del módulo Tareas:
//   tareas                 asignación digital con entrega
//   entregas               submission del alumno
//   calificaciones_tarea   nota + feedback de una entrega
//   grupos_tarea           asignación grupal
//   banco_tareas           plantillas reutilizables
migrate((app) => {
  const usersId = app.findCollectionByNameOrId("users").id;
  const seccionesId = app.findCollectionByNameOrId("secciones_curso").id;

  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";
  const profesorOrAdmin = "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'";

  const saveCol = (config) => {
    try { app.findCollectionByNameOrId(config.name); console.log("[1780617840] skip " + config.name); return; } catch (_e) {}
    app.save(new Collection(config));
  };

  // -- tareas ---------------------------------------------------------------
  saveCol({
    name: "tareas",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: profesorOrAdmin,
    updateRule: "@request.auth.id = profesor_id || " + adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "seccion_id", type: "relation", required: true, collectionId: seccionesId, cascadeDelete: true, maxSelect: 1 },
      { name: "profesor_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "titulo", type: "text", required: true, max: 200 },
      { name: "descripcion_markdown", type: "editor", required: false, maxSize: 50000 },
      { name: "archivos_adjuntos", type: "file", required: false, maxSelect: 10, maxSize: 20971520 },
      { name: "fecha_publicacion", type: "date", required: false },
      { name: "fecha_limite", type: "date", required: true },
      { name: "puntaje_max", type: "number", required: false, min: 0, max: 1000 },
      { name: "tipo", type: "select", required: false, maxSelect: 1, values: ["individual", "grupal"] },
      { name: "grupo_min", type: "number", required: false, onlyInt: true, min: 2, max: 10 },
      { name: "grupo_max", type: "number", required: false, onlyInt: true, min: 2, max: 10 },
      { name: "late_penalty_pct_dia", type: "number", required: false, min: 0, max: 100 },
      { name: "late_max_dias", type: "number", required: false, onlyInt: true, min: 0, max: 30 },
      { name: "allow_resubmit", type: "bool", required: false },
      { name: "max_intentos", type: "number", required: false, onlyInt: true, min: 1, max: 10 },
      { name: "formatos_permitidos", type: "json", required: false, maxSize: 1024 },
      { name: "ponderacion_pct", type: "number", required: false, min: 0, max: 100 },
      { name: "categoria_id", type: "text", required: false, max: 32 },
      { name: "estado", type: "select", required: false, maxSelect: 1, values: ["borrador", "publicada", "archivada"] },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_tareas_seccion ON tareas (seccion_id, fecha_limite)"],
  });

  const tareasId = app.findCollectionByNameOrId("tareas").id;

  // -- grupos_tarea ---------------------------------------------------------
  saveCol({
    name: "grupos_tarea",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: profesorOrAdmin,
    updateRule: profesorOrAdmin,
    deleteRule: profesorOrAdmin,
    fields: [
      { name: "tarea_id", type: "relation", required: true, collectionId: tareasId, cascadeDelete: true, maxSelect: 1 },
      { name: "nombre_grupo", type: "text", required: false, max: 100 },
      { name: "alumnos", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 10 },
      { name: "lider_id", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  // -- entregas -------------------------------------------------------------
  saveCol({
    name: "entregas",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.id = alumno_id || @request.auth.roles ~ 'profesor' || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.id = alumno_id || @request.auth.roles ~ 'profesor' || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    createRule: "@request.auth.id = alumno_id || " + profesorOrAdmin,
    updateRule: "@request.auth.id = alumno_id || " + profesorOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "tarea_id", type: "relation", required: true, collectionId: tareasId, cascadeDelete: true, maxSelect: 1 },
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "archivos", type: "file", required: false, maxSelect: 10, maxSize: 20971520 },
      { name: "archivos_hashes", type: "json", required: false, maxSize: 4096 },
      { name: "comentario_alumno", type: "text", required: false, max: 3000 },
      { name: "fecha_entrega", type: "date", required: false },
      { name: "intento_n", type: "number", required: false, onlyInt: true, min: 1, max: 10 },
      { name: "estado", type: "select", required: false, maxSelect: 1, values: ["en_progreso", "entregada", "calificada", "atrasada", "no_entregada", "devuelta_correccion"] },
      { name: "dias_de_atraso", type: "number", required: false, onlyInt: true },
      { name: "penalizacion_aplicada_pct", type: "number", required: false, min: 0, max: 100 },
      { name: "es_grupal", type: "bool", required: false },
      { name: "grupo_id", type: "relation", required: false, collectionId: app.findCollectionByNameOrId("grupos_tarea").id, cascadeDelete: false, maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_entrega_tarea_alumno_intento ON entregas (tarea_id, alumno_id, intento_n)",
      "CREATE INDEX idx_entrega_estado ON entregas (estado)",
    ],
  });

  const entregasId = app.findCollectionByNameOrId("entregas").id;

  // -- calificaciones_tarea -------------------------------------------------
  saveCol({
    name: "calificaciones_tarea",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    createRule: profesorOrAdmin,
    updateRule: profesorOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "entrega_id", type: "relation", required: true, collectionId: entregasId, cascadeDelete: true, maxSelect: 1 },
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "nota_1_a_7", type: "number", required: true, min: 1, max: 7 },
      { name: "nota_anterior", type: "number", required: false, min: 1, max: 7 },
      { name: "version", type: "number", required: false, onlyInt: true, min: 1 },
      { name: "feedback_markdown", type: "editor", required: false, maxSize: 20000 },
      { name: "archivo_correccion", type: "file", required: false, maxSelect: 1, maxSize: 10485760 },
      { name: "calificada_por", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "fecha_calificacion", type: "date", required: false },
      { name: "motivo_recalificacion", type: "text", required: false, max: 500 },
      { name: "publicada", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_calif_tarea_alumno ON calificaciones_tarea (alumno_id, fecha_calificacion)"],
  });

  // -- banco_tareas ---------------------------------------------------------
  saveCol({
    name: "banco_tareas",
    type: "base",
    listRule: profesorOrAdmin,
    viewRule: profesorOrAdmin,
    createRule: profesorOrAdmin,
    updateRule: "@request.auth.id = autor_id || " + adminOnly,
    deleteRule: "@request.auth.id = autor_id || " + adminOnly,
    fields: [
      { name: "titulo", type: "text", required: true, max: 200 },
      { name: "descripcion_markdown", type: "editor", required: false, maxSize: 50000 },
      { name: "autor_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "materia", type: "select", required: false, maxSelect: 1, values: ["matematica_m1", "matematica_m2", "competencia_lectora", "ciencias", "historia", "ingles", "otra"] },
      { name: "tags", type: "json", required: false, maxSize: 2048 },
      { name: "archivos_adjuntos", type: "file", required: false, maxSelect: 10, maxSize: 20971520 },
      { name: "puntaje_max", type: "number", required: false, min: 0, max: 1000 },
      { name: "compartida", type: "bool", required: false },
      { name: "uso_count", type: "number", required: false, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

}, (app) => {
  for (const name of ["banco_tareas", "calificaciones_tarea", "entregas", "grupos_tarea", "tareas"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_e) {}
  }
});
