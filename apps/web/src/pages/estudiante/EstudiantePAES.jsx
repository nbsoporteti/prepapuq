import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Clock, GraduationCap, Library, ListChecks, PlayCircle, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import cortesData from '@/data/cortes-carreras-2025.json';

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

const useResultadosPAES = (alumnoId) => useQuery({
  queryKey: ['paes', 'resultados', alumnoId],
  enabled: !!alumnoId,
  staleTime: 30_000,
  queryFn: async () => {
    const r = await pb.collection('resultados_simulacro_paes').getFullList({
      filter: `alumno_id = "${alumnoId}"`,
      expand: 'simulacro_id',
      sort: '-created',
      $autoCancel: false,
    });
    return r;
  },
});

const useSimulacrosDisponibles = () => useQuery({
  queryKey: ['paes', 'simulacros'],
  staleTime: 60_000,
  queryFn: async () => pb.collection('simulacros_paes').getFullList({
    filter: 'estado = "publicado"',
    sort: 'asignatura,titulo',
    $autoCancel: false,
  }),
});

const EstudiantePAES = ({ pupiloId }) => {
  const { currentUser } = useAuth();
  const targetId = pupiloId || currentUser?.id;
  const { data: resultados = [], isLoading } = useResultadosPAES(targetId);
  const { data: simulacros = [] } = useSimulacrosDisponibles();
  const isApoderadoMode = !!pupiloId;

  const [carreraObjetivo, setCarreraObjetivo] = useState('');

  // Mapa simulacro_id → resultado, para saber cuáles ya rindió el alumno.
  const resultadoPorSimulacro = useMemo(() => {
    const map = new Map();
    for (const r of resultados) {
      const sid = r.simulacro_id || r.expand?.simulacro_id?.id;
      if (sid) map.set(sid, r);
    }
    return map;
  }, [resultados]);

  // Mejor puntaje por asignatura
  const porAsignatura = useMemo(() => {
    const map = new Map();
    for (const r of resultados) {
      const asig = r.expand?.simulacro_id?.asignatura;
      if (!asig || !r.puntaje) continue;
      const prev = map.get(asig);
      if (!prev || r.puntaje > prev.puntaje) map.set(asig, { ...r, asignatura: asig });
    }
    return map;
  }, [resultados]);

  // Proyección: suma de mejores resultados por asignatura (proxy simple)
  const puntajeProyectado = useMemo(() => {
    if (porAsignatura.size === 0) return null;
    const sumas = Array.from(porAsignatura.values()).map((r) => r.puntaje);
    return Math.round(sumas.reduce((a, b) => a + b, 0) / sumas.length);
  }, [porAsignatura]);

  // Cortes filtrados según búsqueda
  const cortes = cortesData.carreras || [];

  return (
    <div className="space-y-6">
      {!isApoderadoMode && (
        <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground">
          <Link to="/dashboard/estudiante">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al dashboard
          </Link>
        </Button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">{isApoderadoMode ? 'PAES de mi pupilo' : 'Mi PAES'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Resultados de simulacros, percentil interno y comparación con cortes históricos de carreras chilenas.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/biblioteca">
            <Library className="mr-2 h-4 w-4" />
            Biblioteca PAES
          </Link>
        </Button>
      </div>

      {/* Simulacros disponibles para rendir (solo en modo alumno) */}
      {!isApoderadoMode && simulacros.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" />
            Simulacros para rendir
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {simulacros.map((s) => {
              const yaRendido = resultadoPorSimulacro.get(s.id);
              return (
                <Card key={s.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <Badge variant="secondary" className={`w-fit ${ASIGNATURA_COLOR[s.asignatura] || ''}`}>
                      {ASIGNATURA_LABEL[s.asignatura] || s.asignatura}
                    </Badge>
                    <CardTitle className="text-base leading-snug mt-2">{s.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" />
                        <span className="font-mono tabular-nums">{s.n_preguntas_total}</span> preguntas
                      </span>
                      {s.duracion_min > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-mono tabular-nums">{s.duracion_min}</span> min
                        </span>
                      )}
                    </div>
                    {yaRendido ? (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link to={`/dashboard/estudiante/paes/${s.id}`}>
                          Ver resultado
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full" asChild>
                        <Link to={`/dashboard/estudiante/paes/${s.id}`}>
                          Rendir
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : porAsignatura.size === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Sin simulacros rendidos aún"
          description='Cuando tus profesores publiquen resultados de simulacros PAES, verás acá tu puntaje proyectado, percentil interno y comparación con cortes históricos.'
        />
      ) : (
        <>
          {/* Hero proyección */}
          <Card className="bg-gradient-to-br from-primary/5 via-card to-secondary/5 border-primary/20">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0 mb-3">
                    <TrendingUp className="h-3 w-3 mr-1.5" />
                    Puntaje proyectado
                  </Badge>
                  <p className="font-mono text-6xl md:text-7xl font-bold tabular-nums text-foreground">
                    {puntajeProyectado || '—'}
                    <span className="text-base font-normal text-muted-foreground ml-2">/ 1000</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Promedio de tus mejores resultados en {porAsignatura.size} asignaturas.
                  </p>
                </div>
                <div className="flex-1 min-w-[200px] max-w-md">
                  <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">
                    Comparar con corte de carrera
                  </p>
                  <Select value={carreraObjetivo} onValueChange={setCarreraObjetivo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí una carrera..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cortes.map((c, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {c.carrera} — {c.universidad} ({c.corte})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {carreraObjetivo && (() => {
                    const c = cortes[parseInt(carreraObjetivo, 10)];
                    if (!c) return null;
                    const diff = (puntajeProyectado || 0) - c.corte;
                    const pct = Math.min(100, Math.round(((puntajeProyectado || 0) / c.corte) * 100));
                    return (
                      <div className="mt-3 p-3 rounded-lg bg-card border">
                        <div className="flex justify-between items-baseline text-sm mb-1.5">
                          <span className="font-medium">{c.carrera}</span>
                          <span className="font-mono text-xs text-muted-foreground">corte {c.corte}</span>
                        </div>
                        <Progress value={pct} className="h-2 mb-2" />
                        <p className={diff >= 0 ? 'text-xs text-success font-medium' : 'text-xs text-warning-foreground font-medium'}>
                          {diff >= 0
                            ? `Te sobran ${diff} puntos por sobre el corte 🎉`
                            : `Te faltan ${Math.abs(diff)} puntos para alcanzar el corte`}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Por asignatura */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Mejor resultado por asignatura
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(porAsignatura.values()).map((r) => (
                <Card key={r.asignatura}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={ASIGNATURA_COLOR[r.asignatura]}>
                        {ASIGNATURA_LABEL[r.asignatura] || r.asignatura}
                      </Badge>
                      {r.percentil_interno !== null && (
                        <span className="text-xs font-mono text-muted-foreground">
                          P{r.percentil_interno}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-3xl font-bold tabular-nums">{r.puntaje}</p>
                    {r.expand?.simulacro_id?.titulo && (
                      <p className="text-xs text-muted-foreground mt-1.5 truncate">
                        {r.expand.simulacro_id.titulo}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Histórico */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-secondary" />
              Histórico ({resultados.length} simulacros)
            </h3>
            <Card>
              <CardContent className="p-0 divide-y">
                {resultados.map((r) => {
                  const asig = r.expand?.simulacro_id?.asignatura;
                  return (
                    <div key={r.id} className="p-4 flex items-center gap-3">
                      <Badge variant="secondary" className={`text-xs ${ASIGNATURA_COLOR[asig] || ''}`}>
                        {ASIGNATURA_LABEL[asig] || asig || '—'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.expand?.simulacro_id?.titulo || 'Simulacro'}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.expand?.simulacro_id?.fecha
                            ? new Date(r.expand.simulacro_id.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                          {r.respuestas_correctas !== null && r.respuestas_correctas !== undefined && (
                            <span className="ml-2">· {r.respuestas_correctas} correctas</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xl font-bold tabular-nums">{r.puntaje || '—'}</p>
                        {r.percentil_interno !== null && r.percentil_interno !== undefined && (
                          <p className="text-xs text-muted-foreground">P{r.percentil_interno}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card className="border-dashed bg-muted/30">
            <CardContent className="p-4 text-xs text-muted-foreground flex items-start gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Cortes de referencia 2024-2025 (DEMRE). La proyección PAES es un proxy basado en
                el promedio de tus mejores resultados — no garantiza el puntaje oficial. El gráfico
                de evolución con Recharts llega en una iteración futura.
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default EstudiantePAES;
