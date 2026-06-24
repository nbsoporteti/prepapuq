/// <reference path="../pb_data/types.d.ts" />
// Helper genérico para insertar registros en `audit_log` desde otros hooks.
// No registra listeners propios; expone una función global $writeAudit que
// el resto de hooks consume.

/** @type {(ctx: any, opts: { accion: string, recurso_coleccion?: string, recurso_id?: string, motivo?: string, payload?: any }) => void} */
$app.onBootstrap((e) => {
  e.next();
  console.log("[audit_log_writer] ready");
});

// Adjunta el helper al objeto global ($app no expone setItem global, así que
// usamos la función como propiedad de globalThis para que otros hooks la
// referencien sin require()).
globalThis.$writeAudit = function (opts) {
  try {
    const collection = $app.findCollectionByNameOrId("audit_log");
    const record = new Record(collection);
    record.set("actor_id", opts.actor_id || "");
    record.set("actor_rol_activo", opts.actor_rol_activo || "");
    record.set("accion", opts.accion);
    record.set("recurso_coleccion", opts.recurso_coleccion || "");
    record.set("recurso_id", opts.recurso_id || "");
    record.set("motivo", opts.motivo || "");
    if (opts.payload) record.set("payload", opts.payload);
    record.set("ip", opts.ip || "");
    record.set("user_agent", opts.user_agent || "");
    $app.saveNoValidate(record);
  } catch (e) {
    console.log("[audit_log_writer] failed: " + (e && e.message));
  }
};
