/// <reference path="../pb_data/types.d.ts" />
// Endurece justifications.createRule. Antes era '@request.auth.id != ""':
// cualquier usuario autenticado podía crear una justificación con CUALQUIER
// user_id (podía justificar inasistencias de otra persona). Ahora solo pueden
// crear: un admin, el propio alumno (user_id = sí mismo) o el apoderado del
// alumno (vía parent_student). Es el mismo criterio que list/view fijó la
// migración 1780617600; reusamos su regla de apoderado.
migrate((app) => {
  const apoderadoCanSeePupiloRule =
    '@collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= user_id';

  const c = app.findCollectionByNameOrId('justifications');
  c.createRule = `@request.auth.rol = "admin" || user_id = @request.auth.id || (${apoderadoCanSeePupiloRule})`;
  app.save(c);
}, (app) => {
  // Revert al estado abierto previo.
  const c = app.findCollectionByNameOrId('justifications');
  c.createRule = '@request.auth.id != ""';
  app.save(c);
});
