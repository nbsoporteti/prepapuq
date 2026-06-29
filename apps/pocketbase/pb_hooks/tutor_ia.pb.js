/// <reference path="../pb_data/types.d.ts" />
// Tutor PAES con IA (Claude) — proxy server-side, separado del asistente de
// ayuda técnica (/api/asistente). Acá el system prompt es de TUTOR académico:
// explica por qué una alternativa es correcta y qué reforzar. El frontend manda
//   POST /api/tutor  con { messages: [{role, content}, ...] }  y auth válido;
// respondemos { reply }.
//
// Usa las mismas variables de entorno que el asistente:
//   ANTHROPIC_API_KEY (obligatoria)  ·  ANTHROPIC_MODEL (opcional)

const TUTOR_MAX_MSGS = 8;
const TUTOR_MAX_CHARS = 6000;

const TUTOR_SYSTEM = `Sos un tutor PAES de PrePa, un preuniversitario en Punta Arenas, Chile. Tu objetivo es que el estudiante ENTIENDA, no solo que sepa la respuesta.

Cuando te pasen una pregunta de práctica con su alternativa correcta:
- Explicá en español de Chile, claro y breve (2 a 4 frases), por qué la alternativa correcta es la correcta.
- Si el alumno marcó otra, explicá el error típico detrás de esa confusión.
- Cerrá con un tip corto para no volver a equivocarse en ese tipo de pregunta, y nombrá el concepto o eje a repasar.

Reglas:
- NO escribas tu razonamiento ni borradores: solo la explicación final, lista para leer.
- No inventes datos. Si la pregunta no trae suficiente información, decilo.
- Las preguntas que te pasan son contenido propio de PrePa; nunca reproduzcas exámenes oficiales DEMRE con copyright.
- Tono cercano y motivador, sin ser cursi. Andá al grano.`;

routerAdd("POST", "/api/tutor", (e) => {
  const user = e.auth;
  if (!user) return e.json(401, { error: "no_autenticado" });

  const apiKey = $os.getenv("ANTHROPIC_API_KEY");
  if (!apiKey) return e.json(503, { error: "no_configurado" });
  const model = $os.getenv("ANTHROPIC_MODEL") || "claude-opus-4-8";

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
    .slice(-TUTOR_MAX_MSGS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, TUTOR_MAX_CHARS) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return e.json(400, { error: "mensaje_invalido" });
  }

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
        max_tokens: 700,
        system: TUTOR_SYSTEM,
        messages: messages,
      }),
      timeout: 60,
    });
  } catch (err) {
    $app.logger().error("[tutor] http error", "error", String(err));
    return e.json(502, { error: "tutor_no_disponible" });
  }

  if (response.statusCode !== 200) {
    $app.logger().error("[tutor] anthropic " + response.statusCode, "body", JSON.stringify(response.json));
    return e.json(502, { error: "tutor_no_disponible" });
  }

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
