import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import BadgeNota from '@/components/shared/BadgeNota.jsx';
import pb from '@/lib/pocketbaseClient';

const formatFecha = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (_e) { return iso; }
};

const ProfesorCalificarTareaPage = () => {
  const { entregaId } = useParams();
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  const [nota, setNota] = useState('');
  const [feedback, setFeedback] = useState('');
  const [publicar, setPublicar] = useState(true);

  const { data: entrega, isLoading } = useQuery({
    queryKey: ['entrega', entregaId],
    enabled: !!entregaId,
    queryFn: async () => pb.collection('entregas').getOne(entregaId, { expand: 'tarea_id,alumno_id', $autoCancel: false }),
  });

  const { data: existingCalif } = useQuery({
    queryKey: ['entrega', entregaId, 'calif'],
    enabled: !!entregaId,
    queryFn: async () => {
      try {
        return await pb.collection('calificaciones_tarea').getFirstListItem(`entrega_id = "${entregaId}"`, { $autoCancel: false });
      } catch (_e) { return null; }
    },
  });

  React.useEffect(() => {
    if (existingCalif) {
      setNota(String(existingCalif.nota_1_a_7 || ''));
      setFeedback(existingCalif.feedback_markdown || '');
      setPublicar(existingCalif.publicada !== false);
    }
  }, [existingCalif]);

  const guardar = useMutation({
    mutationFn: async () => {
      const n = parseFloat(nota);
      if (isNaN(n) || n < 1 || n > 7) throw new Error('Nota inválida');

      const payload = {
        entrega_id: entregaId,
        alumno_id: entrega.alumno_id,
        nota_1_a_7: n,
        feedback_markdown: feedback,
        calificada_por: currentUser.id,
        fecha_calificacion: new Date().toISOString(),
        publicada: publicar,
      };

      if (existingCalif) {
        payload.nota_anterior = existingCalif.nota_1_a_7;
        payload.version = (existingCalif.version || 1) + 1;
        await pb.collection('calificaciones_tarea').update(existingCalif.id, payload, { $autoCancel: false });
      } else {
        payload.version = 1;
        await pb.collection('calificaciones_tarea').create(payload, { $autoCancel: false });
      }

      // Marcar la entrega como calificada
      await pb.collection('entregas').update(entregaId, { estado: 'calificada' }, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success(publicar ? 'Calificación publicada' : 'Borrador guardado');
      qc.invalidateQueries({ queryKey: ['entrega', entregaId] });
      qc.invalidateQueries({ queryKey: ['profesor'] });
    },
    onError: (e) => {
      toast.error('Error: ' + e.message);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!entrega) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
        <p className="text-muted-foreground">Entrega no encontrada</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/dashboard/profesor?tab=calificar">Volver a calificar</Link>
        </Button>
      </div>
    );
  }

  const archivos = Array.isArray(entrega.archivos) ? entrega.archivos : (entrega.archivos ? [entrega.archivos] : []);

  return (
    <>
      <Helmet><title>Calificar entrega | PrePa</title></Helmet>
      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to="/dashboard/profesor?tab=calificar">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cola de calificación
              </Link>
            </Button>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                {entrega.expand?.alumno_id?.name || 'Alumno'}
              </h1>
              <Badge variant="secondary">{entrega.expand?.tarea_id?.titulo || 'Tarea'}</Badge>
              {entrega.dias_de_atraso > 0 && (
                <Badge variant="secondary" className="bg-warning/10 text-warning-foreground">
                  {entrega.dias_de_atraso} días tarde
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid lg:grid-cols-12 gap-6">
          {/* Entrega */}
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Archivos entregados</CardTitle>
              </CardHeader>
              <CardContent>
                {archivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin archivos.</p>
                ) : (
                  <ul className="space-y-2">
                    {archivos.map((f) => (
                      <li key={f}>
                        <Button asChild variant="outline" className="w-full justify-start">
                          <a href={pb.files.getUrl(entrega, f)} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-2 text-secondary" />
                            <span className="flex-1 truncate text-left">{f}</span>
                            <Download className="h-3.5 w-3.5 ml-2" />
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {entrega.comentario_alumno && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comentario del alumno</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/90">{entrega.comentario_alumno}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                <p>Entregada: <span className="text-foreground">{formatFecha(entrega.fecha_entrega)}</span></p>
                <p>Intento: <span className="text-foreground font-mono">{entrega.intento_n || 1}</span></p>
              </CardContent>
            </Card>
          </div>

          {/* Form calificación */}
          <aside className="lg:col-span-5">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Calificación
                  {existingCalif && <BadgeNota nota={existingCalif.nota_1_a_7} size="md" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nota">Nota (1.0 – 7.0)</Label>
                  <Input
                    id="nota"
                    type="number"
                    step="0.1"
                    min={1}
                    max={7}
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    className="text-2xl font-mono font-bold tabular-nums h-14 text-center"
                    placeholder="—"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    rows={6}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Comentarios para el alumno..."
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <Label htmlFor="publicar" className="text-sm cursor-pointer">
                    Publicar para el alumno
                    <p className="text-xs text-muted-foreground font-normal">Si está apagado, queda como borrador.</p>
                  </Label>
                  <Switch id="publicar" checked={publicar} onCheckedChange={setPublicar} />
                </div>

                <Button
                  className="w-full"
                  onClick={() => guardar.mutate()}
                  disabled={!nota || guardar.isPending}
                >
                  {guardar.isPending ? 'Guardando...' : existingCalif ? 'Actualizar calificación' : 'Guardar calificación'}
                </Button>

                {existingCalif && (
                  <p className="text-xs text-muted-foreground text-center">
                    Última versión: v{existingCalif.version || 1} ·{' '}
                    {existingCalif.fecha_calificacion ? new Date(existingCalif.fecha_calificacion).toLocaleDateString('es-CL') : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
};

export default ProfesorCalificarTareaPage;
