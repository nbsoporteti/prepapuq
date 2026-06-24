/// <reference path="../pb_data/types.d.ts" />
// Seed inicial de placeholders editables para la landing.
// Los datos son honestos: marcados como placeholder hasta que el admin
// cargue los reales en el panel de PB.
migrate((app) => {
  const profCol = (() => { try { return app.findCollectionByNameOrId("profesores_publicos"); } catch (_e) { return null; } })();
  const testCol = (() => { try { return app.findCollectionByNameOrId("testimonios_publicos"); } catch (_e) { return null; } })();
  const resCol = (() => { try { return app.findCollectionByNameOrId("resultados_paes"); } catch (_e) { return null; } })();

  // ---- profesores placeholder --------------------------------------------
  if (profCol) {
    const profesores = [
      { nombre: "Editar", apellido: "en panel admin", materia: "matematica_m1", universidad: "Universidad de Chile", titulo: "Ingeniero Civil Matemático", frase: "Editá este profesor desde el admin de PocketBase.", orden: 1, activo: true },
      { nombre: "Editar", apellido: "en panel admin", materia: "competencia_lectora", universidad: "Universidad de Magallanes", titulo: "Licenciado en Letras", frase: "Reemplazá este placeholder con datos reales.", orden: 2, activo: true },
      { nombre: "Editar", apellido: "en panel admin", materia: "ciencias", universidad: "Pontificia Universidad Católica", titulo: "Bioquímico", frase: "Cargá la foto, el CV y la frase destacada.", orden: 3, activo: true },
    ];
    for (const p of profesores) {
      try {
        const existing = app.findFirstRecordByFilter("profesores_publicos", "orden = {:o}", { o: p.orden });
        if (existing) continue;
      } catch (_e) {}
      const r = new Record(profCol);
      Object.entries(p).forEach(([k, v]) => r.set(k, v));
      try { app.saveNoValidate(r); } catch (e) { console.log("[seed-landing] prof " + p.orden + ": " + e.message); }
    }
  }

  // ---- testimonios placeholder -------------------------------------------
  if (testCol) {
    const testimonios = [
      { nombre_alumno: "Editá este testimonio", promocion_anio: 2025, cita: "Reemplazá esta cita con el testimonio real de un exalumno. Mantenelo en 2-3 líneas.", carrera: "Medicina", universidad: "Universidad de Chile", destacado: true, orden: 1, activo: true },
      { nombre_alumno: "Editá este testimonio", promocion_anio: 2025, cita: "Los testimonios reales con foto generan mucha más confianza que el copy genérico.", carrera: "Ingeniería Civil", universidad: "Universidad Católica", destacado: false, orden: 2, activo: true },
      { nombre_alumno: "Editá este testimonio", promocion_anio: 2024, cita: "Una historia auténtica de Punta Arenas es el diferenciador clave frente a Cpech/PdV.", carrera: "Pedagogía", universidad: "Universidad de Magallanes", destacado: false, orden: 3, activo: true },
    ];
    for (const t of testimonios) {
      try {
        const existing = app.findFirstRecordByFilter("testimonios_publicos", "orden = {:o}", { o: t.orden });
        if (existing) continue;
      } catch (_e) {}
      const r = new Record(testCol);
      Object.entries(t).forEach(([k, v]) => r.set(k, v));
      try { app.saveNoValidate(r); } catch (e) { console.log("[seed-landing] test " + t.orden + ": " + e.message); }
    }
  }

  // ---- resultados PAES placeholder ---------------------------------------
  if (resCol) {
    // Solo crear el registro 2025 placeholder. El admin reemplaza con datos reales.
    try {
      const existing = app.findFirstRecordByFilter("resultados_paes", "anio_promocion = 2025");
      if (!existing) {
        const r = new Record(resCol);
        r.set("anio_promocion", 2025);
        r.set("n_alumnos", 0);
        r.set("pct_ingreso_carrera_elegida", 0);
        r.set("puntaje_promedio_general", 0);
        r.set("puntaje_promedio_m1", 0);
        r.set("puntaje_promedio_competencia_lectora", 0);
        r.set("mejora_promedio_pts", 0);
        r.set("destacado_publico", "Editá estos números en el panel admin cuando tengas los resultados reales.");
        r.set("publicado", false); // Importante: NO se muestran en la landing hasta que el admin los cargue
        try { app.saveNoValidate(r); } catch (e) { console.log("[seed-landing] res: " + e.message); }
      }
    } catch (_e) {}
  }

}, (app) => {
  // Down: borrar los seeds (los que tengan los orden/años conocidos)
  try { app.findAllRecords("profesores_publicos").forEach((r) => { if (r.get("nombre") === "Editar") { try { app.delete(r); } catch (_e) {} } }); } catch (_e) {}
  try { app.findAllRecords("testimonios_publicos").forEach((r) => { if (r.get("nombre_alumno") === "Editá este testimonio") { try { app.delete(r); } catch (_e) {} } }); } catch (_e) {}
  try {
    const existing = app.findFirstRecordByFilter("resultados_paes", "anio_promocion = 2025");
    if (existing && !existing.get("publicado")) app.delete(existing);
  } catch (_e) {}
});
