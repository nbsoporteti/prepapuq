/// <reference path="../pb_data/types.d.ts" />
// Seed de contenido — 3 cursos PAES Ciencias (Biología, Física, Química).
//
// El `syllabus_markdown` es un campo "editor" de PocketBase (HTML), así que acá
// va HTML semántico y accesible (h2/h3/ul/p) que el frontend renderiza dentro de
// un contenedor con estilos tipográficos. La estructura por unidades vive en el
// syllabus; las lecciones con video se siembran aparte (1781100110) porque la
// colección `lecciones` es una lista plana sin agrupación por unidad.
//
// Idempotente: si ya existe un curso con el mismo `nombre`, se actualiza su
// contenido (autoritativo); si no, se crea.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("cursos");

  const upsertCurso = (data) => {
    let record;
    try {
      record = app.findFirstRecordByFilter("cursos", "nombre = {:n}", { n: data.nombre });
    } catch (_e) {
      record = new Record(collection);
    }
    record.set("nombre", data.nombre);
    record.set("descripcion", data.descripcion);
    record.set("materia", "ciencias");
    record.set("nivel", "intermedio");
    record.set("modalidad_default", "mixta");
    record.set("anio_lectivo", 2027);
    record.set("syllabus_markdown", data.syllabus);
    record.set("color_tema", data.color);
    record.set("icono", data.icono);
    record.set("activo", true);
    record.set("orden", data.orden);
    app.save(record);
  };

  // ---- Biología -----------------------------------------------------------
  upsertCurso({
    nombre: "Biología PAES",
    color: "success",
    icono: "Dna",
    orden: 1,
    descripcion:
      "Preparación PAES Ciencias — eje Biología. Desde la célula hasta los " +
      "ecosistemas: estructura y función celular, fisiología de los sistemas, " +
      "genética, evolución y ecología. Con videos explicativos por tema y " +
      "ensayos oficiales para practicar.",
    syllabus: `
<h2>Sobre este curso</h2>
<p>Este curso cubre el <strong>eje de Biología</strong> de la prueba PAES de Ciencias (DEMRE). Está organizado en cuatro unidades que van de lo micro a lo macro: partimos de la célula como unidad de la vida y terminamos en la dinámica de los ecosistemas. Cada lección incluye un video explicativo y se complementa con los ensayos oficiales de la biblioteca.</p>

<h2>Lo que vas a lograr</h2>
<ul>
  <li>Explicar la estructura y los procesos que ocurren dentro de la célula.</li>
  <li>Comprender cómo el cuerpo humano se coordina y mantiene su equilibrio interno.</li>
  <li>Resolver problemas de genética mendeliana y de expresión génica.</li>
  <li>Argumentar la teoría de la evolución con evidencia.</li>
  <li>Interpretar relaciones ecológicas y el flujo de materia y energía.</li>
</ul>

<h2>Unidades y contenidos</h2>

<h3>Unidad 1 · Organización, estructura y actividad celular</h3>
<ul>
  <li>Célula procarionte y eucarionte: organelos y funciones.</li>
  <li>Membrana plasmática y transporte (difusión, osmosis, transporte activo).</li>
  <li>Metabolismo celular: respiración celular y fotosíntesis.</li>
</ul>

<h3>Unidad 2 · Procesos y funciones biológicas</h3>
<ul>
  <li>Sistema nervioso: neurona, impulso y coordinación.</li>
  <li>Sistema endocrino y homeostasis (regulación hormonal).</li>
  <li>Sistema inmune: defensas, antígenos y anticuerpos.</li>
  <li>Sistema reproductor y sexualidad responsable.</li>
</ul>

<h3>Unidad 3 · Herencia y evolución</h3>
<ul>
  <li>Ciclo celular: mitosis y meiosis.</li>
  <li>Genética mendeliana: cruzamientos y probabilidad.</li>
  <li>ADN, expresión génica y mutaciones.</li>
  <li>Evolución y selección natural.</li>
</ul>

<h3>Unidad 4 · Organismo y ambiente</h3>
<ul>
  <li>Ecología: poblaciones, comunidades y ecosistemas.</li>
  <li>Flujo de energía, cadenas tróficas y ciclos biogeoquímicos.</li>
</ul>

<h2>Cómo estudiar</h2>
<p>Avanza por las lecciones en orden: mira el video, toma apuntes con tus palabras y resuelve preguntas del ensayo de <em>Ciencias Biología</em> en la biblioteca. La PAES de Ciencias premia <strong>interpretar datos y experimentos</strong> más que memorizar, así que practica leyendo gráficos y tablas.</p>
`.trim(),
  });

  // ---- Física -------------------------------------------------------------
  upsertCurso({
    nombre: "Física PAES",
    color: "info",
    icono: "Atom",
    orden: 2,
    descripcion:
      "Preparación PAES Ciencias — eje Física. Ondas y sonido, mecánica del " +
      "movimiento, energía, la Tierra en el universo y electricidad. Teoría " +
      "aplicada con videos por tema y ensayos oficiales para practicar.",
    syllabus: `
<h2>Sobre este curso</h2>
<p>Este curso cubre el <strong>eje de Física</strong> de la prueba PAES de Ciencias (DEMRE). La física se entiende practicando: cada lección parte de un fenómeno cotidiano, lo modela con conceptos y termina aplicándolo a problemas tipo PAES. Incluye videos por tema y los ensayos oficiales de la biblioteca.</p>

<h2>Lo que vas a lograr</h2>
<ul>
  <li>Describir y clasificar ondas, incluido el sonido y la luz.</li>
  <li>Resolver problemas de cinemática y aplicar las leyes de Newton.</li>
  <li>Usar la conservación de la energía y del momentum.</li>
  <li>Comprender la estructura de la Tierra y su lugar en el universo.</li>
  <li>Analizar circuitos eléctricos simples y el electromagnetismo.</li>
</ul>

<h2>Unidades y contenidos</h2>

<h3>Unidad 1 · Ondas</h3>
<ul>
  <li>Ondas: tipos, características (frecuencia, longitud, amplitud).</li>
  <li>Sonido: propagación, intensidad y efecto Doppler.</li>
  <li>Luz: reflexión y refracción.</li>
  <li>Óptica geométrica: lentes y espejos.</li>
</ul>

<h3>Unidad 2 · Mecánica</h3>
<ul>
  <li>Cinemática: MRU y MRUA.</li>
  <li>Vectores y movimiento en dos dimensiones.</li>
  <li>Leyes de Newton.</li>
  <li>Fuerza de roce y aplicaciones.</li>
</ul>

<h3>Unidad 3 · Energía y la Tierra en el universo</h3>
<ul>
  <li>Trabajo y energía mecánica.</li>
  <li>Conservación de la energía.</li>
  <li>Cantidad de movimiento (momentum) e impulso.</li>
  <li>La Tierra y el universo: estructura, origen y evolución.</li>
</ul>

<h3>Unidad 4 · Electricidad y magnetismo</h3>
<ul>
  <li>Carga eléctrica y ley de Coulomb.</li>
  <li>Circuitos: ley de Ohm, serie y paralelo.</li>
  <li>Potencia y energía eléctrica.</li>
  <li>Magnetismo y electromagnetismo.</li>
</ul>

<h2>Cómo estudiar</h2>
<p>No saltes la teoría, pero dedica la mayor parte del tiempo a <strong>resolver ejercicios</strong>. Anota siempre los datos, la incógnita y la fórmula antes de calcular. Practica con el ensayo de <em>Ciencias Física</em> de la biblioteca y revisa el formulario que aparece al inicio de la prueba.</p>
`.trim(),
  });

  // ---- Química ------------------------------------------------------------
  upsertCurso({
    nombre: "Química PAES",
    color: "accent",
    icono: "FlaskConical",
    orden: 3,
    descripcion:
      "Preparación PAES Ciencias — eje Química. Estructura atómica y enlace, " +
      "química orgánica y reacciones químicas con estequiometría. Teoría clara " +
      "con videos por tema y ensayos oficiales para practicar.",
    syllabus: `
<h2>Sobre este curso</h2>
<p>Este curso cubre el <strong>eje de Química</strong> de la prueba PAES de Ciencias (DEMRE), organizado en las tres áreas temáticas oficiales. Vamos desde el interior del átomo hasta el cálculo de cuánto reacciona con cuánto. Incluye videos por tema y los ensayos oficiales de la biblioteca.</p>

<h2>Lo que vas a lograr</h2>
<ul>
  <li>Describir la estructura del átomo y predecir propiedades con la tabla periódica.</li>
  <li>Explicar los tipos de enlace y la geometría de las moléculas.</li>
  <li>Reconocer grupos funcionales y nombrar compuestos orgánicos.</li>
  <li>Balancear ecuaciones y resolver problemas de estequiometría.</li>
  <li>Calcular concentraciones, pH y reconocer reacciones redox.</li>
</ul>

<h2>Áreas temáticas y contenidos</h2>

<h3>Área 1 · Estructura atómica</h3>
<ul>
  <li>Modelos atómicos y estructura del átomo.</li>
  <li>Configuración electrónica y números cuánticos.</li>
  <li>Tabla periódica y propiedades periódicas.</li>
  <li>Enlace químico: iónico, covalente y metálico.</li>
  <li>Geometría molecular y fuerzas intermoleculares.</li>
</ul>

<h3>Área 2 · Química orgánica</h3>
<ul>
  <li>El átomo de carbono e hidrocarburos.</li>
  <li>Grupos funcionales.</li>
  <li>Isomería.</li>
  <li>Reacciones orgánicas y polímeros.</li>
</ul>

<h3>Área 3 · Reacciones químicas y estequiometría</h3>
<ul>
  <li>El mol y cálculos estequiométricos.</li>
  <li>Ecuaciones químicas y balanceo.</li>
  <li>Disoluciones y concentración.</li>
  <li>Ácido-base y escala de pH.</li>
  <li>Reacciones de óxido-reducción (redox).</li>
</ul>

<h2>Cómo estudiar</h2>
<p>La química se apoya en cálculos: domina primero el <strong>concepto de mol</strong> y el balanceo, porque casi todo lo demás depende de ellos. Ten siempre a mano una tabla periódica y practica con el ensayo de <em>Ciencias Química</em> de la biblioteca para acostumbrarte al formato de las preguntas.</p>
`.trim(),
  });
}, (app) => {
  for (const nombre of ["Biología PAES", "Física PAES", "Química PAES"]) {
    try {
      const record = app.findFirstRecordByFilter("cursos", "nombre = {:n}", { n: nombre });
      app.delete(record);
    } catch (_e) {}
  }
});
