import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Upload, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import BadgeNota from '@/components/shared/BadgeNota.jsx';
import ConfirmDialog from '@/components/shared/ConfirmDialog.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';

const formatFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch (_e) { return iso; }
};

const Countdown = ({ targetIso }) => {
  const [restante, setRestante] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = new Date(targetIso).getTime() - Date.now();
      if (ms <= 0) { setRestante('Vencida'); return; }
      const dias = Math.floor(ms / (1000 * 60 * 60 * 24));
      const horas = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      if (dias > 0) setRestante(`${dias}d ${horas}h ${mins}m`);
      else if (horas > 0) setRestante(`${horas}h ${mins}m`);
      else setRestante(`${mins}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [targetIso]);
  return <span className="font-mono tabular-nums">{restante}</span>;
};

const EstudianteTareaDetailPage = () => {
  const { tareaId } = useParams();
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [comentario, setComentario] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: tarea, isLoading } = useQuery({
    queryKey: ['tarea', tareaId],
    enabled: !!tareaId,
    queryFn: async () => pb.collection('tareas').getOne(tareaId, { expand: 'seccion_id,seccion_id.curso_id', $autoCancel: false }),
  });

  const { data: entrega } = useQuery({
    queryKey: ['tarea', tareaId, 'entrega', currentUser?.id],
    enabled: !!(tareaId && currentUser?.id),
    queryFn: async () => {
      try {
        return await pb.collection('entregas').getFirstListItem(
          `tarea_id = "${tareaId}" && alumno_id = "${currentUser.id}"`,
          { sort: '-intento_n', $autoCancel: false },
        );
      } catch (_e) { return null; }
    },
  });

  // Calificación si la entrega ya fue calificada
  const { data: calificacion } = useQuery({
    queryKey: ['tarea', tareaId, 'calificacion', entrega?.id],
    enabled: !!entrega?.id,
    queryFn: async () => {
      try {
        return await pb.collection('calificaciones_tarea').getFirstListItem(
          `entrega_id = "${entrega.id}" && publicada = true`,
          { $autoCancel: false },
        );
      } catch (_e) { return null; }
    },
  });

  useEffect(() => {
    if (entrega?.comentario_alumno) setComentario(entrega.comentario_alumno);
  }, [entrega]);

  const handleFiles = (files) => {
    const newOnes = Array.from(files || []);
    setArchivos((prev) => [...prev, ...newOnes].slice(0, 10));
  };

  const removeArchivo = (idx) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('tarea_id', tareaId);
      fd.append('alumno_id', currentUser.id);
      fd.append('comentario_alumno', comentario || '');
      fd.append('estado', 'entregada');
      fd.append('fecha_entrega', new Date().toISOString());
      fd.append('intento_n', (entrega?.intento_n || 0) + 1);
      for (const f of archivos) {
        fd.append('archivos', f);
      }
      if (entrega?.id && entrega.estado !== 'calificada' && tarea?.allow_resubmit !== true) {
        // Update existing
        return pb.collection('entregas').update(entrega.id, fd, { $autoCancel: false });
      }
      return pb.collection('entregas').create(fd, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success('¡Tarea entregada!');
      qc.invalidateQueries({ queryKey: ['tarea', tareaId] });
      qc.invalidateQueries({ queryKey: ['tareas', 'alumno'] });
      setArchivos([]);
      setConfirmOpen(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error('No se pudo enviar la entrega');
      setConfirmOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!tarea) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
        <p className="text-muted-foreground">Tarea no encontrada</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/dashboard/estudiante/tareas">Volver</Link>
        </Button>
      </div>
    );
  }

  const ahora = Date.now();
  const venceMs = new Date(tarea.fecha_limite).getTime() - ahora;
  const yaVencida = venceMs < 0;
  const yaEntregada = entrega?.estado === 'entregada' || entrega?.estado === 'calificada';
  const puedeEntregar = !yaEntregada || tarea.allow_resubmit;

  return (
    <>
      <Helmet><title>{tarea.titulo} | PrePa</title></Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to="/dashboard/estudiante/tareas">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Mis tareas
              </Link>
            </Button>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{tarea.titulo}</h1>
              {tarea.expand?.seccion_id?.expand?.curso_id?.nombre && (
                <Badge variant="secondary">
                  {tarea.expand.seccion_id.expand.curso_id.nombre}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid lg:grid-cols-12 gap-6">
          {/* Detalles + consigna */}
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consigna</CardTitle>
              </CardHeader>
              <CardContent>
                {tarea.descripcion_markdown ? (
                  <div className="prose prose-sm max-w-none text-foreground/90" dangerouslySetInnerHTML={{ __html: tarea.descripcion_markdown }} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">El profesor no agregó descripción.</p>
                )}
              </CardContent>
            </Card>

            {calificacion && (
              <Card className="border-success/30 bg-success/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Tu calificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <BadgeNota nota={calificacion.nota_1_a_7} size="lg" />
                    <span className="text-sm text-muted-foreground">
                      Calificada el {new Date(calificacion.fecha_calificacion || calificacion.created).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                  {calificacion.feedback_markdown && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Feedback</p>
                      <div className="prose prose-sm max-w-none text-foreground/90" dangerouslySetInnerHTML={{ __html: calificacion.feedback_markdown }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Aside: estado + entrega */}
          <aside className="lg:col-span-5 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha límite</p>
                    <p className="font-medium capitalize">{formatFecha(tarea.fecha_limite)}</p>
                  </div>
                </div>
                {!yaVencida && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-muted-foreground text-xs">Tiempo restante</p>
                      <Countdown targetIso={tarea.fecha_limite} />
                    </div>
                  </div>
                )}
                {tarea.puntaje_max && (
                  <div className="pt-2 border-t flex justify-between">
                    <span className="text-muted-foreground">Puntaje máximo</span>
                    <span className="font-mono font-bold tabular-nums">{tarea.puntaje_max}</span>
                  </div>
                )}
                {yaVencida && !yaEntregada && (
                  <div className="p-2 rounded bg-destructive/10 border border-destructive/30 flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-destructive">
                      La tarea venció. {tarea.late_penalty_pct_dia ? `Se aplicará ${tarea.late_penalty_pct_dia}% de penalty por día.` : 'Verificá si el profesor permite entregas tardías.'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {puedeEntregar ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {yaEntregada ? 'Re-entregar' : 'Entregar tarea'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Archivos
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-1"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir archivo(s)
                    </Button>
                    {archivos.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {archivos.map((f, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs bg-muted/40 px-2 py-1 rounded">
                            <span className="truncate flex-1">{f.name}</span>
                            <span className="text-muted-foreground font-mono">{(f.size / 1024).toFixed(0)}KB</span>
                            <button onClick={() => removeArchivo(idx)} className="text-destructive hover:text-destructive/80">
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="coment">
                      Comentario opcional
                    </label>
                    <Textarea
                      id="coment"
                      rows={3}
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Algo que el profesor deba saber..."
                      className="mt-1"
                    />
                  </div>
                  <Button
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => setConfirmOpen(true)}
                    disabled={archivos.length === 0 || submit.isPending}
                  >
                    {submit.isPending ? 'Enviando...' : 'Entregar'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-info/5 border-info/30">
                <CardContent className="p-4 text-sm">
                  <p className="font-medium text-foreground">Ya entregaste esta tarea</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {entrega?.estado === 'calificada'
                      ? 'Tu profesor ya la calificó. Revisá la nota arriba.'
                      : 'Está en revisión por tu profesor.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar entrega"
        description={`Vas a enviar ${archivos.length} ${archivos.length === 1 ? 'archivo' : 'archivos'}. ${yaVencida ? '⚠️ La tarea ya venció.' : ''} ¿Estás seguro?`}
        confirmLabel="Entregar"
        onConfirm={() => submit.mutate()}
        isLoading={submit.isPending}
      />
    </>
  );
};

export default EstudianteTareaDetailPage;
