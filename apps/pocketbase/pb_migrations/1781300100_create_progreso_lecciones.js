/// <reference path="../pb_data/types.d.ts" />
// Progreso de lecciones del estudiante: una fila por (alumno, lección) con un
// flag `visto`. Habilita marcar lecciones como vistas y el % de avance por
// curso. El alumno gestiona solo lo suyo; el admin ve/edita todo. Índice único
// (alumno, lección) para que no se dupliquen filas.
migrate((app) => {
  const usersId = app.findCollectionByNameOrId("users").id;
  const leccionesId = app.findCollectionByNameOrId("lecciones").id;

  const adminOnly = "@request.auth.roles ~ 'admin' || @request.auth.rol = 'admin'";
  const ownOrAdmin = "@request.auth.id = alumno_id || " + adminOnly;

  try {
    app.findCollectionByNameOrId("progreso_lecciones");
    console.log("[1781300100] skip progreso_lecciones (ya existe)");
    return;
  } catch (_e) {
    // no existe: la creamos
  }

  app.save(new Collection({
    name: "progreso_lecciones",
    type: "base",
    listRule: ownOrAdmin,
    viewRule: ownOrAdmin,
    createRule: ownOrAdmin,
    updateRule: ownOrAdmin,
    deleteRule: ownOrAdmin,
    fields: [
      { name: "alumno_id", type: "relation", required: true, collectionId: usersId, cascadeDelete: true, maxSelect: 1 },
      { name: "leccion_id", type: "relation", required: true, collectionId: leccionesId, cascadeDelete: true, maxSelect: 1 },
      { name: "visto", type: "bool", required: false },
      { name: "fecha_visto", type: "date", required: false },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_progreso_alumno_leccion ON progreso_lecciones (alumno_id, leccion_id)",
    ],
  }));
}, (app) => {
  try {
    const c = app.findCollectionByNameOrId("progreso_lecciones");
    app.delete(c);
  } catch (_e) {
    // ya no existe
  }
});
