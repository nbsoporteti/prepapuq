import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import NotaInput from '@/components/profesor/NotaInput.jsx';
import BadgeNota from '@/components/shared/BadgeNota.jsx';
import ConfirmDialog from '@/components/shared/ConfirmDialog.jsx';
import pb from '@/lib/pocketbaseClient';

const ESTADOS_NOTA = [
  { value: 'calificada', label: 'Calificada' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'anulada', label: 'Anulada (copia)' },
  { value: 'eximida', label: 'Eximida' },
  { value: 'ausente_justificado', label: 'Ausente justificada' },
];

const CalificarEvaluacionBulk = () => {
  const { evaluacionId } = useParams();
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  const [filas, setFilas] = useState([]); // { alumnoId, name, rut, calificacionId, nota, estado_nota, dirty }
  const [busqueda, setBusqueda] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [savingIdx, setSavingIdx] = useState(null);

  const { data: evaluacion, isLoading: loadingEval } = useQuery({
    queryKey: ['evaluacion', evaluacionId],
    enabled: !!evaluacionId,
    queryFn: async () => pb.collection('evaluaciones').getOne(evaluacionId, { expand: 'seccion_id,seccion_id.curso_id', $autoCancel: false }),
  });

  const { data: setup, isLoading: loadingSetup } = useQuery({
    queryKey: ['evaluacion', evaluacionId, 'setup'],
    enabled: !!evaluacion,
    queryFn: async () => {
      // alumnos matriculados de la sección + calificaciones existentes
      const seccionId = evaluacion.seccion_id;
      const matriculas = await pb.collection('matriculas_seccion').getFullList({
        filter: `seccion_id = "${seccionId}" && estado = "matriculado"`,
        expand: 'alumno_id',
        sort: 'expand.alumno_id.name',
        $autoCancel: false,
      });
      let califs = [];
      try {
        califs = await pb.collection('calificaciones_evaluacion').getFullList({
          filter: `evaluacion_id = "${evaluacionId}"`,
          $autoCancel: false,
        });
      } catch (_e) {}
      const califByAlumno = new Map(califs.map((c) => [c.alumno_id, c]));
      return matriculas.map((m) => {
        const u = m.expand?.alumno_id;
        const c = califByAlumno.get(m.alumno_id);
        return {
          alumnoId: m.alumno_id,
          name: u?.name || '',
          rut: u?.rut || '',
          calificacionId: c?.id || null,
          nota: c?.nota_1_a_7 != null ? String(c.nota_1_a_7) : '',
          estado_nota: c?.estado_nota || 'calificada',
          publicada: c?.publicada ?? false,
          dirty: false,
        };
      });
    },
  });

  useEffect(() => {
    if (setup) setFilas(setup);
  }, [setup]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) => f.name.toLowerCase().includes(q) || f.rut.toLowerCase().includes(q));
  }, [filas, busqueda]);

  const conNotaValida = filas.filter((f) => f.nota !== '' && !isNaN(parseFloat(f.nota))).length;
  const totalDirty = filas.filter((f) => f.dirty).length;

  const handleNotaChange = (idx, valor) => {
    setFilas((prev) => prev.map((f, i) => i === idx ? { ...f, nota: valor, dirty: true } : f));
  };

  const handleEstadoChange = (idx, estado) => {
    setFilas((prev) => prev.map((f, i) => i === idx ? { ...f, estado_nota: estado, dirty: true } : f));
  };

  const aplicarBase = () => {
    const base = window.prompt('Nota base para todos los pendientes (1.0–7.0):');
    if (!base) return;
    const n = parseFloat(base.replace(',', '.'));
    if (isNaN(n) || n < 1 || n > 7) {
      toast.error('Nota inválida');
      return;
    }
    setFilas((prev) => prev.map((f) => (f.nota === '' ? { ...f, nota: String(n), dirty: true } : f)));
  };

  const saveOne = useMutation({
    mutationFn: async (fila) => {
      const n = fila.nota === '' ? null : parseFloat(fila.nota.replace(',', '.'));
      const payload = {
        evaluacion_id: evaluacionId,
        alumno_id: fila.alumnoId,
        nota_1_a_7: n,
        estado_nota: fila.estado_nota,
        calificada_por: currentUser.id,
        fecha_calificacion: new Date().toISOString(),
        publicada: fila.publicada || false,
      };
      if (fila.calificacionId) {
        return pb.collection('calificaciones_evaluacion').update(fila.calificacionId, payload, { $autoCancel: false });
      }
      return pb.collection('calificaciones_evaluacion').create(payload, { $autoCancel: false });
    },
    onSuccess: (rec, fila) => {
      setFilas((prev) => prev.map((f) =>
        f.alumnoId === fila.alumnoId ? { ...f, calificacionId: rec.id, dirty: false } : f,
      ));
    },
  });

  const saveAll = useMutation({
    mutationFn: async (publicar) => {
      const dirty = filas.filter((f) => f.dirty);
      if (dirty.length === 0 && !publicar) return;

      // Si publicar=true, actualizar TODAS las calificaciones existentes a publicada=true
      const tasks = filas.map(async (fila) => {
        const n = fila.nota === '' ? null : parseFloat(fila.nota.replace(',', '.'));
        if (!fila.dirty && !publicar) return null;
        const payload = {
          evaluacion_id: evaluacionId,
          alumno_id: fila.alumnoId,
          nota_1_a_7: n,
          estado_nota: fila.estado_nota,
          calificada_por: currentUser.id,
          fecha_calificacion: new Date().toISOString(),
        };
        if (publicar) payload.publicada = true;
        if (fila.calificacionId) {
          await pb.collection('calificaciones_evaluacion').update(fila.calificacionId, payload, { $autoCancel: false });
        } else if (n !== null) {
          await pb.collection('calificaciones_evaluacion').create({ ...payload, publicada: publicar }, { $autoCancel: false });
        }
      });
      await Promise.all(tasks);

      // Si publicar, marcar la evaluación como publicada
      if (publicar) {
        await pb.collection('evaluaciones').update(evaluacionId, { estado: 'publicada' }, { $autoCancel: false });
      }
    },
    onSuccess: (_, publicar) => {
      toast.success(publicar ? 'Resultados publicados — alumnos notificados' : 'Cambios guardados');
      qc.invalidateQueries({ queryKey: ['evaluacion', evaluacionId] });
      qc.invalidateQueries({ queryKey: ['profesor'] });
      setPublishOpen(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error('Error al guardar');
      setPublishOpen(false);
    },
  });

  if (loadingEval || loadingSetup) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{evaluacion?.titulo || 'Calificar'} | PrePa</title></Helmet>
      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to={`/dashboard/profesor/seccion/${evaluacion?.seccion_id}?sub=alumnos`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a la sección
              </Link>
            </Button>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-2xl md:text-3xl font-bold">{evaluacion?.titulo}</h1>
              <Badge variant="secondary">{evaluacion?.tipo}</Badge>
              <Badge variant="outline">
                {evaluacion?.expand?.seccion_id?.expand?.curso_id?.nombre} —{' '}
                {evaluacion?.expand?.seccion_id?.nombre}
              </Badge>
              {evaluacion?.estado === 'publicada' && (
                <Badge variant="secondary" className="bg-success/10 text-success">Publicada</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar alumno..." className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="sm" onClick={aplicarBase}>Aplicar nota base</Button>
              <div className="flex items-center gap-2 ml-auto text-xs">
                <Badge variant="secondary" className="font-mono">
                  {conNotaValida} / {filas.length} con nota
                </Badge>
                {totalDirty > 0 && (
                  <Badge variant="secondary" className="bg-warning/10 text-warning-foreground">
                    {totalDirty} sin guardar
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveAll.mutate(false)}
                disabled={totalDirty === 0 || saveAll.isPending}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Guardar borrador
              </Button>
              <Button
                size="sm"
                onClick={() => setPublishOpen(true)}
                disabled={conNotaValida === 0 || saveAll.isPending}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Publicar resultados
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Alumno</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-32">Nota</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-44">Estado</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-sm text-muted-foreground">
                      No hay alumnos para mostrar.
                    </TableCell>
                  </TableRow>
                ) : filtradas.map((f) => {
                  const idx = filas.findIndex((x) => x.alumnoId === f.alumnoId);
                  const notaParsed = f.nota === '' ? null : parseFloat(f.nota.replace(',', '.'));
                  return (
                    <TableRow key={f.alumnoId}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{f.name || '—'}</p>
                          {f.rut && <p className="text-xs font-mono text-muted-foreground">{f.rut}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <NotaInput
                            value={f.nota}
                            onChange={(v) => handleNotaChange(idx, v)}
                            onCommit={() => {
                              if (f.dirty && f.nota !== '' && !isNaN(parseFloat(f.nota))) {
                                setSavingIdx(idx);
                                saveOne.mutate(filas[idx], { onSettled: () => setSavingIdx(null) });
                              }
                            }}
                          />
                          {!isNaN(notaParsed) && f.nota !== '' && <BadgeNota nota={notaParsed} size="sm" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={f.estado_nota} onValueChange={(v) => handleEstadoChange(idx, v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS_NOTA.map((e) => (
                              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {f.dirty
                          ? <span className="text-xs text-warning-foreground font-medium">sin guardar</span>
                          : f.calificacionId
                            ? <span className="text-xs text-success">guardada</span>
                            : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Publicar resultados"
        description={`Vas a publicar ${conNotaValida} calificaciones. Los alumnos las verán en su libreta y recibirán notificación. ¿Confirmás?`}
        confirmLabel="Publicar"
        onConfirm={() => saveAll.mutate(true)}
        isLoading={saveAll.isPending}
      />
    </>
  );
};

export default CalificarEvaluacionBulk;
