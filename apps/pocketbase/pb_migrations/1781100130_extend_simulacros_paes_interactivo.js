/// <reference path="../pb_data/types.d.ts" />
// Extiende el módulo de simulacros PAES para volverlo interactivo:
//
//   simulacros_paes:
//     + clave_respuestas_json  clave oficial (array ["A","C",...] o null por
//                              pregunta piloto). Se carga cuando DEMRE publica
//                              el clavijero; mientras esté vacía, el simulacro
//                              corre en "modo práctica" (sin puntaje).
//     + pdf_url                ruta al PDF del ensayo en /biblioteca.
//     + duracion_min           minutos del cronómetro.
//
//   resultados_simulacro_paes:
//     + respuestas_alumno_json respuestas marcadas por el alumno (array).
//
// Además abre el createRule de resultados para que el propio alumno pueda
// registrar su intento (`@request.auth.id = alumno_id`). El puntaje NO lo
// calcula el cliente: lo deriva el hook server-side (ver simulacros_paes.pb.js),
// así que aunque el alumno cree el registro no puede inflar su nota.
migrate((app) => {
  // ---- simulacros_paes ----------------------------------------------------
  const sim = app.findCollectionByNameOrId("simulacros_paes");
  const addSim = (name, factory) => {
    if (!sim.fields.getByName(name)) sim.fields.add(factory());
  };
  addSim("clave_respuestas_json", () => new JSONField({
    name: "clave_respuestas_json",
    required: false,
    maxSize: 16384,
  }));
  addSim("pdf_url", () => new TextField({
    name: "pdf_url",
    required: false,
    max: 255,
  }));
  addSim("duracion_min", () => new NumberField({
    name: "duracion_min",
    required: false,
    onlyInt: true,
    min: 1,
    max: 480,
  }));
  app.save(sim);

  // ---- resultados_simulacro_paes ------------------------------------------
  const res = app.findCollectionByNameOrId("resultados_simulacro_paes");
  if (!res.fields.getByName("respuestas_alumno_json")) {
    res.fields.add(new JSONField({
      name: "respuestas_alumno_json",
      required: false,
      maxSize: 16384,
    }));
  }
  // El alumno puede crear su propio resultado; el puntaje lo fija el hook.
  res.createRule = "@request.auth.id = alumno_id || @request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'";
  app.save(res);
}, (app) => {
  try {
    const sim = app.findCollectionByNameOrId("simulacros_paes");
    for (const name of ["clave_respuestas_json", "pdf_url", "duracion_min"]) {
      if (sim.fields.getByName(name)) sim.fields.removeByName(name);
    }
    app.save(sim);
  } catch (_e) {}

  try {
    const res = app.findCollectionByNameOrId("resultados_simulacro_paes");
    if (res.fields.getByName("respuestas_alumno_json")) res.fields.removeByName("respuestas_alumno_json");
    res.createRule = "@request.auth.roles ~ 'admin' || @request.auth.roles ~ 'profesor'";
    app.save(res);
  } catch (_e) {}
});
