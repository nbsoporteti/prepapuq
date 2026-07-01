/// <reference path="../pb_data/types.d.ts" />
// Confirmación segura de asistencia con PIN de 4 dígitos.
//
// El PIN de cada usuario se guarda HASHEADO (HMAC-SHA256) en la colección
// `asistencia_pin` (solo-superusuario), nunca en texto plano ni expuesto por
// API. La ESCRITURA de la asistencia pasa por /api/asistencia/confirmar, que
// verifica el PIN server-side; así el cliente no puede marcar `confirmada` sin
// un PIN válido.
//
// Variable de entorno opcional del contenedor PocketBase:
//   ASISTENCIA_PIN_SALT   sal extra para el HMAC (default de fallback si falta).

const PIN_RE = /^[0-9]{4}$/;
const ESTADOS_CLASE = ["presente", "ausente", "tardanza", "justificado", "retirado"];
const ESTADOS_CURSO = ["Presente", "Ausente", "Justificado"];

function pinHash(pin, userId) {
  const salt = $os.getenv("ASISTENCIA_PIN_SALT") || "prepa_asistencia_pin_v1";
  return $security.sha256(pin + "|" + userId + "|" + salt);
}

function hasRole(user, role) {
  try {
    if (user.getString("rol") === role) return true;
  } catch (_e) { /* sin campo rol */ }
  try {
    const arr = user.get("roles");
    return arr ? JSON.stringify(arr).indexOf('"' + role + '"') >= 0 : false;
  } catch (_e) {
    return false;
  }
}

function findPinRecord(userId) {
  try {
    return $app.findFirstRecordByFilter("asistencia_pin", "user_id = {:u}", { u: userId });
  } catch (_e) {
    return null;
  }
}

// Lockout anti fuerza-bruta: 5 fallos → bloqueo de 5 minutos.
const MAX_FALLOS = 5;
const LOCK_MS = 5 * 60 * 1000;

function estaBloqueado(pinRec) {
  const hasta = pinRec.getString("bloqueado_hasta");
  return !!hasta && new Date(hasta).getTime() > Date.now();
}

function registrarFallo(pinRec) {
  const n = (pinRec.get("intentos_fallidos") || 0) + 1;
  if (n >= MAX_FALLOS) {
    pinRec.set("intentos_fallidos", 0);
    pinRec.set("bloqueado_hasta", new Date(Date.now() + LOCK_MS).toISOString());
  } else {
    pinRec.set("intentos_fallidos", n);
  }
  try { $app.save(pinRec); } catch (_e) { /* best-effort */ }
}

function registrarExito(pinRec) {
  if ((pinRec.get("intentos_fallidos") || 0) !== 0 || pinRec.getString("bloqueado_hasta")) {
    pinRec.set("intentos_fallidos", 0);
    pinRec.set("bloqueado_hasta", "");
    try { $app.save(pinRec); } catch (_e) { /* best-effort */ }
  }
}

// ¿El usuario ya tiene PIN configurado?
routerAdd("GET", "/api/asistencia/pin-estado", (e) => {
  const u = e.auth;
  if (!u) return e.json(401, { error: "no_autenticado" });
  return e.json(200, { tienePin: !!findPinRecord(u.id) });
});

// Crear o cambiar el PIN. Para cambiarlo hay que pasar el PIN actual.
routerAdd("POST", "/api/asistencia/pin", (e) => {
  const u = e.auth;
  if (!u) return e.json(401, { error: "no_autenticado" });

  let body = {};
  try { body = e.requestInfo().body || {}; } catch (_e) { /* body vacío */ }
  const pin = String(body.pin || "");
  const actual = String(body.actual || "");
  if (!PIN_RE.test(pin)) return e.json(400, { error: "pin_invalido" });

  const existing = findPinRecord(u.id);
  if (existing) {
    if (estaBloqueado(existing)) return e.json(429, { error: "bloqueado" });
    if (!PIN_RE.test(actual) || existing.getString("hash") !== pinHash(actual, u.id)) {
      registrarFallo(existing);
      return e.json(403, { error: "pin_actual_incorrecto" });
    }
    registrarExito(existing);
    existing.set("hash", pinHash(pin, u.id));
    $app.save(existing);
  } else {
    const col = $app.findCollectionByNameOrId("asistencia_pin");
    const rec = new Record(col);
    rec.set("user_id", u.id);
    rec.set("hash", pinHash(pin, u.id));
    $app.save(rec);
  }
  return e.json(200, { ok: true });
});

