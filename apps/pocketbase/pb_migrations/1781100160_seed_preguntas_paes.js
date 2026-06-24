/// <reference path="../pb_data/types.d.ts" />
// Seed de contenido — 7 mini-ensayos PAES INTERACTIVOS (modo "interactivo").
//
// A diferencia de los simulacros-PDF (que el alumno leía aparte), acá las
// preguntas viven en `preguntas_paes` y se responden en pantalla; al entregar,
// el hook server-side `simulacros_paes.pb.js` calcula el puntaje comparando las
// respuestas con `clave_respuestas_json` (que esta migración llena a partir de
// la respuesta correcta de cada pregunta).
//
// CONTENIDO ORIGINAL PrePa, alineado al temario PAES (NO transcrito de los
// ensayos oficiales DEMRE). 10 preguntas por asignatura, cada una con respuesta
// correcta y explicación. Pensado como punto de partida revisable por los
// profes y ampliable a la extensión real de cada prueba.
//
// Idempotente: upsert del simulacro por `titulo`; las preguntas se borran y se
// recrean en cada corrida (la clave se regenera desde ellas).
migrate((app) => {
  const simColl = app.findCollectionByNameOrId("simulacros_paes");
  const pregColl = app.findCollectionByNameOrId("preguntas_paes");

  // Tabla de conversión referencial (misma curva 100–1000 que los PDF), keyed
  // al nº de preguntas puntuadas g.
  const tablaRef = (g) => ([
    { correctas: 0, puntaje: 100 },
    { correctas: Math.round(g * 0.25), puntaje: 400 },
    { correctas: Math.round(g * 0.5), puntaje: 600 },
    { correctas: Math.round(g * 0.75), puntaje: 780 },
    { correctas: Math.round(g * 0.9), puntaje: 880 },
    { correctas: g, puntaje: 1000 },
  ]);

  const A = (...textos) => textos.map((t, i) => ({ letra: ["A", "B", "C", "D", "E"][i], texto: t }));

  // Textos base originales para Competencia Lectora (escritos para PrePa).
  const TEXTO_SUENO =
    "El sueño no es un simple período de inactividad. Mientras dormimos, el cerebro realiza tareas esenciales: consolida los recuerdos del día, elimina desechos metabólicos acumulados en las neuronas y regula hormonas vinculadas al apetito y al estrés. Diversos estudios han mostrado que las personas que duermen menos de seis horas por noche presentan mayores dificultades para concentrarse y tomar decisiones.\n\nSin embargo, la cantidad de horas no lo es todo: la calidad del sueño, es decir, qué tan profundo y continuo es, resulta igualmente decisiva. Dormir en horarios regulares, reducir la exposición a pantallas antes de acostarse y mantener una habitación oscura y fresca son hábitos que favorecen un descanso reparador.\n\nEn una sociedad que valora la productividad constante, dormir suele verse como una pérdida de tiempo. No obstante, renunciar al sueño tiene un costo: a largo plazo, la falta crónica de descanso se asocia con problemas de memoria, debilitamiento del sistema inmune y mayor irritabilidad.";

  const TEXTO_ARBOLES =
    "Los árboles urbanos hacen mucho más que embellecer una ciudad. Sus copas proporcionan sombra que reduce la temperatura de calles y plazas, un alivio cada vez más necesario frente a las olas de calor. Además, sus hojas capturan partículas contaminantes y liberan oxígeno, mejorando la calidad del aire que respiran los habitantes. Las raíces, por su parte, ayudan a que el suelo absorba el agua de lluvia, disminuyendo el riesgo de inundaciones.\n\nA pesar de estos beneficios, en muchas ciudades los árboles son talados para ampliar calles o construir edificios, sin que se planten otros en su reemplazo. Especialistas advierten que una ciudad sin vegetación suficiente se vuelve más calurosa, ruidosa y hostil. Por eso, varios municipios han comenzado a impulsar planes de arborización que buscan aumentar la cantidad de árboles por habitante.\n\nCuidar el arbolado urbano, sostienen, no es un lujo estético, sino una inversión en salud y bienestar para toda la comunidad.";

  const SIMS = [
    // ---------------------------------------------------------------- BIOLOGÍA
    {
      titulo: "Mini-ensayo PrePa — Biología (interactivo)",
      asignatura: "ciencias",
      duracion: 15,
      descripcion: "Mini-ensayo interactivo de Biología (10 preguntas). Contenido original PrePa alineado al temario PAES. Respondes en pantalla y al terminar ves tu puntaje y la explicación de cada pregunta.",
      preguntas: [
        { eje: "Célula", enunciado: "¿Cuál es el organelo responsable de producir la mayor parte del ATP en una célula eucarionte?",
          alternativas: A("Ribosoma", "Aparato de Golgi", "Mitocondria", "Lisosoma"), correcta: "C",
          explicacion: "La mitocondria realiza la respiración celular (fosforilación oxidativa), donde se produce la mayor parte del ATP. El ribosoma sintetiza proteínas y el Golgi las procesa y empaqueta." },
        { eje: "Transporte celular", enunciado: "¿Cómo se llama el movimiento de moléculas a favor de su gradiente de concentración (de mayor a menor), sin gasto de energía?",
          alternativas: A("Difusión simple", "Transporte activo", "Endocitosis", "Exocitosis"), correcta: "A",
          explicacion: "La difusión es un transporte pasivo: las moléculas se mueven de donde hay más a donde hay menos sin gastar ATP. El transporte activo, en cambio, va en contra del gradiente y sí consume energía." },
        { eje: "Genética", enunciado: "En un cruzamiento entre dos individuos heterocigotos (Aa × Aa), con dominancia completa, ¿cuál es la proporción fenotípica esperada en la descendencia?",
          alternativas: A("1 : 1", "3 : 1", "9 : 3 : 3 : 1", "1 : 2 : 1"), correcta: "B",
          explicacion: "Aa × Aa da genotipos 1 AA : 2 Aa : 1 aa. Como A domina sobre a, fenotípicamente hay 3 con el rasgo dominante por 1 recesivo (3:1). El 1:2:1 es la proporción genotípica, no fenotípica." },
        { eje: "ADN y replicación", enunciado: "Durante la replicación del ADN, ¿qué enzima sintetiza la nueva hebra a partir de la hebra molde?",
          alternativas: A("ARN polimerasa", "Helicasa", "Ligasa", "ADN polimerasa"), correcta: "D",
          explicacion: "La ADN polimerasa agrega los nucleótidos de la hebra nueva. La helicasa abre la doble hélice y la ligasa une los fragmentos de Okazaki; ninguna de ellas sintetiza la hebra completa." },
        { eje: "Fotosíntesis", enunciado: "Durante la fotosíntesis, ¿qué gas captan las plantas desde el ambiente y cuál liberan?",
          alternativas: A("Captan O₂ y liberan CO₂", "Captan N₂ y liberan O₂", "Captan CO₂ y liberan O₂", "Captan CO₂ y liberan H₂"), correcta: "C",
          explicacion: "En la fotosíntesis las plantas toman dióxido de carbono (CO₂) y, usando la energía de la luz, liberan oxígeno (O₂). El consumo de O₂ y liberación de CO₂ corresponde a la respiración." },
        { eje: "Sistema inmune", enunciado: "¿Qué células del sistema inmune se especializan en producir anticuerpos?",
          alternativas: A("Linfocitos B (células plasmáticas)", "Glóbulos rojos", "Plaquetas", "Neuronas"), correcta: "A",
          explicacion: "Los linfocitos B, al activarse, se diferencian en células plasmáticas que secretan anticuerpos. Los glóbulos rojos transportan O₂ y las plaquetas participan en la coagulación." },
        { eje: "Ecología", enunciado: "En una cadena trófica, ¿cómo se denomina a los organismos autótrofos que producen materia orgánica a partir de la luz?",
          alternativas: A("Consumidores primarios", "Descomponedores", "Consumidores secundarios", "Productores"), correcta: "D",
          explicacion: "Los productores (plantas, algas) fabrican su propia materia orgánica mediante fotosíntesis y son la base de la cadena. Los consumidores se alimentan de otros y los descomponedores degradan materia muerta." },
        { eje: "División celular", enunciado: "¿Cuál es el resultado de una mitosis a partir de una célula diploide?",
          alternativas: A("Cuatro células haploides (gametos)", "Dos células diploides idénticas a la original", "Cuatro células diploides distintas", "Una célula con el doble de cromosomas"), correcta: "B",
          explicacion: "La mitosis produce dos células hijas con la misma dotación cromosómica (diploides) e idéntica información genética que la célula original. Las cuatro células haploides corresponden a la meiosis." },
        { eje: "Fisiología", enunciado: "¿En qué estructura del sistema respiratorio humano ocurre principalmente el intercambio de gases con la sangre?",
          alternativas: A("La tráquea", "Los bronquios", "Los alvéolos pulmonares", "La laringe"), correcta: "C",
          explicacion: "El intercambio de O₂ y CO₂ ocurre en los alvéolos, pequeños sacos rodeados de capilares. La tráquea y los bronquios solo conducen el aire hacia y desde los pulmones." },
        { eje: "Homeostasis", enunciado: "¿Cuál es el efecto principal de la insulina en el organismo?",
          alternativas: A("Disminuye la glicemia, favoreciendo la captación de glucosa por las células", "Aumenta la glicemia liberando glucosa a la sangre", "No tiene efecto sobre la glucosa", "Reemplaza a la hemoglobina"), correcta: "A",
          explicacion: "La insulina (secretada por el páncreas) baja la glucosa en sangre al facilitar su ingreso a las células. La hormona que sube la glicemia es el glucagón." },
      ],
    },

    // ----------------------------------------------------------------- FÍSICA
    {
      titulo: "Mini-ensayo PrePa — Física (interactivo)",
      asignatura: "ciencias",
      duracion: 15,
      descripcion: "Mini-ensayo interactivo de Física (10 preguntas). Contenido original PrePa alineado al temario PAES. Cinemática, dinámica, energía, ondas y electricidad básica.",
      preguntas: [
        { eje: "Cinemática", enunciado: "Un auto viaja a velocidad constante de 20 m/s durante 5 s. ¿Qué distancia recorre?",
          alternativas: A("25 m", "100 m", "4 m", "400 m"), correcta: "B",
          explicacion: "Con velocidad constante, d = v · t = 20 m/s · 5 s = 100 m." },
        { eje: "Cinemática", enunciado: "Un cuerpo parte del reposo y acelera de forma constante a 2 m/s² durante 4 s. ¿Qué velocidad alcanza?",
          alternativas: A("0,5 m/s", "8 m/s", "16 m/s", "2 m/s"), correcta: "B",
          explicacion: "Partiendo del reposo, v = a · t = 2 m/s² · 4 s = 8 m/s." },
        { eje: "Dinámica", enunciado: "Sobre un cuerpo de 2 kg actúa una fuerza neta de 10 N. ¿Cuál es su aceleración?",
          alternativas: A("0,2 m/s²", "20 m/s²", "5 m/s²", "12 m/s²"), correcta: "C",
          explicacion: "Por la segunda ley de Newton, a = F / m = 10 N / 2 kg = 5 m/s²." },
        { eje: "Fuerza de gravedad", enunciado: "En la Tierra (g ≈ 10 m/s²), ¿cuál es el peso de un objeto de 3 kg?",
          alternativas: A("0,3 N", "3 N", "300 N", "30 N"), correcta: "D",
          explicacion: "El peso es P = m · g = 3 kg · 10 m/s² = 30 N. La masa (3 kg) y el peso (30 N) son magnitudes distintas." },
        { eje: "Energía", enunciado: "¿Cuál es la energía cinética de un cuerpo de 4 kg que se mueve a 3 m/s? (Ec = ½ m v²)",
          alternativas: A("18 J", "6 J", "12 J", "36 J"), correcta: "A",
          explicacion: "Ec = ½ · 4 kg · (3 m/s)² = ½ · 4 · 9 = 18 J." },
        { eje: "Energía", enunciado: "Un objeto de 2 kg se encuentra a 5 m de altura (g = 10 m/s²). ¿Cuál es su energía potencial gravitatoria? (Ep = m g h)",
          alternativas: A("10 J", "100 J", "50 J", "1000 J"), correcta: "B",
          explicacion: "Ep = m · g · h = 2 kg · 10 m/s² · 5 m = 100 J." },
        { eje: "Ondas", enunciado: "¿Cómo se llama la cantidad de oscilaciones que una onda completa en un segundo?",
          alternativas: A("Amplitud", "Longitud de onda", "Período", "Frecuencia"), correcta: "D",
          explicacion: "La frecuencia es el número de oscilaciones por segundo (se mide en hertz, Hz). El período es el tiempo de una oscilación; ambos son inversos entre sí." },
        { eje: "Ondas", enunciado: "Una onda tiene una frecuencia de 5 Hz y una longitud de onda de 2 m. ¿Cuál es su rapidez de propagación? (v = λ · f)",
          alternativas: A("2,5 m/s", "7 m/s", "10 m/s", "0,4 m/s"), correcta: "C",
          explicacion: "v = λ · f = 2 m · 5 Hz = 10 m/s." },
        { eje: "Electricidad", enunciado: "En un circuito con un voltaje de 12 V y una resistencia de 4 Ω, ¿cuál es la corriente? (Ley de Ohm: I = V / R)",
          alternativas: A("3 A", "48 A", "8 A", "0,33 A"), correcta: "A",
          explicacion: "Por la ley de Ohm, I = V / R = 12 V / 4 Ω = 3 A." },
        { eje: "Calor", enunciado: "Si ponemos en contacto dos cuerpos a distinta temperatura, el calor fluye del más caliente al más frío hasta alcanzar:",
          alternativas: A("El cero absoluto", "El equilibrio térmico (igual temperatura)", "Su punto de ebullición", "La máxima energía posible"), correcta: "B",
          explicacion: "El calor se transfiere espontáneamente del cuerpo de mayor temperatura al de menor, hasta que ambos quedan a la misma temperatura: el equilibrio térmico." },
      ],
    },

    // ---------------------------------------------------------------- QUÍMICA
    {
      titulo: "Mini-ensayo PrePa — Química (interactivo)",
      asignatura: "ciencias",
      duracion: 15,
      descripcion: "Mini-ensayo interactivo de Química (10 preguntas). Contenido original PrePa alineado al temario PAES. Estructura atómica, enlaces, mol, soluciones y ácido-base.",
      preguntas: [
        { eje: "Estructura atómica", enunciado: "El número atómico (Z) de un elemento indica la cantidad de:",
          alternativas: A("Protones", "Neutrones", "Electrones de valencia", "Protones más neutrones"), correcta: "A",
          explicacion: "El número atómico Z corresponde al número de protones del núcleo (y, en un átomo neutro, también al de electrones). Protones + neutrones es el número másico A." },
        { eje: "Isótopos", enunciado: "Dos isótopos de un mismo elemento se diferencian en su número de:",
          alternativas: A("Protones", "Neutrones", "Electrones", "Carga eléctrica"), correcta: "B",
          explicacion: "Los isótopos tienen el mismo número de protones (mismo elemento) pero distinto número de neutrones, por lo que difieren en su masa." },
        { eje: "Tabla periódica", enunciado: "Los gases nobles (grupo 18) se caracterizan por:",
          alternativas: A("Ser muy reactivos", "Ser metales típicos", "Formar iones +1 con facilidad", "Tener su capa de valencia completa, por lo que son poco reactivos"), correcta: "D",
          explicacion: "Los gases nobles tienen su último nivel de energía completo (8 electrones, salvo el helio), lo que los hace muy estables y poco reactivos." },
        { eje: "Enlace químico", enunciado: "¿Qué tipo de enlace se forma por transferencia de electrones entre un metal y un no metal?",
          alternativas: A("Covalente apolar", "Covalente polar", "Iónico", "Metálico"), correcta: "C",
          explicacion: "El enlace iónico se forma cuando un metal cede electrones a un no metal, generando iones de carga opuesta que se atraen. En el covalente, en cambio, los electrones se comparten." },
        { eje: "Cantidad de sustancia", enunciado: "¿Cuál es la masa molar del agua (H₂O)? (masas atómicas: H = 1, O = 16 g/mol)",
          alternativas: A("16 g/mol", "18 g/mol", "17 g/mol", "34 g/mol"), correcta: "B",
          explicacion: "Masa molar del H₂O = 2 · (1) + 16 = 18 g/mol." },
        { eje: "Cantidad de sustancia", enunciado: "¿Cuántos moles hay en 36 g de agua? (masa molar del agua = 18 g/mol)",
          alternativas: A("0,5 mol", "1 mol", "18 mol", "2 mol"), correcta: "D",
          explicacion: "n = masa / masa molar = 36 g / 18 g/mol = 2 mol." },
        { eje: "Ácido-base", enunciado: "Una solución acuosa con pH = 3 es:",
          alternativas: A("Ácida", "Básica", "Neutra", "Salina"), correcta: "A",
          explicacion: "En la escala de pH (0 a 14), valores menores a 7 indican solución ácida; 7 es neutra y mayores a 7 son básicas. pH 3 es claramente ácido." },
        { eje: "Ácido-base", enunciado: "A 25 °C, una solución neutra tiene un pH igual a:",
          alternativas: A("0", "7", "14", "1"), correcta: "B",
          explicacion: "A 25 °C el agua pura y las soluciones neutras tienen pH = 7, punto medio de la escala." },
        { eje: "Estados de la materia", enunciado: "El cambio de estado de líquido a gaseoso se denomina:",
          alternativas: A("Fusión", "Solidificación", "Condensación", "Vaporización"), correcta: "D",
          explicacion: "El paso de líquido a gas es la vaporización (evaporación o ebullición). La condensación es el proceso inverso (gas a líquido) y la fusión es de sólido a líquido." },
        { eje: "Reacciones químicas", enunciado: "Según la ecuación 2 H₂ + O₂ → 2 H₂O, ¿cuántas moléculas de agua se forman por cada molécula de O₂ que reacciona?",
          alternativas: A("1 molécula", "2 moléculas", "3 moléculas", "4 moléculas"), correcta: "B",
          explicacion: "Los coeficientes indican la proporción: 1 molécula de O₂ produce 2 moléculas de H₂O (junto con 2 de H₂)." },
      ],
    },

    // ------------------------------------------------------- COMPETENCIA LECTORA
    {
      titulo: "Mini-ensayo PrePa — Competencia Lectora (interactivo)",
      asignatura: "competencia_lectora",
      duracion: 20,
      descripcion: "Mini-ensayo interactivo de Competencia Lectora (10 preguntas sobre 2 textos originales PrePa). Identifica la idea principal, localiza información, infiere y reconoce vocabulario en contexto.",
      preguntas: [
        { contexto: TEXTO_SUENO, eje: "Idea principal", enunciado: "¿Cuál es la idea principal del texto?",
          alternativas: A("Dormir es una pérdida de tiempo en una sociedad productiva", "Solo importa dormir exactamente ocho horas", "El sueño cumple funciones esenciales y su calidad es tan importante como su duración", "Las pantallas son la única causa de los problemas de sueño"), correcta: "C",
          explicacion: "El texto recorre las funciones del sueño y subraya que tanto la cantidad como la calidad importan. Las demás opciones son afirmaciones parciales o contrarias al texto." },
        { contexto: TEXTO_SUENO, eje: "Localizar información", enunciado: "Según el texto, ¿qué tarea realiza el cerebro mientras dormimos?",
          alternativas: A("Consolida los recuerdos del día", "Aumenta los desechos metabólicos", "Detiene por completo su actividad", "Reduce la producción de todas las hormonas"), correcta: "A",
          explicacion: "El primer párrafo afirma explícitamente que el cerebro 'consolida los recuerdos del día'. El texto dice que elimina desechos (no los aumenta) y que regula hormonas (no las suprime)." },
        { contexto: TEXTO_SUENO, eje: "Inferir", enunciado: "A partir del texto, ¿qué se puede concluir sobre una persona que duerme muchas horas pero de forma interrumpida?",
          alternativas: A("Necesariamente descansa bien", "No sufre ninguna consecuencia", "Mejora su memoria de forma garantizada", "Podría no tener un descanso reparador, porque la calidad del sueño también importa"), correcta: "D",
          explicacion: "El texto plantea que 'la cantidad de horas no lo es todo' y que la calidad (sueño profundo y continuo) es decisiva. Por eso un sueño interrumpido puede no ser reparador aunque sume muchas horas." },
        { contexto: TEXTO_SUENO, eje: "Vocabulario en contexto", enunciado: "En el texto, la palabra «reparador» se refiere a un descanso que:",
          alternativas: A("Daña el organismo", "Restaura o recupera el organismo", "Es muy breve", "Ocurre solamente de día"), correcta: "B",
          explicacion: "Un descanso 'reparador' es el que restaura las funciones del cuerpo; el contexto lo asocia a hábitos que favorecen la recuperación." },
        { contexto: TEXTO_SUENO, eje: "Propósito del autor", enunciado: "¿Cuál es la actitud del autor respecto del sueño?",
          alternativas: A("Lo considera una pérdida de tiempo", "Es indiferente al tema", "Lo valora como una necesidad con claros beneficios para la salud", "Lo desaconseja"), correcta: "C",
          explicacion: "Aunque menciona que la sociedad lo subestima, el autor argumenta a favor del sueño y advierte sobre los costos de no dormir; su postura es valorarlo." },
        { contexto: TEXTO_ARBOLES, eje: "Propósito del texto", enunciado: "¿Cuál es el propósito central del texto?",
          alternativas: A("Explicar cómo se construyen los edificios", "Destacar los beneficios de los árboles urbanos y la importancia de cuidarlos", "Criticar a los habitantes de las ciudades", "Describir los tipos de hojas de los árboles"), correcta: "B",
          explicacion: "El texto enumera los beneficios del arbolado urbano (sombra, aire, agua) y defiende su cuidado. Las otras opciones no recogen la idea global." },
        { contexto: TEXTO_ARBOLES, eje: "Localizar información", enunciado: "Según el texto, ¿en qué ayudan las raíces de los árboles?",
          alternativas: A("En aumentar las inundaciones", "En subir la temperatura de las calles", "En contaminar el aire", "En que el suelo absorba el agua de lluvia"), correcta: "D",
          explicacion: "El texto señala que las raíces 'ayudan a que el suelo absorba el agua de lluvia, disminuyendo el riesgo de inundaciones'." },
        { contexto: TEXTO_ARBOLES, eje: "Inferir", enunciado: "De acuerdo con el texto, se puede concluir que talar árboles sin reemplazarlos:",
          alternativas: A("No tiene ninguna consecuencia", "Mejora la ciudad", "Puede hacer la ciudad más calurosa y hostil", "Reduce el ruido"), correcta: "C",
          explicacion: "El texto advierte que 'una ciudad sin vegetación suficiente se vuelve más calurosa, ruidosa y hostil', por lo que talar sin reponer empeora esas condiciones." },
        { contexto: TEXTO_ARBOLES, eje: "Vocabulario en contexto", enunciado: "En el texto, la palabra «arborización» se refiere a:",
          alternativas: A("Plantar y aumentar la cantidad de árboles", "Talar árboles para ampliar calles", "Regar las plazas", "Construir edificios nuevos"), correcta: "A",
          explicacion: "Los 'planes de arborización' buscan 'aumentar la cantidad de árboles por habitante', es decir, plantar más árboles." },
        { contexto: TEXTO_ARBOLES, eje: "Interpretar", enunciado: "Cuando el texto dice que cuidar los árboles «no es un lujo estético, sino una inversión», quiere decir que:",
          alternativas: A("Solo sirve para que la ciudad se vea bonita", "Es un gasto innecesario", "No vale la pena hacerlo", "Tiene un valor práctico para la salud y el bienestar, más allá de lo visual"), correcta: "D",
          explicacion: "La frase contrasta lo meramente decorativo ('lujo estético') con un beneficio real y duradero ('inversión en salud y bienestar'): el cuidado de los árboles tiene utilidad práctica." },
      ],
    },

    // ----------------------------------------------------------- MATEMÁTICA M1
    {
      titulo: "Mini-ensayo PrePa — Matemática M1 (interactivo)",
      asignatura: "matematica_m1",
      duracion: 18,
      descripcion: "Mini-ensayo interactivo de Matemática M1 (10 preguntas). Contenido original PrePa alineado al temario PAES. Números, proporciones, álgebra básica, geometría y probabilidad.",
      preguntas: [
        { eje: "Porcentajes", enunciado: "¿Cuál es el 20% de 150?",
          alternativas: A("3", "30", "15", "50"), correcta: "B",
          explicacion: "20% de 150 = 0,20 · 150 = 30." },
        { eje: "Fracciones", enunciado: "¿Cuál es el resultado de 1/2 + 1/3?",
          alternativas: A("2/5", "5/6", "1/5", "2/6"), correcta: "B",
          explicacion: "Con denominador común 6: 1/2 = 3/6 y 1/3 = 2/6, de modo que 3/6 + 2/6 = 5/6." },
        { eje: "Proporcionalidad", enunciado: "Si 3 lápices cuestan $600, ¿cuánto cuestan 5 lápices al mismo precio unitario?",
          alternativas: A("$900", "$800", "$1.000", "$1.200"), correcta: "C",
          explicacion: "Cada lápiz vale 600 / 3 = $200. Entonces 5 lápices cuestan 5 · 200 = $1.000." },
        { eje: "Ecuaciones", enunciado: "¿Cuál es la solución de la ecuación 2x + 5 = 17?",
          alternativas: A("x = 6", "x = 11", "x = 6,5", "x = 4"), correcta: "A",
          explicacion: "2x = 17 − 5 = 12, por lo tanto x = 12 / 2 = 6." },
        { eje: "Potencias", enunciado: "¿Cuál es el valor de 2³ · 2²?",
          alternativas: A("16", "32", "64", "8"), correcta: "B",
          explicacion: "Al multiplicar potencias de igual base se suman los exponentes: 2³ · 2² = 2⁵ = 32." },
        { eje: "Álgebra", enunciado: "¿Cuál es el valor de la expresión 3(x − 2) cuando x = 5?",
          alternativas: A("3", "13", "21", "9"), correcta: "D",
          explicacion: "3(5 − 2) = 3 · 3 = 9." },
        { eje: "Geometría", enunciado: "¿Cuál es el área de un rectángulo de 8 cm de base y 3 cm de altura?",
          alternativas: A("11 cm²", "22 cm²", "24 cm²", "48 cm²"), correcta: "C",
          explicacion: "Área del rectángulo = base · altura = 8 · 3 = 24 cm²." },
        { eje: "Geometría", enunciado: "¿Cuál es el área aproximada de un círculo de radio 5 cm? (usa π ≈ 3,14; A = π r²)",
          alternativas: A("15,7 cm²", "31,4 cm²", "25 cm²", "78,5 cm²"), correcta: "D",
          explicacion: "A = π · r² = 3,14 · 5² = 3,14 · 25 = 78,5 cm²." },
        { eje: "Estadística", enunciado: "¿Cuál es el promedio (media aritmética) de los números 4, 8 y 6?",
          alternativas: A("5", "6", "9", "18"), correcta: "B",
          explicacion: "Promedio = (4 + 8 + 6) / 3 = 18 / 3 = 6." },
        { eje: "Probabilidad", enunciado: "Al lanzar un dado común de 6 caras, ¿cuál es la probabilidad de obtener un número par?",
          alternativas: A("1/6", "1/3", "1/2", "2/3"), correcta: "C",
          explicacion: "Los números pares son 2, 4 y 6: 3 casos favorables de 6 posibles, es decir 3/6 = 1/2." },
      ],
    },

    // ----------------------------------------------------------- MATEMÁTICA M2
    {
      titulo: "Mini-ensayo PrePa — Matemática M2 (interactivo)",
      asignatura: "matematica_m2",
      duracion: 20,
      descripcion: "Mini-ensayo interactivo de Matemática M2 (10 preguntas). Contenido original PrePa alineado al temario PAES. Funciones, logaritmos, trigonometría y probabilidad.",
      preguntas: [
        { eje: "Función cuadrática", enunciado: "Si f(x) = x² − 4x + 3, ¿cuál es el valor de f(2)?",
          alternativas: A("−1", "3", "1", "7"), correcta: "A",
          explicacion: "f(2) = 2² − 4·2 + 3 = 4 − 8 + 3 = −1." },
        { eje: "Ecuación cuadrática", enunciado: "¿Cuáles son las soluciones de la ecuación x² − 5x + 6 = 0?",
          alternativas: A("−2 y −3", "2 y 3", "1 y 6", "5 y 6"), correcta: "B",
          explicacion: "Factorizando: (x − 2)(x − 3) = 0, por lo que x = 2 o x = 3 (suman 5 y multiplican 6)." },
        { eje: "Logaritmos", enunciado: "¿Cuál es el valor de log₂(8)?",
          alternativas: A("2", "3", "4", "8"), correcta: "B",
          explicacion: "log₂(8) pregunta a qué exponente hay que elevar 2 para obtener 8. Como 2³ = 8, el resultado es 3." },
        { eje: "Trigonometría", enunciado: "¿Cuál es el valor de sen(30°)?",
          alternativas: A("0", "1", "0,5", "√3/2"), correcta: "C",
          explicacion: "sen(30°) = 1/2 = 0,5 es un valor notable de la trigonometría." },
        { eje: "Trigonometría", enunciado: "¿Cuál es el valor de cos(60°)?",
          alternativas: A("1", "√2/2", "0", "0,5"), correcta: "D",
          explicacion: "cos(60°) = 1/2 = 0,5, otro valor notable. (Coincide con sen(30°) porque 60° y 30° son ángulos complementarios.)" },
        { eje: "Función exponencial", enunciado: "Si f(x) = 3ˣ, ¿cuál es el valor de f(2)?",
          alternativas: A("6", "8", "9", "27"), correcta: "C",
          explicacion: "f(2) = 3² = 9." },
        { eje: "Progresiones", enunciado: "En la secuencia aritmética 2, 5, 8, 11, …, ¿cuál es el término siguiente?",
          alternativas: A("12", "13", "15", "14"), correcta: "D",
          explicacion: "La diferencia constante es 3 (2→5→8→11). El siguiente término es 11 + 3 = 14." },
        { eje: "Probabilidad", enunciado: "Se lanza una moneda equilibrada dos veces. ¿Cuál es la probabilidad de obtener dos caras?",
          alternativas: A("1/2", "1/4", "1/3", "3/4"), correcta: "B",
          explicacion: "Los eventos son independientes: P(cara y cara) = 1/2 · 1/2 = 1/4." },
        { eje: "Sistemas de ecuaciones", enunciado: "Si x + y = 10 y x − y = 2, ¿cuál es el valor de x?",
          alternativas: A("6", "4", "5", "8"), correcta: "A",
          explicacion: "Sumando ambas ecuaciones: 2x = 12, por lo que x = 6 (y entonces y = 4)." },
        { eje: "Función lineal", enunciado: "¿Cuál es la pendiente de la recta que pasa por los puntos (0, 1) y (2, 5)?",
          alternativas: A("1", "2", "3", "4"), correcta: "B",
          explicacion: "Pendiente m = (5 − 1) / (2 − 0) = 4 / 2 = 2." },
      ],
    },

    // ------------------------------------------------------------------ HISTORIA
    {
      titulo: "Mini-ensayo PrePa — Historia y Cs. Sociales (interactivo)",
      asignatura: "historia",
      duracion: 15,
      descripcion: "Mini-ensayo interactivo de Historia y Ciencias Sociales (10 preguntas). Contenido original PrePa alineado al temario PAES. Formación ciudadana, historia, geografía y economía.",
      preguntas: [
        { eje: "Formación ciudadana", enunciado: "En una república democrática, ¿en quién reside esencialmente la soberanía?",
          alternativas: A("En el poder militar", "En un solo gobernante vitalicio", "En el pueblo (la nación)", "En las grandes empresas"), correcta: "C",
          explicacion: "En una democracia la soberanía radica en el pueblo, que la ejerce mediante elecciones y representantes. Ese es el principio de soberanía popular." },
        { eje: "Organización del Estado", enunciado: "En Chile, ¿qué poder del Estado tiene como función principal elaborar y aprobar las leyes?",
          alternativas: A("El Poder Legislativo (Congreso)", "El Poder Ejecutivo", "El Poder Judicial", "La Contraloría"), correcta: "A",
          explicacion: "El Poder Legislativo (Cámara de Diputados y Senado) elabora y aprueba las leyes. El Ejecutivo gobierna y administra; el Judicial resuelve conflictos aplicando la ley." },
        { eje: "Derechos humanos", enunciado: "Una característica esencial de los derechos humanos es que son:",
          alternativas: A("Exclusivos de algunos grupos", "Temporales", "Otorgados según el nivel de ingreso", "Universales e inalienables"), correcta: "D",
          explicacion: "Los derechos humanos pertenecen a todas las personas por igual (universales) y no se pueden quitar ni renunciar a ellos (inalienables)." },
        { eje: "Historia de Chile", enunciado: "El proceso de Independencia de Chile se desarrolló principalmente durante el:",
          alternativas: A("Siglo XVIII", "Siglo XIX", "Siglo XX", "Siglo XVII"), correcta: "B",
          explicacion: "La Independencia de Chile transcurrió entre 1810 y 1818, es decir, a comienzos del siglo XIX." },
        { eje: "Geografía de Chile", enunciado: "Una característica destacada del territorio de Chile es que es un país:",
          alternativas: A("Mediterráneo, sin acceso al mar", "Completamente plano", "Tricontinental y de gran extensión latitudinal (largo y angosto)", "Totalmente insular"), correcta: "C",
          explicacion: "Chile es tricontinental (América, Antártica y Oceanía con Rapa Nui) y se extiende a lo largo de muchos grados de latitud, lo que le da su forma larga y angosta." },
        { eje: "Economía", enunciado: "En un mercado, si la cantidad demandada de un bien supera a la ofertada, lo más probable es que el precio:",
          alternativas: A("Suba", "Baje", "No cambie", "Haga desaparecer el bien"), correcta: "A",
          explicacion: "Cuando la demanda supera a la oferta (escasez relativa), la presión de los compradores tiende a hacer subir el precio del bien." },
        { eje: "Recursos naturales", enunciado: "¿Cuál de los siguientes es un recurso natural no renovable?",
          alternativas: A("La energía solar", "El viento", "El petróleo", "El agua de lluvia"), correcta: "C",
          explicacion: "El petróleo tarda millones de años en formarse, por lo que se agota a escala humana: es no renovable. El sol, el viento y la lluvia se reponen continuamente." },
        { eje: "Historia universal", enunciado: "La Revolución Francesa (1789) proclamó principios de:",
          alternativas: A("Monarquía absoluta", "Feudalismo", "Esclavitud", "Libertad, igualdad y fraternidad"), correcta: "D",
          explicacion: "El lema de la Revolución Francesa fue 'Libertad, igualdad y fraternidad', en oposición al absolutismo monárquico del Antiguo Régimen." },
        { eje: "Institucionalidad", enunciado: "En Chile, ¿qué organismo está encargado de organizar y administrar los procesos electorales?",
          alternativas: A("El SERVEL (Servicio Electoral)", "El Banco Central", "El Servicio de Impuestos Internos (SII)", "El INE"), correcta: "A",
          explicacion: "El SERVEL administra los procesos electorales y el registro electoral. El Banco Central maneja la política monetaria, el SII los impuestos y el INE las estadísticas." },
        { eje: "Participación ciudadana", enunciado: "¿Cuál de las siguientes es una forma de participación ciudadana en democracia?",
          alternativas: A("Pagar solamente impuestos", "Votar en las elecciones", "No informarse sobre los temas públicos", "Evadir la ley"), correcta: "B",
          explicacion: "Votar es una de las formas más directas de participación ciudadana, porque permite incidir en quiénes toman las decisiones públicas." },
      ],
    },
  ];

  for (const s of SIMS) {
    // upsert del simulacro por titulo (no pisa intentos ya rendidos)
    let sim;
    try {
      sim = app.findFirstRecordByFilter("simulacros_paes", "titulo = {:t}", { t: s.titulo });
    } catch (_e) {
      sim = new Record(simColl);
    }
    const n = s.preguntas.length;
    sim.set("titulo", s.titulo);
    sim.set("asignatura", s.asignatura);
    sim.set("fecha", "2027-06-21 12:00:00.000Z");
    sim.set("n_preguntas_total", n);
    sim.set("tabla_conversion_json", tablaRef(n));
    sim.set("puntaje_max_chile", 1000);
    sim.set("descripcion", s.descripcion);
    sim.set("duracion_min", s.duracion);
    sim.set("modo", "interactivo");
    sim.set("estado", "publicado");
    // clave derivada de las preguntas (índice = numero − 1, igual que el front)
    sim.set("clave_respuestas_json", s.preguntas.map((p) => p.correcta));
    app.save(sim);

    // borrar preguntas previas de este simulacro y recrearlas (idempotente)
    try {
      const viejas = app.findRecordsByFilter("preguntas_paes", "simulacro_id = {:sid}", "", 500, 0, { sid: sim.id });
      for (const v of viejas) app.delete(v);
    } catch (_e) {}

    s.preguntas.forEach((p, idx) => {
      const preg = new Record(pregColl);
      preg.set("simulacro_id", sim.id);
      preg.set("numero", idx + 1);
      preg.set("eje", p.eje || "");
      if (p.contexto) preg.set("contexto", p.contexto);
      preg.set("enunciado", p.enunciado);
      preg.set("alternativas_json", p.alternativas);
      preg.set("respuesta_correcta", p.correcta);
      preg.set("explicacion", p.explicacion || "");
      app.save(preg);
    });
  }
}, (app) => {
  const titulos = [
    "Mini-ensayo PrePa — Biología (interactivo)",
    "Mini-ensayo PrePa — Física (interactivo)",
    "Mini-ensayo PrePa — Química (interactivo)",
    "Mini-ensayo PrePa — Competencia Lectora (interactivo)",
    "Mini-ensayo PrePa — Matemática M1 (interactivo)",
    "Mini-ensayo PrePa — Matemática M2 (interactivo)",
    "Mini-ensayo PrePa — Historia y Cs. Sociales (interactivo)",
  ];
  for (const t of titulos) {
    try {
      // borrar el simulacro arrastra sus preguntas (cascadeDelete en la relación)
      const rec = app.findFirstRecordByFilter("simulacros_paes", "titulo = {:t}", { t });
      app.delete(rec);
    } catch (_e) {}
  }
});
