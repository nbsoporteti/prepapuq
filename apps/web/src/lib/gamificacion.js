import pb from '@/lib/pocketbaseClient';

// Fecha local en YYYY-MM-DD (en-CA da ese formato).
const hoyISO = () => new Date().toLocaleDateString('en-CA');
const ayerISO = () => new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

// Logros: id estable + test sobre el estado + label visible.
export const LOGROS = [
  { id: 'primer_paso', label: 'Primer paso', test: (g) => g.puntos >= 10 },
  { id: 'racha_3', label: 'Racha de 3 días', test: (g) => g.racha_actual >= 3 },
  { id: 'racha_7', label: 'Racha de 7 días', test: (g) => g.racha_actual >= 7 },
  { id: 'racha_30', label: 'Racha de 30 días', test: (g) => g.racha_actual >= 30 },
  { id: 'puntos_500', label: '500 puntos', test: (g) => g.puntos >= 500 },
  { id: 'puntos_2000', label: '2000 puntos', test: (g) => g.puntos >= 2000 },
];

/**
 * Registra actividad del alumno: suma puntos y actualiza la racha de días.
 * Idempotente por día para la racha (varias actividades el mismo día no la
 * inflan; sí suman puntos). Nunca lanza: la gamificación no debe romper nada.
 *
 * @returns el estado nuevo, o null si no se pudo (p. ej. colección sin migrar).
 */
export async function registrarActividad(userId, puntos = 10) {
  if (!userId) return null;
  try {
    let row = null;
    try {
      row = await pb
        .collection('progreso_gamificacion')
        .getFirstListItem(`user_id = "${userId}"`, { $autoCancel: false });
    } catch (_e) {
      row = null; // no existe todavía
    }

    const hoy = hoyISO();
    const base = row || { puntos: 0, racha_actual: 0, racha_max: 0, ultima_actividad: '', logros: [] };
    const lastDay = (base.ultima_actividad || '').slice(0, 10);

    let racha = base.racha_actual || 0;
    if (lastDay === hoy) {
      // ya contó hoy: solo suma puntos, la racha no cambia
    } else if (lastDay === ayerISO()) {
      racha += 1;
    } else {
      racha = 1;
    }

    const puntosNuevos = (base.puntos || 0) + puntos;
    const rachaMax = Math.max(base.racha_max || 0, racha);

    const estado = { puntos: puntosNuevos, racha_actual: racha };
    const logros = Array.isArray(base.logros) ? [...base.logros] : [];
    for (const l of LOGROS) {
      if (l.test(estado) && !logros.includes(l.id)) logros.push(l.id);
    }

    const payload = {
      user_id: userId,
      puntos: puntosNuevos,
      racha_actual: racha,
      racha_max: rachaMax,
      ultima_actividad: hoy,
      logros,
    };

    if (row) {
      await pb.collection('progreso_gamificacion').update(row.id, payload, { $autoCancel: false });
    } else {
      await pb.collection('progreso_gamificacion').create(payload, { $autoCancel: false });
    }
    return payload;
  } catch (_e) {
    return null;
  }
}
