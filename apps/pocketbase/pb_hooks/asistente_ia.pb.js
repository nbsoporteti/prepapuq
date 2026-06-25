/// <reference path="../pb_data/types.d.ts" />
// Asistente de ayuda técnica con IA (Claude) — proxy server-side.
//
// La API key de Anthropic vive SOLO acá, en una variable de entorno; nunca en
// el frontend ni en el bundle. El frontend manda  POST /api/asistente  con
// { messages: [{role, content}, ...] } y un token de auth válido; respondemos
// { reply }.
//
// Variables de entorno del contenedor PocketBase (setear en Coolify):
//   ANTHROPIC_API_KEY  (obligatoria)  la clave de https://console.anthropic.com
//   ANTHROPIC_MODEL    (opcional)     default "claude-opus-4-8". Para bajar el
//                                     costo, poné "claude-haiku-4-5" (rápido y
//                                     barato, suficiente para ayuda de uso).

const ASIST_MAX_MSGS = 24; // tope de turnos por request (acota costo/abuso)
const ASIST_MAX_CHARS = 6000; // tope de largo por mensaje

const ASIST_SYSTEM = `Sos el asistente de ayuda técnica de PrePa, una plataforma web de un preuniversitario PAES en Punta Arenas, Chile. Ayudás a usuarios logueados (estudiantes, apoderados, profesores y administradores) a usar la plataforma.

Qué ofrece la plataforma:
- Estudiantes: ven sus cursos y materiales, rinden ensayos PAES interactivos (con timer, hoja de respuestas y corrección automática), entregan tareas, ven sus notas y descargan PDFs de la biblioteca.
- Apoderados: ven la asistencia y las notas de sus pupilos.
- Profesores: gestionan sus secciones, toman asistencia, califican tareas y cargan notas; también pueden crear ensayos PAES.
- Administradores: gestionan cursos (crear y archivar), materiales, matrículas, asistencia y usuarios; e importan ensayos PAES (desde un PDF, con un botón "Cargar respuestas" que marca solas las correctas a partir de la clave).
- Hay un Manual de uso en /manual (para admins y profes) y la Biblioteca PAES en /biblioteca.

Cómo respondés:
- En español de Chile, claro, breve y directo. Andá al grano. NO escribas tu razonamiento ni borradores: solo la respuesta final.
- Dá indicaciones paso a paso para las tareas de la plataforma. Si algo está en el Manual de uso, podés mencionarlo.
- Sos un asistente de AYUDA: no podés ejecutar acciones, cambiar datos, ni entrar a cuentas. Explicás cómo hacerlo o a quién pedirlo.
- Si no sabés algo, o es un problema técnico / de cuenta que necesita una persona, decilo con honestidad y sugerí contactar al administrador o a soporte. No inventes funciones que no existen.
- No reproduzcas contenido con copyright (por ejemplo, exámenes oficiales DEMRE).`;

routerAdd("POST", "/api/asistente", (e) => {
  // 1) Solo usuarios logueados.
  const user = e.auth;
  if (!user) return e.json(401, { error: "no_autenticado" });

  // 2) Configuración.
  const apiKey = $os.getenv("ANTHROPIC_API_KEY");
  if (!apiKey) return e.json(503, { error: "no_configurado" });
  const model = $os.getenv("ANTHROPIC_MODEL") || "claude-opus-4-8";

  // 3) Body + saneo (rol/contenido válidos, recorte de largo y cantidad).
  let body = {};
  try {
    body = e.requestInfo().body || {};
  } catch (_e) {}
  let messages = Array.isArray(body.messages) ? body.messages : [];
  messages = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .slice(-ASIST_MAX_MSGS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, ASIST_MAX_CHARS) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return e.json(400, { error: "mensaje_invalido" });
  }

  // 4) Contexto del usuario actual.
  let rol = "";
  try {
    rol = user.get("rol") || "";
  } catch (_e) {}
  const system = ASIST_SYSTEM + (rol ? `\n\nEl usuario actual tiene rol: ${rol}.` : "");

  // 5) Llamada a la API de Claude (Messages API).
  let response;
  try {
    response = $http.send({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1024,
        system: system,
        messages: messages,
      }),
      timeout: 60,
    });
  } catch (err) {
    $app.logger().error("[asistente] http error", "error", String(err));
    return e.json(502, { error: "asistente_no_disponible" });
  }

  if (response.statusCode !== 200) {
    $app
      .logger()
      .error("[asistente] anthropic " + response.statusCode, "body", JSON.stringify(response.json));
    return e.json(502, { error: "asistente_no_disponible" });
  }

  // 6) Extraer el texto de los bloques de content.
  let reply = "";
  try {
    const blocks = (response.json && response.json.content) || [];
    reply = blocks
      .filter((b) => b && b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  } catch (_e) {}
  if (!reply) return e.json(502, { error: "respuesta_vacia" });

  return e.json(200, { reply: reply });
});
