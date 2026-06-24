import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  ArrowLeft,
  FileUp,
  Eye,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Wand2,
  Trash2,
  BookOpen,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import {
  ASIGNATURAS,
  EJEMPLO_PEGADO,
  parsePreguntas,
  serializePreguntas,
  tablaConversionRef,
  validatePreguntas,
} from '@/lib/paesImport';

const hoyISO = () => new Date().toISOString().slice(0, 10);

const FORMATO_AYUDA = `Cada pregunta empieza con un número (1. , 2) , …).
Las alternativas van con letra: A) , B) , *C) , D)
Marcá la correcta con un * al inicio  →  *C)
…o con una línea aparte:  Correcta: C
Opcionales por pregunta:  Eje: …   /   Explicación: …
Texto de lectura compartido:  empezá un bloque con  "Texto:"  (se aplica a las
preguntas siguientes hasta el próximo "Texto:" o una línea con  ---).`;

const AdminPAESImportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id') || null;

  const [meta, setMeta] = useState({
    titulo: '',
    asignatura: '',
    fecha: hoyISO(),
    duracion_min: 60,
    descripcion: '',
    estado: 'publicado',
  });
  const [text, setText] = useState('');
  const [existingSims, setExistingSims] = useState([]);
  const [loadingEdit, setLoadingEdit] = useState(!!editingId);
  const [showHelp, setShowHelp] = useState(false);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [done, setDone] = useState(null); // { n, estado, simId, titulo }

  // --- Carga: lista de simulacros (para detectar colisiones de título) ------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sims = await pb.collection('simulacros_paes').getFullList({
          sort: '-created',
          $autoCancel: false,
        });
        if (alive) setExistingSims(sims);
      } catch (_e) {
        // Si la colección aún no existe (backend sin redeploy) seguimos igual.
        if (alive) setExistingSims([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // --- Modo edición: cargar simulacro + serializar sus preguntas al textarea -
  useEffect(() => {
    if (!editingId) return undefined;
    let alive = true;
    (async () => {
      try {
        setLoadingEdit(true);
        const sim = await pb.collection('simulacros_paes').getOne(editingId, { $autoCancel: false });
        if (!alive) return;
        setMeta({
          titulo: sim.titulo || '',
          asignatura: sim.asignatura || '',
          fecha: sim.fecha ? String(sim.fecha).slice(0, 10) : hoyISO(),
          duracion_min: sim.duracion_min || 60,
          descripcion: sim.descripcion || '',
          estado: sim.estado === 'publicado' ? 'publicado' : 'programado',
        });
        const pregs = await pb.collection('preguntas_paes').getFullList({
          filter: `simulacro_id = "${editingId}"`,
          sort: 'numero',
          $autoCancel: false,
        });
        if (!alive) return;
        setText(pregs.length ? serializePreguntas(pregs) : '');
      } catch (err) {
        console.error('Error cargando simulacro a editar:', err);
        toast.error('No se pudo cargar el simulacro para editar.');
      } finally {
        if (alive) setLoadingEdit(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [editingId]);

  // --- Parseo en vivo -------------------------------------------------------
  const { questions, textosOrden } = useMemo(() => parsePreguntas(text), [text]);
  const issues = useMemo(() => validatePreguntas(questions), [questions]);
  const errorIssues = text.trim() ? issues.filter((i) => i.level === 'error') : [];
  const issuesByQ = useMemo(() => {
    const m = {};
    for (const it of errorIssues) {
      if (it.q) (m[it.q] = m[it.q] || []).push(it.msg);
    }
    return m;
  }, [errorIssues]);

  const dupSim = useMemo(() => {
    const t = meta.titulo.trim().toLowerCase();
    if (!t) return null;
    return existingSims.find(
      (s) => s.id !== editingId && (s.titulo || '').trim().toLowerCase() === t,
    );
  }, [existingSims, meta.titulo, editingId]);

  const metaComplete =
    meta.titulo.trim() && meta.asignatura && meta.fecha && Number(meta.duracion_min) > 0;
  const canImport =
    !!metaComplete && questions.length > 0 && errorIssues.length === 0 && !importing && !loadingEdit;

  const setMetaField = (k, v) => setMeta((m) => ({ ...m, [k]: v }));

  // --- Importación ----------------------------------------------------------
  const handleImport = async () => {
    if (!canImport) return;
    const n = questions.length;
    const correctas = questions.map((q) => q.correcta);

    setImporting(true);
    setProgress({ done: 0, total: n });
    try {
      const payload = {
        titulo: meta.titulo.trim(),
        asignatura: meta.asignatura,
        fecha: `${meta.fecha} 12:00:00.000Z`,
        n_preguntas_total: n,
        tabla_conversion_json: tablaConversionRef(n),
        puntaje_max_chile: 1000,
        descripcion: meta.descripcion.trim(),
        duracion_min: Number(meta.duracion_min) || 0,
        modo: 'interactivo',
        estado: meta.estado,
        clave_respuestas_json: correctas,
      };

      // 1) Crear o actualizar el simulacro (upsert por id o por título).
      let sim;
      if (editingId) {
        sim = await pb.collection('simulacros_paes').update(editingId, payload, { $autoCancel: false });
      } else if (dupSim) {
        sim = await pb.collection('simulacros_paes').update(dupSim.id, payload, { $autoCancel: false });
      } else {
        sim = await pb.collection('simulacros_paes').create(payload, { $autoCancel: false });
      }

      // 2) Borrar las preguntas anteriores (índice único simulacro+número).
      const viejas = await pb.collection('preguntas_paes').getFullList({
        filter: `simulacro_id = "${sim.id}"`,
        $autoCancel: false,
      });
      for (const v of viejas) {
        await pb.collection('preguntas_paes').delete(v.id, { $autoCancel: false });
      }

      // 3) Crear las preguntas nuevas en orden.
      for (let i = 0; i < questions.length; i += 1) {
        const q = questions[i];
        await pb.collection('preguntas_paes').create(
          {
            simulacro_id: sim.id,
            numero: i + 1,
            eje: q.eje || '',
            contexto: q.contexto || '',
            enunciado: q.enunciado,
            alternativas_json: q.alternativas,
            respuesta_correcta: q.correcta,
            explicacion: q.explicacion || '',
          },
          { $autoCancel: false },
        );
        setProgress({ done: i + 1, total: n });
      }

      toast.success(`Simulacro guardado con ${n} preguntas.`);
      setDone({ n, estado: meta.estado, simId: sim.id, titulo: sim.titulo });
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error('Error importando preguntas PAES:', err);
      toast.error('Falló la importación: ' + (err?.message || 'error desconocido'));
    } finally {
      setImporting(false);
    }
  };

  const resetTodo = () => {
    setMeta({
      titulo: '',
      asignatura: '',
      fecha: hoyISO(),
      duracion_min: 60,
      descripcion: '',
      estado: 'publicado',
    });
    setText('');
    setDone(null);
    if (editingId) navigate('/dashboard/admin/paes');
  };

  // ----------------------------------------------------------------- DONE
  if (done) {
    return (
      <>
        <Helmet>
          <title>Simulacro guardado | PrePa</title>
        </Helmet>
        <div className="container mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">¡Simulacro guardado!</h1>
              <p className="mt-2 text-muted-foreground">
                <span className="font-semibold text-foreground">{done.titulo}</span> quedó con{' '}
                <span className="font-mono tabular-nums">{done.n}</span> preguntas, corrección
                automática y la clave armada sola.
              </p>
              {done.estado === 'publicado' ? (
                <Badge className="mt-4 border-0 bg-success/15 text-success">
                  Publicado · visible para estudiantes
                </Badge>
              ) : (
                <Badge variant="secondary" className="mt-4">
                  Borrador · oculto hasta que lo publiques
                </Badge>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={resetTodo}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Cargar otro
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/dashboard/admin/paes?id=${done.simId}`}>Editar este</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/dashboard/admin">Volver al panel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // ----------------------------------------------------------------- FORM
  return (
    <>
      <Helmet>
        <title>{editingId ? 'Editar' : 'Importar'} ensayo PAES | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-32">
        <div className="border-b border-border bg-slate-950">
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-slate-300 hover:text-white">
              <Link to="/dashboard/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Panel de administración
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-white text-balance">
              {editingId ? 'Editar' : 'Importar'} ensayo <span className="text-primary">PAES</span>
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Pegá las preguntas en texto, elegí la asignatura y el sistema arma la clave solo. Queda
              auto-corrigiendo igual que los mini-ensayos.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Nota de responsabilidad de contenido */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p>
              Cargá solo preguntas que tengas derecho a usar (propias o autorizadas). No subas la
              transcripción de ensayos oficiales DEMRE: su licencia prohíbe reproducirlos. El
              contenido que pegues queda bajo tu responsabilidad.
            </p>
          </div>

          {/* Metadatos del simulacro */}
          <Card className="mb-6 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Datos del simulacro</CardTitle>
              <CardDescription>
                {editingId
                  ? 'Estás editando un simulacro existente. Al guardar se reemplazan todas sus preguntas.'
                  : 'Si el título coincide con uno existente, se actualiza ese simulacro.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="titulo">
                    Título <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="titulo"
                    value={meta.titulo}
                    onChange={(e) => setMetaField('titulo', e.target.value)}
                    placeholder="Ej: Ensayo Competencia Lectora N°1"
                    className="text-foreground"
                  />
                  {dupSim && !editingId && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Info className="h-3.5 w-3.5" />
                      Ya existe un simulacro con este título: se actualizará (se reemplazan sus
                      preguntas).
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Asignatura <span className="text-destructive">*</span>
                  </Label>
                  <Select value={meta.asignatura} onValueChange={(v) => setMetaField('asignatura', v)}>
                    <SelectTrigger className="text-foreground">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ASIGNATURAS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracion">
                    Duración (minutos) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="duracion"
                    type="number"
                    min={1}
                    max={480}
                    value={meta.duracion_min}
                    onChange={(e) => setMetaField('duracion_min', e.target.value)}
                    className="text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha">
                    Fecha <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={meta.fecha}
                    onChange={(e) => setMetaField('fecha', e.target.value)}
                    className="text-foreground"
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
                    <Switch
                      id="publicar"
                      checked={meta.estado === 'publicado'}
                      onCheckedChange={(v) => setMetaField('estado', v ? 'publicado' : 'programado')}
                    />
                    <Label htmlFor="publicar" className="cursor-pointer">
                      {meta.estado === 'publicado' ? 'Publicado (visible)' : 'Borrador (oculto)'}
                    </Label>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Input
                    id="descripcion"
                    value={meta.descripcion}
                    onChange={(e) => setMetaField('descripcion', e.target.value)}
                    placeholder="Breve detalle que verá el estudiante antes de comenzar."
                    className="text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editor + preview */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pegar preguntas */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <FileUp className="h-5 w-5 text-primary" />
                  Pegá las preguntas
                </h2>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setShowHelp((s) => !s)}>
                    <Info className="mr-1.5 h-3.5 w-3.5" />
                    Formato
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setText(EJEMPLO_PEGADO)}>
                    <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                    Ejemplo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setText('')}
                    disabled={!text}
                    title="Vaciar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {showHelp && (
                <div className="rounded-lg border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
                  <pre className="whitespace-pre-wrap font-sans">{FORMATO_AYUDA}</pre>
                </div>
              )}

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  loadingEdit ? 'Cargando preguntas…' : 'Pegá acá tus preguntas (mirá "Ejemplo" o "Formato").'
                }
                disabled={loadingEdit}
                spellCheck={false}
                className="min-h-[55vh] resize-y font-mono text-sm text-foreground"
              />
            </div>

            {/* Preview en vivo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Eye className="h-5 w-5 text-primary" />
                  Vista previa
                </h2>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="font-mono">
                    {questions.length} preguntas
                  </Badge>
                  {textosOrden.length > 0 && (
                    <Badge variant="outline" className="font-mono">
                      {textosOrden.length} texto{textosOrden.length === 1 ? '' : 's'}
                    </Badge>
                  )}
                  {errorIssues.length > 0 ? (
                    <Badge variant="destructive" className="font-mono">
                      {errorIssues.length} a revisar
                    </Badge>
                  ) : questions.length > 0 ? (
                    <Badge className="border-0 bg-success/15 font-mono text-success">OK</Badge>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[60vh] space-y-3 overflow-y-auto rounded-xl border bg-card/40 p-3">
                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
                    <ListChecks className="mb-2 h-8 w-8 opacity-40" />
                    Acá vas a ver cómo quedan las preguntas a medida que las pegás.
                  </div>
                ) : (
                  questions.map((q, idx, arr) => {
                    const showCtx = q.contexto && q.contexto !== arr[idx - 1]?.contexto;
                    const errs = issuesByQ[idx + 1] || [];
                    return (
                      <React.Fragment key={idx}>
                        {showCtx && (
                          <div className="rounded-lg border border-info/30 bg-info/5 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-info">
                              <BookOpen className="h-3.5 w-3.5" />
                              Texto {textosOrden.indexOf(q.contexto) + 1}
                            </div>
                            <p className="line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-foreground/80">
                              {q.contexto}
                            </p>
                          </div>
                        )}
                        <PreviewPregunta q={q} idx={idx} errs={errs} />
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de importación fija */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0 text-sm text-muted-foreground">
              {importing ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums">
                    {progress.done}/{progress.total}
                  </span>
                  <Progress
                    value={progress.total ? Math.round((progress.done / progress.total) * 100) : 0}
                    className="h-1.5 w-40"
                  />
                </div>
              ) : !metaComplete ? (
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Completá título, asignatura, duración y fecha.
                </span>
              ) : errorIssues.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Hay {errorIssues.length} cosa{errorIssues.length === 1 ? '' : 's'} por corregir en
                  las preguntas.
                </span>
              ) : questions.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Listo para cargar {questions.length} preguntas con corrección automática.
                </span>
              ) : (
                <span>Pegá las preguntas para empezar.</span>
              )}
            </div>

            <Button size="lg" onClick={handleImport} disabled={!canImport}>
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              {editingId || dupSim ? 'Guardar cambios' : 'Crear simulacro'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

// Tarjeta de una pregunta en la vista previa.
const PreviewPregunta = ({ q, idx, errs }) => {
  const hasErr = errs.length > 0;
  return (
    <div
      className={`rounded-lg border bg-card p-3 ${hasErr ? 'border-destructive/40' : 'border-border/60'}`}
    >
      <div className="mb-2 flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
          {idx + 1}
        </span>
        <div className="min-w-0 flex-1">
          {q.eje && (
            <Badge variant="outline" className="mb-1 text-[10px] font-normal">
              {q.eje}
            </Badge>
          )}
          <p className="whitespace-pre-line text-sm font-medium leading-snug">
            {q.enunciado || <span className="text-destructive">(sin enunciado)</span>}
          </p>
        </div>
      </div>

      <ul className="space-y-1">
        {q.alternativas.map((a, i) => {
          const correcta = a.letra === q.correcta;
          return (
            <li
              key={`${a.letra}-${i}`}
              className={`flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs ${
                correcta ? 'border-success/50 bg-success/10' : 'border-transparent'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                  correcta ? 'border-success/50 text-success' : 'text-muted-foreground'
                }`}
              >
                {a.letra}
              </span>
              <span className="flex-1 leading-snug">{a.texto}</span>
              {correcta && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />}
            </li>
          );
        })}
      </ul>

      {q.explicacion && (
        <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Explicación: </span>
          {q.explicacion}
        </p>
      )}

      {hasErr && (
        <ul className="mt-2 space-y-0.5">
          {errs.map((m, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminPAESImportPage;
