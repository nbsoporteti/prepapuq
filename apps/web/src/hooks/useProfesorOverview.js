import { useQuery } from '@tanstack/react-query';
import pb from '@/lib/pocketbaseClient';

const todayISO = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

const tomorrowISO = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
};

/**
 * Trae en un único round trip los datos del header del dashboard del profesor:
 *   - secciones donde el profesor es titular
 *   - alumnos totales matriculados (sumatoria)
 *   - próxima clase
 *   - entregas pendientes de calificar
 *
 * Algunas queries pueden fallar si la BD no tiene datos. Devolvemos defaults
 * para no romper la UI.
 */
export const useProfesorOverview = (userId) => {
  return useQuery({
    queryKey: ['profesor', 'overview', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      // 1. Secciones titulares
      let secciones = [];
      try {
        const r = await pb.collection('secciones_curso').getList(1, 50, {
          filter: `profesor_id = "${userId}" && estado != "archivada"`,
          expand: 'curso_id',
          sort: '+nombre',
          $autoCancel: false,
        });
        secciones = r.items;
      } catch (_e) {}

      // 2. Alumnos totales (sumatoria de matriculados activos en sus secciones)
      let alumnosTotales = 0;
      try {
        const seccionIds = secciones.map((s) => `"${s.id}"`);
        if (seccionIds.length > 0) {
          const filter = `(${seccionIds.map((id) => `seccion_id = ${id}`).join(' || ')}) && estado = "matriculado"`;
          const r = await pb.collection('matriculas_seccion').getList(1, 1, {
            filter,
            $autoCancel: false,
          });
          alumnosTotales = r.totalItems;
        }
      } catch (_e) {}

      // 3. Próxima clase
      let proximaClase = null;
      try {
        const r = await pb.collection('clases_vivo').getList(1, 1, {
          filter: `profesor_id = "${userId}" && fecha >= "${todayISO()}" && estado != "cancelada"`,
          expand: 'seccion_id',
          sort: '+fecha,+hora_inicio',
          $autoCancel: false,
        });
        if (r.items.length > 0) proximaClase = r.items[0];
      } catch (_e) {}

      // 4. Entregas pendientes de calificar
      let entregasPendientes = 0;
      try {
        const seccionIds = secciones.map((s) => `"${s.id}"`);
        if (seccionIds.length > 0) {
          const tareasFilter = `${seccionIds.map((id) => `seccion_id = ${id}`).join(' || ')}`;
          const tareas = await pb.collection('tareas').getFullList({
            filter: tareasFilter,
            fields: 'id',
            $autoCancel: false,
          });
          const tareaIds = tareas.map((t) => `"${t.id}"`);
          if (tareaIds.length > 0) {
            const entregasFilter = `(${tareaIds.map((id) => `tarea_id = ${id}`).join(' || ')}) && estado = "entregada"`;
            const r = await pb.collection('entregas').getList(1, 1, {
              filter: entregasFilter,
              $autoCancel: false,
            });
            entregasPendientes = r.totalItems;
          }
        }
      } catch (_e) {}

      // 5. Clases hoy
      let clasesHoy = [];
      try {
        const r = await pb.collection('clases_vivo').getList(1, 10, {
          filter: `profesor_id = "${userId}" && fecha >= "${todayISO()}" && fecha < "${tomorrowISO()}"`,
          expand: 'seccion_id',
          sort: '+hora_inicio',
          $autoCancel: false,
        });
        clasesHoy = r.items;
      } catch (_e) {}

      return {
        secciones,
        alumnosTotales,
        proximaClase,
        entregasPendientes,
        clasesHoy,
      };
    },
  });
};
