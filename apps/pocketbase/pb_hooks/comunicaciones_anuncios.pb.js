/// <reference path="../pb_data/types.d.ts" />
// Al crear un anuncio, hace fan-out a notificaciones para todos los
// destinatarios resueltos según el scope:
//   - seccion       → alumnos matriculados en esa sección + apoderados
//   - curso         → alumnos matriculados en cualquier sección del curso + apoderados
//   - institucional → todos los usuarios activos
//   - personal      → user_id específicos en destinatarios_ids
//
// Si el anuncio está marcado como `importante`, además marca canal email.

const buildDestinatarios = function (anuncio) {
  const destinatarios = new Set();
  const scope = anuncio.get("scope");

  try {
    if (scope === "personal") {
      const ids = anuncio.get("destinatarios_ids");
      const arr = Array.isArray(ids) ? ids : [];
      for (const id of arr) destinatarios.add(id);
      return destinatarios;
    }

    if (scope === "seccion") {
      const seccionId = anuncio.get("seccion_id");
      if (!seccionId) return destinatarios;
      const mats = $app.findRecordsByFilter(
        "matriculas_seccion",
        "seccion_id = {:s} && estado = 'matriculado'",
        "",
        500,
        0,
        { s: seccionId },
      );
      for (const m of mats) {
        const alumnoId = m.get("alumno_id");
        if (alumnoId) destinatarios.add(alumnoId);
        try {
          const links = $app.findRecordsByFilter("parent_student", "student_id = {:s}", "", 10, 0, { s: alumnoId });
          for (const l of links) {
            const pid = l.get("parent_id");
            if (pid) destinatarios.add(pid);
          }
        } catch (_e) {}
      }
      return destinatarios;
    }

    if (scope === "curso") {
      const cursoId = anuncio.get("curso_id");
      if (!cursoId) return destinatarios;
      const secciones = $app.findRecordsByFilter("secciones_curso", "curso_id = {:c}", "", 50, 0, { c: cursoId });
      for (const sec of secciones) {
        const mats = $app.findRecordsByFilter(
          "matriculas_seccion",
          "seccion_id = {:s} && estado = 'matriculado'",
          "",
          500,
          0,
          { s: sec.id },
        );
        for (const m of mats) {
          const alumnoId = m.get("alumno_id");
          if (alumnoId) destinatarios.add(alumnoId);
          try {
            const links = $app.findRecordsByFilter("parent_student", "student_id = {:s}", "", 10, 0, { s: alumnoId });
            for (const l of links) {
              const pid = l.get("parent_id");
              if (pid) destinatarios.add(pid);
            }
          } catch (_e) {}
        }
      }
      return destinatarios;
    }

    if (scope === "institucional") {
      const users = $app.findRecordsByFilter("users", "activo = true || activo = ''", "", 1000, 0);
      for (const u of users) destinatarios.add(u.id);
      return destinatarios;
    }
  } catch (err) {
    console.log("[anuncios] buildDestinatarios err: " + (err && err.message));
  }
  return destinatarios;
};

onRecordAfterCreateSuccess((e) => {
  try {
    const anuncio = e.record;
    const autorId = anuncio.get("autor_id");
    const destinatarios = buildDestinatarios(anuncio);

    // Excluir al autor
    if (autorId) destinatarios.delete(autorId);
    if (destinatarios.size === 0) return e.next();

    const notifCol = $app.findCollectionByNameOrId("notificaciones");
    const importante = !!anuncio.get("importante");
    const canal = importante ? ["in_app", "email"] : ["in_app"];
    const tipo = importante ? "anuncio_importante" : "anuncio_nuevo";

    const linkDestino = anuncio.get("scope") === "personal"
      ? "/notificaciones"
      : `/anuncios/${anuncio.id}`;

    let creadas = 0;
    for (const uid of destinatarios) {
      const n = new Record(notifCol);
      n.set("user_id", uid);
      n.set("tipo", tipo);
      n.set("canal", canal);
      n.set("titulo", anuncio.get("titulo") || "Nuevo anuncio");
      n.set("cuerpo", anuncio.get("titulo") || "");
      n.set("link_destino", linkDestino);
      n.set("agrupacion_key", "anuncio_" + anuncio.id);
      n.set("urgente", importante);
      n.set("payload", { anuncio_id: anuncio.id, scope: anuncio.get("scope") });
      try { $app.saveNoValidate(n); creadas++; } catch (err) { console.log("[anuncios] notif err: " + err.message); }
    }
    console.log(`[anuncios] anuncio ${anuncio.id} fan-out: ${creadas} notificaciones`);
  } catch (err) {
    console.log("[anuncios] fatal: " + (err && err.message));
  }
  e.next();
}, "anuncios");
