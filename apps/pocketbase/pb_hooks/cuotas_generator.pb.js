/// <reference path="../pb_data/types.d.ts" />
// Al matricular un alumno en una sección, genera automáticamente:
//   - 1 cuota de "matricula"
//   - 10 cuotas de "mensualidad" con vencimiento el día 5 de cada mes
//     entre marzo y diciembre del año lectivo de la sección.
// Idempotente: si ya existen cuotas para esta matrícula, no duplica.

const DEFAULT_MATRICULA = 0;
const DEFAULT_MENSUALIDAD = 0;
const DEFAULT_MONEDA = "CLP";

onRecordCreate((e) => {
  e.next();

  const matricula = e.record;
  // Sólo generar cuotas si entró en estado "matriculado".
  const estado = matricula.get("estado");
  if (estado && estado !== "matriculado") {
    return;
  }

  try {
    const alumnoId = matricula.get("alumno_id");
    const seccionId = matricula.get("seccion_id");

    // Buscar apoderado primario (primer parent_student que apunte al alumno).
    let apoderadoId = "";
    try {
      const ps = $app.findFirstRecordByFilter("parent_student", "student_id = {:s}", { s: alumnoId });
      if (ps) apoderadoId = ps.get("parent_id");
    } catch (_e) {}

    // Buscar año lectivo desde la sección.
    let anio = new Date().getFullYear();
    try {
      const sec = $app.findRecordById("secciones_curso", seccionId);
      if (sec && sec.get("anio_lectivo")) anio = sec.get("anio_lectivo");
    } catch (_e) {}

    // Verificar idempotencia: si ya hay cuotas para este alumno+sección, salir.
    try {
      const existing = $app.findFirstRecordByFilter(
        "pagos",
        "matricula_id = {:m}",
        { m: matricula.id },
      );
      if (existing) {
        console.log("[cuotas_generator] cuotas ya existen para matrícula " + matricula.id);
        return;
      }
    } catch (_e) {}

    const pagosCol = $app.findCollectionByNameOrId("pagos");

    // Cuota de matrícula.
    const matriculaPago = new Record(pagosCol);
    matriculaPago.set("alumno_id", alumnoId);
    matriculaPago.set("apoderado_id", apoderadoId);
    matriculaPago.set("matricula_id", matricula.id);
    matriculaPago.set("concepto", "matricula");
    matriculaPago.set("periodo", String(anio) + "-matricula");
    matriculaPago.set("monto", DEFAULT_MATRICULA);
    matriculaPago.set("moneda", DEFAULT_MONEDA);
    matriculaPago.set("estado", "pendiente");
    matriculaPago.set("fecha_emision", new Date().toISOString());
    try { $app.saveNoValidate(matriculaPago); } catch (err) { console.log("[cuotas_generator] err matricula: " + err.message); }

    // 10 cuotas mensualidad: marzo (mes 3) a diciembre (mes 12), día 5.
    for (let mes = 3; mes <= 12; mes++) {
      const cuota = new Record(pagosCol);
      cuota.set("alumno_id", alumnoId);
      cuota.set("apoderado_id", apoderadoId);
      cuota.set("matricula_id", matricula.id);
      cuota.set("concepto", "mensualidad");
      cuota.set("periodo", anio + "-" + String(mes).padStart(2, "0"));
      cuota.set("monto", DEFAULT_MENSUALIDAD);
      cuota.set("moneda", DEFAULT_MONEDA);
      cuota.set("estado", "pendiente");
      // vencimiento: día 5 del mes correspondiente, ISO.
      const venc = new Date(Date.UTC(anio, mes - 1, 5, 23, 59, 59));
      cuota.set("fecha_vencimiento", venc.toISOString());
      try { $app.saveNoValidate(cuota); } catch (err) { console.log("[cuotas_generator] err " + mes + ": " + err.message); }
    }

    if (typeof $writeAudit === "function") {
      $writeAudit({
        accion: "cuotas_generadas",
        recurso_coleccion: "matriculas_seccion",
        recurso_id: matricula.id,
        payload: { alumno_id: alumnoId, anio: anio, cuotas: 11 },
      });
    }
  } catch (err) {
    console.log("[cuotas_generator] failed: " + (err && err.message));
  }
}, "matriculas_seccion");
