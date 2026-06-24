/// <reference path="../pb_data/types.d.ts" />
// Seed de contenido — 8 simulacros PAES enlazados a los ensayos oficiales de
// /biblioteca. Cada simulacro trae:
//   - metadata (asignatura, nº de preguntas, duración del cronómetro)
//   - tabla_conversion_json REFERENCIAL (puntaje 100–1000). No es la tabla
//     oficial DEMRE de este ensayo (que no se publica por ensayo); sirve para
//     dar una proyección una vez cargada la clave.
//   - pdf_url al ensayo en /biblioteca.
//
// NO se siembra clave_respuestas_json: DEMRE no ha publicado el clavijero de
// estos ensayos y sus PDFs prohíben reproducir las preguntas. Mientras la clave
// esté vacía, el simulacro corre en "modo práctica" (el alumno marca y registra
// su intento, el puntaje queda pendiente). Cuando el equipo cargue la clave
// oficial desde el panel admin, el hook re-corrige los intentos automáticamente.
//
// Idempotente: upsert por `titulo`. Nunca toca `clave_respuestas_json` para no
// pisar una clave cargada a mano.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("simulacros_paes");

  // Tabla de conversión referencial keyed al nº de preguntas puntuadas (g).
  const tablaRef = (g) => ([
    { correctas: 0, puntaje: 100 },
    { correctas: Math.round(g * 0.25), puntaje: 400 },
    { correctas: Math.round(g * 0.5), puntaje: 600 },
    { correctas: Math.round(g * 0.75), puntaje: 780 },
    { correctas: Math.round(g * 0.9), puntaje: 880 },
    { correctas: g, puntaje: 1000 },
  ]);

  const simulacros = [
    {
      titulo: "Ensayo PAES — Competencia Lectora 2027",
      asignatura: "competencia_lectora",
      n_total: 65, g: 60, duracion: 150,
      pdf: "/biblioteca/ensayo-competencia-lectora-2027.pdf",
      descripcion: "Ensayo oficial de Competencia Lectora: 65 preguntas (60 puntuadas + 5 de piloto), 2 h 30 min. Lee los textos del PDF y marca tus respuestas en la hoja interactiva.",
    },
    {
      titulo: "Ensayo PAES — Matemática M1 2027",
      asignatura: "matematica_m1",
      n_total: 65, g: 60, duracion: 140,
      pdf: "/biblioteca/ensayo-matematica-m1-2027.pdf",
      descripcion: "Ensayo oficial de Matemática M1 (obligatoria): 65 preguntas (60 puntuadas + 5 de piloto), 2 h 20 min. Números, álgebra, geometría y probabilidad.",
    },
    {
      titulo: "Ensayo PAES — Matemática M2 2027",
      asignatura: "matematica_m2",
      n_total: 55, g: 50, duracion: 140,
      pdf: "/biblioteca/ensayo-matematica-m2-2027.pdf",
      descripcion: "Ensayo oficial de Matemática M2 (electiva): 55 preguntas (50 puntuadas + 5 de piloto), 2 h 20 min. Para carreras que exigen M2.",
    },
    {
      titulo: "Ensayo PAES — Historia y Cs. Sociales 2027",
      asignatura: "historia",
      n_total: 65, g: 60, duracion: 120,
      pdf: "/biblioteca/ensayo-historia-2027.pdf",
      descripcion: "Ensayo oficial de Historia y Ciencias Sociales: 65 preguntas (60 puntuadas + 5 de piloto), 2 h. Formación ciudadana, historia y economía.",
    },
    {
      titulo: "Ensayo PAES — Ciencias (Módulo Común) 2027",
      asignatura: "ciencias",
      n_total: 80, g: 75, duracion: 160,
      pdf: "/biblioteca/ensayo-ciencias-comun-tp-2027.pdf",
      descripcion: "Ensayo oficial de Ciencias, módulo común + Técnico Profesional: 80 preguntas (75 puntuadas + 5 de piloto), 2 h 40 min.",
    },
    {
      titulo: "Ensayo PAES — Ciencias Física 2027",
      asignatura: "ciencias",
      n_total: 80, g: 75, duracion: 160,
      pdf: "/biblioteca/ensayo-ciencias-fisica-2027.pdf",
      descripcion: "Ensayo oficial de Ciencias con electivo de Física: 80 preguntas (75 puntuadas + 5 de piloto), 2 h 40 min. Módulo común + 26 preguntas de Física.",
    },
    {
      titulo: "Ensayo PAES — Ciencias Química 2027",
      asignatura: "ciencias",
      n_total: 80, g: 75, duracion: 160,
      pdf: "/biblioteca/ensayo-ciencias-quimica-2027.pdf",
      descripcion: "Ensayo oficial de Ciencias con electivo de Química: 80 preguntas (75 puntuadas + 5 de piloto), 2 h 40 min. Módulo común + 26 preguntas de Química.",
    },
    {
      titulo: "Ensayo PAES — Ciencias Biología 2027",
      asignatura: "ciencias",
      n_total: 80, g: 75, duracion: 160,
      pdf: "/biblioteca/ensayo-ciencias-biologia-2027.pdf",
      descripcion: "Ensayo oficial de Ciencias con electivo de Biología: 80 preguntas (75 puntuadas + 5 de piloto), 2 h 40 min. Módulo común + 26 preguntas de Biología.",
    },
  ];

  for (const s of simulacros) {
    let rec;
    try {
      rec = app.findFirstRecordByFilter("simulacros_paes", "titulo = {:t}", { t: s.titulo });
    } catch (_e) {
      rec = new Record(collection);
    }
    rec.set("titulo", s.titulo);
    rec.set("asignatura", s.asignatura);
    rec.set("fecha", "2027-06-21 12:00:00.000Z");
    rec.set("n_preguntas_total", s.n_total);
    rec.set("tabla_conversion_json", tablaRef(s.g));
    rec.set("puntaje_max_chile", 1000);
    rec.set("descripcion", s.descripcion);
    rec.set("pdf_url", s.pdf);
    rec.set("duracion_min", s.duracion);
    rec.set("estado", "publicado");
    // OJO: nunca seteamos clave_respuestas_json acá (modo práctica por defecto).
    app.save(rec);
  }
}, (app) => {
  const titulos = [
    "Ensayo PAES — Competencia Lectora 2027",
    "Ensayo PAES — Matemática M1 2027",
    "Ensayo PAES — Matemática M2 2027",
    "Ensayo PAES — Historia y Cs. Sociales 2027",
    "Ensayo PAES — Ciencias (Módulo Común) 2027",
    "Ensayo PAES — Ciencias Física 2027",
    "Ensayo PAES — Ciencias Química 2027",
    "Ensayo PAES — Ciencias Biología 2027",
  ];
  for (const t of titulos) {
    try {
      const rec = app.findFirstRecordByFilter("simulacros_paes", "titulo = {:t}", { t });
      app.delete(rec);
    } catch (_e) {}
  }
});
