import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  FileText,
  Download,
  ExternalLink,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ListChecks,
  Target,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { RichText } from '@/lib/richText';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// URL de un archivo de PocketBase (compat getURL/getUrl según versión del SDK).
const fileUrl = (record, name) => {
  if (!name) return null;
  if (pb.files.getURL) return pb.files.getURL(record, name);
  return pb.files.getUrl(record, name);
};
// Imagen de una alternativa (campos imagen_a … imagen_e en preguntas_paes).
const altImgUrl = (p, letra) => fileUrl(p, p[`imagen_${String(letra || '').toLowerCase()}`]);

const ASIGNATURA_LABEL = {
  competencia_lectora: 'Competencia Lectora',
  matematica_m1: 'Matemática M1',
  matematica_m2: 'Matemática M2',
  historia: 'Historia y Ciencias Sociales',
  ciencias: 'Ciencias',
};

const ASIGNATURA_COLOR = {
  competencia_lectora: 'bg-info/10 text-info border-info/30',
  matematica_m1: 'bg-primary/10 text-primary border-primary/30',
  matematica_m2: 'bg-secondary/10 text-secondary border-secondary/30',
  historia: 'bg-accent/15 text-accent border-accent/30',
  ciencias: 'bg-success/10 text-success border-success/30',
};

const fmtTime = (totalSec) => {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

// Panel del PDF del ensayo con fallbacks de abrir/descargar (por si el navegador
// bloquea el iframe). Se usa solo en simulacros en modo "pdf" (los oficiales),
// que hoy quedan archivados; el contenido nuevo es interactivo.
const PdfPanel = ({ url, titulo, className = '' }) => {
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        <FileText className="mb-2 h-8 w-8 opacity-50" />
        El PDF de este ensayo no está disponible.
      </div>
    );
  }
  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Enunciado del ensayo
        </span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Abrir
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={url} download>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Descargar
            </a>
          </Button>
        </div>
      </div>
      <iframe
        src={url}
        title={titulo ? `Enunciado: ${titulo}` : 'Enunciado del ensayo'}
        className="h-full min-h-[60vh] w-full rounded-xl border bg-card"
      />
    </div>
  );
};

// Bloque de texto base (lecturas de Competencia Lectora) compartido por varias
// preguntas. Se muestra una sola vez, encabezando el grupo.
const ContextoBlock = ({ texto, label, imgUrl }) => (
  <Card className="border-info/30 bg-info/5">
    <CardContent className="p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-info">
        <BookOpen className="h-3.5 w-3.5" />
        {label || 'Texto'}
      </div>
      {imgUrl && (
        <img src={imgUrl} alt="" className="mb-3 max-h-80 w-auto rounded border bg-white object-contain" />
      )}
      {texto && (
        <RichText as="div" className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {texto}
        </RichText>
      )}
    </CardContent>
  </Card>
);

