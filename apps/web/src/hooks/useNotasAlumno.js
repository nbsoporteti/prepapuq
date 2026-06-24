import { useQuery } from '@tanstack/react-query';
import pb from '@/lib/pocketbaseClient';

/**
 * Trae la libreta consolidada de un alumno:
 *  - calificaciones de evaluaciones publicadas
 *  - calificaciones de tareas publicadas
 *  - agrupado por curso (vía evaluacion.seccion_id → curso_id)
 */
export const useNotasAlumno = (alumnoId) => useQuery({
  queryKey: ['notas', 'alumno', alumnoId],
  enabled: !!alumnoId,
  staleTime: 30_000,
  queryFn: async () => {
    const [evalCalifs, tareaCalifs] = await Promise.all([
      pb.collection('calificaciones_evaluacion').getFullList({
        filter: `alumno_id = "${alumnoId}" && publicada = true`,
        expand: 'evaluacion_id,evaluacion_id.seccion_id,evaluacion_id.seccion_id.curso_id',
        sort: '-fecha_calificacion',
        $autoCancel: false,
      }).catch(() => []),
      pb.collection('calificaciones_tarea').getFullList({
        filter: `alumno_id = "${alumnoId}" && publicada = true`,
        expand: 'entrega_id,entrega_id.tarea_id,entrega_id.tarea_id.seccion_id,entrega_id.tarea_id.seccion_id.curso_id',
        sort: '-fecha_calificacion',
        $autoCancel: false,
      }).catch(() => []),
    ]);

    // Normalizar a una estructura común
    const items = [];
    for (const c of evalCalifs) {
      const e = c.expand?.evaluacion_id;
      const sec = e?.expand?.seccion_id;
      const curso = sec?.expand?.curso_id;
      items.push({
        id: 'e_' + c.id,
        tipo: 'evaluacion',
        subtipo: e?.tipo || 'evaluacion',
        titulo: e?.titulo || 'Evaluación',
        fecha: c.fecha_calificacion || c.created,
        nota: c.nota_1_a_7,
        estado_nota: c.estado_nota,
        feedback: c.comentarios,
        cursoId: curso?.id,
        cursoNombre: curso?.nombre || 'Sin curso',
        seccionNombre: sec?.nombre,
        ponderacion_pct: e?.ponderacion_pct,
      });
    }
    for (const c of tareaCalifs) {
      const t = c.expand?.entrega_id?.expand?.tarea_id;
      const sec = t?.expand?.seccion_id;
      const curso = sec?.expand?.curso_id;
      items.push({
        id: 't_' + c.id,
        tipo: 'tarea',
        subtipo: 'tarea',
        titulo: t?.titulo || 'Tarea',
        fecha: c.fecha_calificacion || c.created,
        nota: c.nota_1_a_7,
        estado_nota: 'calificada',
        feedback: c.feedback_markdown,
        cursoId: curso?.id,
        cursoNombre: curso?.nombre || 'Sin curso',
        seccionNombre: sec?.nombre,
        ponderacion_pct: t?.ponderacion_pct,
      });
    }

    return items;
  },
});
