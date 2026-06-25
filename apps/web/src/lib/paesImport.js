// Parser y utilidades para el importador de preguntas PAES (panel admin).
//
// El admin/profe pega las preguntas en un formato de texto simple y este módulo
// las convierte en la estructura que consumen `simulacros_paes` + `preguntas_paes`.
// El sistema arma la clave solo (la alternativa marcada con `*` o con
// "Correcta: X") y queda auto-corrigiendo igual que los mini-ensayos.
//
// IMPORTANTE: este módulo NO contiene ni reproduce contenido oficial DEMRE.
// Solo transforma el texto que el usuario decide pegar, bajo su responsabilidad.

export const ASIGNATURAS = [
  { value: 'competencia_lectora', label: 'Competencia Lectora' },
  { value: 'matematica_m1', label: 'Matemática M1' },
  { value: 'matematica_m2', label: 'Matemática M2' },
  { value: 'historia', label: 'Historia y Cs. Sociales' },
  { value: 'ciencias', label: 'Ciencias' },
];

export const ESTADOS = [
  { value: 'publicado', label: 'Publicado (visible para estudiantes)' },
  { value: 'programado', label: 'Borrador / programado (oculto)' },
];

export const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const DIFICULTADES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' },
];

export const DIFICULTAD_LABEL = {
  facil: 'Fácil',
  media: 'Media',
  dificil: 'Difícil',
};

// Ejes/temarios sugeridos por asignatura. Son solo sugerencias para autocompletar:
// el profe puede escribir cualquier eje.
export const EJES_POR_ASIGNATURA = {
  competencia_lectora: ['Localizar', 'Interpretar y relacionar', 'Evaluar y reflexionar'],
  matematica_m1: ['Números', 'Álgebra y funciones', 'Geometría', 'Probabilidad y estadística'],
  matematica_m2: ['Números', 'Álgebra y funciones', 'Geometría', 'Probabilidad y estadística', 'Cálculo'],
  historia: ['Historia', 'Geografía', 'Formación ciudadana', 'Economía y sociedad'],
  ciencias: ['Biología', 'Física', 'Química'],
};

// Normaliza el texto de dificultad (acepta acentos / variantes) a la clave interna.
export function normDificultad(s) {
  const t = String(s || '').toLowerCase().trim();
  if (t.startsWith('fac') || t.startsWith('fác')) return 'facil';
  if (t.startsWith('dif')) return 'dificil';
  if (t.startsWith('med')) return 'media';
  return '';
}

// Curva de conversión referencial 100–1000 según nº de preguntas. Misma fórmula
// que usan los seeds de los mini-ensayos, para que el puntaje sea consistente.
export const tablaConversionRef = (g) => [
  { correctas: 0, puntaje: 100 },
  { correctas: Math.round(g * 0.25), puntaje: 400 },
  { correctas: Math.round(g * 0.5), puntaje: 600 },
  { correctas: Math.round(g * 0.75), puntaje: 780 },
  { correctas: Math.round(g * 0.9), puntaje: 880 },
  { correctas: g, puntaje: 1000 },
];

// --- Tabla de conversión personalizada (ej: tabla oficial DEMRE) ------------
// Texto editable, una fila por línea con formato  "correctas: puntaje".
export function serializeTabla(tabla) {
  return (tabla || []).map((r) => `${r.correctas}: ${r.puntaje}`).join('\n');
}

export function parseTabla(raw) {
  const rows = [];
  for (const line of String(raw || '').split('\n')) {
    const mm = line.match(/^\s*(\d+)\s*[:=\t-]\s*(\d+)\s*$/);
    if (mm) rows.push({ correctas: parseInt(mm[1], 10), puntaje: parseInt(mm[2], 10) });
  }
  rows.sort((a, b) => a.correctas - b.correctas);
  return rows;
}

