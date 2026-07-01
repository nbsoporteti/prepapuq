/// <reference path="../pb_data/types.d.ts" />
// Asistencia más segura: PIN de confirmación por usuario + sello de confirmación.
//
//  - `asistencia_pin`  colección solo-superusuario con el HASH del PIN por
//                      usuario (nunca se expone por API; se lee/escribe solo
//                      desde el hook `asistencia_pin.pb.js`).
//  - `asistencia` y `asistencia_clase_vivo` ganan  confirmada / confirmada_por /
//    confirmada_el  para dejar sello de quién confirmó la lista y cuándo.
//
// El PIN se verifica server-side y la escritura de la asistencia pasa por el
// endpoint /api/asistencia/confirmar, así el cliente no puede marcar
// `confirmada` sin un PIN válido.
migrate((app) => {
  const usersId = app.findCollectionByNameOrId("users").id;

  // -- asistencia_pin (solo superusuario: sin reglas de API) -----------------
  try {
    app.findCollectionByNameOrId("asistencia_pin");
    console.log("[1781400000] asistencia_pin ya existe, skip");
  } catch (_e) {
    const col = new Collection({
      name: "asistencia_pin",
      type: "base",
      // Sin list/view/create/update/deleteRule => solo superusuarios / hooks.
      fields: [
        { name: "user_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
        { name: "hash", type: "text", required: true, max: 128 },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_asistencia_pin_user ON asistencia_pin (user_id)"],
    });
    app.save(col);
  }

  // -- Sello de confirmación en ambas colecciones de asistencia --------------
  const addSello = (collectionName) => {
    const col = app.findCollectionByNameOrId(collectionName);
    const addIfMissing = (name, factory) => {
      if (!col.fields.getByName(name)) col.fields.add(factory());
    };
    addIfMissing("confirmada", () => new BoolField({ name: "confirmada", required: false }));
    addIfMissing("confirmada_por", () => new RelationField({
      name: "confirmada_por",
      required: false,
      collectionId: usersId,
      cascadeDelete: false,
      maxSelect: 1,
    }));
    addIfMissing("confirmada_el", () => new DateField({ name: "confirmada_el", required: false }));
    app.save(col);
  };

  addSello("asistencia");
  addSello("asistencia_clase_vivo");
}, (app) => {
  // Revertir: quitar campos y borrar la colección de PINs.
  for (const collectionName of ["asistencia", "asistencia_clase_vivo"]) {
    try {
      const col = app.findCollectionByNameOrId(collectionName);
      for (const name of ["confirmada", "confirmada_por", "confirmada_el"]) {
        if (col.fields.getByName(name)) col.fields.removeByName(name);
      }
      app.save(col);
    } catch (_e) { /* colección ausente */ }
  }
  try {
    app.delete(app.findCollectionByNameOrId("asistencia_pin"));
  } catch (_e) { /* ya no existe */ }
});
