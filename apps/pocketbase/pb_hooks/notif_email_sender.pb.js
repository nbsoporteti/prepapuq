/// <reference path="../pb_data/types.d.ts" />
// Worker de email para la cola de `notificaciones`.
//
// Los demás hooks (asistencia, notas, pagos) ya crean notificaciones con
// canal:["in_app","email"], y el esquema trae email_enviado/at/error + el
// índice idx_notif_email_queue... pero faltaba quien efectivamente mandara el
// correo. Este cron cierra ese loop. builder-mailer.pb.js intercepta el envío
// y lo rutea a SMTP o a la API de Builder según config.
//
// Diseño defensivo:
//  - Si NO hay mailer configurado (ni SMTP ni env de Builder), no hace nada:
//    deja la cola intacta para cuando se configure (no quema notificaciones).
//  - Solo procesa notifs recientes (ventana 2 días) para no inundar con backlog
//    viejo la primera vez que se active el mailer.
//  - Reintenta dentro de la ventana; registra email_error en cada fallo.
//  - Cada notif va en su propio try/catch: un correo que falla no frena la cola.
// ponytail: reintento acotado por la ventana de 2 días; si se quiere backoff
// real con tope de intentos, agregar un campo `intentos` a notificaciones.

cronAdd("notif_email_sender", "*/5 * * * *", () => {
  try {
    const smtpOn = $app.settings().smtp.enabled;
    const builderOn =
      !!$os.getenv("BUILDER_MAILER_API_URL") && !!$os.getenv("BUILDER_MAILER_API_KEY");
    if (!smtpOn && !builderOn) return; // mailer sin configurar: esperar

    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const pendientes = $app.findRecordsByFilter(
      "notificaciones",
      "email_enviado = false && canal ~ 'email' && created >= {:cutoff}",
      "+created",
      30,
      0,
      { cutoff: cutoff },
    );
    if (!pendientes || !pendientes.length) return;

    const meta = $app.settings().meta;
    const fromAddr = meta.senderAddress || "noreply@prepapuq.cl";
    const fromName = meta.senderName || "PrePa";

    let enviados = 0;
    for (const n of pendientes) {
      try {
        let email = "";
        try {
          const u = $app.findRecordById("users", n.get("user_id"));
          email = u ? u.get("email") : "";
        } catch (_e) {}

        if (!email) {
          n.set("email_enviado", true); // sin destino: no reintentar
          n.set("email_error", "usuario sin email");
          $app.saveNoValidate(n);
          continue;
        }

        const titulo = n.get("titulo") || "Notificación PrePa";
        const cuerpo = n.get("cuerpo") || "";
        const link = n.get("link_destino") || "";
        const linkAbs = link ? "https://prepapuq.cl" + link : "";
        const html =
          '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2421">' +
          '<h2 style="color:#21b24c;font-size:18px;margin:0 0 12px">' + titulo + "</h2>" +
          (cuerpo ? '<p style="font-size:15px;line-height:1.6;margin:0 0 16px">' + cuerpo + "</p>" : "") +
          (linkAbs
            ? '<p style="margin:0 0 16px"><a href="' + linkAbs +
              '" style="background:#21b24c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px">Ver en PrePa</a></p>'
            : "") +
          '<p style="font-size:12px;color:#9a9a93;margin-top:24px">PrePa — Prepara tu futuro · Punta Arenas</p>' +
          "</div>";

        const message = new MailerMessage({
          from: { address: fromAddr, name: fromName },
          to: [{ address: email }],
          subject: titulo,
          html: html,
        });
        $app.newMailClient().send(message);

        n.set("email_enviado", true);
        n.set("email_enviado_at", new Date().toISOString());
        n.set("email_error", "");
        $app.saveNoValidate(n);
        enviados++;
      } catch (err) {
        try {
          n.set("email_error", String((err && err.message) || err).slice(0, 480));
          $app.saveNoValidate(n); // email_enviado sigue false: reintenta en la ventana
        } catch (_e) {}
        console.log("[notif_email] send err: " + (err && err.message));
      }
    }

    if (enviados) console.log("[notif_email] enviados: " + enviados + "/" + pendientes.length);
  } catch (err) {
    console.log("[notif_email] cron fail: " + (err && err.message));
  }
});
