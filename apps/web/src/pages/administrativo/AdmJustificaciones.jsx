import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const ESTADO_VARIANT = {
  Pendiente: 'bg-warning/10 text-warning-foreground',
  Aprobada: 'bg-success/10 text-success',
  Rechazada: 'bg-destructive/10 text-destructive',
};

const formatFecha = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (_e) { return iso; }
};

const AdmJustificaciones = () => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [comentario, setComentario] = useState('');

  const { data: justifs = [], isLoading } = useQuery({
    queryKey: ['adm', 'justificaciones'],
    staleTime: 30_000,
    queryFn: async () => {
      const r = await pb.collection('justifications').getList(1, 100, {
        expand: 'user_id,asistencia_id',
        sort: 'estado,-fecha',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const pendientes = useMemo(() => justifs.filter((j) => j.estado === 'Pendiente'), [justifs]);
  const resueltas = useMemo(() => justifs.filter((j) => j.estado !== 'Pendiente'), [justifs]);

  const resolve = useMutation({
    mutationFn: async ({ id, estado, comentario }) => pb.collection('justifications').update(id, {
      estado,
      fecha_revision: new Date().toISOString(),
      revisada_por: pb.authStore.model?.id,
      comentario_revisor: comentario || '',
    }, { $autoCancel: false }),
    onSuccess: () => {
      toast.success('Justificación procesada');
      qc.invalidateQueries({ queryKey: ['adm', 'justificaciones'] });
      qc.invalidateQueries({ queryKey: ['administrativo'] });
      setSelected(null);
      setComentario('');
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-3">
        <h3 className="font-semibold text-sm">
          Pendientes <Badge variant="secondary" className="ml-2 bg-warning/10 text-warning-foreground">{pendientes.length}</Badge>
        </h3>

        {pendientes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin justificaciones pendientes"
            description="Cuando un apoderado justifique una inasistencia, aparece acá."
            className="p-6"
          />
        ) : (
          <div className="space-y-2">
            {pendientes.map((j) => (
              <Card
                key={j.id}
                className={`cursor-pointer hover:shadow-sm transition-shadow ${selected?.id === j.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => { setSelected(j); setComentario(''); }}
              >
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{j.expand?.user_id?.name || 'Alumno'}</p>
                  <p className="text-xs text-muted-foreground">
                    Falta: {formatFecha(j.fecha)}
                  </p>
                  <p className="text-xs mt-1 line-clamp-2 text-foreground/80">{j.razon}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {resueltas.length > 0 && (
          <>
            <h3 className="font-semibold text-sm mt-6">Resueltas</h3>
            <div className="space-y-2">
              {resueltas.slice(0, 10).map((j) => (
                <Card key={j.id} className="bg-muted/30">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{j.expand?.user_id?.name || 'Alumno'}</p>
                      <p className="text-xs text-muted-foreground">{formatFecha(j.fecha)}</p>
                    </div>
                    <Badge variant="secondary" className={ESTADO_VARIANT[j.estado]}>{j.estado}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="lg:col-span-7">
        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-warning-foreground" />
                Revisar justificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Alumno</p>
                <p className="font-medium">{selected.expand?.user_id?.name || '—'}</p>
                <p className="text-sm text-muted-foreground">{selected.expand?.user_id?.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Fecha de la inasistencia</p>
                <p className="font-medium">{formatFecha(selected.fecha)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Motivo del apoderado</p>
                <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{selected.razon}</p>
              </div>
              {selected.archivo_adjunto && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Archivo adjunto</p>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={pb.files.getUrl(selected, Array.isArray(selected.archivo_adjunto) ? selected.archivo_adjunto[0] : selected.archivo_adjunto)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Abrir archivo
                    </a>
                  </Button>
                </div>
              )}
              <div className="space-y-2 pt-3 border-t">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Comentario de revisión (opcional)
                </label>
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  placeholder="Notas para el apoderado o auditoría interna..."
                />
              </div>
              <div className="flex gap-2 pt-3">
                <Button
                  className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => resolve.mutate({ id: selected.id, estado: 'Aprobada', comentario })}
                  disabled={resolve.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => resolve.mutate({ id: selected.id, estado: 'Rechazada', comentario })}
                  disabled={resolve.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={FileText}
            title="Elegí una justificación"
            description="Seleccioná una de la lista de la izquierda para revisarla."
            className="h-full"
          />
        )}
      </div>
    </div>
  );
};

export default AdmJustificaciones;
