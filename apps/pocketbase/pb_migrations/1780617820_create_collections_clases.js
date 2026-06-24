/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — colecciones de clases en vivo y contenido por sección:
//   lecciones                    unidades temáticas del curso
//   clases_vivo                  sesión específica con link Meet/Zoom
//   asistencia_clase_vivo        lista por clase concreta
//   reemplazos_clase             histórico de reemplazos de profesor
//   feriados_cl                  catálogo de feriados Chile (seed posterior)
//   clase_recordatorio_log       idempotencia del cron de recordatorios
//   clase_lead_publica           inscripciones a clases públicas gratuitas
migrate((app) => {
  const usersId = app.findCollectionByNameOrId("users").id;
  const cursosId = app.findCollectionByNameOrId("cursos").id;
  const seccionesId = app.findCollectionByNameOrId("secciones_curso").id;

  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";
  const authOnly = "@request.auth.id != ''";

  const saveCol = (config) => {
    try { app.findCollectionByNameOrId(config.name); console.log("[1780617820] skip " + config.name); return; } catch (_e) {}
    app.save(new Collection(config));
  };

  // Una sección puede ver las clases/lecciones de su sección.
  // Apoderado ve las de su pupilo via parent_student + matriculas_seccion.
  const scopedRead = "@request.auth.roles ~ 'admin' || " +
    "@collection.matriculas_seccion.alumno_id ?= @request.auth.id && @collection.matriculas_seccion.seccion_id ?= seccion_id || " +
    "@collection.secciones_curso.profesor_id ?= @request.auth.id && @collection.secciones_curso.id ?= seccion_id";

  // -- lecciones ------------------------------------------------------------
  saveCol({
    name: "lecciones",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "curso_id", type: "relation", required: true, collectionId: cursosId, cascadeDelete: true, maxSelect: 1 },
      { name: "seccion_id", type: "relation", required: false, collectionId: seccionesId, cascadeDelete: false, maxSelect: 1 },
      { name: "titulo", type: "text", required: true, max: 200 },
      { name: "descripcion", type: "text", required: false, max: 2000 },
      { name: "orden", type: "number", required: false, onlyInt: true },
      { name: "video_url", type: "url", required: false },
      { name: "duracion_estimada_min", type: "number", required: false, onlyInt: true },
      { name: "publicada", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  // -- clases_vivo ----------------------------------------------------------
  saveCol({
    name: "clases_vivo",
    type: "base",
    listRule: scopedRead,
    viewRule: scopedRead,
    createRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'",
    updateRule: "@request.auth.roles ~ 'admin' || @request.auth.id = profesor_id",
    deleteRule: adminOnly,
    fields: [
      { name: "seccion_id", type: "relation", required: true, collectionId: seccionesId, cascadeDelete: true, maxSelect: 1 },
      { name: "profesor_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "profesor_titular_original_id", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "fecha", type: "date", required: true },
      { name: "hora_inicio", type: "text", required: true, max: 5, pattern: "^[0-2][0-9]:[0-5][0-9]$" },
      { name: "hora_fin", type: "text", required: false, max: 5, pattern: "^[0-2][0-9]:[0-5][0-9]$" },
      { name: "duracion_min", type: "number", required: false, onlyInt: true, min: 5, max: 480 },
      { name: "plataforma", type: "select", required: false, maxSelect: 1, values: ["meet", "zoom", "teams", "presencial", "otra"] },
      { name: "link", type: "url", required: false },
      { name: "tema", type: "text", required: false, max: 300 },
      { name: "descripcion", type: "text", required: false, max: 3000 },
      { name: "materiales_adjuntos", type: "json", required: false, maxSize: 4096 },
      { name: "estado", type: "select", required: false, maxSelect: 1, values: ["programada", "en_curso", "finalizada", "cancelada", "reagendada"] },
      { name: "grabacion_url", type: "url", required: false },
      { name: "grabacion_disponible", type: "bool", required: false },
      { name: "numero_asistentes_cache", type: "number", required: false, onlyInt: true },
      // recurrencia
      { name: "es_recurrente", type: "bool", required: false },
      { name: "patron_recurrencia", type: "json", required: false, maxSize: 1024 },
      { name: "serie_recurrente_id", type: "text", required: false, max: 32 },
      // reagenda
      { name: "reagendada_desde", type: "date", required: false },
      { name: "motivo_reagenda", type: "text", required: false, max: 500 },
      { name: "historial_cambios", type: "json", required: false, maxSize: 8192 },
      // lead público (clases gratis en landing)
      { name: "lead_publica", type: "bool", required: false },
      { name: "lead_titulo_publico", type: "text", required: false, max: 200 },
      { name: "lead_descripcion_publica", type: "text", required: false, max: 1000 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_clases_vivo_seccion_fecha ON clases_vivo (seccion_id, fecha)",
      "CREATE INDEX idx_clases_vivo_profesor_fecha ON clases_vivo (profesor_id, fecha)",
      "CREATE INDEX idx_clases_vivo_serie ON clases_vivo (serie_recurrente_id)",
    ],
  });

  const clasesVivoId = app.findCollectionByNameOrId("clases_vivo").id;

  // -- asistencia_clase_vivo ------------------------------------------------
  saveCol({
    name: "asistencia_clase_vivo",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id || @request.auth.roles ~ 'profesor'",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id || @request.auth.roles ~ 'profesor'",
    createRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'",
    updateRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'",
    deleteRule: adminOnly,
    fields: [
      { name: "clase_vivo_id", type: "relation", required: true, collectionId: clasesVivoId, cascadeDelete: true, maxSelect: 1 },
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "estado", type: "select", required: true, maxSelect: 1, values: ["presente", "ausente", "tardanza", "justificado", "retirado"] },
      { name: "hora_entrada", type: "date", required: false },
      { name: "hora_salida", type: "date", required: false },
      { name: "marcada_por", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "comentario", type: "text", required: false, max: 500 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_asist_clase_alumno ON asistencia_clase_vivo (clase_vivo_id, alumno_id)"],
  });

  // -- reemplazos_clase -----------------------------------------------------
  saveCol({
    name: "reemplazos_clase",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo'",
    updateRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo'",
    deleteRule: adminOnly,
    fields: [
      { name: "clase_vivo_id", type: "relation", required: true, collectionId: clasesVivoId, cascadeDelete: true, maxSelect: 1 },
      { name: "profesor_original_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "profesor_reemplazo_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "motivo", type: "text", required: false, max: 500 },
      { name: "asignado_por", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "activo", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  // -- feriados_cl ----------------------------------------------------------
  saveCol({
    name: "feriados_cl",
    type: "base",
    listRule: authOnly,
    viewRule: "", // público (la landing usa esto en el calendario PAES)
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "fecha", type: "date", required: true },
      { name: "nombre", type: "text", required: true, max: 100 },
      { name: "tipo", type: "select", required: false, maxSelect: 1, values: ["civil", "religioso", "regional"] },
      { name: "irrenunciable", type: "bool", required: false },
      { name: "anio", type: "number", required: true, onlyInt: true, min: 2024, max: 2099 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_feriados_fecha ON feriados_cl (fecha)",
      "CREATE INDEX idx_feriados_anio ON feriados_cl (anio)",
    ],
  });

  // -- clase_recordatorio_log ----------------------------------------------
  saveCol({
    name: "clase_recordatorio_log",
    type: "base",
    listRule: adminOnly,
    viewRule: adminOnly,
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "clase_vivo_id", type: "relation", required: true, collectionId: clasesVivoId, cascadeDelete: true, maxSelect: 1 },
      { name: "tipo", type: "select", required: true, maxSelect: 1, values: ["24h", "1h", "15min", "cancelacion", "reagenda"] },
      { name: "enviado_at", type: "date", required: true },
      { name: "destinatarios_count", type: "number", required: false, onlyInt: true },
      { name: "errores_count", type: "number", required: false, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_recordatorio_clase_tipo ON clase_recordatorio_log (clase_vivo_id, tipo)"],
  });

  // -- clase_lead_publica ---------------------------------------------------
  saveCol({
    name: "clase_lead_publica",
    type: "base",
    listRule: adminOnly,
    viewRule: adminOnly,
    createRule: "", // público — formulario de inscripción en landing
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "clase_vivo_id", type: "relation", required: true, collectionId: clasesVivoId, cascadeDelete: false, maxSelect: 1 },
      { name: "nombre", type: "text", required: true, max: 100 },
      { name: "email", type: "email", required: true },
      { name: "telefono", type: "text", required: false, max: 32 },
      { name: "colegio", type: "text", required: false, max: 200 },
      { name: "anio_que_cursa", type: "text", required: false, max: 20 },
      { name: "utm_source", type: "text", required: false, max: 100 },
      { name: "utm_medium", type: "text", required: false, max: 100 },
      { name: "utm_campaign", type: "text", required: false, max: 100 },
      { name: "ip", type: "text", required: false, max: 50 },
      { name: "honeypot", type: "text", required: false, max: 100 },
      { name: "estado_seguimiento", type: "select", required: false, maxSelect: 1, values: ["nuevo", "contactado", "matriculado", "descartado"] },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE INDEX idx_lead_publica_email ON clase_lead_publica (email)"],
  });

}, (app) => {
  for (const name of ["clase_lead_publica", "clase_recordatorio_log", "feriados_cl", "reemplazos_clase", "asistencia_clase_vivo", "clases_vivo", "lecciones"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_e) {}
  }
});
