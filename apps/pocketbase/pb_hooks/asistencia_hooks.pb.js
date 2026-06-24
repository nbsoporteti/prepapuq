/// <reference path="../pb_data/types.d.ts" />
// Cuando se actualiza la asistencia de un alumno, recalcula la cache del
// contador de asistentes en la clase y dispara alertas si el alumno acumula
// inasistencias por debajo del 75% (umbral default).
//
// La notificación se inserta en `notificaciones` (canal in_app + email)
// dirigida a TODOS los apoderados vinculados al alumno via parent_student.

const UMBRAL_ALERTA_PCT = 75;
const MIN_CLASES_PARA_ALERTAR = 4;

const recalcCacheAsistentes = function (claseId) {
  try {
    const presentes = $app.findRecordsByFilter(
      "asistencia_clase_vivo",
      "clase_vivo_id = {:c} && (estado = 'presente' || estado = 'tardanza')",
      "",
      500,
      0,
      { c: claseId },
    );
    const clase = $app.findRecordById("clases_vivo", claseId);
    if (clase) {
      clase.set("numero_asistentes_cache", presentes.length);
      $app.saveNoValidate(clase);
    }
  } catch (_e) {}
};

const calcPctYAlertar = function (alumnoId) {
  try {
    const total = $app.findRecordsByFilter(
      "asistencia_clase_vivo",
      "alumno_id = {:a}",
      "",
      500,
      0,
      { a: alumnoId },
    );
    if (total.length < MIN_CLASES_PARA_ALERTAR) return;

    const presentes = total.filter((r) => {
      const e = r.get("estado");
      return e === "presente" || e === "tardanza" || e === "justificado";
    });
    const pct = Math.round((presentes.length / total.length) * 100);
    if (pct >= UMBRAL_ALERTA_PCT) return;

    // Buscar apoderados.
    let apoderados = [];
    try {
      apoderados = $app.findRecordsByFilter(
        "parent_student",
        "student_id = {:s}",
        "",
        20,
        0,
        { s: alumnoId },
      );
    } catch (_e) {}

    // Buscar el nombre del alumno.
    let alumnoName = "tu pupilo";
    try {
      const u = $app.findRecordById("users", alumnoId);
      if (u) alumnoName = u.get("name") || alumnoName;
    } catch (_e) {}

    const notifCol = $app.findCollectionByNameOrId("notificaciones");
    const agrupacion = "alerta_75pct_" + alumnoId;

    // Evitar spam: si ya hay una notif del mismo tipo+alumno en las últimas
    // 24h, no crear otra.
    try {
      const recientes = $app.findRecordsByFilter(
        "notificaciones",
        "tipo = 'alerta_75pct' && agrupacion_key = {:k} && created > {:c}",
        "-created",
        5,
        0,
        { k: agrupacion, c: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      );
      if (recientes && recientes.length > 0) return;
    } catch (_e) {}

    for (const link of apoderados) {
      const parentId = link.get("parent_id");
      if (!parentId) continue;
      const n = new Record(notifCol);
      n.set("user_id", parentId);
      n.set("tipo", "alerta_75pct");
      n.set("canal", ["in_app", "email"]);
      n.set("titulo", "Alerta de asistencia: " + alumnoName + " (" + pct + "%)");
      n.set("cuerpo", "La asistencia de " + alumnoName + " bajó a " + pct + "% sobre " + total.length + " clases. Recomendamos revisar la situación.");
      n.set("link_destino", "/dashboard/apoderado");
      n.set("agrupacion_key", agrupacion);
      n.set("urgente", true);
      n.set("payload", { alumno_id: alumnoId, pct: pct, total_clases: total.length });
      try { $app.saveNoValidate(n); } catch (err) { console.log("[asistencia_hooks] notif err: " + err.message); }
    }

    if (typeof $writeAudit === "function") {
      $writeAudit({
        accion: "alerta_75pct_emitida",
        recurso_coleccion: "asistencia_clase_vivo",
        recurso_id: alumnoId,
        payload: { pct: pct, total_clases: total.length, apoderados_notificados: apoderados.length },
      });
    }
  } catch (err) {
    console.log("[asistencia_hooks] alerta err: " + (err && err.message));
  }
};

onRecordCreate((e) => {
  e.next();
  const r = e.record;
  if (!r) return;
  recalcCacheAsistentes(r.get("clase_vivo_id"));
  calcPctYAlertar(r.get("alumno_id"));
}, "asistencia_clase_vivo");

onRecordUpdate((e) => {
  e.next();
  const r = e.record;
  if (!r) return;
  recalcCacheAsistentes(r.get("clase_vivo_id"));
  calcPctYAlertar(r.get("alumno_id"));
}, "asistencia_clase_vivo");
