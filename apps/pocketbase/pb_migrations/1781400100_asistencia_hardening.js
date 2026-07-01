/// <reference path="../pb_data/types.d.ts" />
// Endurecimiento de asistencia (append-only sobre 1781400000):
//   1. asistencia_pin gana intentos_fallidos + bloqueado_hasta para el lockout
//      anti fuerza-bruta del PIN (lo aplica el hook asistencia_pin.pb.js).
//   2. asistencia_clase_vivo: create/update pasa a "solo el profe dueño de la
//      clase (o admin)". Antes cualquier profesor podía tocar la lista de
//      cualquier clase. El endpoint /api/asistencia/confirmar escribe como
//      superusuario, así que este cambio no lo afecta (no hay writes directos
//      del frontend a esta colección).
migrate((app) => {
  // 1. Campos de lockout en asistencia_pin.
  try {
    const pinCol = app.findCollectionByNameOrId("asistencia_pin");
    if (!pinCol.fields.getByName("intentos_fallidos")) {
      pinCol.fields.add(new NumberField({ name: "intentos_fallidos", required: false, onlyInt: true, min: 0 }));
    }
    if (!pinCol.fields.getByName("bloqueado_hasta")) {
      pinCol.fields.add(new DateField({ name: "bloqueado_hasta", required: false }));
    }
    app.save(pinCol);
  } catch (_e) { /* colección ausente (migración 1781400000 no corrió) */ }

  // 2. Endurecer escritura de asistencia_clase_vivo a profe dueño || admin.
  try {
    const av = app.findCollectionByNameOrId("asistencia_clase_vivo");
    av.createRule = "@request.auth.roles ~ 'admin' || clase_vivo_id.profesor_id = @request.auth.id";
    av.updateRule = "@request.auth.roles ~ 'admin' || clase_vivo_id.profesor_id = @request.auth.id";
    app.save(av);
  } catch (_e) { /* colección ausente */ }
}, (app) => {
  // Revertir.
  try {
    const pinCol = app.findCollectionByNameOrId("asistencia_pin");
    for (const name of ["intentos_fallidos", "bloqueado_hasta"]) {
      if (pinCol.fields.getByName(name)) pinCol.fields.removeByName(name);
    }
    app.save(pinCol);
  } catch (_e) { /* ausente */ }

  try {
    const av = app.findCollectionByNameOrId("asistencia_clase_vivo");
    av.createRule = "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'";
    av.updateRule = "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'";
    app.save(av);
  } catch (_e) { /* ausente */ }
});
