/// <reference path="../pb_data/types.d.ts" />
// PAES interactiva — preguntas dentro del sistema.
//
// Hasta ahora un simulacro era solo metadata + un PDF para leer aparte (modo
// "hoja de respuestas"). Esta migración agrega el modo INTERACTIVO: las
// preguntas viven en la base de datos, el alumno las responde en pantalla y el
// puntaje se calcula automáticamente reutilizando el hook server-side ya
// existente (simulacros_paes.pb.js), que deriva las correctas desde
// `clave_respuestas_json`.
//
// IMPORTANTE (legal): el contenido interactivo son preguntas ORIGINALES de
// PrePa (estilo PAES), NO transcripciones de los ensayos oficiales DEMRE —
// esos PDFs prohíben expresamente su reproducción. Los PDF oficiales quedan
// solo como descarga en la Biblioteca.
//
// Cambios:
//   simulacros_paes:
//     + modo  ("pdf" | "interactivo"). Los 8 simulacros-PDF existentes pasan a
//             modo "pdf" y estado "archivado" (salen de la lista de "rendir",
//             pero siguen disponibles para descarga en la Biblioteca).
//
//   preguntas_paes  (colección nueva):
//     simulacro_id, numero, eje, contexto (texto base compartido, opcional),
//     enunciado, alternativas_json ([{letra,texto}]), respuesta_correcta,
//     explicacion.
migrate((app) => {
  const authOnly = "@request.auth.id != ''";
  const profesorOrAdmin = "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'";
  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";

  // ---- simulacros_paes: + modo -------------------------------------------
  const sim = app.findCollectionByNameOrId("simulacros_paes");
  if (!sim.fields.getByName("modo")) {
    sim.fields.add(new SelectField({
      name: "modo",
      required: false,
      maxSelect: 1,
      values: ["pdf", "interactivo"],
    }));
    app.save(sim);
  }

  // Los simulacros-PDF ya publicados pasan a modo "pdf" y se archivan para que
  // no aparezcan en la lista de "Simulacros para rendir" (la UX que el usuario
  // descartó). Siguen como descarga en la Biblioteca (lista estática del front).
  try {
    const pdfSims = app.findRecordsByFilter(
      "simulacros_paes",
      "pdf_url != '' && estado = 'publicado'",
      "",
      200,
      0,
    );
    for (const s of pdfSims) {
      s.set("modo", "pdf");
      s.set("estado", "archivado");
      app.save(s);
    }
  } catch (_e) {}

  // ---- preguntas_paes (nueva) --------------------------------------------
  const simulacrosId = app.findCollectionByNameOrId("simulacros_paes").id;
  try {
    app.findCollectionByNameOrId("preguntas_paes");
  } catch (_e) {
    app.save(new Collection({
      name: "preguntas_paes",
      type: "base",
      // Cualquier autenticado puede leerlas para rendir. El puntaje lo calcula
      // el servidor desde la clave del simulacro; ver nota de hardening en docs.
      listRule: authOnly,
      viewRule: authOnly,
      createRule: profesorOrAdmin,
      updateRule: profesorOrAdmin,
      deleteRule: adminOnly,
      fields: [
        { name: "simulacro_id", type: "relation", required: true, collectionId: simulacrosId, cascadeDelete: true, maxSelect: 1 },
        { name: "numero", type: "number", required: true, onlyInt: true, min: 1, max: 300 },
        { name: "eje", type: "text", required: false, max: 120 },
        { name: "contexto", type: "text", required: false, max: 8000 },
        { name: "enunciado", type: "text", required: true, max: 4000 },
        { name: "alternativas_json", type: "json", required: true, maxSize: 8192 },
        { name: "respuesta_correcta", type: "select", required: true, maxSelect: 1, values: ["A", "B", "C", "D", "E"] },
        { name: "explicacion", type: "text", required: false, max: 3000 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_preguntas_sim_num ON preguntas_paes (simulacro_id, numero)"],
    }));
  }
}, (app) => {
  // Down: borrar preguntas_paes, quitar `modo`, des-archivar los PDF.
  try { app.delete(app.findCollectionByNameOrId("preguntas_paes")); } catch (_e) {}
  try {
    const sim = app.findCollectionByNameOrId("simulacros_paes");
    try {
      const archived = app.findRecordsByFilter("simulacros_paes", "pdf_url != '' && estado = 'archivado'", "", 200, 0);
      for (const s of archived) { s.set("estado", "publicado"); app.save(s); }
    } catch (_e) {}
    if (sim.fields.getByName("modo")) { sim.fields.removeByName("modo"); app.save(sim); }
  } catch (_e) {}
});
