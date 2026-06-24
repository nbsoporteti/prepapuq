import { useQuery } from '@tanstack/react-query';
import pb from '@/lib/pocketbaseClient';

/**
 * Trae las tareas visibles para un alumno (de las secciones donde está
 * matriculado) y matchea cada una con su entrega + calificación si existe.
 */
export const useTareasAlumno = (alumnoId) => {
  return useQuery({
    queryKey: ['tareas', 'alumno', alumnoId],
    enabled: !!alumnoId,
    staleTime: 30_000,
    queryFn: async () => {
      // 1. Secciones matriculadas
      const matriculas = await pb.collection('matriculas_seccion').getFullList({
        filter: `alumno_id = "${alumnoId}" && estado = "matriculado"`,
        fields: 'seccion_id',
        $autoCancel: false,
      });
      if (matriculas.length === 0) return [];

      const seccionIds = matriculas.map((m) => m.seccion_id);
      const filterTareas = seccionIds.map((id) => `seccion_id = "${id}"`).join(' || ') +
        ' && estado = "publicada"';

      const tareas = await pb.collection('tareas').getFullList({
        filter: filterTareas,
        expand: 'seccion_id,seccion_id.curso_id',
        sort: '-fecha_limite',
        $autoCancel: false,
      });
      if (tareas.length === 0) return [];

      // 2. Entregas del alumno para esas tareas
      const tareaIds = tareas.map((t) => `"${t.id}"`);
      const filterEntregas = `(${tareaIds.map((id) => `tarea_id = ${id}`).join(' || ')}) && alumno_id = "${alumnoId}"`;
      let entregas = [];
      try {
        entregas = await pb.collection('entregas').getFullList({
          filter: filterEntregas,
          sort: '-intento_n',
          $autoCancel: false,
        });
      } catch (_e) {}

      const entregaByTarea = new Map();
      for (const e of entregas) {
        // Mantener solo la última (intento más alto)
        if (!entregaByTarea.has(e.tarea_id)) entregaByTarea.set(e.tarea_id, e);
      }

      // 3. Calificaciones de esas entregas
      const entregaIds = entregas.map((e) => `"${e.id}"`);
      let califs = [];
      if (entregaIds.length > 0) {
        try {
          califs = await pb.collection('calificaciones_tarea').getFullList({
            filter: entregaIds.map((id) => `entrega_id = ${id}`).join(' || '),
            $autoCancel: false,
          });
        } catch (_e) {}
      }
      const califByEntrega = new Map();
      for (const c of califs) {
        if (c.publicada !== false) califByEntrega.set(c.entrega_id, c);
      }

      // 4. Componer
      return tareas.map((t) => {
        const entrega = entregaByTarea.get(t.id) || null;
        const calificacion = entrega ? califByEntrega.get(entrega.id) : null;
        return {
          ...t,
          entrega: entrega ? { ...entrega, calificacion } : null,
        };
      });
    },
  });
};
