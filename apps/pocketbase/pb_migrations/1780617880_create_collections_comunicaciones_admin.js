/// <reference path="../pb_data/types.d.ts" />
// Fase 0 — colecciones de comunicaciones internas + administración:
//   anuncios                    publicación 1→N a sección/curso/institucional
//   respuestas_anuncio          comentarios (foro ligero)
//   threads_mensajes            hilo 1-a-1
//   mensajes_internos           mensaje individual
//   thread_lecturas             tracking leído por participante
//   notificaciones              in-app + pipeline email
//   rate_limits_comunicacion    antispam server-side
//   pagos                       cuotas (matrícula + mensualidades)
//   documentos                  PDFs académicos/legales del alumno
//   audit_log                   accesos sensibles auditados
migrate((app) => {
  const usersId = app.findCollectionByNameOrId("users").id;
  const cursosId = app.findCollectionByNameOrId("cursos").id;
  const seccionesId = app.findCollectionByNameOrId("secciones_curso").id;
  const matriculasId = app.findCollectionByNameOrId("matriculas_seccion").id;

  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";
  const authOnly = "@request.auth.id != ''";
  const profesorOrAdmin = "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'";
  const administrativoOrAdmin = "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo'";

  const saveCol = (config) => {
    try { app.findCollectionByNameOrId(config.name); console.log("[1780617880] skip " + config.name); return; } catch (_e) {}
    app.save(new Collection(config));
  };

  // -- anuncios -------------------------------------------------------------
  saveCol({
    name: "anuncios",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: profesorOrAdmin + " || @request.auth.roles ~ 'administrativo'",
    updateRule: "@request.auth.id = autor_id || " + adminOnly,
    deleteRule: "@request.auth.id = autor_id || " + adminOnly,
    fields: [
      { name: "autor_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "scope", type: "select", required: true, maxSelect: 1, values: ["seccion", "curso", "institucional", "personal"] },
      { name: "seccion_id", type: "relation", required: false, collectionId: seccionesId, cascadeDelete: false, maxSelect: 1 },
      { name: "curso_id", type: "relation", required: false, collectionId: cursosId, cascadeDelete: false, maxSelect: 1 },
      { name: "destinatarios_ids", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 200 },
      { name: "audiencia_filtro", type: "json", required: false, maxSize: 2048 },
      { name: "titulo", type: "text", required: true, max: 200 },
      { name: "contenido_html", type: "editor", required: false, maxSize: 50000 },
      { name: "categoria", type: "select", required: false, maxSelect: 1, values: ["general", "academica", "evento", "advertencia", "felicitacion", "feriado"] },
      { name: "pinned", type: "bool", required: false },
      { name: "importante", type: "bool", required: false },
      { name: "archivos_adjuntos", type: "file", required: false, maxSelect: 5, maxSize: 10485760 },
      { name: "permite_respuestas", type: "bool", required: false },
      { name: "publicado_at", type: "date", required: false },
      { name: "expira_at", type: "date", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_anuncios_scope ON anuncios (scope, publicado_at)"],
  });

  const anunciosId = app.findCollectionByNameOrId("anuncios").id;

  // -- respuestas_anuncio ---------------------------------------------------
  saveCol({
    name: "respuestas_anuncio",
    type: "base",
    listRule: authOnly,
    viewRule: authOnly,
    createRule: authOnly,
    updateRule: "@request.auth.id = autor_id || " + adminOnly,
    deleteRule: "@request.auth.id = autor_id || " + adminOnly,
    fields: [
      { name: "anuncio_id", type: "relation", required: true, collectionId: anunciosId, cascadeDelete: true, maxSelect: 1 },
      { name: "autor_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "contenido", type: "text", required: true, max: 3000 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  // -- threads_mensajes -----------------------------------------------------
  saveCol({
    name: "threads_mensajes",
    type: "base",
    listRule: "@request.auth.id != '' && participantes_ids ~ @request.auth.id",
    viewRule: "@request.auth.id != '' && participantes_ids ~ @request.auth.id",
    createRule: authOnly,
    updateRule: "participantes_ids ~ @request.auth.id || " + adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "participantes_ids", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 10 },
      { name: "asunto", type: "text", required: false, max: 200 },
      { name: "ultima_actividad", type: "date", required: false },
      { name: "mensajes_no_leidos_por_user", type: "json", required: false, maxSize: 4096 },
      { name: "archivado_por_ids", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 10 },
      { name: "flagged", type: "bool", required: false },
      { name: "flagged_por_ids", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 10 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  const threadsId = app.findCollectionByNameOrId("threads_mensajes").id;

  // -- mensajes_internos ----------------------------------------------------
  saveCol({
    name: "mensajes_internos",
    type: "base",
    listRule: "@request.auth.id != '' && @collection.threads_mensajes.id ?= thread_id && @collection.threads_mensajes.participantes_ids ?~ @request.auth.id",
    viewRule: "@request.auth.id != '' && @collection.threads_mensajes.id ?= thread_id && @collection.threads_mensajes.participantes_ids ?~ @request.auth.id",
    createRule: "@request.auth.id = autor_id && @collection.threads_mensajes.id ?= thread_id && @collection.threads_mensajes.participantes_ids ?~ @request.auth.id",
    updateRule: "@request.auth.id = autor_id || " + adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "thread_id", type: "relation", required: true, collectionId: threadsId, cascadeDelete: true, maxSelect: 1 },
      { name: "autor_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "contenido", type: "text", required: true, max: 5000 },
      { name: "archivos", type: "file", required: false, maxSelect: 5, maxSize: 10485760 },
      { name: "leido_por_ids", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 10 },
      { name: "flagged", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_msg_thread_created ON mensajes_internos (thread_id, created)"],
  });

  // -- thread_lecturas ------------------------------------------------------
  saveCol({
    name: "thread_lecturas",
    type: "base",
    listRule: "@request.auth.id = user_id || " + adminOnly,
    viewRule: "@request.auth.id = user_id || " + adminOnly,
    createRule: "@request.auth.id = user_id",
    updateRule: "@request.auth.id = user_id",
    deleteRule: adminOnly,
    fields: [
      { name: "thread_id", type: "relation", required: true, collectionId: threadsId, cascadeDelete: true, maxSelect: 1 },
      { name: "user_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
      { name: "ultimo_leido_at", type: "date", required: false },
      { name: "ultimo_mensaje_id", type: "text", required: false, max: 32 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_thread_lectura_user ON thread_lecturas (thread_id, user_id)"],
  });

  // -- notificaciones -------------------------------------------------------
  saveCol({
    name: "notificaciones",
    type: "base",
    listRule: "@request.auth.id = user_id || " + adminOnly,
    viewRule: "@request.auth.id = user_id || " + adminOnly,
    createRule: adminOnly,
    updateRule: "@request.auth.id = user_id || " + adminOnly,
    deleteRule: "@request.auth.id = user_id || " + adminOnly,
    fields: [
      { name: "user_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
      { name: "tipo", type: "select", required: true, maxSelect: 1, values: [
        "tarea_calificada", "tarea_devuelta", "nota_publicada", "evaluacion_anulada",
        "clase_proxima", "clase_reagendada", "clase_cancelada", "grabacion_disponible",
        "anuncio_nuevo", "anuncio_importante",
        "mensaje_nuevo", "mensaje_admin",
        "cuota_proxima", "cuota_vencida", "pago_registrado",
        "justificacion_aprobada", "justificacion_rechazada",
        "inasistencias_seguidas", "alerta_75pct",
        "matricula_confirmada", "matricula_pendiente",
        "solicitud_revision_resuelta",
      ] },
      { name: "canal", type: "select", required: false, maxSelect: 3, values: ["in_app", "email", "push"] },
      { name: "titulo", type: "text", required: true, max: 200 },
      { name: "cuerpo", type: "text", required: false, max: 2000 },
      { name: "link_destino", type: "text", required: false, max: 300 },
      { name: "payload", type: "json", required: false, maxSize: 4096 },
      { name: "agrupacion_key", type: "text", required: false, max: 100 },
      { name: "leida", type: "bool", required: false },
      { name: "fecha_leida", type: "date", required: false },
      { name: "email_enviado", type: "bool", required: false },
      { name: "email_enviado_at", type: "date", required: false },
      { name: "email_error", type: "text", required: false, max: 500 },
      { name: "expira_en", type: "date", required: false },
      { name: "urgente", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_notif_user_leida ON notificaciones (user_id, leida, created)",
      "CREATE INDEX idx_notif_agrupacion ON notificaciones (user_id, agrupacion_key)",
      "CREATE INDEX idx_notif_email_queue ON notificaciones (email_enviado, created)",
    ],
  });

  // -- rate_limits_comunicacion --------------------------------------------
  saveCol({
    name: "rate_limits_comunicacion",
    type: "base",
    listRule: adminOnly,
    viewRule: adminOnly,
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "user_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
      { name: "scope", type: "text", required: true, max: 100 },
      { name: "ventana_inicio", type: "date", required: true },
      { name: "contador", type: "number", required: true, onlyInt: true, min: 0 },
      { name: "limite", type: "number", required: false, onlyInt: true },
      { name: "ultimo_evento_at", type: "date", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_rate_user_scope ON rate_limits_comunicacion (user_id, scope, ventana_inicio)"],
  });

  // -- pagos ----------------------------------------------------------------
  saveCol({
    name: "pagos",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    createRule: administrativoOrAdmin,
    updateRule: administrativoOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "apoderado_id", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "matricula_id", type: "relation", required: false, collectionId: matriculasId, cascadeDelete: false, maxSelect: 1 },
      { name: "concepto", type: "select", required: true, maxSelect: 1, values: ["matricula", "mensualidad", "extra", "ajuste", "credito"] },
      { name: "periodo", type: "text", required: false, max: 20 },
      { name: "monto", type: "number", required: true, min: 0 },
      { name: "moneda", type: "text", required: false, max: 6 },
      { name: "fecha_emision", type: "date", required: false },
      { name: "fecha_vencimiento", type: "date", required: false },
      { name: "fecha_pago", type: "date", required: false },
      { name: "estado", type: "select", required: true, maxSelect: 1, values: ["pendiente", "pagado", "vencido", "condonado", "anulado", "en_revision"] },
      { name: "metodo", type: "select", required: false, maxSelect: 1, values: ["efectivo", "transferencia", "webpay", "khipu", "otro"] },
      { name: "comprobante_url", type: "url", required: false },
      { name: "comprobante_archivo", type: "file", required: false, maxSelect: 1, maxSize: 10485760 },
      { name: "boleta_pdf", type: "file", required: false, maxSelect: 1, maxSize: 10485760 },
      { name: "notas_internas", type: "text", required: false, max: 1000 },
      { name: "registrado_por", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_pagos_alumno_estado ON pagos (alumno_id, estado)",
      "CREATE INDEX idx_pagos_vencimiento ON pagos (fecha_vencimiento, estado)",
    ],
  });

  // -- documentos -----------------------------------------------------------
  saveCol({
    name: "documentos",
    type: "base",
    listRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    viewRule: "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'administrativo' || @request.auth.id = alumno_id || @collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= alumno_id",
    createRule: administrativoOrAdmin,
    updateRule: administrativoOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "tipo", type: "select", required: true, maxSelect: 1, values: ["matricula", "contrato", "certificado_alumno_regular", "certificado_notas", "carnet_identidad", "rendimiento_2do_medio", "otro"] },
      { name: "titulo", type: "text", required: false, max: 200 },
      { name: "archivo", type: "file", required: true, maxSelect: 1, maxSize: 20971520 },
      { name: "fecha_subida", type: "date", required: false },
      { name: "vigente", type: "bool", required: false },
      { name: "subido_por", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  });

  // -- audit_log ------------------------------------------------------------
  saveCol({
    name: "audit_log",
    type: "base",
    listRule: adminOnly,
    viewRule: adminOnly,
    createRule: adminOnly, // los hooks server-side hacen el insert con superuser context
    updateRule: null, // append-only
    deleteRule: null,
    fields: [
      { name: "actor_id", type: "relation", required: false, collectionId: usersId, cascadeDelete: false, maxSelect: 1 },
      { name: "actor_rol_activo", type: "text", required: false, max: 32 },
      { name: "accion", type: "text", required: true, max: 100 },
      { name: "recurso_coleccion", type: "text", required: false, max: 64 },
      { name: "recurso_id", type: "text", required: false, max: 32 },
      { name: "motivo", type: "text", required: false, max: 1000 },
      { name: "payload", type: "json", required: false, maxSize: 8192 },
      { name: "ip", type: "text", required: false, max: 64 },
      { name: "user_agent", type: "text", required: false, max: 300 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE INDEX idx_audit_actor_fecha ON audit_log (actor_id, created)",
      "CREATE INDEX idx_audit_accion ON audit_log (accion, created)",
      "CREATE INDEX idx_audit_recurso ON audit_log (recurso_coleccion, recurso_id)",
    ],
  });

}, (app) => {
  for (const name of ["audit_log", "documentos", "pagos", "rate_limits_comunicacion", "notificaciones", "thread_lecturas", "mensajes_internos", "threads_mensajes", "respuestas_anuncio", "anuncios"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_e) {}
  }
});
