/// <reference path="../pb_data/types.d.ts" />
// Gamificación del estudiante: una fila por alumno con puntos acumulados, racha
// de días seguidos con actividad, racha máxima y logros (json). El alumno
// gestiona solo la suya; admin ve todo. Índice único por user.
migrate((app) => {
  const usersId = app.findCollectionByNameOrId("users").id;
  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";
  const ownOrAdmin = "@request.auth.id = user_id || " + adminOnly;

  try {
    app.findCollectionByNameOrId("progreso_gamificacion");
    console.log("[1781300200] skip progreso_gamificacion (ya existe)");
    return;
  } catch (_e) {
    // no existe: crear
  }

  app.save(new Collection({
    name: "progreso_gamificacion",
    type: "base",
    listRule: ownOrAdmin,
    viewRule: ownOrAdmin,
    createRule: ownOrAdmin,
    updateRule: ownOrAdmin,
    deleteRule: adminOnly,
    fields: [
      { name: "user_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
      { name: "puntos", type: "number", required: false, onlyInt: true },
      { name: "racha_actual", type: "number", required: false, onlyInt: true },
      { name: "racha_max", type: "number", required: false, onlyInt: true },
      { name: "ultima_actividad", type: "text", required: false, max: 10 },
      { name: "logros", type: "json", required: false, maxSize: 4096 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_gamificacion_user ON progreso_gamificacion (user_id)",
    ],
  }));
}, (app) => {
  try {
    const c = app.findCollectionByNameOrId("progreso_gamificacion");
    app.delete(c);
  } catch (_e) {
    // ya no existe
  }
});
