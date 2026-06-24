/// <reference path="../pb_data/types.d.ts" />
// Ciclo de vida de pagos / cuotas:
//
// 1. Cron diario 09:00 server-time: marca como "vencido" todo pago con
//    estado="pendiente" y fecha_vencimiento < hoy. Emite notificaciones
//    al apoderado correspondiente.
//
// 2. Al pasar un pago a estado="pagado", setea fecha_pago=now si no estaba.
//
// El cron usa cronAdd que es la API estándar de PocketBase v0.20+ para
// tareas programadas en hooks JS.

cronAdd("pagos_marcar_vencidos", "0 9 * * *", () => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const pendientes = $app.findRecordsByFilter(
      "pagos",
      "estado = 'pendiente' && fecha_vencimiento != '' && fecha_vencimiento < {:hoy}",
      "+fecha_vencimiento",
      500,
      0,
      { hoy: hoy + " 23:59:59.999Z" },
    );

    let cambios = 0;
    for (const p of pendientes) {
      p.set("estado", "vencido");
      try { $app.saveNoValidate(p); cambios++; } catch (_e) {}

      // Notificación al apoderado (si hay) o al alumno.
      const userId = p.get("apoderado_id") || p.get("alumno_id");
      if (!userId) continue;

      try {
        const notifCol = $app.findCollectionByNameOrId("notificaciones");
        const n = new Record(notifCol);
        n.set("user_id", userId);
        n.set("tipo", "cuota_vencida");
        n.set("canal", ["in_app", "email"]);
        n.set("titulo", "Cuota vencida — " + (p.get("periodo") || p.get("concepto")));
        n.set("cuerpo", "Tu cuota de " + (p.get("concepto") || "") + " " + (p.get("periodo") || "") + " venció el " + (p.get("fecha_vencimiento") || "") + ". Ponete al día desde tu panel.");
        n.set("link_destino", "/dashboard/apoderado?tab=pagos");
        n.set("agrupacion_key", "cuota_vencida_" + p.id);
        n.set("urgente", true);
        n.set("payload", { pago_id: p.id, monto: p.get("monto") });
        $app.saveNoValidate(n);
      } catch (err) {
        console.log("[pagos_lifecycle] notif err: " + (err && err.message));
      }
    }

    console.log("[pagos_lifecycle] cron vencidos: " + cambios + "/" + pendientes.length);
  } catch (err) {
    console.log("[pagos_lifecycle] cron fail: " + (err && err.message));
  }
});

onRecordUpdate((e) => {
  const r = e.record;
  if (!r) {
    return e.next();
  }
  try {
    const estado = r.get("estado");
    const estadoAnterior = r.original().get("estado");
    if (estado === "pagado" && estadoAnterior !== "pagado") {
      if (!r.get("fecha_pago")) {
        r.set("fecha_pago", new Date().toISOString());
      }

      // Notif al pagador.
      const userId = r.get("apoderado_id") || r.get("alumno_id");
      if (userId) {
        try {
          const notifCol = $app.findCollectionByNameOrId("notificaciones");
          const n = new Record(notifCol);
          n.set("user_id", userId);
          n.set("tipo", "pago_registrado");
          n.set("canal", ["in_app", "email"]);
          n.set("titulo", "Pago registrado — " + (r.get("concepto") || ""));
          n.set("cuerpo", "Confirmamos tu pago de " + r.get("concepto") + " " + (r.get("periodo") || "") + ".");
          n.set("link_destino", "/dashboard/apoderado?tab=pagos");
          n.set("payload", { pago_id: r.id, monto: r.get("monto") });
          $app.saveNoValidate(n);
        } catch (_e) {}
      }
    }
  } catch (err) {
    console.log("[pagos_lifecycle] update fail: " + (err && err.message));
  }
  e.next();
}, "pagos");
