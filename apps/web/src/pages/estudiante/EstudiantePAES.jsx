import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Clock, GraduationCap, Library, ListChecks, PlayCircle, Sparkles, Target, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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

// Trae las preguntas (solo lo necesario) de los simulacros que el alumno rindió,
// para poder calcular el desempeño por eje cruzando con sus respuestas.
const usePreguntasDeSimulacros = (simIds) => useQuery({
  queryKey: ['paes', 'preguntas-ejes', [...simIds].sort().join(',')],
  enabled: simIds.length > 0,
  staleTime: 5 * 60_000,
  queryFn: () => pb.collection('preguntas_paes').getFullList({
    filter: simIds.map((id) => `simulacro_id = "${id}"`).join(' || '),
    fields: 'simulacro_id,numero,eje,respuesta_correcta,piloto',
    sort: 'numero',
    $autoCancel: false,
  }),
});

const EstudiantePAES = ({ pupiloId }) => {
  const { currentUser } = useAuth();
  const targetId = pupiloId || currentUser?.id;
  const { data: resultados = [], isLoading } = useResultadosPAES(targetId);
  const { data: simulacros = [] } = useSimulacrosDisponibles();
  const isApoderadoMode = !!pupiloId;

  const simIds = useMemo(
    () => [...new Set(resultados.map((r) => r.simulacro_id || r.expand?.simulacro_id?.id).filter(Boolean))],
    [resultados],
  );
  const { data: preguntas = [] } = usePreguntasDeSimulacros(simIds);

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

  // Desempeño por eje (tema), cruzando respuestas del alumno con la clave de
  // cada pregunta. Ordenado de peor a mejor → "ejes a reforzar".
  const ejeStats = useMemo(() => {
    if (!preguntas.length || !resultados.length) return [];
    const bySim = new Map();
    for (const p of preguntas) {
      const arr = bySim.get(p.simulacro_id) || [];
      arr.push(p);
      bySim.set(p.simulacro_id, arr);
    }
    const stats = new Map();
    for (const r of resultados) {
      const sid = r.simulacro_id || r.expand?.simulacro_id?.id;
      const pregs = bySim.get(sid);
      if (!pregs) continue;
      const resp = Array.isArray(r.respuestas_alumno_json) ? r.respuestas_alumno_json : [];
      for (const p of pregs) {
        if (p.piloto) continue;
        const eje = (p.eje || '').trim() || 'Sin eje';
        const ans = resp[p.numero - 1];
        const ok = ans && String(ans).toUpperCase() === String(p.respuesta_correcta).toUpperCase();
        const s = stats.get(eje) || { correct: 0, total: 0 };
        s.total += 1;
        if (ok) s.correct += 1;
        stats.set(eje, s);
      }
    }
    return [...stats.entries()]
      .map(([eje, s]) => ({ eje, correct: s.correct, total: s.total, pct: s.total ? Math.round((s.correct / s.total) * 100) : 0 }))
      .sort((a, b) => a.pct - b.pct);
  }, [preguntas, resultados]);

  // Serie de evolución del puntaje en el tiempo.
  const evolucion = useMemo(
    () =>
      [...resultados]
        .filter((r) => r.puntaje > 0)
        .sort((a, b) => new Date(a.created) - new Date(b.created))
        .map((r) => ({
          fecha: new Date(r.created).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
          puntaje: r.puntaje,
        })),
    [resultados],
  );

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
                      {s.modo === 'interactivo' && (
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Sparkles className="h-3.5 w-3.5" />
                          Interactivo
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

          {/* Evolución del puntaje */}
          {evolucion.length >= 2 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolución de tu puntaje
              </h3>
              <Card>
                <CardContent className="p-4 pl-2">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolucion} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis domain={[100, 1000]} ticks={[100, 400, 700, 1000]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} formatter={(v) => [v, 'Puntaje']} />
                        <Line type="monotone" dataKey="puntaje" stroke="#21b24c" strokeWidth={2.5} dot={{ r: 3, fill: '#21b24c' }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ejes a reforzar */}
          {ejeStats.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                Ejes a reforzar
              </h3>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Tu desempeño por tema sobre todos los simulacros interactivos. Empezá a estudiar por los de arriba.
                  </p>
                  {ejeStats.map((e) => {
                    const barColor = e.pct < 50 ? 'bg-destructive' : e.pct < 75 ? 'bg-accent' : 'bg-success';
                    const txtColor = e.pct < 50 ? 'text-destructive' : e.pct < 75 ? 'text-accent' : 'text-success';
                    return (
                      <div key={e.eje}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-foreground">{e.eje}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {e.correct}/{e.total} · <span className={`font-semibold ${txtColor}`}>{e.pct}%</span>
                            </span>
                            {!isApoderadoMode && (
                              <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-xs text-primary hover:text-primary">
                                <Link to={`/dashboard/estudiante/practica?eje=${encodeURIComponent(e.eje)}`}>Practicar</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${e.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

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
                el promedio de tus mejores resultados — no garantiza el puntaje oficial.
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default EstudiantePAES;
