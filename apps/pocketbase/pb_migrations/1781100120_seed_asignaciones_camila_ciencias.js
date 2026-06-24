/// <reference path="../pb_data/types.d.ts" />
// Seed demo — matricula a la alumna demo (camila@example.com) en los 3 cursos
// PAES Ciencias vía la colección legacy `asignaciones`. Esto es lo que hace que
// los cursos aparezcan en "Mis cursos" del dashboard del estudiante y que pase
// el control de acceso de CourseDetailPage (user_id = auth.id && curso_id = ...).
//
// Idempotente: solo crea la asignación si no existe (user_id + curso_id).
migrate((app) => {
  const asignaciones = app.findCollectionByNameOrId("asignaciones");

  let alumno;
  try {
    alumno = app.findFirstRecordByData("users", "email", "camila@example.com");
  } catch (_e) {
    console.log("[1781100120] alumna demo camila@example.com no encontrada, skip");
    return;
  }

  for (const nombre of ["Biología PAES", "Física PAES", "Química PAES"]) {
    let curso;
    try {
      curso = app.findFirstRecordByFilter("cursos", "nombre = {:n}", { n: nombre });
    } catch (_e) {
      console.log("[1781100120] curso no encontrado, skip: " + nombre);
      continue;
    }

    try {
      app.findFirstRecordByFilter(
        "asignaciones",
        "user_id = {:u} && curso_id = {:c}",
        { u: alumno.id, c: curso.id },
      );
      // ya existe → skip
      continue;
    } catch (_e) {
      // no existe → crear
    }

    const rec = new Record(asignaciones);
    rec.set("user_id", alumno.id);
    rec.set("curso_id", curso.id);
    app.save(rec);
  }
}, (app) => {
  try {
    const alumno = app.findFirstRecordByData("users", "email", "camila@example.com");
    for (const nombre of ["Biología PAES", "Física PAES", "Química PAES"]) {
      try {
        const curso = app.findFirstRecordByFilter("cursos", "nombre = {:n}", { n: nombre });
        const rec = app.findFirstRecordByFilter(
          "asignaciones",
          "user_id = {:u} && curso_id = {:c}",
          { u: alumno.id, c: curso.id },
        );
        app.delete(rec);
      } catch (_e) {}
    }
  } catch (_e) {}
});
