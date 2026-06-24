import { useQuery } from '@tanstack/react-query';
import pb from '@/lib/pocketbaseClient';

const todayISO = () => new Date().toISOString();
const sevenDaysAheadISO = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString();
};

/**
 * Single roundtrip para los KPIs del dashboard administrativo.
 *
 * Trae:
 *  - alumnosActivos: users con rol/roles "estudiante" y activo!=false
 *  - apoderadosActivos: ídem para apoderado
 *  - pagosVencidos: count
 *  - pagosPorVencer (próximos 7 días): count
 *  - matriculasPreInscritas: count (estado="pre_inscrito")
 *  - justificacionesPendientes: count (estado="Pendiente")
 *  - ingresosUltimoMes: suma de pagos pagados en últimos 30 días
 */
export const useAdministrativoOverview = () => useQuery({
  queryKey: ['administrativo', 'overview'],
  staleTime: 60_000,
  queryFn: async () => {
    const safeCount = async (collection, filter) => {
      try {
        const r = await pb.collection(collection).getList(1, 1, { filter, $autoCancel: false });
        return r.totalItems;
      } catch (_e) {
        return 0;
      }
    };

    const safeSum = async (collection, filter, field) => {
      try {
        const all = await pb.collection(collection).getFullList({ filter, fields: 'id,' + field, $autoCancel: false });
        return all.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
      } catch (_e) {
        return 0;
      }
    };

    const [
      alumnosActivos,
      apoderadosActivos,
      pagosVencidos,
      pagosPorVencer,
      matriculasPreInscritas,
      justificacionesPendientes,
      ingresosUltimoMes,
    ] = await Promise.all([
      safeCount('users', 'roles ~ "estudiante" && (activo = true || activo = "")'),
      safeCount('users', 'roles ~ "apoderado" && (activo = true || activo = "")'),
      safeCount('pagos', 'estado = "vencido"'),
      safeCount('pagos', `estado = "pendiente" && fecha_vencimiento >= "${todayISO()}" && fecha_vencimiento <= "${sevenDaysAheadISO()}"`),
      safeCount('matriculas_seccion', 'estado = "pre_inscrito"'),
      safeCount('justifications', 'estado = "Pendiente"'),
      safeSum('pagos', `estado = "pagado" && fecha_pago >= "${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}"`, 'monto'),
    ]);

    return {
      alumnosActivos,
      apoderadosActivos,
      pagosVencidos,
      pagosPorVencer,
      matriculasPreInscritas,
      justificacionesPendientes,
      ingresosUltimoMes,
    };
  },
});
