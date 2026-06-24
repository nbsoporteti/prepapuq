/// <reference path="../pb_data/types.d.ts" />
// Fase 1 — colecciones de contenido público para la landing:
//   profesores_publicos    cards de "Conocé al equipo docente"
//   testimonios_publicos   carrusel "Nuestros exalumnos"
//   resultados_paes        números reales de promociones (counters)
//
// Reglas: list/view PÚBLICOS (sin auth), CUD solo admin.
// El admin las edita desde el panel de PB.
migrate((app) => {
  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";

  const saveCol = (config) => {
    try { app.findCollectionByNameOrId(config.name); console.log("[1781000000] skip " + config.name); return; } catch (_e) {}
    app.save(new Collection(config));
  };

  // -- profesores_publicos --------------------------------------------------
  saveCol({
    name: "profesores_publicos",
    type: "base",
    listRule: "activo = true",
    viewRule: "activo = true",
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "nombre", type: "text", required: true, max: 80 },
      { name: "apellido", type: "text", required: true, max: 80 },
      { name: "materia", type: "select", required: false, maxSelect: 1, values: [
        "matematica_m1",
        "matematica_m2",
        "competencia_lectora",
        "ciencias",
        "historia",
        "ingles",
        "otra",
      ] },
      { name: "foto", type: "file", required: false, maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: ["200x200", "400x400"] },
      { name: "universidad", type: "text", required: false, max: 200 },
      { name: "titulo", type: "text", required: false, max: 200 },
      { name: "magister", type: "text", required: false, max: 200 },
      { name: "frase", type: "text", required: false, max: 300 },
      { name: "cv_completo_markdown", type: "editor", required: false, maxSize: 20000 },
      { name: "anios_experiencia", type: "number", required: false, onlyInt: true, min: 0, max: 80 },
      { name: "orden", type: "number", required: false, onlyInt: true },
      { name: "activo", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_prof_pub_orden ON profesores_publicos (orden)"],
  });

  // -- testimonios_publicos -------------------------------------------------
  saveCol({
    name: "testimonios_publicos",
    type: "base",
    listRule: "activo = true",
    viewRule: "activo = true",
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "nombre_alumno", type: "text", required: true, max: 100 },
      { name: "foto", type: "file", required: false, maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"], thumbs: ["200x200"] },
      { name: "promocion_anio", type: "number", required: false, onlyInt: true, min: 2000, max: 2099 },
      { name: "cita", type: "text", required: true, max: 400 },
      { name: "carrera", type: "text", required: false, max: 120 },
      { name: "universidad", type: "text", required: false, max: 120 },
      { name: "puntaje_paes_obtenido", type: "number", required: false, min: 100, max: 1000 },
      { name: "destacado", type: "bool", required: false },
      { name: "orden", type: "number", required: false, onlyInt: true },
      { name: "activo", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_test_pub_orden ON testimonios_publicos (orden)"],
  });

  // -- resultados_paes ------------------------------------------------------
  saveCol({
    name: "resultados_paes",
    type: "base",
    listRule: "publicado = true",
    viewRule: "publicado = true",
    createRule: adminOnly,
    updateRule: adminOnly,
    deleteRule: adminOnly,
    fields: [
      { name: "anio_promocion", type: "number", required: true, onlyInt: true, min: 2000, max: 2099 },
      { name: "n_alumnos", type: "number", required: false, onlyInt: true, min: 0 },
      { name: "pct_ingreso_carrera_elegida", type: "number", required: false, min: 0, max: 100 },
      { name: "puntaje_promedio_general", type: "number", required: false, min: 100, max: 1000 },
      { name: "puntaje_promedio_m1", type: "number", required: false, min: 100, max: 1000 },
      { name: "puntaje_promedio_m2", type: "number", required: false, min: 100, max: 1000 },
      { name: "puntaje_promedio_competencia_lectora", type: "number", required: false, min: 100, max: 1000 },
      { name: "mejora_promedio_pts", type: "number", required: false, min: 0, max: 500 },
      { name: "data_simulacros_mensuales", type: "json", required: false, maxSize: 8192 },
      { name: "destacado_publico", type: "text", required: false, max: 400 },
      { name: "publicado", type: "bool", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_res_paes_anio ON resultados_paes (anio_promocion)"],
  });

}, (app) => {
  for (const name of ["resultados_paes", "testimonios_publicos", "profesores_publicos"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_e) {}
  }
});
