/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — colecciones del módulo Evaluaciones y Simulacros PAES:
//   evaluaciones                 prueba/control/ensayo/simulacro
//   calificaciones_evaluacion    nota del alumno en una evaluación
//   simulacros_paes              set de preguntas con tabla de conversión
//   resultados_simulacro_paes    puntaje + percentil del alumno
//   categorias_evaluacion        ponderaciones por curso (controles 30%, etc.)
//   solicitudes_revision         alumno pide revisión de nota
migrate((app) => {
  const usersId = app.findCollectionByNameOrId("users").id;
  const cursosId = app.findCollectionByNameOrId("cursos").id;
  const seccionesId = app.findCollectionByNameOrId("secciones_curso").id;

  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";
  const profesorOrAdmin = "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'";
  const authOnly = "@request.auth.id != ''";

  const saveCol = (config) => {
    try { app.findCollectionByNameOrId(config.name); console.log("[1780617860] skip " + config.name); return; } catch (_e) {}
    app.save(new Collection(config));
  };

  // -- categorias_evaluacion ------------------------------------------------
  saveCol({
    name: "categorias_evaluacion",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: profesorOrAdmin,
    updateRule: profesorOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "curso_id", type: "relation", required: true, collectionId: cursosId, cascadeDelete: true, maxSelect: 1 },
      { name: "seccion_id", type: "relation", required: false, collectionId: seccionesId, cascadeDelete: false, maxSelect: 1 },
      { name: "nombre", type: "text", required: true, max: 100 },
      { name: "ponderacion_pct", type: "number", required: true, min: 0, max: 100 },
      { name: "tipo_default", type: "select", required: false, maxSelect: 1, values: ["prueba", "control", "simulacro_paes", "ensayo", "trabajo", "tarea", "participacion", "oral", "proyecto"] },
      { name: "orden", type: "number", required: false, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  const categoriasId = app.findCollectionByNameOrId("categorias_evaluacion").id;

  // -- evaluaciones ---------------------------------------------------------
  saveCol({
    name: "evaluaciones",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: profesorOrAdmin,
    updateRule: "@request.auth.id = profesor_id || " + adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "seccion_id", type: "relation", required: true, collectionId: seccionesId, cascadeDelete: true, maxSelect: 1 },
      { name: "profesor_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "titulo", type: "text", required: true, max: 200 },
      { name: "tipo", type: "select", required: true, maxSelect: 1, values: ["prueba", "control", "simulacro_paes", "ensayo", "trabajo", "oral", "proyecto"] },
      { name: "categoria_id", type: "relation", required: false, collectionId: categoriasId, cascadeDelete: false, maxSelect: 1 },
      { name: "fecha", type: "date", required: true },
      { name: "ponderacion_pct", type: "number", required: false, min: 0, max: 100 },
      { name: "puntaje_max", type: "number", required: false, min: 1, max: 1000 },
      { name: "escala_exigencia_pct", type: "number", required: false, min: 30, max: 80 },
      { name: "archivo_enunciado", type: "file", required: false, maxSelect: 5, maxSize: 20971520 },
      { name: "instrucciones", type: "text", required: false, max: 3000 },
      { name: "duracion_min", type: "number", required: false, onlyInt: true, min: 1, max: 480 },
      { name: "modalidad", type: "select", required: false, maxSelect: 1, values: ["presencial", "online"] },
      { name: "estado", type: "select", required: false, maxSelect: 1, values: ["programada", "en_curso", "rendida", "calificando", "publicada", "anulada"] },
      { name: "es_recuperativo_de", type: "text", required: false, max: 32 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  const evaluacionesId = app.findCollectionByNameOrId("evaluaciones").id;

  // -- calificaciones_evaluacion --------------------------------------------
  saveCol({
    name: "calificaciones_evaluacion",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    createRule: profesorOrAdmin,
    updateRule: profesorOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "evaluacion_id", type: "relation", required: true, collectionId: evaluacionesId, cascadeDelete: true, maxSelect: 1 },
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "puntaje", type: "number", required: false, min: 0, max: 1000 },
      { name: "nota_1_a_7", type: "number", required: false, min: 1, max: 7 },
      { name: "estado_nota", type: "select", required: false, maxSelect: 1, values: ["pendiente", "calificada", "anulada", "eximida", "recuperada", "ausente_justificado"] },
      { name: "comentarios", type: "text", required: false, max: 3000 },
      { name: "motivo_anulacion", type: "text", required: false, max: 500 },
      { name: "calificada_por", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "fecha_calificacion", type: "date", required: false },
      { name: "publicada", type: "bool", required: false },
      { name: "version", type: "number", required: false, onlyInt: true, min: 1 },
      { name: "nota_anterior", type: "number", required: false, min: 1, max: 7 },
      { name: "motivo_recalificacion", type: "text", required: false, max: 500 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_calif_eval_alumno ON calificaciones_evaluacion (evaluacion_id, alumno_id)"],
  });

  // -- simulacros_paes ------------------------------------------------------
  saveCol({
    name: "simulacros_paes",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: profesorOrAdmin,
    updateRule: profesorOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "titulo", type: "text", required: true, max: 200 },
      { name: "asignatura", type: "select", required: true, maxSelect: 1, values: ["competencia_lectora", "matematica_m1", "matematica_m2", "historia", "ciencias"] },
      { name: "fecha", type: "date", required: true },
      { name: "n_preguntas_total", type: "number", required: false, onlyInt: true, min: 1, max: 200 },
      { name: "tabla_conversion_json", type: "json", required: false, maxSize: 32768 },
      { name: "puntaje_max_chile", type: "number", required: false, min: 100, max: 1000 },
      { name: "puntaje_corte_carrera_referencial", type: "json", required: false, maxSize: 4096 },
      { name: "descripcion", type: "text", required: false, max: 2000 },
      { name: "archivo_enunciado", type: "file", required: false, maxSelect: 1, maxSize: 20971520 },
      { name: "estado", type: "select", required: false, maxSelect: 1, values: ["programado", "rendido", "publicado", "archivado"] },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  const simulacrosId = app.findCollectionByNameOrId("simulacros_paes").id;

  // -- resultados_simulacro_paes --------------------------------------------
  saveCol({
    name: "resultados_simulacro_paes",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    createRule: profesorOrAdmin,
    updateRule: profesorOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "simulacro_id", type: "relation", required: true, collectionId: simulacrosId, cascadeDelete: true, maxSelect: 1 },
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "respuestas_correctas", type: "number", required: false, onlyInt: true, min: 0 },
      { name: "puntaje", type: "number", required: false, min: 100, max: 1000 },
      { name: "percentil_interno", type: "number", required: false, min: 0, max: 100 },
      { name: "ranking_interno", type: "number", required: false, onlyInt: true, min: 1 },
      { name: "tiempo_usado_min", type: "number", required: false, onlyInt: true },
      { name: "mostrar_en_ranking", type: "bool", required: false },
      { name: "comentarios", type: "text", required: false, max: 1500 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_res_simulacro_alumno ON resultados_simulacro_paes (simulacro_id, alumno_id)"],
  });

  // -- solicitudes_revision -------------------------------------------------
  saveCol({
    name: "solicitudes_revision",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor' || @request.auth.id = alumno_id",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor' || @request.auth.id = alumno_id",
    createRule: "@request.auth.id = alumno_id || @request.auth.roles ~ 'apoderado'",
    updateRule: profesorOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "tipo_origen", type: "select", required: true, maxSelect: 1, values: ["evaluacion", "tarea"] },
      { name: "calificacion_evaluacion_id", type: "relation", required: false, collectionId: app.findCollectionByNameOrId("calificaciones_evaluacion").id, cascadeDelete: false, maxSelect: 1 },
      { name: "calificacion_tarea_id", type: "relation", required: false, collectionId: app.findCollectionByNameOrId("calificaciones_tarea").id, cascadeDelete: false, maxSelect: 1 },
      { name: "motivo", type: "text", required: true, max: 2000 },
      { name: "estado", type: "select", required: false, maxSelect: 1, values: ["pendiente", "en_revision", "aprobada", "rechazada"] },
      { name: "resolucion", type: "text", required: false, max: 2000 },
      { name: "resuelta_por", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "fecha_resolucion", type: "date", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

}, (app) => {
  for (const name of ["solicitudes_revision", "resultados_simulacro_paes", "simulacros_paes", "calificaciones_evaluacion", "evaluaciones", "categorias_evaluacion"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_e) {}
  }
});
