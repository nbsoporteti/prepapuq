/// <reference path="../pb_data/types.d.ts" />
// Enriquece las preguntas PAES para el creador visual del panel admin:
//
//   preguntas_paes:
//     + dificultad        ("facil" | "media" | "dificil"), opcional.
//     + piloto            (bool) pregunta de prueba que NO puntúa. Cuando es
//                         true, la clave del simulacro guarda null en esa
//                         posición y el hook de corrección la saltea.
//     + imagen_enunciado  (archivo, imagen) figura/gráfico del enunciado.
//     + imagen_contexto   (archivo, imagen) figura del texto de lectura.
//     + imagen_a … imagen_e (archivo, imagen) una por alternativa (A–E), para
//                         preguntas con alternativas gráficas. Un campo por
//                         letra: simple y sin desalinear al reordenar.
//
//   simulacros_paes:
//     + instrucciones     (texto largo) indicaciones que ve el alumno antes de
//                         comenzar (además de la descripción breve).
//
// Nada de esto reproduce contenido oficial DEMRE: son campos de estructura. El
// contenido lo carga el profe bajo su responsabilidad.
migrate((app) => {
  const IMG_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  const imgField = (name) => new FileField({
    name,
    required: false,
    maxSelect: 1,
    maxSize: 5242880, // 5MB
    mimeTypes: IMG_MIMES,
  });

  // ---- preguntas_paes -----------------------------------------------------
  const preg = app.findCollectionByNameOrId("preguntas_paes");
  const addPreg = (name, factory) => {
    if (!preg.fields.getByName(name)) preg.fields.add(factory());
  };

  addPreg("dificultad", () => new SelectField({
    name: "dificultad",
    required: false,
    maxSelect: 1,
    values: ["facil", "media", "dificil"],
  }));
  addPreg("piloto", () => new BoolField({ name: "piloto", required: false }));
  addPreg("imagen_enunciado", () => imgField("imagen_enunciado"));
  addPreg("imagen_contexto", () => imgField("imagen_contexto"));
  for (const letra of ["a", "b", "c", "d", "e"]) {
    addPreg(`imagen_${letra}`, () => imgField(`imagen_${letra}`));
  }
  app.save(preg);

  // ---- simulacros_paes ----------------------------------------------------
  const sim = app.findCollectionByNameOrId("simulacros_paes");
  if (!sim.fields.getByName("instrucciones")) {
    sim.fields.add(new TextField({ name: "instrucciones", required: false, max: 5000 }));
    app.save(sim);
  }
}, (app) => {
  // Down: quitar los campos agregados.
  try {
    const preg = app.findCollectionByNameOrId("preguntas_paes");
    const names = ["dificultad", "piloto", "imagen_enunciado", "imagen_contexto",
      "imagen_a", "imagen_b", "imagen_c", "imagen_d", "imagen_e"];
    for (const n of names) {
      if (preg.fields.getByName(n)) preg.fields.removeByName(n);
    }
    app.save(preg);
  } catch (_e) {}

  try {
    const sim = app.findCollectionByNameOrId("simulacros_paes");
    if (sim.fields.getByName("instrucciones")) sim.fields.removeByName("instrucciones");
    app.save(sim);
  } catch (_e) {}
});