// Valida la tabla. Devuelve un string de error o null si está OK.
export function validateTabla(rows, maxCorrectas) {
  if (!rows || !rows.length) {
    return 'La tabla no tiene filas válidas (usá una línea "correctas: puntaje").';
  }
  const seen = new Set();
  for (const r of rows) {
    if (r.puntaje < 100 || r.puntaje > 1000) return `Puntaje fuera de rango (100–1000): ${r.puntaje}.`;
    if (r.correctas < 0 || r.correctas > maxCorrectas) {
      return `“Correctas” fuera de rango (0–${maxCorrectas}): ${r.correctas}.`;
    }
    if (seen.has(r.correctas)) return `Hay dos filas con ${r.correctas} correctas.`;
    seen.add(r.correctas);
  }
  return null;
}

const RE_OPTION = /^\s*(\*?)\s*([A-Ea-e])\s*[).\-]\s+(.*)$/;
const RE_KEY = /^\s*(?:correcta|clave|respuesta)\s*[:=]\s*([A-Ea-e])\s*$/i;
const RE_EJE = /^\s*eje\s*[:=]\s*(.+)$/i;
const RE_EXPL = /^\s*explicaci[oó]n\s*[:=]\s*(.+)$/i;
const RE_DIF = /^\s*dificultad\s*[:=]\s*(.+)$/i;
const RE_PILOTO = /^\s*piloto\s*$/i;
const RE_CTX = /^\s*(?:texto|contexto)\s*[:=]?\s*(.*)$/i;
const RE_SEP = /^\s*[-=]{3,}\s*$/;

// Detecta una FILA de alternativas en una sola línea ("A) 12  B) 15  C) 18 …"),
// típica de respuestas cortas en los folletos DEMRE. Solo divide si las letras
// van en secuencia A, B, C… desde el inicio de la línea (señal fuerte de que es
// una fila de alternativas y no prosa). Devuelve [{letra, star, texto}] o null.
const RE_INLINE_OPT = /(\*?)\s*([A-Ea-e])\s*[).\-]\s+/g;
function splitInlineOptions(line) {
  RE_INLINE_OPT.lastIndex = 0;
  const marks = [];
  let m;
  while ((m = RE_INLINE_OPT.exec(line)) !== null) {
    marks.push({ start: m.index, end: RE_INLINE_OPT.lastIndex, star: m[1] === '*', letra: m[2].toUpperCase() });
  }
  if (marks.length < 2) return null;
  if (line.slice(0, marks[0].start).trim() !== '') return null; // debe arrancar en la 1ª alternativa
  for (let i = 0; i < marks.length; i += 1) {
    if (marks[i].letra !== LETTERS[i]) return null; // exige A, B, C… en orden
  }
  return marks.map((mk, i) => {
    const stop = i + 1 < marks.length ? marks[i + 1].start : line.length;
    return { letra: mk.letra, star: mk.star, texto: line.slice(mk.end, stop).trim() };
  });
}

// Número de pregunta con delimitador OPCIONAL: matchea "12.", "12)", "12 texto"
// y "12" solo. Los folletos DEMRE no siempre ponen el punto y a veces el número
// queda solo en su línea; por eso la detección real se apoya en la SECUENCIA.
const RE_QNUM = /^\s*(\d{1,3})\s*([.)])?\s*(.*)$/;
// Versión laxa para anclar (línea que arranca con un número, con/ sin punto).
const RE_QSTART = /^\s*\d{1,3}\s*[.)]?(?:\s|$)/;

// ¿La línea idx va seguida, en pocas líneas, de >=2 alternativas? Señal fuerte
// de que esa línea numerada es una pregunta (y no un número suelto del texto).
function followedByOptions(lines, idx) {
  let opts = 0;
  for (let j = idx + 1; j < Math.min(lines.length, idx + 16); j += 1) {
    if (RE_OPTION.test(lines[j]) || splitInlineOptions(lines[j])) {
      opts += 1;
      if (opts >= 2) return true;
    } else if (RE_QSTART.test(lines[j])) {
      return false; // apareció otra línea numerada antes que las alternativas
    }
  }
  return false;
}

