/// <reference path="../pb_data/types.d.ts" />
// Al publicar una calificación (evaluación o tarea), inserta una
// notificación in-app para el alumno. Idempotente: si ya hay notif
// para esta misma calificación, no duplica.

const notifyNotaPublicada = function (record, tipoCalif) {
  try {
    const publicada = record.get("publicada");
    if (!publicada) return;

    const alumnoId = record.get("alumno_id");
    if (!alumnoId) return;

    const agrupacionKey = `nota_${tipoCalif}_${record.id}`;

    // Idempotencia
    try {
      const existing = $app.findFirstRecordByFilter(
        "notificaciones",
        "user_id = {:u} && agrupacion_key = {:k}",
        { u: alumnoId, k: agrupacionKey },
      );
      if (existing) return;
    } catch (_e) {}

    // Buscar nombre de la evaluación/tarea
    let titulo = "Tu profesor publicó una nota";
    let linkDestino = "/dashboard/estudiante?tab=notas";
    let cuerpo = "";
    try {
      if (tipoCalif === "evaluacion") {
        const ev = $app.findRecordById("evaluaciones", record.get("evaluacion_id"));
        if (ev) {
          titulo = `Nueva nota: ${ev.get("titulo")}`;
          cuerpo = `${ev.get("tipo")} · ${ev.get("titulo")}`;
        }
      } else if (tipoCalif === "tarea") {
        const ent = $app.findRecordById("entregas", record.get("entrega_id"));
        if (ent) {
          const tarea = $app.findRecordById("tareas", ent.get("tarea_id"));
          if (tarea) {
            titulo = `Tarea calificada: ${tarea.get("titulo")}`;
            cuerpo = `Revisá tu nota y feedback`;
          }
        }
      }
    } catch (_e) {}

    const notifCol = $app.findCollectionByNameOrId("notificaciones");
    const n = new Record(notifCol);
    n.set("user_id", alumnoId);
    n.set("tipo", "nota_publicada");
    n.set("canal", ["in_app"]);
    n.set("titulo", titulo);
    n.set("cuerpo", cuerpo);
    n.set("link_destino", linkDestino);
    n.set("agrupacion_key", agrupacionKey);
    n.set("payload", { tipo: tipoCalif, nota: record.get("nota_1_a_7") });
    try { $app.saveNoValidate(n); } catch (e) { console.log("[notif_nota] err: " + e.message); }

    // También notificar a apoderados del alumno
    try {
      const links = $app.findRecordsByFilter(
        "parent_student",
        "student_id = {:s}",
        "",
        10,
        0,
        { s: alumnoId },
      );
      for (const l of links) {
        const parentId = l.get("parent_id");
        if (!parentId) continue;
        const np = new Record(notifCol);
        np.set("user_id", parentId);
        np.set("tipo", "nota_publicada");
        np.set("canal", ["in_app", "email"]);
        np.set("titulo", titulo);
        np.set("cuerpo", cuerpo + " — Pupilo");
        np.set("link_destino", "/dashboard/apoderado");
        np.set("agrupacion_key", agrupacionKey + "_p_" + parentId);
        np.set("payload", { tipo: tipoCalif, nota: record.get("nota_1_a_7"), pupilo_id: alumnoId });
        try { $app.saveNoValidate(np); } catch (_e) {}
      }
    } catch (_e) {}
  } catch (err) {
    console.log("[notif_nota] fatal: " + (err && err.message));
  }
};

onRecordAfterCreateSuccess((e) => {
  notifyNotaPublicada(e.record, "evaluacion");
  e.next();
}, "calificaciones_evaluacion");

onRecordAfterUpdateSuccess((e) => {
  // Solo notificar si pasó de no-publicada a publicada
  try {
    const wasPub = e.record.original().get("publicada");
    const isPub = e.record.get("publicada");
    if (!wasPub && isPub) notifyNotaPublicada(e.record, "evaluacion");
  } catch (_e) {}
  e.next();
}, "calificaciones_evaluacion");

onRecordAfterCreateSuccess((e) => {
  notifyNotaPublicada(e.record, "tarea");
  e.next();
}, "calificaciones_tarea");

onRecordAfterUpdateSuccess((e) => {
  try {
    const wasPub = e.record.original().get("publicada");
    const isPub = e.record.get("publicada");
    if (!wasPub && isPub) notifyNotaPublicada(e.record, "tarea");
  } catch (_e) {}
  e.next();
}, "calificaciones_tarea");
