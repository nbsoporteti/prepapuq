/// <reference path="../pb_data/types.d.ts" />
// Al crear un mensaje_interno:
//   1. Actualizar el thread: ultima_actividad = now, contador no_leidos del
//      destinatario +1.
//   2. Crear notificación tipo "mensaje_nuevo" para cada participante que
//      no sea el autor del mensaje.

onRecordAfterCreateSuccess((e) => {
  try {
    const mensaje = e.record;
    const threadId = mensaje.get("thread_id");
    const autorId = mensaje.get("autor_id");
    if (!threadId || !autorId) return e.next();

    // 1. Actualizar thread
    let thread;
    try {
      thread = $app.findRecordById("threads_mensajes", threadId);
    } catch (_e) {}
    if (!thread) return e.next();

    thread.set("ultima_actividad", new Date().toISOString());

    // Incrementar mensajes_no_leidos por participante excepto autor
    let noLeidos = {};
    try {
      const raw = thread.get("mensajes_no_leidos_por_user");
      if (raw) noLeidos = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
    } catch (_e) {}

    const participantes = thread.get("participantes_ids");
    const parr = Array.isArray(participantes) ? participantes : [];
    for (const pid of parr) {
      if (pid === autorId) continue;
      noLeidos[pid] = (noLeidos[pid] || 0) + 1;
    }
    thread.set("mensajes_no_leidos_por_user", noLeidos);

    try { $app.saveNoValidate(thread); } catch (err) { console.log("[mensajes] thread upd: " + err.message); }

    // 2. Notificaciones
    let nombreAutor = "Alguien";
    try {
      const autor = $app.findRecordById("users", autorId);
      if (autor) nombreAutor = autor.get("name") || nombreAutor;
    } catch (_e) {}

    const notifCol = $app.findCollectionByNameOrId("notificaciones");
    const contenidoPreview = (mensaje.get("contenido") || "").slice(0, 100);

    for (const pid of parr) {
      if (pid === autorId) continue;
      const n = new Record(notifCol);
      n.set("user_id", pid);
      n.set("tipo", "mensaje_nuevo");
      n.set("canal", ["in_app"]);
      n.set("titulo", `Mensaje de ${nombreAutor}`);
      n.set("cuerpo", contenidoPreview);
      n.set("link_destino", "/mensajes?thread=" + threadId);
      n.set("agrupacion_key", "thread_" + threadId);
      n.set("payload", { thread_id: threadId });
      try { $app.saveNoValidate(n); } catch (_e) {}
    }
  } catch (err) {
    console.log("[mensajes] fatal: " + (err && err.message));
  }
  e.next();
}, "mensajes_internos");
