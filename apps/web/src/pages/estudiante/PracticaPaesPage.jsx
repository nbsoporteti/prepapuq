import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, RefreshCw, Target, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { registrarActividad } from '@/lib/gamificacion';

// URL de archivo PB (compat getURL/getUrl según versión del SDK).
const fileUrl = (record, name) => {
  if (!name) return null;
  if (pb.files.getURL) return pb.files.getURL(record, name);
  return pb.files.getUrl(record, name);
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const usePreguntasPorEje = (eje) =>
  useQuery({
    queryKey: ['practica', 'eje', eje],
    enabled: !!eje,
    staleTime: 5 * 60_000,
    queryFn: () =>
      pb.collection('preguntas_paes').getFullList({
        filter: `eje = "${eje.replace(/"/g, '')}" && piloto != true`,
        $autoCancel: false,
      }),
  });

const PracticaPaesPage = () => {
  const [params] = useSearchParams();
  const eje = params.get('eje') || '';
  const { currentUser } = useAuth();

  const { data: preguntas = [], isLoading } = usePreguntasPorEje(eje);

  // Sesión: hasta 10 preguntas barajadas. `round` permite re-barajar al reiniciar.
  const [round, setRound] = useState(0);
  const sesion = useMemo(() => {
    void round; // `round` fuerza re-barajar al reiniciar
    return shuffle(preguntas).slice(0, 10);
  }, [preguntas, round]);

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correctos, setCorrectos] = useState(0);
  const [terminado, setTerminado] = useState(false);

  const p = sesion[idx];

  const responder = (letra) => {
    if (revealed || !p) return;
    setSelected(letra);
    setRevealed(true);
    if (String(letra).toUpperCase() === String(p.respuesta_correcta).toUpperCase()) {
      setCorrectos((c) => c + 1);
    }
  };

  const siguiente = () => {
    if (idx + 1 >= sesion.length) {
      setTerminado(true);
      registrarActividad(currentUser?.id, correctos * 5 + 5); // puntos por la sesión
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const reiniciar = () => {
    setRound((r) => r + 1);
    setIdx(0);
    setSelected(null);
    setRevealed(false);
    setCorrectos(0);
    setTerminado(false);
  };

  const volver = (
    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
      <Link to="/dashboard/estudiante?tab=paes">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a PAES
      </Link>
    </Button>
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      <Helmet>
        <title>Práctica por tema | PrePa</title>
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {volver}

        <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Práctica por tema</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">{eje || 'Elegí un tema'}</h1>
          </div>
          {sesion.length > 0 && !terminado && (
            <Badge variant="secondary" className="font-mono tabular-nums">
              {Math.min(idx + 1, sesion.length)} / {sesion.length}
            </Badge>
          )}
        </div>

        {!eje ? (
          <EmptyState
            icon={Target}
            title="Elegí un tema para practicar"
            description="Entrá desde 'Ejes a reforzar' en tu PAES y tocá 'Practicar' en el tema que quieras reforzar."
          />
        ) : isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : sesion.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Sin preguntas de este tema todavía"
            description="Cuando haya preguntas publicadas de este eje, vas a poder practicarlas acá."
          />
        ) : terminado ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  correctos / sesion.length >= 0.6 ? 'bg-success/10 text-success' : 'bg-accent/15 text-accent'
                }`}
              >
                <Target className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold">Práctica terminada</h2>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums">
                {correctos}/{sesion.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {Math.round((correctos / sesion.length) * 100)}% correctas en {eje}.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button onClick={reiniciar}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Practicar de nuevo
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard/estudiante?tab=paes">Volver a PAES</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : p ? (
          <PreguntaPractica
            p={p}
            selected={selected}
            revealed={revealed}
            onResponder={responder}
            onSiguiente={siguiente}
            ultima={idx + 1 >= sesion.length}
          />
        ) : null}
      </div>
    </div>
  );
};

const PreguntaPractica = ({ p, selected, revealed, onResponder, onSiguiente, ultima }) => {
  const alts = Array.isArray(p.alternativas_json) ? p.alternativas_json : [];
  const contextoImg = fileUrl(p, p.imagen_contexto);
  const enunciadoImg = fileUrl(p, p.imagen_enunciado);

  return (
    <div className="space-y-4">
      {(p.contexto || contextoImg) && (
        <Card className="bg-muted/40">
          <CardContent className="p-4">
            {p.contexto && (
              <div className="prose-prepa text-sm" dangerouslySetInnerHTML={{ __html: p.contexto }} />
            )}
            {contextoImg && <img src={contextoImg} alt="Contexto" className="mt-2 max-h-72 rounded-lg" />}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="prose-prepa text-base" dangerouslySetInnerHTML={{ __html: p.enunciado || '' }} />
          {enunciadoImg && <img src={enunciadoImg} alt="Enunciado" className="max-h-72 rounded-lg" />}

          <div className="space-y-2">
            {alts.map((alt) => {
              const letra = alt.letra;
              const isCorrect = String(letra).toUpperCase() === String(p.respuesta_correcta).toUpperCase();
              const isSelected = selected === letra;
              let cls = 'border-border hover:border-primary/60 hover:bg-muted/50';
              if (revealed) {
                if (isCorrect) cls = 'border-success bg-success/10';
                else if (isSelected) cls = 'border-destructive bg-destructive/10';
                else cls = 'border-border opacity-60';
              }
              const altImg = fileUrl(p, p[`imagen_${String(letra).toLowerCase()}`]);
              return (
                <button
                  key={letra}
                  type="button"
                  disabled={revealed}
                  onClick={() => onResponder(letra)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${cls}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                    {letra}
                  </span>
                  <span className="min-w-0 flex-1">
                    {alt.texto && <span className="text-sm text-foreground">{alt.texto}</span>}
                    {altImg && <img src={altImg} alt={`Alternativa ${letra}`} className="mt-1 max-h-40 rounded" />}
                  </span>
                  {revealed && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />}
                  {revealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="space-y-3 border-t pt-4">
              {p.explicacion ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explicación</p>
                  <div className="prose-prepa text-sm" dangerouslySetInnerHTML={{ __html: p.explicacion }} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Respuesta correcta: <span className="font-semibold text-success">{p.respuesta_correcta}</span>
                </p>
              )}
              <div className="flex justify-end">
                <Button onClick={onSiguiente}>
                  {ultima ? 'Ver resultado' : 'Siguiente'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PracticaPaesPage;
