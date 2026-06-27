import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import pb from '@/lib/pocketbaseClient';

// Horario / agenda del estudiante: todas las clases en vivo próximas de sus
// secciones matriculadas, agrupadas por día. Reusa el mismo modelo que la card
// "Próximas clases" del dashboard, pero sin el tope de 6 (acá va la agenda
// completa hacia adelante).
const useHorario = (alumnoId) =>
  useQuery({
    queryKey: ['estudiante', 'horario', alumnoId],
    enabled: !!alumnoId,
    staleTime: 60_000,
    queryFn: async () => {
      const matriculas = await pb
        .collection('matriculas_seccion')
        .getFullList({
          filter: `alumno_id = "${alumnoId}" && estado = "matriculado"`,
          $autoCancel: false,
        })
        .catch(() => []);

      const seccionIds = matriculas.map((m) => `"${m.seccion_id}"`);
      if (!seccionIds.length) return [];

      const todayISO = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
      const filter = `(${seccionIds.map((id) => `seccion_id = ${id}`).join(' || ')}) && fecha >= "${todayISO}" && estado != "cancelada"`;
      const r = await pb
        .collection('clases_vivo')
        .getList(1, 80, {
          filter,
          expand: 'seccion_id,seccion_id.curso_id',
          sort: '+fecha,+hora_inicio',
          $autoCancel: false,
        })
        .catch(() => ({ items: [] }));
      return r.items;
    },
  });

const HorarioView = ({ alumnoId }) => {
  const { data: clases = [], isLoading } = useHorario(alumnoId);

  // Agrupar por día local (mismo Date para clave y rótulo → sin desfase de zona).
  const grupos = useMemo(() => {
    const map = new Map();
    for (const c of clases) {
      const d = new Date(c.fecha);
      const key = d.toLocaleDateString('es-CL');
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }),
          clases: [],
        });
      }
      map.get(key).clases.push(c);
    }
    return [...map.values()];
  }, [clases]);

  if (isLoading) return <Skeleton className="h-40" />;

  if (!grupos.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <CalendarDays className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No tenés clases en vivo programadas próximamente. Cuando tu profe agende una, aparece acá.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {grupos.map((g) => (
        <div key={g.key}>
          <h3 className="mb-2 text-sm font-semibold capitalize text-foreground">{g.label}</h3>
          <Card>
            <CardContent className="divide-y p-0">
              {g.clases.map((c) => {
                const curso = c.expand?.seccion_id?.expand?.curso_id?.nombre || '';
                const seccion = c.expand?.seccion_id?.nombre || '';
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-[64px] text-center">
                      <p className="font-mono text-sm font-semibold tabular-nums">{c.hora_inicio}</p>
                      {c.hora_fin && <p className="text-xs text-muted-foreground tabular-nums">{c.hora_fin}</p>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.tema || curso || 'Clase en vivo'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {curso}
                        {seccion ? ` · ${seccion}` : ''}
                      </p>
                    </div>
                    {c.link && (
                      <Button asChild size="sm" variant="outline">
                        <a href={c.link} target="_blank" rel="noopener noreferrer">
                          <Video className="mr-1 h-3 w-3" />
                          Entrar
                        </a>
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default HorarioView;
