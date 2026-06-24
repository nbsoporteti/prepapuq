import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/shared/DataTable.jsx';
import RegistrarPagoDialog from '@/components/administrativo/RegistrarPagoDialog.jsx';
import pb from '@/lib/pocketbaseClient';

const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
const formatFecha = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-CL'); } catch (_e) { return iso; }
};

const ESTADO_VARIANT = {
  pendiente: 'bg-muted text-muted-foreground',
  pagado: 'bg-success/10 text-success',
  vencido: 'bg-destructive/10 text-destructive',
  condonado: 'bg-info/10 text-info',
  anulado: 'bg-muted text-muted-foreground line-through',
  en_revision: 'bg-warning/10 text-warning-foreground',
};

const AdmPagos = () => {
  const [pagoSelected, setPagoSelected] = useState(null);
  const [filtro, setFiltro] = useState('todos'); // todos | pendientes | vencidos | pagados

  const { data: pagos = [], isLoading } = useQuery({
    queryKey: ['adm', 'pagos'],
    staleTime: 30_000,
    queryFn: async () => {
      const r = await pb.collection('pagos').getList(1, 1000, {
        expand: 'alumno_id,apoderado_id',
        sort: '-fecha_vencimiento',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const filtrados = useMemo(() => {
    if (filtro === 'todos') return pagos;
    if (filtro === 'pendientes') return pagos.filter((p) => p.estado === 'pendiente');
    if (filtro === 'vencidos') return pagos.filter((p) => p.estado === 'vencido');
    if (filtro === 'pagados') return pagos.filter((p) => p.estado === 'pagado');
    return pagos;
  }, [pagos, filtro]);

  const columns = useMemo(() => ([
    {
      accessorKey: 'expand.alumno_id.name',
      header: 'Alumno',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.expand?.alumno_id?.name || '—'}</p>
          {row.original.expand?.apoderado_id?.name && (
            <p className="text-xs text-muted-foreground">Apod: {row.original.expand.apoderado_id.name}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'concepto',
      header: 'Concepto',
      cell: ({ row }) => (
        <div>
          <p className="text-sm capitalize">{row.original.concepto}</p>
          {row.original.periodo && <p className="text-xs text-muted-foreground font-mono">{row.original.periodo}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'monto',
      header: 'Monto',
      cell: ({ row }) => <span className="font-mono tabular-nums font-bold">{formatCLP(row.original.monto)}</span>,
    },
    { accessorKey: 'fecha_vencimiento', header: 'Vence', cell: ({ row }) => <span className="text-sm">{formatFecha(row.original.fecha_vencimiento)}</span> },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <Badge variant="secondary" className={ESTADO_VARIANT[row.original.estado] || ''}>{row.original.estado}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          {row.original.comprobante_url && (
            <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Ver comprobante">
              <a href={row.original.comprobante_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          {(row.original.estado === 'pendiente' || row.original.estado === 'vencido') && (
            <Button size="sm" onClick={() => setPagoSelected(row.original)}>
              Registrar pago
            </Button>
          )}
        </div>
      ),
    },
  ]), []);

  const counts = useMemo(() => ({
    pendientes: pagos.filter((p) => p.estado === 'pendiente').length,
    vencidos: pagos.filter((p) => p.estado === 'vencido').length,
    pagados: pagos.filter((p) => p.estado === 'pagado').length,
  }), [pagos]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={filtro === 'todos' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('todos')}>
          Todos ({pagos.length})
        </Button>
        <Button variant={filtro === 'pendientes' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('pendientes')}>
          Pendientes ({counts.pendientes})
        </Button>
        <Button variant={filtro === 'vencidos' ? 'destructive' : 'outline'} size="sm" onClick={() => setFiltro('vencidos')}>
          Vencidos ({counts.vencidos})
        </Button>
        <Button variant={filtro === 'pagados' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('pagados')}>
          Pagados ({counts.pagados})
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtrados}
        isLoading={isLoading}
        emptyIcon={CreditCard}
        emptyTitle="Sin pagos"
        emptyDescription="Las cuotas se generan automáticamente al matricular alumnos."
        searchPlaceholder="Buscar alumno o concepto..."
      />

      <RegistrarPagoDialog
        open={!!pagoSelected}
        onOpenChange={(o) => !o && setPagoSelected(null)}
        pago={pagoSelected}
      />
    </div>
  );
};

export default AdmPagos;