// Convierte el texto pegado en una lista de preguntas estructuradas.
// Devuelve { questions, textosOrden }.
export function parsePreguntas(raw) {
  const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
  const questions = [];
  let current = null;
  let collectingEnunciado = false;
  let activeContexto = '';
  let ctxBuffer = null; // líneas acumuladas mientras se lee un bloque "Texto:"
  let lastNum = null; // último número de pregunta detectado (para la secuencia)

  const finishCtx = () => {
    if (ctxBuffer !== null) {
      activeContexto = ctxBuffer.join('\n').trim();
      ctxBuffer = null;
    }
  };
  const pushCurrent = () => {
    if (current) {
      questions.push(current);
      current = null;
    }
    collectingEnunciado = false;
  };

  for (let li = 0; li < lines.length; li += 1) {
    const line = lines[li];

    // ¿Esta línea ABRE una pregunta nueva? Detección por SECUENCIA: aceptamos el
    // número con o sin punto (incluso un número solo en su línea) si es el
    // siguiente esperado (lastNum+1..+3). Eso recupera la numeración DEMRE sin
    // punto y, a la vez, descarta números sueltos del texto (medidas, años…).
    let qNum = null;
    let qRest = '';
    {
      const qm = RE_QNUM.exec(line);
      if (qm) {
        const num = parseInt(qm[1], 10);
        const hasDelim = !!qm[2];
        const rest = (qm[3] || '').trim();
        const sequential = lastNum != null && num >= lastNum + 1 && num <= lastNum + 3;
        const classic = hasDelim && rest.length > 0; // formato clásico "1. ¿…?"
        let accept = false;
        if (lastNum == null) accept = classic || followedByOptions(lines, li); // ancla la 1ª
        else if (sequential) accept = true; // la secuencia manda
        else if (classic && num > lastNum + 3 && followedByOptions(lines, li)) accept = true; // re-sync
        if (accept) {
          qNum = num;
          qRest = rest;
        }
      }
    }
    const isQuestion = qNum != null;
    const isCtxStart = !isQuestion && RE_CTX.test(line);
    const isSep = RE_SEP.test(line);

    // Mientras se acumula un bloque de texto de lectura, todo se agrega al
    // pasaje hasta toparse con una pregunta, otro "Texto:" o un separador.
    if (ctxBuffer !== null && !isQuestion && !isCtxStart && !isSep) {
      ctxBuffer.push(line);
      continue;
    }

    if (isSep) {
      finishCtx();
      pushCurrent();
      activeContexto = '';
      continue;
    }

    if (isCtxStart) {
      finishCtx();
      pushCurrent();
      const rest = (RE_CTX.exec(line)[1] || '').trim();
      ctxBuffer = rest ? [rest] : [];
      continue;
    }

    if (isQuestion) {
      finishCtx();
      pushCurrent();
      current = {
        numeroRaw: qNum,
        enunciado: qRest,
        alternativas: [],
        correcta: null,
        eje: '',
        dificultad: '',
        piloto: false,
        explicacion: '',
        contexto: activeContexto,
      };
      lastNum = qNum;
      collectingEnunciado = true;
      continue;
    }

    // A esta altura ya no estamos dentro de un bloque de texto.
    if (ctxBuffer !== null) finishCtx();

    // Fila de alternativas en una sola línea ("A) … B) … C) …").
    const inlineOpts = current ? splitInlineOptions(line) : null;
    if (inlineOpts) {
      collectingEnunciado = false;
      for (const o of inlineOpts) {
        current.alternativas.push({ letra: o.letra, texto: o.texto });
        if (o.star) current.correcta = o.letra;
      }
      continue;
    }

    const optM = RE_OPTION.exec(line);
    if (optM && current) {
      collectingEnunciado = false;
      const star = optM[1] === '*';
      const letra = optM[2].toUpperCase();
      const texto = (optM[3] || '').trim();
      current.alternativas.push({ letra, texto });
      if (star) current.correcta = letra;
      continue;
    }

    const keyM = RE_KEY.exec(line);
    if (keyM && current) {
      current.correcta = keyM[1].toUpperCase();
      continue;
    }

    const ejeM = RE_EJE.exec(line);
    if (ejeM && current) {
      current.eje = ejeM[1].trim();
      continue;
    }

    const explM = RE_EXPL.exec(line);
    if (explM && current) {
      current.explicacion = explM[1].trim();
      continue;
    }

    const difM = RE_DIF.exec(line);
    if (difM && current) {
      current.dificultad = normDificultad(difM[1]);
      continue;
    }

    if (RE_PILOTO.test(line) && current) {
      current.piloto = true;
      continue;
    }

    // Línea suelta: si seguimos juntando el enunciado, la agregamos.
    if (line.trim() === '') continue;
    if (current && collectingEnunciado) {
      current.enunciado = (current.enunciado ? current.enunciado + ' ' : '') + line.trim();
    }
  }

  finishCtx();
  pushCurrent();

  const textosOrden = [];
  for (const q of questions) {
    if (q.contexto && !textosOrden.includes(q.contexto)) textosOrden.push(q.contexto);
  }

  return { questions, textosOrden };
}

