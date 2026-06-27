import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, FileText, Home, Sparkles, ExternalLink, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import CourseCard from '@/components/CourseCard.jsx';
import TaskCard from '@/components/estudiante/TaskCard.jsx';
import EstudianteNotas from './estudiante/EstudianteNotas.jsx';
import EstudiantePAES from './estudiante/EstudiantePAES.jsx';
import HorarioView from '@/components/estudiante/HorarioView.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTareasAlumno } from '@/hooks/useTareasAlumno.js';
import pb from '@/lib/pocketbaseClient';
import { SITE } from '@/lib/site';

const tabTriggerCls = 'data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-3 whitespace-nowrap';

const formatFecha = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (_e) { return iso; }
};

const useDashboardOverview = (alumnoId) => useQuery({
  queryKey: ['estudiante', 'overview', alumnoId],
  enabled: !!alumnoId,
  staleTime: 60_000,
  queryFn: async () => {
    const todayISO = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
    const tomorrowISO = new Date(new Date().setUTCHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000).toISOString();

    // Cursos asignados (compat: usa la colección legacy `asignaciones` Y las nuevas matrículas)
    const [asignaciones, matriculas] = await Promise.all([
      pb.collection('asignaciones').getList(1, 50, {
        filter: `user_id ~ "${alumnoId}"`,
        expand: 'curso_id',
        $autoCancel: false,
      }).catch(() => ({ items: [] })),
      pb.collection('matriculas_seccion').getFullList({
        filter: `alumno_id = "${alumnoId}" && estado = "matriculado"`,
        expand: 'seccion_id,seccion_id.curso_id',
        $autoCancel: false,
      }).catch(() => []),
    ]);

    const cursoMap = new Map();
    for (const a of asignaciones.items) {
      const curso = a.expand?.curso_id;
      if (curso) cursoMap.set(curso.id, curso);
    }
    for (const m of matriculas) {
      const curso = m.expand?.seccion_id?.expand?.curso_id;
      if (curso) cursoMap.set(curso.id, curso);
    }

    // Próximas clases hoy/mañana
    const seccionIds = matriculas.map((m) => `"${m.seccion_id}"`);
    let proximasClases = [];
    if (seccionIds.length > 0) {
      try {
        const filter = `(${seccionIds.map((id) => `seccion_id = ${id}`).join(' || ')}) && fecha >= "${todayISO}" && estado != "cancelada"`;
        const r = await pb.collection('clases_vivo').getList(1, 6, {
          filter,
          expand: 'seccion_id,seccion_id.curso_id',
          sort: '+fecha,+hora_inicio',
          $autoCancel: false,
        });
        proximasClases = r.items;
      } catch (_e) {}
    }

    return {
      cursos: Array.from(cursoMap.values()),
      proximasClases,
    };
  },
});

const EstudianteDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'hoy';

  const { data: overview, isLoading } = useDashboardOverview(currentUser?.id);
  const { data: tareas = [] } = useTareasAlumno(currentUser?.id);

  const tareasUrgentes = useMemo(() => {
    const now = Date.now();
    return tareas
      .filter((t) => {
        if (t.entrega?.estado === 'calificada' || t.entrega?.estado === 'entregada') return false;
        const venceMs = new Date(t.fecha_limite).getTime() - now;
        return venceMs >= 0 && venceMs <= 7 * 24 * 60 * 60 * 1000;
      })
      .slice(0, 6);
  }, [tareas]);

  const setTab = (v) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (v === 'hoy') next.delete('tab');
      else next.set('tab', v);
      return next;
    });
  };

  const totalPendientes = tareas.filter((t) => !t.entrega || t.entrega.estado === 'en_progreso').length;

  return (
    <>
      <Helmet><title>Mi panel | PrePa</title></Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Estudiante</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-balance">
              Hola, <span className="text-primary">{currentUser?.name?.split(' ')[0] || 'estudiante'}</span>
            </h1>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="border-b overflow-x-auto">
              <TabsList className="bg-transparent rounded-none h-auto p-0 gap-1 flex w-max">
                <TabsTrigger value="hoy" className={tabTriggerCls}><Home className="h-4 w-4 mr-2" />Hoy</TabsTrigger>
                <TabsTrigger value="horario" className={tabTriggerCls}><Calendar className="h-4 w-4 mr-2" />Horario</TabsTrigger>
                <TabsTrigger value="cursos" className={tabTriggerCls}><BookOpen className="h-4 w-4 mr-2" />Mis cursos</TabsTrigger>
                <TabsTrigger value="tareas" className={tabTriggerCls}>
                  <FileText className="h-4 w-4 mr-2" />Tareas
                  {totalPendientes > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] font-mono bg-warning/10 text-warning-foreground">
                      {totalPendientes}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notas" className={tabTriggerCls}><ClipboardList className="h-4 w-4 mr-2" />Mi libreta</TabsTrigger>
                <TabsTrigger value="paes" className={tabTriggerCls}><Sparkles className="h-4 w-4 mr-2" />PAES</TabsTrigger>
              </TabsList>
            </div>

            <div className="py-6">
              {/* Hoy */}
              <TabsContent value="hoy" className="m-0 space-y-6">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calendar className="h-4 w-4 text-primary" />
                      Próximas clases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-20" />
                    ) : (overview?.proximasClases || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tenés clases programadas próximamente.</p>
                    ) : (
                      <ul className="divide-y -mx-2">
                        {overview.proximasClases.map((c) => (
                          <li key={c.id} className="flex items-center gap-3 px-2 py-2.5">
                            <div className="text-center min-w-[60px]">
                              <p className="text-xs text-muted-foreground capitalize">{formatFecha(c.fecha).split(',')[0]}</p>
                              <p className="font-mono text-sm font-semibold tabular-nums">{c.hora_inicio}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{c.tema || c.expand?.seccion_id?.expand?.curso_id?.nombre}</p>
                              <p className="text-xs text-muted-foreground truncate">{c.expand?.seccion_id?.expand?.curso_id?.nombre}</p>
                            </div>
                            {c.link && (
                              <Button asChild size="sm" variant="outline">
                                <a href={c.link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Entrar
                                </a>
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-warning-foreground" />
                      Tareas urgentes (próximos 7 días)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tareasUrgentes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nada urgente por ahora 🎉</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tareasUrgentes.map((t) => <TaskCard key={t.id} tarea={t} entrega={t.entrega} />)}
                      </div>
                    )}
                    {tareas.length > tareasUrgentes.length && (
                      <Button variant="ghost" size="sm" className="mt-4" onClick={() => setTab('tareas')}>
                        Ver todas las tareas →
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Horario */}
              <TabsContent value="horario" className="m-0">
                <HorarioView alumnoId={currentUser?.id} />
              </TabsContent>

              {/* Cursos */}
              <TabsContent value="cursos" className="m-0">
                {isLoading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
                  </div>
                ) : (overview?.cursos || []).length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="Aún no tenés cursos asignados"
                    description="Contactá a administración para regularizar tu matrícula."
                    action={{ label: 'Contactar', href: `mailto:${SITE.email}`, variant: 'outline' }}
                  />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {overview.cursos.map((curso) => (
                      <CourseCard
                        key={curso.id}
                        course={curso}
                        onClick={() => navigate(`/dashboard/estudiante/curso/${curso.id}`)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tareas */}
              <TabsContent value="tareas" className="m-0">
                <div className="flex justify-between items-baseline mb-4">
                  <h2 className="text-lg font-semibold">Todas mis tareas</h2>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/dashboard/estudiante/tareas">Vista completa →</Link>
                  </Button>
                </div>
                {tareas.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Aún sin tareas"
                    description="Cuando tus profesores publiquen tareas, las verás acá."
                  />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tareas.slice(0, 12).map((t) => <TaskCard key={t.id} tarea={t} entrega={t.entrega} />)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notas" className="m-0">
                <EstudianteNotas />
              </TabsContent>

              <TabsContent value="paes" className="m-0">
                <EstudiantePAES />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default EstudianteDashboard;
