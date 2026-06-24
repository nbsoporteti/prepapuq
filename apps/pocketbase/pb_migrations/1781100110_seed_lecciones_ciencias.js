/// <reference path="../pb_data/types.d.ts" />
// Seed de contenido — lecciones de los 3 cursos PAES Ciencias.
//
// `lecciones` es una lista plana (sin agrupación por unidad), así que el orden
// secuencial reconstruye el recorrido por unidades definido en el syllabus del
// curso. Cada lección apunta a un video de YouTube (campo `video_url`, tipo url)
// y usa `descripcion` como objetivo de aprendizaje.
//
// Idempotente: upsert por (curso_id + titulo).
migrate((app) => {
  const lecciones = app.findCollectionByNameOrId("lecciones");

  const yt = (id) => `https://www.youtube.com/watch?v=${id}`;

  const cursos = [
    {
      nombre: "Biología PAES",
      items: [
        ["La célula: estructura y organización", "_ejQaAsna3k", "Distingue célula procarionte de eucarionte e identifica la función de cada organelo."],
        ["Membrana celular y transporte", "JIFP22tG9R0", "Comprende cómo la membrana regula el paso de sustancias: difusión, osmosis y transporte activo."],
        ["Metabolismo celular: respiración y fotosíntesis", "_2dViQGbBDM", "Relaciona fotosíntesis y respiración celular como procesos de obtención y uso de energía."],
        ["Sistema nervioso y coordinación", "X4tM9h6TrIg", "Explica cómo la neurona transmite el impulso y cómo el sistema nervioso coordina al organismo."],
        ["Sistema endocrino y homeostasis", "iJCJqXMhh5s", "Describe la regulación hormonal y cómo el cuerpo mantiene su equilibrio interno."],
        ["Sistema inmune y defensa del organismo", "eRxYGDqZxmc", "Identifica las barreras de defensa y la respuesta de antígenos y anticuerpos."],
        ["Sistema reproductor y sexualidad", "eOxrPr7XH9k", "Conoce la anatomía reproductiva, el ciclo menstrual y la sexualidad responsable."],
        ["Ciclo celular: mitosis y meiosis", "-mu4hvR2Dp8", "Diferencia mitosis de meiosis y su rol en el crecimiento y la reproducción."],
        ["Genética mendeliana", "pz_68nsE5SE", "Resuelve cruzamientos y calcula probabilidades de herencia con las leyes de Mendel."],
        ["ADN, expresión génica y mutaciones", "Dvm3hdlWr80", "Comprende cómo el ADN se expresa en proteínas y qué efecto tienen las mutaciones."],
        ["Evolución y selección natural", "3t266EiQKvA", "Argumenta la evolución de las especies con evidencia y el mecanismo de selección natural."],
        ["Ecología: ecosistemas y flujo de energía", "loTGzLCHV8E", "Interpreta relaciones tróficas, flujo de energía y ciclos de la materia en los ecosistemas."],
      ],
    },
    {
      nombre: "Física PAES",
      items: [
        ["Introducción a las ondas", "okSglkoeE00", "Clasifica las ondas y maneja sus características: frecuencia, longitud de onda y amplitud."],
        ["Sonido: propagación, intensidad y Doppler", "OhcleDHc8Kk", "Explica cómo se propaga el sonido, su intensidad y el efecto Doppler."],
        ["Luz: reflexión y refracción", "rbvTVigZW2Y", "Aplica las leyes de reflexión y refracción al comportamiento de la luz."],
        ["Óptica: lentes y espejos", "qYyXeDQwC0I", "Construye e interpreta las imágenes formadas por lentes y espejos."],
        ["Cinemática: MRU y MRUA", "9FkWqbAlN3k", "Describe el movimiento con gráficos y ecuaciones de MRU y MRUA."],
        ["Vectores y movimiento en dos dimensiones", "SmuGUTY81AU", "Opera con vectores y analiza el movimiento en dos dimensiones."],
        ["Leyes de Newton", "u9Z_D1z4DjQ", "Aplica las tres leyes de Newton a sistemas con fuerzas."],
        ["Fuerza de roce y aplicaciones", "M1bPKU-nTRY", "Incorpora la fuerza de roce a la resolución de problemas de dinámica."],
        ["Trabajo y energía mecánica", "Ap5z4DgsZNQ", "Relaciona trabajo, energía cinética y energía potencial."],
        ["Conservación de la energía", "j7bEgvHL4qI", "Usa el principio de conservación de la energía para resolver problemas."],
        ["Cantidad de movimiento e impulso", "NBbF8Pysvjs", "Aplica la conservación del momentum en choques e impulsos."],
        ["La Tierra y el universo", "LrMewCUhZj4", "Describe la estructura de la Tierra y su lugar en el universo."],
        ["Carga eléctrica y ley de Coulomb", "QIw3js2oKvg", "Calcula fuerzas eléctricas entre cargas con la ley de Coulomb."],
        ["Circuitos eléctricos: ley de Ohm", "JhhZz3fl0D8", "Analiza circuitos en serie y paralelo aplicando la ley de Ohm."],
        ["Potencia y energía eléctrica", "2zNjLcQeuK4", "Calcula la potencia y el consumo de energía eléctrica."],
        ["Magnetismo y electromagnetismo", "nb7c1h0wJ6s", "Relaciona electricidad y magnetismo: campos y fenómenos electromagnéticos."],
      ],
    },
    {
      nombre: "Química PAES",
      items: [
        ["Modelos atómicos y estructura del átomo", "mwPKa-oxhvc", "Reconstruye la evolución de los modelos atómicos y la estructura del átomo."],
        ["Configuración electrónica y números cuánticos", "1YWb-ahJvAg", "Escribe configuraciones electrónicas y asocia los números cuánticos."],
        ["Tabla periódica y propiedades periódicas", "9OG_SDg4GAM", "Predice propiedades de los elementos según su posición en la tabla periódica."],
        ["Enlace químico: iónico, covalente y metálico", "5-jW1Tppdgs", "Distingue los tipos de enlace y las propiedades que les confieren a los compuestos."],
        ["Geometría molecular y fuerzas intermoleculares", "JJPujh7CW7g", "Determina la geometría de las moléculas y las fuerzas entre ellas."],
        ["El átomo de carbono e hidrocarburos", "_25WGvTJSoo", "Describe la versatilidad del carbono y nombra los hidrocarburos."],
        ["Grupos funcionales", "9BfbmEjoLfY", "Identifica y nombra los principales grupos funcionales orgánicos."],
        ["Isomería", "i4Z7HFPDV9U", "Reconoce los distintos tipos de isomería en compuestos orgánicos."],
        ["Reacciones orgánicas y polímeros", "rX_7BNvgGTY", "Comprende reacciones orgánicas básicas y la formación de polímeros."],
        ["El mol y cálculos estequiométricos", "wl_HCBxpBs0", "Domina el concepto de mol y resuelve cálculos estequiométricos."],
        ["Ecuaciones químicas y balanceo", "WBoDPNiUrqU", "Balancea ecuaciones químicas y las interpreta cuantitativamente."],
        ["Disoluciones y concentración", "oyI7a9rfC7s", "Calcula concentraciones (molaridad, % m/m, ppm) de disoluciones."],
        ["Ácido-base y escala de pH", "5JqRhjEuSek", "Aplica el concepto de ácido-base y calcula el pH de una disolución."],
        ["Reacciones de óxido-reducción (redox)", "Vcwemyu1-vk", "Identifica oxidación y reducción y balancea reacciones redox."],
      ],
    },
  ];

  for (const curso of cursos) {
    let cursoRec;
    try {
      cursoRec = app.findFirstRecordByFilter("cursos", "nombre = {:n}", { n: curso.nombre });
    } catch (_e) {
      console.log("[1781100110] curso no encontrado, skip: " + curso.nombre);
      continue;
    }
    let orden = 1;
    for (const [titulo, video, objetivo] of curso.items) {
      let rec;
      try {
        rec = app.findFirstRecordByFilter(
          "lecciones",
          "curso_id = {:c} && titulo = {:t}",
          { c: cursoRec.id, t: titulo },
        );
      } catch (_e) {
        rec = new Record(lecciones);
      }
      rec.set("curso_id", cursoRec.id);
      rec.set("titulo", titulo);
      rec.set("descripcion", objetivo);
      rec.set("orden", orden);
      rec.set("video_url", yt(video));
      rec.set("publicada", true);
      app.save(rec);
      orden++;
    }
  }
}, (app) => {
  for (const nombre of ["Biología PAES", "Física PAES", "Química PAES"]) {
    try {
      const cursoRec = app.findFirstRecordByFilter("cursos", "nombre = {:n}", { n: nombre });
      const recs = app.findRecordsByFilter("lecciones", "curso_id = {:c}", "", 500, 0, { c: cursoRec.id });
      for (const r of recs) {
        try { app.delete(r); } catch (_e) {}
      }
    } catch (_e) {}
  }
});
