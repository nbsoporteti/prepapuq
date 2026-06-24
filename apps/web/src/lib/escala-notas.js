// Fórmula chilena estándar para convertir puntaje a nota 1.0-7.0
// con una nota mínima de aprobación (default 4.0) y una escala de
// exigencia configurable (default 60%).
//
// Lógica:
//   - Si el puntaje del alumno está por encima del corte de aprobación
//     (puntaje_max * exigencia/100), aplica función lineal entre nota
//     aprobacion y 7.0.
//   - Si está por debajo, aplica función lineal entre 1.0 y nota
//     aprobacion.

export const puntajeANota = (puntaje, puntajeMax, opts = {}) => {
  const exigencia = opts.exigencia ?? 60;
  const notaAprobacion = opts.notaAprobacion ?? 4.0;
  const notaMin = opts.notaMin ?? 1.0;
  const notaMax = opts.notaMax ?? 7.0;

  if (puntaje === null || puntaje === undefined || puntajeMax === 0) return null;
  const corte = puntajeMax * (exigencia / 100);

  let nota;
  if (puntaje >= corte) {
    if (puntajeMax === corte) {
      nota = notaMax;
    } else {
      nota = notaAprobacion + ((puntaje - corte) / (puntajeMax - corte)) * (notaMax - notaAprobacion);
    }
  } else {
    nota = notaMin + (puntaje / corte) * (notaAprobacion - notaMin);
  }
  return Math.round(nota * 10) / 10;
};

export const notaAPuntaje = (nota, puntajeMax, opts = {}) => {
  const exigencia = opts.exigencia ?? 60;
  const notaAprobacion = opts.notaAprobacion ?? 4.0;
  const notaMin = opts.notaMin ?? 1.0;
  const notaMax = opts.notaMax ?? 7.0;

  if (nota === null || nota === undefined || puntajeMax === 0) return null;
  const corte = puntajeMax * (exigencia / 100);

  let puntaje;
  if (nota >= notaAprobacion) {
    puntaje = corte + ((nota - notaAprobacion) / (notaMax - notaAprobacion)) * (puntajeMax - corte);
  } else {
    puntaje = ((nota - notaMin) / (notaAprobacion - notaMin)) * corte;
  }
  return Math.round(puntaje * 10) / 10;
};

export const formatNota = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(1);
};

export const colorClaseNota = (n) => {
  if (n === null || n === undefined) return 'text-muted-foreground';
  if (n >= 6) return 'text-success';
  if (n >= 5) return 'text-info';
  if (n >= 4) return 'text-warning-foreground';
  return 'text-destructive';
};
