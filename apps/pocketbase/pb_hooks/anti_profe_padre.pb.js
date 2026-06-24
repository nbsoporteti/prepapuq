/// <reference path="../pb_data/types.d.ts" />
// Bloquea que un profesor califique a su propio hijo. Cruza la colección
// `parent_student` para detectar si el profesor (autenticado) es padre/madre
// del alumno target de la calificación. Si lo es, requiere que la acción la
// haga un admin (o que se firme con un override explícito documentado).
//
// Aplica a calificaciones_tarea y calificaciones_evaluacion.

const checkAntiPadre = function (e, coleccionCalificacion) {
  const auth = e.auth;
  if (!auth) {
    return e.next();
  }

  // Admin siempre pasa (puede que esté corrigiendo en nombre del profesor).
  const isAdmin = (auth.get("rol") === "admin") ||
    ((auth.get("roles") || []).indexOf("admin") !== -1);
  if (isAdmin) {
    return e.next();
  }

  const alumnoId = e.record.get("alumno_id");
  if (!alumnoId) {
    return e.next();
  }

  // Buscar si el actor es apoderado del alumno.
  try {
    const link = $app.findFirstRecordByFilter(
      "parent_student",
      "parent_id = {:p} && student_id = {:s}",
      { p: auth.id, s: alumnoId },
    );
    if (link) {
      if (typeof $writeAudit === "function") {
        $writeAudit({
          actor_id: auth.id,
          actor_rol_activo: auth.get("rol") || "",
          accion: "intento_calificar_propio_hijo",
          recurso_coleccion: coleccionCalificacion,
          recurso_id: e.record.id || "",
          motivo: "Bloqueado por anti_profe_padre hook",
          payload: { alumno_id: alumnoId },
        });
      }
      throw new ForbiddenError(
        "No puedes calificar a tu propio pupilo. Pídele a otro profesor o al administrador que firme esta calificación.",
      );
    }
  } catch (err) {
    // findFirstRecordByFilter lanza si no encuentra. Si el error es "no rows",
    // dejar pasar; si es otro error, también lo propagamos pero solo en caso
    // de un ForbiddenError real (que ya lo throweamos arriba).
    const msg = (err && err.message) || "";
    if (msg.indexOf("no rows") === -1 && msg.indexOf("not found") === -1) {
      // re-throw si no es "not found"
      if (err instanceof ForbiddenError) throw err;
    }
  }

  e.next();
};

onRecordCreateRequest((e) => checkAntiPadre(e, "calificaciones_tarea"), "calificaciones_tarea");
onRecordUpdateRequest((e) => checkAntiPadre(e, "calificaciones_tarea"), "calificaciones_tarea");
onRecordCreateRequest((e) => checkAntiPadre(e, "calificaciones_evaluacion"), "calificaciones_evaluacion");
onRecordUpdateRequest((e) => checkAntiPadre(e, "calificaciones_evaluacion"), "calificaciones_evaluacion");
