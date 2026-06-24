import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import pb from '@/lib/pocketbaseClient';

const formatFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  } catch (_e) {
    return iso;
  }
};

const ProfesorCalificarQueue = ({ overview }) => {
  const seccionIds = (overview?.secciones || []).map((s) => s.id);

  const { data: entregasPendientes = [], isLoading } = useQuery({
    queryKey: ['profesor', 'calificar', seccionIds.join(',')],
    enabled: seccionIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      // Buscar tareas de las secciones del profe
      const tareasFilter = seccionIds.map((id) => `seccion_id = "${id}"`).join(' || ');
      const tareas = await pb.collection('tareas').getFullList({
        filter: tareasFilter,
        fields: 'id,titulo,fecha_limite,puntaje_max',
        $autoCancel: false,
      });
      if (tareas.length === 0) return [];

      const tareaIds = tareas.map((t) => t.id);
      const tareaMap = new Map(tareas.map((t) => [t.id, t]));

      const entregasFilter = tareaIds.map((id) => `tarea_id = "${id}"`).join(' || ') +
        ' && (estado = "entregada" || estado = "atrasada")';
      const r = await pb.collection('entregas').getList(1, 50, {
        filter: entregasFilter,
        expand: 'alumno_id',
        sort: '-fecha_entrega',
        $autoCancel: false,
      });
      return r.items.map((e) => ({
        ...e,
        tarea: tareaMap.get(e.tarea_id),
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (entregasPendientes.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nada por calificar"
        description="Cuando un alumno entregue una tarea, aparecerá acá."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">{entregasPendientes.length}</strong>{' '}
        {entregasPendientes.length === 1 ? 'entrega pendiente' : 'entregas pendientes'} de calificar.
      </p>
      <Card>
        <CardContent className="p-0 divide-y">
          {entregasPendientes.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
              <FileText className="h-5 w-5 text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {e.tarea?.titulo || 'Tarea'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {e.expand?.alumno_id?.name} · Entregada {formatFecha(e.fecha_entrega)}
                </p>
              </div>
              {e.estado === 'atrasada' && (
                <Badge variant="secondary" className="bg-warning/10 text-warning-foreground">Atrasada</Badge>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link to={`/dashboard/profesor/calificar/${e.id}`}>
                  Calificar
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        El flujo completo de calificación con preview PDF, atajos J/K y feedback markdown llega en Fase 3.
      </p>
    </div>
  );
};

export default ProfesorCalificarQueue;
