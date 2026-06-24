/// <reference path="../pb_data/types.d.ts" />
// Scoring de simulacros PAES — server-side y anti-trampa.
//
// Al guardar un resultado_simulacro_paes:
//   1. Si el simulacro tiene clave_respuestas_json y el alumno envió
//      respuestas_alumno_json, el servidor DERIVA respuestas_correctas
//      comparando respuesta vs clave (ignora lo que mande el cliente). Las
//      posiciones con clave null/"" son preguntas piloto y no puntúan.
//   2. Convierte correctas → puntaje con la tabla_conversion_json del simulacro.
//   3. Recalcula el percentil interno contra los otros resultados del mismo
//      simulacro.
//
// Si el simulacro aún no tiene clave (modo práctica: DEMRE no ha publicado el
// clavijero), el intento se guarda igual con sus respuestas pero sin puntaje.
// Cuando un admin carga la clave más tarde, el hook onRecordAfterUpdateSuccess
// re-corrige todos los resultados de ese simulacro automáticamente.

const parseJson = (raw) => {
  if (raw === null || raw === undefined || raw === "") return null;
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch (_e) {}
  if (typeof raw === "object") return raw;
  return null;
};

const interpolarPuntaje = (correctas, tabla) => {
  if (!Array.isArray(tabla) || tabla.length === 0) return null;
  // tabla: [{ correctas: N, puntaje: P }, ...] ordenada por correctas asc
  const sorted = [...tabla].sort((a, b) => a.correctas - b.correctas);
  if (correctas <= sorted[0].correctas) return sorted[0].puntaje;
  if (correctas >= sorted[sorted.length - 1].correctas) return sorted[sorted.length - 1].puntaje;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (correctas >= sorted[i].correctas && correctas <= sorted[i + 1].correctas) {
      const t = (correctas - sorted[i].correctas) / (sorted[i + 1].correctas - sorted[i].correctas);
      return Math.round(sorted[i].puntaje + t * (sorted[i + 1].puntaje - sorted[i].puntaje));
    }
  }
  return null;
};

const calcularPercentil = (puntajePropio, todosLosPuntajes) => {
  if (!puntajePropio || todosLosPuntajes.length === 0) return null;
  const debajo = todosLosPuntajes.filter((p) => p < puntajePropio).length;
  const iguales = todosLosPuntajes.filter((p) => p === puntajePropio).length;
  const total = todosLosPuntajes.length;
  // Percentile (averaged for ties): (#below + 0.5 * #equal) / total * 100
  return Math.round(((debajo + 0.5 * iguales) / total) * 100);
};

// Cuenta aciertos del alumno contra la clave. Posiciones con clave null/"" son
// preguntas piloto y no entran en el conteo. Devuelve null si la clave no tiene
// ninguna respuesta válida (no se puede corregir).
const contarCorrectas = (alumno, clave) => {
  if (!Array.isArray(alumno) || !Array.isArray(clave)) return null;
  let correctas = 0;
  let huboClave = false;
  for (let i = 0; i < clave.length; i++) {
    const c = clave[i];
    if (typeof c !== "string" || !c) continue; // piloto / sin clave → no cuenta
    huboClave = true;
    if (i < alumno.length && typeof alumno[i] === "string" &&
        alumno[i].toUpperCase() === c.toUpperCase()) {
      correctas++;
    }
  }
  return huboClave ? correctas : null;
};

const procesar = (r) => {
  try {
    const simulacroId = r.get("simulacro_id");
    if (!simulacroId) return;

    let simulacro = null;
    try { simulacro = $app.findRecordById("simulacros_paes", simulacroId); } catch (_e) {}

    // 1. Anti-trampa: derivar correctas desde clave + respuestas del alumno.
    let correctas = r.get("respuestas_correctas");
    let claveDerivada = false;
    if (simulacro) {
      const clave = parseJson(simulacro.get("clave_respuestas_json"));
      const alumno = parseJson(r.get("respuestas_alumno_json"));
      if (Array.isArray(clave) && clave.length > 0 && Array.isArray(alumno)) {
        const c = contarCorrectas(alumno, clave);
        if (c !== null) {
          correctas = c;
          r.set("respuestas_correctas", c);
          claveDerivada = true;
        }
      }
    }

    // 2. Convertir correctas → puntaje. Si derivamos de la clave recalculamos
    //    siempre; si no, solo cuando falta el puntaje (compat con carga manual).
    let puntaje = r.get("puntaje");
    if (simulacro && typeof correctas === "number" && (claveDerivada || !puntaje || puntaje === 0)) {
      const tabla = parseJson(simulacro.get("tabla_conversion_json"));
      if (Array.isArray(tabla) && tabla.length > 0) {
        const p = interpolarPuntaje(correctas, tabla);
        if (p !== null) { puntaje = p; r.set("puntaje", p); }
      }
    }

    // 3. Percentil interno vs los otros resultados del mismo simulacro.
    if (puntaje && puntaje > 0) {
      try {
        const todos = $app.findRecordsByFilter(
          "resultados_simulacro_paes",
          "simulacro_id = {:s} && puntaje > 0",
          "",
          1000,
          0,
          { s: simulacroId },
        );
        const puntajes = todos.map((x) => x.get("puntaje")).filter((p) => typeof p === "number" && p > 0);
        // Asegurar que el propio puntaje esté incluido
        if (!puntajes.includes(puntaje)) puntajes.push(puntaje);
        const pct = calcularPercentil(puntaje, puntajes);
        if (pct !== null) {
          r.set("percentil_interno", pct);
        }
      } catch (_e) {}
    }
  } catch (err) {
    console.log("[simulacros_paes] err: " + (err && err.message));
  }
};

onRecordCreate((e) => {
  procesar(e.record);
  e.next();
}, "resultados_simulacro_paes");

onRecordUpdate((e) => {
  procesar(e.record);
  e.next();
}, "resultados_simulacro_paes");

// Cuando un admin carga/edita la clave de un simulacro, re-corregir todos sus
// resultados ya rendidos (la clave ya está commiteada en este punto, así que
// procesar() la lee fresca al re-guardar cada resultado).
onRecordAfterUpdateSuccess((e) => {
  try {
    const sim = e.record;
    const clave = parseJson(sim.get("clave_respuestas_json"));
    if (Array.isArray(clave) && clave.length > 0) {
      const resultados = $app.findRecordsByFilter(
        "resultados_simulacro_paes",
        "simulacro_id = {:s}",
        "",
        2000,
        0,
        { s: sim.id },
      );
      for (const res of resultados) {
        try { $app.save(res); } catch (_e) {}
      }
    }
  } catch (err) {
    console.log("[simulacros_paes] regrade err: " + (err && err.message));
  }
  e.next();
}, "simulacros_paes");
