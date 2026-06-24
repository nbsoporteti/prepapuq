/// <reference path="../pb_data/types.d.ts" />
// Al guardar un resultado_simulacro_paes, calcula puntaje y percentil
// interno usando la tabla de conversión del simulacro y los resultados
// de la misma promoción.
//
// Estrategia:
//   - Si respuestas_correctas está seteado y existe tabla_conversion_json,
//     convierte a puntaje usando la tabla.
//   - Recalcula percentil interno comparando contra los otros resultados
//     ya rendidos del mismo simulacro_id.

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

const procesar = (r) => {
  try {
    const simulacroId = r.get("simulacro_id");
    if (!simulacroId) return;

    // 1. Convertir correctas → puntaje si falta
    let puntaje = r.get("puntaje");
    const correctas = r.get("respuestas_correctas");

    if ((!puntaje || puntaje === 0) && typeof correctas === "number") {
      try {
        const simulacro = $app.findRecordById("simulacros_paes", simulacroId);
        const tablaRaw = simulacro && simulacro.get("tabla_conversion_json");
        const tabla = Array.isArray(tablaRaw) ? tablaRaw : (typeof tablaRaw === "string" && tablaRaw ? JSON.parse(tablaRaw) : null);
        if (tabla) {
          puntaje = interpolarPuntaje(correctas, tabla);
          if (puntaje !== null) {
            r.set("puntaje", puntaje);
          }
        }
      } catch (_e) {}
    }

    // 2. Recalcular percentil contra los otros resultados del mismo simulacro
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
