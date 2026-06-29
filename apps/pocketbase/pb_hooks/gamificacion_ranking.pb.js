/// <reference path="../pb_data/types.d.ts" />
// Ranking de gamificación: top 10 por puntos. Server-side para no exponer la
// colección entera a los alumnos (la regla de progreso_gamificacion es
// own-or-admin). Solo devolvemos primer nombre + puntos + racha, y marcamos
// la fila del usuario actual. Requiere auth.
routerAdd("GET", "/api/ranking", (e) => {
  const user = e.auth;
  if (!user) return e.json(401, { error: "no_autenticado" });

  try {
    const rows = $app.findRecordsByFilter("progreso_gamificacion", "puntos > 0", "-puntos", 10, 0);
    const out = [];
    for (const r of rows) {
      let nombre = "Estudiante";
      try {
        const u = $app.findRecordById("users", r.get("user_id"));
        const full = (u && u.get("name")) || "";
        nombre = (full.split(" ")[0] || "Estudiante");
      } catch (_e) {}
      out.push({
        nombre: nombre,
        puntos: r.get("puntos") || 0,
        racha: r.get("racha_actual") || 0,
        esYo: r.get("user_id") === user.id,
      });
    }
    return e.json(200, { ranking: out });
  } catch (_e) {
    // colección sin migrar todavía → ranking vacío, no es error
    return e.json(200, { ranking: [] });
  }
});