// Separa el preámbulo (portada de instrucciones de un PDF oficial) del cuerpo
// de preguntas. Lo usa el importador desde PDF: la portada va al campo
// "Instrucciones" y el resto al parser de preguntas.
//
// Heurística: en estas pruebas las instrucciones de la portada vienen
// numeradas (1., 2., …) PERO sin alternativas; una pregunta real es una línea
// numerada seguida, en pocas líneas, de >=2 alternativas (A) B) …). El cuerpo
// arranca en la primera pregunta así detectada; todo lo anterior es preámbulo.
export function splitPreambulo(raw) {
  const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
  let startIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    // Primera línea que arranca con un número (con o SIN punto) y va seguida, en
    // pocas líneas, de >=2 alternativas. Las instrucciones de la portada también
    // están numeradas, pero NO tienen alternativas, así que no disparan acá.
    if (!RE_QSTART.test(lines[i])) continue;
    if (followedByOptions(lines, i)) {
      startIdx = i;
      break;
    }
  }
  // Sin preámbulo detectable (el PDF arranca directo en preguntas) → todo cuerpo.
  if (startIdx <= 0) return { preambulo: '', cuerpo: String(raw || '').trim() };
  return {
    preambulo: lines.slice(0, startIdx).join('\n').trim(),
    cuerpo: lines.slice(startIdx).join('\n').trim(),
  };
}

// Parsea una "clave de respuestas" (la que DEMRE publica aparte del folleto) a
// un mapa { numeroDePregunta: "A".."E" }. Acepta varios formatos:
//   - pares número→letra: "1: A", "1. A", "1)A", "1 A", "1-A", "12 D 13 C"…
//   - secuencia de letras en orden (posicional): "A C B D" o "ACBD" → q1, q2, …
// Devuelve { mode, map }. mode: 'numbered' | 'positional' | 'empty'.
export function parseClave(raw) {
  const text = String(raw || '');
  const map = {};

  // 1) Pares número→letra (lo más confiable: requiere el número de pregunta).
  const pairRe = /(\d{1,3})\s*[.)\-:=]?\s*([A-Ea-e])(?![A-Za-z])/g;
  let m;
  let pairs = 0;
  while ((m = pairRe.exec(text)) !== null) {
    map[parseInt(m[1], 10)] = m[2].toUpperCase();
    pairs += 1;
  }
  if (pairs > 0) return { mode: 'numbered', map };

  // 2) Posicional: cada letra A–E suelta, en orden, es la respuesta de q1, q2, …
  const letters = (text.match(/[A-Ea-e]/g) || []).map((l) => l.toUpperCase());
  letters.forEach((l, i) => { map[i + 1] = l; });
  return { mode: letters.length ? 'positional' : 'empty', map };
}

