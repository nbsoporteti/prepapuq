/// <reference path="../pb_data/types.d.ts" />
// Al crear un curso nuevo, replica 4 categorías de evaluación por default:
//   Controles 30% · Tareas 15% · Simulacros 40% · Participación 15%
// El profesor luego puede ajustar ponderaciones por sección.
onRecordCreate((e) => {
  e.next();

  const curso = e.record;
  const cursoId = curso.id;
  if (!cursoId) return;

  try {
    const catCol = $app.findCollectionByNameOrId("categorias_evaluacion");
    if (!catCol) return;

    // Idempotencia: si ya existe una categoría para este curso, no crear nada.
    try {
      const existing = $app.findFirstRecordByFilter(
        "categorias_evaluacion",
        "curso_id = {:c}",
        { c: cursoId },
      );
      if (existing) return;
    } catch (_e) {}

    const defaults = [
      { nombre: "Controles", ponderacion_pct: 30, tipo_default: "control", orden: 1 },
      { nombre: "Tareas", ponderacion_pct: 15, tipo_default: "tarea", orden: 2 },
      { nombre: "Simulacros PAES", ponderacion_pct: 40, tipo_default: "simulacro_paes", orden: 3 },
      { nombre: "Participación", ponderacion_pct: 15, tipo_default: "participacion", orden: 4 },
    ];

    for (const c of defaults) {
      const rec = new Record(catCol);
      rec.set("curso_id", cursoId);
      rec.set("nombre", c.nombre);
      rec.set("ponderacion_pct", c.ponderacion_pct);
      rec.set("tipo_default", c.tipo_default);
      rec.set("orden", c.orden);
      try { $app.saveNoValidate(rec); } catch (err) { console.log("[categorias_eval_seeder] err " + c.nombre + ": " + err.message); }
    }
  } catch (err) {
    console.log("[categorias_eval_seeder] fallo: " + (err && err.message));
  }
}, "cursos");