// Confirmar asistencia: verifica el PIN y escribe las filas con el sello.
routerAdd("POST", "/api/asistencia/confirmar", (e) => {
  const u = e.auth;
  if (!u) return e.json(401, { error: "no_autenticado" });

  let body = {};
  try { body = e.requestInfo().body || {}; } catch (_e) { /* body vacío */ }

  const pin = String(body.pin || "");
  if (!PIN_RE.test(pin)) return e.json(400, { error: "pin_invalido" });

  const pinRec = findPinRecord(u.id);
  if (!pinRec) return e.json(409, { error: "sin_pin" });
  if (estaBloqueado(pinRec)) return e.json(429, { error: "bloqueado" });
  if (pinRec.getString("hash") !== pinHash(pin, u.id)) {
    registrarFallo(pinRec);
    return e.json(403, { error: "pin_incorrecto" });
  }
  registrarExito(pinRec);

  const isAdmin = hasRole(u, "admin");
  const scope = String(body.scope || "");
  const estados = body.estados || {};
  const now = new Date().toISOString();
  let count = 0;

  if (scope === "clase") {
    if (!(isAdmin || hasRole(u, "profesor"))) return e.json(403, { error: "sin_permiso" });
    const claseId = String(body.claseId || "");
    if (!claseId) return e.json(400, { error: "falta_clase" });

    let clase;
    try { clase = $app.findRecordById("clases_vivo", claseId); } catch (_e) {
      return e.json(404, { error: "clase_no_encontrada" });
    }
    if (!isAdmin && clase.getString("profesor_id") !== u.id) {
      return e.json(403, { error: "no_es_tu_clase" });
    }

    const col = $app.findCollectionByNameOrId("asistencia_clase_vivo");
    for (const alumnoId of Object.keys(estados)) {
      const estado = String(estados[alumnoId]);
      if (ESTADOS_CLASE.indexOf(estado) < 0) continue;
      let row = null;
      try {
        row = $app.findFirstRecordByFilter(
          "asistencia_clase_vivo",
          "clase_vivo_id = {:c} && alumno_id = {:a}",
          { c: claseId, a: alumnoId },
        );
      } catch (_e) { row = null; }
      if (!row) {
        row = new Record(col);
        row.set("clase_vivo_id", claseId);
        row.set("alumno_id", alumnoId);
      }
      row.set("estado", estado);
      row.set("marcada_por", u.id);
      row.set("confirmada", true);
      row.set("confirmada_por", u.id);
      row.set("confirmada_el", now);
      $app.save(row);
      count++;
    }
    return e.json(200, { ok: true, count: count });
  }

  if (scope === "curso") {
    if (!(isAdmin || hasRole(u, "administrativo"))) return e.json(403, { error: "sin_permiso" });
    const cursoId = String(body.cursoId || "");
    const fecha = String(body.fecha || "");
    if (!cursoId) return e.json(400, { error: "falta_curso" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return e.json(400, { error: "fecha_invalida" });

    const dt = new Date(fecha + "T00:00:00.000Z");
    const d0 = dt.toISOString();
    const d1 = new Date(dt.getTime() + 86400000).toISOString();

    const col = $app.findCollectionByNameOrId("asistencia");
    for (const alumnoId of Object.keys(estados)) {
      const estado = String(estados[alumnoId]);
      if (ESTADOS_CURSO.indexOf(estado) < 0) continue;
      let row = null;
      try {
        row = $app.findFirstRecordByFilter(
          "asistencia",
          "curso_id = {:c} && user_id = {:u} && fecha >= {:d0} && fecha < {:d1}",
          { c: cursoId, u: alumnoId, d0: d0, d1: d1 },
        );
      } catch (_e) { row = null; }
      if (!row) {
        row = new Record(col);
        row.set("curso_id", cursoId);
        row.set("user_id", alumnoId);
        row.set("fecha", fecha);
      }
      row.set("estado", estado);
      row.set("marcada_por", u.id);
      row.set("hora_marca", now);
      row.set("confirmada", true);
      row.set("confirmada_por", u.id);
      row.set("confirmada_el", now);
      $app.save(row);
      count++;
    }
    return e.json(200, { ok: true, count: count });
  }

  return e.json(400, { error: "scope_invalido" });
});
