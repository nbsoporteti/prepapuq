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

const RE_QUESTION = /^\s*(\d{1,3})\s*[.)]\s+(.*)$/;
const RE_OPTION = /^\s*(\*?)\s*([A-Ea-e])\s*[).\-]\s+(.*)$/;
const RE_KEY = /^\s*(?:correcta|clave|respuesta)\s*[:=]\s*([A-Ea-e])\s*$/i;
const RE_EJE = /^\s*eje\s*[:=]\s*(.+)$/i;
const RE_EXPL = /^\s*explicaci[oó]n\s*[:=]\s*(.+)$/i;
const RE_CTX = /^\s*(?:texto|contexto)\s*[:=]?\s*(.*)$/i;
const RE_SEP = /^\s*[-=]{3,}\s*$/;

// Convierte el texto pegado en una lista de preguntas estructuradas.
// Devuelve { questions, textosOrden }.
export function parsePreguntas(raw) {
  const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
  const questions = [];
  let current = null;
  let collectingEnunciado = false;
  let activeContexto = '';
  let ctxBuffer = null; // líneas acumuladas mientras se lee un bloque "Texto:"

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

  for (const line of lines) {
    const qMatch = RE_QUESTION.exec(line);
    const isQuestion = !!qMatch;
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
        numeroRaw: parseInt(qMatch[1], 10),
        enunciado: (qMatch[2] || '').trim(),
        alternativas: [],
        correcta: null,
        eje: '',
        explicacion: '',
        contexto: activeContexto,
      };
      collectingEnunciado = true;
      continue;
    }

    // A esta altura ya no estamos dentro de un bloque de texto.
    if (ctxBuffer !== null) finishCtx();

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
      issues.push({ level: 'error', q: n, msg: `Pregunta ${n}: no marcaste la correcta (usá * o una línea "Correcta: X").` });
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
Explicación: La fotosíntesis ocurre sobre todo en las hojas, donde están los cloroplastos.

2. ¿Qué gas liberan las plantas durante la fotosíntesis?
A) Dióxido de carbono
B) Hidrógeno
*C) Oxígeno
D) Nitrógeno
Correcta: C

---

3. ¿Cuánto es 15 + 27?
A) 32
B) 41
*C) 42
D) 52
`;