const EstudiantePAESRendir = () => {
  const { simulacroId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const alumnoId = currentUser?.id;

  const [phase, setPhase] = useState('loading'); // loading | error | intro | taking | done
  const [errorMsg, setErrorMsg] = useState('');
  const [simulacro, setSimulacro] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const submittedRef = useRef(false);
  const startTsRef = useRef(null);

  const interactivo = preguntas.length > 0;
  const nPreguntas = interactivo ? preguntas.length : simulacro?.n_preguntas_total || 0;
  const durationSec = (simulacro?.duracion_min || 0) * 60;

  // Orden de aparición de los textos base, para etiquetarlos "Texto 1", "Texto 2"…
  const textosOrden = useMemo(() => {
    const seen = [];
    for (const p of preguntas) {
      if (p.contexto && !seen.includes(p.contexto)) seen.push(p.contexto);
    }
    return seen;
  }, [preguntas]);

  const ejes = useMemo(
    () => [...new Set(preguntas.map((p) => p.eje).filter(Boolean))],
    [preguntas],
  );

  // Preguntas que efectivamente puntúan (las piloto no cuentan).
  const nScored = useMemo(() => preguntas.filter((p) => !p.piloto).length, [preguntas]);

  // --- Carga inicial: simulacro + preguntas + intento existente -------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPhase('loading');
        const sim = await pb.collection('simulacros_paes').getOne(simulacroId, {
          $autoCancel: false,
        });
        if (!alive) return;
        setSimulacro(sim);

        // Preguntas interactivas (si el simulacro las tiene). Modo PDF = sin preguntas.
        let pregs = [];
        try {
          pregs = await pb.collection('preguntas_paes').getFullList({
            filter: `simulacro_id = "${simulacroId}"`,
            sort: 'numero',
            $autoCancel: false,
          });
        } catch (_e) {
          pregs = [];
        }
        if (!alive) return;
        setPreguntas(pregs);

        // ¿Ya rindió este simulacro? (índice único alumno+simulacro)
        let existing = null;
        try {
          existing = await pb
            .collection('resultados_simulacro_paes')
            .getFirstListItem(
              `alumno_id = "${alumnoId}" && simulacro_id = "${simulacroId}"`,
              { $autoCancel: false },
            );
        } catch (_e) {
          existing = null;
        }
        if (!alive) return;

        if (existing) {
          setResult(existing);
          setPhase('done');
        } else {
          const n = pregs.length > 0 ? pregs.length : sim.n_preguntas_total || 0;
          setAnswers(new Array(n).fill(''));
          setPhase('intro');
        }
      } catch (err) {
        console.error('Error cargando simulacro:', err);
        if (!alive) return;
        setErrorMsg('No pudimos cargar este simulacro.');
        setPhase('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [simulacroId, alumnoId]);

  // --- Cronómetro -----------------------------------------------------------
  useEffect(() => {
    if (phase !== 'taking' || !durationSec) return undefined;
    const id = setInterval(() => {
      setTimeLeftSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, durationSec]);

  // Auto-entrega al llegar a 0
  useEffect(() => {
    if (phase === 'taking' && durationSec && timeLeftSec === 0 && !submittedRef.current) {
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSec, phase, durationSec]);

  const answeredCount = useMemo(() => answers.filter(Boolean).length, [answers]);

  const setAnswer = (idx, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value || '';
      return next;
    });
  };

  const handleStart = () => {
    submittedRef.current = false;
    startTsRef.current = Date.now();
    setTimeLeftSec(durationSec);
    setPhase('taking');
    window.scrollTo({ top: 0 });
  };

  const handleSubmit = async (auto = false) => {
    if (submittedRef.current && !auto) return;
    if (submittedRef.current && auto && submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const elapsedSec = startTsRef.current
        ? Math.round((Date.now() - startTsRef.current) / 1000)
        : 0;
      const tiempoMin = Math.max(0, Math.round(elapsedSec / 60));

      const payload = {
        simulacro_id: simulacro.id,
        alumno_id: alumnoId,
        // Enviamos solo las respuestas; el puntaje lo deriva el servidor.
        respuestas_alumno_json: answers.map((a) => (a ? a : null)),
        tiempo_usado_min: tiempoMin,
        mostrar_en_ranking: true,
      };

      const created = await pb
        .collection('resultados_simulacro_paes')
        .create(payload, { $autoCancel: false });

      setResult(created);
      setPhase('done');
      queryClient.invalidateQueries({ queryKey: ['paes', 'resultados', alumnoId] });
      toast.success(auto ? 'Tiempo agotado: respuestas enviadas.' : 'Respuestas enviadas.');
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error('Error enviando respuestas:', err);
      submittedRef.current = false;
      setSubmitting(false);
      toast.error('No pudimos registrar tu intento. Intenta de nuevo.');
    }
  };

  // ---------------------------------------------------------------- LOADING
  if (phase === 'loading') {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ---------------------------------------------------------------- ERROR
  if (phase === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">No disponible</h2>
        <p className="mt-2 text-muted-foreground">{errorMsg}</p>
        <Button className="mt-6" onClick={() => navigate('/dashboard/estudiante')}>
          Volver al panel
        </Button>
      </div>
    );
  }

  const asigLabel = ASIGNATURA_LABEL[simulacro?.asignatura] || simulacro?.asignatura;
  const asigColor = ASIGNATURA_COLOR[simulacro?.asignatura] || '';

  // ---------------------------------------------------------------- DONE
  if (phase === 'done') {
    const correctas = result?.respuestas_correctas;
    const puntaje = result?.puntaje;
    const graded = typeof puntaje === 'number' && puntaje > 0;
    const studentAns = Array.isArray(result?.respuestas_alumno_json)
      ? result.respuestas_alumno_json
      : [];
    return (
      <>
        <Helmet>
          <title>Resultado · {simulacro?.titulo} | PrePa</title>
        </Helmet>
        <div className="container mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-3 mb-6 text-muted-foreground"
          >
            <Link to="/dashboard/estudiante">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al panel
            </Link>
          </Button>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={asigColor}>
              {asigLabel}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight">{simulacro?.titulo}</h1>
          </div>

          {graded ? (
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/5">
              <CardContent className="p-6 md:p-8">
                <Badge variant="secondary" className="mb-3 border-0 bg-primary/10 text-primary">
                  <Target className="mr-1.5 h-3 w-3" />
                  Puntaje obtenido
                </Badge>
                <p className="font-mono text-6xl font-bold tabular-nums md:text-7xl">
                  {puntaje}
                  <span className="ml-2 text-base font-normal text-muted-foreground">/ 1000</span>
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {typeof correctas === 'number' && (
                    <Stat
                      label="Respuestas correctas"
                      value={interactivo ? `${correctas}/${nScored}` : correctas}
                    />
                  )}
                  {typeof result?.percentil_interno === 'number' && (
                    <Stat label="Percentil interno" value={`P${result.percentil_interno}`} />
                  )}
                  {typeof result?.tiempo_usado_min === 'number' && (
                    <Stat label="Tiempo usado" value={`${result.tiempo_usado_min} min`} />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex items-start gap-3 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Intento registrado en modo práctica</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Guardamos tus respuestas. El clavijero oficial de este ensayo todavía no
                    está cargado, así que el puntaje se calculará automáticamente apenas el
                    equipo lo publique. Te avisaremos cuando esté tu resultado.
                  </p>
                  {typeof result?.tiempo_usado_min === 'number' && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Tiempo usado:{' '}
                      <span className="font-mono tabular-nums">{result.tiempo_usado_min} min</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revisión pregunta por pregunta (solo interactivo) */}
          {interactivo && (
            <div className="mt-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <ListChecks className="h-5 w-5 text-primary" />
                Revisión pregunta por pregunta
              </h2>
              <div className="space-y-4">
                {preguntas.map((p, idx, arr) => {
                  const showCtx = p.contexto && p.contexto !== arr[idx - 1]?.contexto;
                  return (
                    <React.Fragment key={p.id}>
                      {showCtx && (
                        <ContextoBlock
                          texto={p.contexto}
                          label={`Texto ${textosOrden.indexOf(p.contexto) + 1}`}
                          imgUrl={fileUrl(p, p.imagen_contexto)}
                        />
                      )}
                      <RevisionPregunta p={p} idx={idx} mine={studentAns[idx]} />
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/dashboard/estudiante">
                <Sparkles className="mr-2 h-4 w-4" />
                Ver mi PAES
              </Link>
            </Button>
            {simulacro?.pdf_url && (
              <Button asChild variant="ghost">
                <a href={simulacro.pdf_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  Revisar el ensayo
                </a>
              </Button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------- INTRO
  if (phase === 'intro') {
    return (
      <>
        <Helmet>
          <title>Rendir · {simulacro?.titulo} | PrePa</title>
        </Helmet>
        <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-3 mb-6 text-muted-foreground"
          >
            <Link to="/dashboard/estudiante">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al panel
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <Badge variant="secondary" className={`mb-3 ${asigColor}`}>
                {asigLabel}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {simulacro?.titulo}
              </h1>
              {simulacro?.descripcion && (
                <p className="mt-3 max-w-2xl text-muted-foreground">{simulacro.descripcion}</p>
              )}

              {simulacro?.instrucciones && (
                <Card className="mt-5 border-amber-300/50 bg-amber-50/60">
                  <CardContent className="flex items-start gap-3 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="mb-1 text-sm font-semibold text-amber-900">Instrucciones</p>
                      <RichText
                        as="div"
                        className="whitespace-pre-line text-sm leading-relaxed text-amber-900/90"
                      >
                        {simulacro.instrucciones}
                      </RichText>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="mt-6">
                {interactivo ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        Cómo funciona
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                      <ul className="space-y-2.5">
                        <li className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          Responde cada pregunta <strong className="text-foreground">en pantalla</strong>{' '}
                          seleccionando una alternativa.
                        </li>
                        <li className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          El cronómetro parte al presionar <strong className="text-foreground">Comenzar</strong>;
                          al llegar a cero se entrega solo.
                        </li>
                        <li className="flex gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          Al terminar verás tu <strong className="text-foreground">puntaje</strong> y la{' '}
                          <strong className="text-foreground">explicación</strong> de cada pregunta.
                        </li>
                      </ul>

                      {ejes.length > 0 && (
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                            Contenidos
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {ejes.map((e) => (
                              <Badge key={e} variant="outline" className="font-normal">
                                {e}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <PdfPanel
                    url={simulacro?.pdf_url}
                    titulo={simulacro?.titulo}
                    className="h-[60vh]"
                  />
                )}
              </div>
            </div>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Antes de comenzar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <ul className="space-y-3">
                    <InfoRow icon={ListChecks} label="Preguntas">
                      <span className="font-mono tabular-nums">{nPreguntas}</span>
                    </InfoRow>
                    <InfoRow icon={Clock} label="Tiempo">
                      {simulacro?.duracion_min ? (
                        <>
                          <span className="font-mono tabular-nums">{simulacro.duracion_min}</span>{' '}
                          minutos
                        </>
                      ) : (
                        'Sin límite'
                      )}
                    </InfoRow>
                  </ul>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                    {interactivo ? (
                      <>
                        Selecciona una alternativa por pregunta. El cronómetro empieza al presionar{' '}
                        <strong>Comenzar</strong> y al llegar a cero se entrega automáticamente. Al
                        terminar verás tu puntaje y la explicación de cada respuesta. No podrás volver
                        a rendir este simulacro.
                      </>
                    ) : (
                      <>
                        Lee los enunciados en el PDF y marca tu alternativa (A–E) en la hoja de
                        respuestas. El cronómetro empieza al presionar <strong>Comenzar</strong> y al
                        llegar a cero se entrega automáticamente.
                      </>
                    )}
                  </div>

                  <Button className="w-full" size="lg" onClick={handleStart}>
                    Comenzar
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------- TAKING
  const lowTime = durationSec && timeLeftSec <= 60;
  const midTime = durationSec && timeLeftSec <= 300 && timeLeftSec > 60;
  const progressPct = nPreguntas ? Math.round((answeredCount / nPreguntas) * 100) : 0;

  return (
    <>
      <Helmet>
        <title>Rindiendo · {simulacro?.titulo} | PrePa</title>
      </Helmet>

      {/* Barra de acción fija (debajo del header global de 64px) */}
      <div className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {durationSec ? (
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${
                  lowTime
                    ? 'bg-destructive/10 text-destructive'
                    : midTime
                      ? 'bg-warning/10 text-warning-foreground'
                      : 'bg-muted text-foreground'
                }`}
                role="timer"
                aria-live={lowTime ? 'assertive' : 'off'}
              >
                <Clock className="h-4 w-4" />
                {fmtTime(timeLeftSec)}
              </div>
            ) : (
              <Badge variant="outline">Sin límite de tiempo</Badge>
            )}
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">
                Respondidas{' '}
                <span className="font-mono tabular-nums text-foreground">
                  {answeredCount}/{nPreguntas}
                </span>
              </p>
              <Progress value={progressPct} className="mt-1 h-1.5 w-40" />
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Entregar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Entregar tus respuestas?</AlertDialogTitle>
                <AlertDialogDescription>
                  Respondiste {answeredCount} de {nPreguntas} preguntas
                  {answeredCount < nPreguntas && (
                    <> — quedan {nPreguntas - answeredCount} sin marcar</>
                  )}
                  . No podrás volver a rendir este simulacro una vez entregado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Seguir respondiendo</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleSubmit(false)}>
                  Entregar ahora
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {interactivo ? (
        // -------- Modo interactivo: preguntas en pantalla -------------------
        <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {preguntas.map((p, idx, arr) => {
              const showCtx = p.contexto && p.contexto !== arr[idx - 1]?.contexto;
              return (
                <React.Fragment key={p.id}>
                  {showCtx && (
                    <ContextoBlock
                      texto={p.contexto}
                      label={`Texto ${textosOrden.indexOf(p.contexto) + 1}`}
                      imgUrl={fileUrl(p, p.imagen_contexto)}
                    />
                  )}
                  <PreguntaInteractiva
                    p={p}
                    idx={idx}
                    value={answers[idx] || ''}
                    onChange={(v) => setAnswer(idx, v)}
                  />
                </React.Fragment>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Entregar y ver mi puntaje
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Entregar tus respuestas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Respondiste {answeredCount} de {nPreguntas} preguntas
                    {answeredCount < nPreguntas && (
                      <> — quedan {nPreguntas - answeredCount} sin marcar</>
                    )}
                    . No podrás volver a rendir este simulacro una vez entregado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Seguir respondiendo</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleSubmit(false)}>
                    Entregar ahora
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        // -------- Modo PDF (simulacros oficiales archivados) ----------------
        <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <PdfPanel
              url={simulacro?.pdf_url}
              titulo={simulacro?.titulo}
              className="lg:sticky lg:top-32 lg:h-[calc(100vh-9rem)]"
            />

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <ListChecks className="h-5 w-5 text-primary" />
                Hoja de respuestas
              </h2>
              <Card>
                <CardContent className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-2">
                  {answers.map((value, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 odd:bg-muted/30"
                    >
                      <span className="w-7 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">
                        {idx + 1}
                      </span>
                      <ToggleGroup
                        type="single"
                        value={value}
                        onValueChange={(v) => setAnswer(idx, v)}
                        className="justify-start gap-1"
                        aria-label={`Pregunta ${idx + 1}`}
                      >
                        {LETTERS.map((l) => (
                          <ToggleGroupItem
                            key={l}
                            value={l}
                            aria-label={`Pregunta ${idx + 1}, alternativa ${l}`}
                            className="h-8 w-8 rounded-full border data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                          >
                            {l}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Pregunta interactiva (modo "taking"): enunciado + alternativas seleccionables.
const PreguntaInteractiva = ({ p, idx, value, onChange }) => {
  const alts = Array.isArray(p.alternativas_json) ? p.alternativas_json : [];
  const enunciadoImg = fileUrl(p, p.imagen_enunciado);
  return (
    <Card id={`pregunta-${idx + 1}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            {p.eje && (
              <Badge variant="outline" className="mb-1.5 font-normal text-xs">
                {p.eje}
              </Badge>
            )}
            <RichText as="p" className="whitespace-pre-line font-medium leading-relaxed">
              {p.enunciado}
            </RichText>
            {enunciadoImg && (
              <img src={enunciadoImg} alt="" className="mt-2 max-h-80 w-auto rounded border bg-white object-contain" />
            )}
          </div>
        </div>

        <ToggleGroup
          type="single"
          value={value}
          onValueChange={onChange}
          className="flex flex-col items-stretch gap-2"
          aria-label={`Pregunta ${idx + 1}`}
        >
          {alts.map((alt) => {
            const img = altImgUrl(p, alt.letra);
            return (
              <ToggleGroupItem
                key={alt.letra}
                value={alt.letra}
                aria-label={`Alternativa ${alt.letra}`}
                className="h-auto justify-start gap-3 whitespace-normal rounded-lg border px-3 py-2.5 text-left font-normal data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                  {alt.letra}
                </span>
                <span className="min-w-0 flex-1">
                  {alt.texto && (
                    <RichText as="span" className="text-sm leading-snug">
                      {alt.texto}
                    </RichText>
                  )}
                  {img && (
                    <img src={img} alt="" className="mt-1 max-h-44 w-auto rounded border bg-white object-contain" />
                  )}
                </span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </CardContent>
    </Card>
  );
};

// Pregunta en modo revisión (post-entrega): marca la correcta y la del alumno.
const RevisionPregunta = ({ p, idx, mine }) => {
  const alts = Array.isArray(p.alternativas_json) ? p.alternativas_json : [];
  const piloto = !!p.piloto;
  const correct = p.respuesta_correcta;
  const answered = !!mine;
  const isCorrect = !piloto && mine === correct;
  const enunciadoImg = fileUrl(p, p.imagen_enunciado);

  return (
    <Card
      className={
        piloto
          ? 'border-info/30'
          : isCorrect
            ? 'border-success/40'
            : answered
              ? 'border-destructive/40'
              : ''
      }
    >
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-start gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${
              piloto
                ? 'bg-info/15 text-info'
                : isCorrect
                  ? 'bg-success/15 text-success'
                  : answered
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-muted text-muted-foreground'
            }`}
          >
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {p.eje && (
                <Badge variant="outline" className="font-normal text-xs">
                  {p.eje}
                </Badge>
              )}
              {piloto ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-info">
                  <Sparkles className="h-3.5 w-3.5" /> Piloto · no puntúa
                </span>
              ) : isCorrect ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Correcta
                </span>
              ) : answered ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> Incorrecta
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">Sin responder</span>
              )}
            </div>
            <RichText as="p" className="whitespace-pre-line font-medium leading-relaxed">
              {p.enunciado}
            </RichText>
            {enunciadoImg && (
              <img src={enunciadoImg} alt="" className="mt-2 max-h-80 w-auto rounded border bg-white object-contain" />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          {alts.map((alt) => {
            const esCorrecta = !piloto && alt.letra === correct;
            const esTuya = alt.letra === mine;
            const img = altImgUrl(p, alt.letra);
            return (
              <div
                key={alt.letra}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                  esCorrecta
                    ? 'border-success/50 bg-success/10'
                    : esTuya
                      ? piloto
                        ? 'border-info/50 bg-info/10'
                        : 'border-destructive/50 bg-destructive/10'
                      : 'border-transparent'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    esCorrecta
                      ? 'border-success/50 text-success'
                      : esTuya
                        ? piloto
                          ? 'border-info/50 text-info'
                          : 'border-destructive/50 text-destructive'
                        : 'text-muted-foreground'
                  }`}
                >
                  {alt.letra}
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  {alt.texto && <RichText as="span">{alt.texto}</RichText>}
                  {img && (
                    <img src={img} alt="" className="mt-1 max-h-44 w-auto rounded border bg-white object-contain" />
                  )}
                </span>
                {esCorrecta && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
                {esTuya && !esCorrecta && !piloto && (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
              </div>
            );
          })}
        </div>

        {p.explicacion && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Explicación: </span>
            <RichText as="span">{p.explicacion}</RichText>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <p className="font-mono text-2xl font-bold tabular-nums">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const InfoRow = ({ icon: Icon, label, children }) => (
  <li className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </span>
    <span className="font-medium text-foreground">{children}</span>
  </li>
);

export default EstudiantePAESRendir;
