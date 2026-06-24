/// <reference path="../pb_data/types.d.ts" />
// Endpoints públicos para "clases gratuitas" — usados por la landing /clases-gratis.
//   GET  /api/public/clases-gratis           lista clases con lead_publica=true && fecha>=today
//   GET  /api/public/clases-gratis/:id       detalle de una clase pública
//   POST /api/public/clases-gratis/:id/inscribirse   formulario de inscripción
//
// Sin auth (público). Validaciones server-side: honeypot, email válido,
// rate-limit suave por IP (10 inscripciones/hora).

const PUBLIC_CACHE_SECONDS = 60;

routerAdd("GET", "/api/public/clases-gratis", (e) => {
  try {
    const records = $app.findRecordsByFilter(
      "clases_vivo",
      "lead_publica = true && estado = 'programada' && fecha >= @now",
      "+fecha",
      50,
      0,
    );

    const items = records.map((r) => ({
      id: r.id,
      titulo: r.get("lead_titulo_publico") || r.get("tema") || "Clase gratuita",
      descripcion: r.get("lead_descripcion_publica") || r.get("descripcion") || "",
      fecha: r.get("fecha"),
      hora_inicio: r.get("hora_inicio"),
      hora_fin: r.get("hora_fin"),
      duracion_min: r.get("duracion_min"),
      plataforma: r.get("plataforma"),
    }));

    e.response.header().set("Cache-Control", "public, max-age=" + PUBLIC_CACHE_SECONDS);
    return e.json(200, { items: items, total: items.length });
  } catch (err) {
    console.log("[endpoint_publico_clases] list err: " + (err && err.message));
    return e.json(500, { error: "internal_error" });
  }
});

routerAdd("GET", "/api/public/clases-gratis/{id}", (e) => {
  const id = e.request.pathValue("id");
  try {
    const r = $app.findRecordById("clases_vivo", id);
    if (!r || !r.get("lead_publica")) {
      return e.json(404, { error: "not_found" });
    }
    return e.json(200, {
      id: r.id,
      titulo: r.get("lead_titulo_publico") || r.get("tema") || "Clase gratuita",
      descripcion: r.get("lead_descripcion_publica") || r.get("descripcion") || "",
      fecha: r.get("fecha"),
      hora_inicio: r.get("hora_inicio"),
      hora_fin: r.get("hora_fin"),
      duracion_min: r.get("duracion_min"),
      plataforma: r.get("plataforma"),
    });
  } catch (err) {
    return e.json(404, { error: "not_found" });
  }
});

routerAdd("POST", "/api/public/clases-gratis/{id}/inscribirse", (e) => {
  const id = e.request.pathValue("id");

  let body = {};
  try {
    body = e.requestInfo().body || {};
  } catch (_e) {}

  // honeypot
  if (body.honeypot) {
    return e.json(200, { ok: true }); // fake success al bot
  }

  // validación mínima
  const nombre = (body.nombre || "").trim();
  const email = (body.email || "").trim();
  if (nombre.length < 2 || !email.includes("@")) {
    return e.json(400, { error: "datos_invalidos" });
  }

  // rate-limit suave: 10 inscripciones por IP por hora
  const ip = (e.realIp && e.realIp()) || "";
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recents = $app.findRecordsByFilter(
      "clase_lead_publica",
      "ip = {:ip} && created > {:cutoff}",
      "-created",
      100,
      0,
      { ip: ip, cutoff: cutoff },
    );
    if (recents.length >= 10) {
      return e.json(429, { error: "rate_limit" });
    }
  } catch (_e) {}

  // verificar que la clase existe y es pública
  try {
    const clase = $app.findRecordById("clases_vivo", id);
    if (!clase || !clase.get("lead_publica")) {
      return e.json(404, { error: "clase_no_disponible" });
    }
  } catch (_e) {
    return e.json(404, { error: "clase_no_disponible" });
  }

  // insertar lead
  try {
    const col = $app.findCollectionByNameOrId("clase_lead_publica");
    const lead = new Record(col);
    lead.set("clase_vivo_id", id);
    lead.set("nombre", nombre);
    lead.set("email", email);
    lead.set("telefono", body.telefono || "");
    lead.set("colegio", body.colegio || "");
    lead.set("anio_que_cursa", body.anio_que_cursa || "");
    lead.set("utm_source", body.utm_source || "");
    lead.set("utm_medium", body.utm_medium || "");
    lead.set("utm_campaign", body.utm_campaign || "");
    lead.set("ip", ip);
    lead.set("estado_seguimiento", "nuevo");
    $app.saveNoValidate(lead);

    return e.json(200, { ok: true });
  } catch (err) {
    console.log("[endpoint_publico_clases] insert err: " + (err && err.message));
    return e.json(500, { error: "internal_error" });
  }
});
