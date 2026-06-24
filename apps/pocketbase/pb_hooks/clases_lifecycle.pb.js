/// <reference path="../pb_data/types.d.ts" />
// Ciclo de vida de las clases en vivo (versión Fase 2, sin webhooks Meet/Zoom):
//
// 1. Al crear una `clase_vivo` → crea N filas `asistencia_clase_vivo` con
//    estado "ausente" default, una por cada alumno matriculado en la sección.
//    Esto permite al profesor "pasar lista" tocando solo los toggles que
//    cambien al estado "presente"/"tardanza" (target < 90s).
//
// 2. Al actualizar fecha/hora de una clase → marca `reagendada_desde` con
//    el valor anterior y deja una entrada en `historial_cambios`.

onRecordCreate((e) => {
  e.next();

  const clase = e.record;
  if (!clase) return;

  try {
    const seccionId = clase.get("seccion_id");
    if (!seccionId) return;

    // Buscar matrículas activas de la sección.
    let matriculas = [];
    try {
      matriculas = $app.findRecordsByFilter(
        "matriculas_seccion",
        "seccion_id = {:s} && (estado = 'matriculado' || estado = 'pre_inscrito')",
        "+created",
        500,
        0,
        { s: seccionId },
      );
    } catch (_e) {}

    if (matriculas.length === 0) {
      console.log("[clases_lifecycle] clase " + clase.id + " sin matriculados, skip prefill");
      return;
    }

    const asistCol = $app.findCollectionByNameOrId("asistencia_clase_vivo");
    let ok = 0;
    for (const m of matriculas) {
      const alumnoId = m.get("alumno_id");
      if (!alumnoId) continue;
      const a = new Record(asistCol);
      a.set("clase_vivo_id", clase.id);
      a.set("alumno_id", alumnoId);
      a.set("estado", "ausente");
      try {
        $app.saveNoValidate(a);
        ok++;
      } catch (err) {
        // Ignorar duplicados (UNIQUE clase_vivo+alumno) en caso de re-trigger.
        const msg = (err && err.message) || "";
        if (msg.indexOf("UNIQUE") === -1 && msg.indexOf("unique") === -1) {
          console.log("[clases_lifecycle] prefill err alumno " + alumnoId + ": " + msg);
        }
      }
    }
    console.log("[clases_lifecycle] clase " + clase.id + " prefill " + ok + "/" + matriculas.length + " asistencias");
  } catch (err) {
    console.log("[clases_lifecycle] create fail: " + (err && err.message));
  }
}, "clases_vivo");

onRecordUpdate((e) => {
  const clase = e.record;
  if (!clase) {
    return e.next();
  }

  try {
    const fechaOriginal = clase.original().get("fecha");
    const horaInicioOriginal = clase.original().get("hora_inicio");
    const fechaNueva = clase.get("fecha");
    const horaNueva = clase.get("hora_inicio");

    const cambioFecha = String(fechaOriginal) !== String(fechaNueva);
    const cambioHora = String(horaInicioOriginal) !== String(horaNueva);

    if (cambioFecha || cambioHora) {
      clase.set("reagendada_desde", fechaOriginal);

      // Append a historial_cambios (json array)
      let hist = [];
      try {
        const raw = clase.get("historial_cambios");
        if (raw) hist = Array.isArray(raw) ? raw.slice() : (typeof raw === "string" ? JSON.parse(raw) : []);
      } catch (_e) {}
      hist.push({
        ts: new Date().toISOString(),
        accion: "reagenda",
        fecha_anterior: String(fechaOriginal),
        hora_anterior: String(horaInicioOriginal),
        fecha_nueva: String(fechaNueva),
        hora_nueva: String(horaNueva),
      });
      clase.set("historial_cambios", hist);
    }
  } catch (err) {
    console.log("[clases_lifecycle] update detect fail: " + (err && err.message));
  }

  e.next();
}, "clases_vivo");