// Valida la lista de preguntas. Devuelve un array de issues { level, q?, msg }.
// Si hay algún issue de nivel 'error' la importación queda bloqueada.
export function validatePreguntas(questions) {
  const issues = [];
  if (!questions || questions.length === 0) {
    issues.push({ level: 'error', msg: 'No se detectó ninguna pregunta en el texto.' });
    return issues;
  }

  questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.enunciado) {
      issues.push({ level: 'error', q: n, msg: `Pregunta ${n}: falta el enunciado.` });
    }
    if (q.alternativas.length < 2) {
      issues.push({ level: 'error', q: n, msg: `Pregunta ${n}: necesita al menos 2 alternativas.` });
    }
    if (q.alternativas.length > 5) {
      issues.push({ level: 'error', q: n, msg: `Pregunta ${n}: máximo 5 alternativas (A–E).` });
    }
    const letras = q.alternativas.map((a) => a.letra);
    const dup = letras.filter((l, idx) => letras.indexOf(l) !== idx);
    if (dup.length) {
      issues.push({ level: 'error', q: n, msg: `Pregunta ${n}: letras repetidas (${[...new Set(dup)].join(', ')}).` });
    }
    if (q.alternativas.some((a) => !a.texto)) {
      issues.push({ level: 'error', q: n, msg: `Pregunta ${n}: hay una alternativa sin texto.` });
    }
    if (!q.correcta) {
      if (!q.piloto) {
        issues.push({ level: 'error', q: n, msg: `Pregunta ${n}: no marcaste la correcta (usá * o una línea "Correcta: X"). Si es piloto, marcala como tal.` });
      }
    } else if (!letras.includes(q.correcta)) {
      issues.push({ level: 'error', q: n, msg: `Pregunta ${n}: la correcta (${q.correcta}) no está entre las alternativas.` });
    }
  });

  return issues;
}

// Convierte preguntas ya guardadas (al editar un simulacro existente) de vuelta
// al formato de texto editable. Inversa de parsePreguntas.
export function serializePreguntas(preguntas) {
  const out = [];
  let prevCtx = null;
  preguntas.forEach((p, i) => {
    const ctx = (p.contexto || '').trim();
    if (ctx !== (prevCtx ?? '')) {
      if (ctx) {
        out.push('Texto:');
        out.push(ctx);
        out.push('');
      } else {
        out.push('---');
        out.push('');
      }
    }
    prevCtx = ctx;

    out.push(`${i + 1}. ${p.enunciado}`);
    (p.alternativas_json || []).forEach((a) => {
      const mark = a.letra === p.respuesta_correcta ? '*' : '';
      out.push(`${mark}${a.letra}) ${a.texto}`);
    });
    if (p.eje) out.push(`Eje: ${p.eje}`);
    if (p.dificultad) out.push(`Dificultad: ${DIFICULTAD_LABEL[p.dificultad] || p.dificultad}`);
    if (p.piloto) out.push('Piloto');
    if (p.explicacion) out.push(`Explicación: ${p.explicacion}`);
    out.push('');
  });
  return out.join('\n').trim() + '\n';
}

export const EJEMPLO_PEGADO = `Texto:
La fotosíntesis es el proceso por el cual las plantas transforman la energía de la luz en energía química. Ocurre principalmente en las hojas, dentro de unos organelos llamados cloroplastos.

Gracias a este proceso, las plantas producen oxígeno y azúcares que les sirven de alimento.

1. ¿Dónde ocurre principalmente la fotosíntesis?
A) En las raíces
*B) En las hojas
C) En el tallo
D) En las flores
Eje: Biología
Dificultad: Fácil
Explicación: La fotosíntesis ocurre sobre todo en las hojas, donde están los cloroplastos.

2. ¿Qué gas liberan las plantas durante la fotosíntesis?
A) Dióxido de carbono
B) Hidrógeno
*C) Oxígeno
D) Nitrógeno
Correcta: C

---

3. Las soluciones de $ax^2 + bx + c = 0$ son $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. ¿Qué expresión es el discriminante?
A) $b^2 + 4ac$
*B) $b^2 - 4ac$
C) $2a$
D) $-b$
Eje: Álgebra y funciones
Dificultad: Media

4. Pregunta en prueba para calibrar dificultad (no suma puntaje).
A) La entendí sin problemas
B) Tuve algunas dudas
C) No la entendí
Piloto
`;
