import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  ArrowLeft,
  BookOpen,
  FileQuestion,
  GraduationCap,
  PlayCircle,
  Clock,
  ListChecks,
  Dna,
  Atom,
  FlaskConical,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import MaterialCard from '@/components/MaterialCard.jsx';
import { MaterialListSkeleton } from '@/components/LoadingSkeletons.jsx';
import LeccionVideo from '@/components/curso/LeccionVideo.jsx';

// Icono y color del curso vienen de la metadata (color_tema / icono).
// Tailwind necesita los nombres de clase completos y literales para no purgarlos,
// por eso son mapas estáticos y NO interpolación `text-${color}`.
const ICONOS = { Dna, Atom, FlaskConical, BookOpen, GraduationCap };

const TEMA = {
  success: { text: 'text-success', bg: 'bg-success/10', soft: 'bg-success/5' },
  info: { text: 'text-info', bg: 'bg-info/10', soft: 'bg-info/5' },
  accent: { text: 'text-accent', bg: 'bg-accent/10', soft: 'bg-accent/5' },
  primary: { text: 'text-primary', bg: 'bg-primary/10', soft: 'bg-primary/5' },
};

const tabTriggerCls =
  'data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5';

const CourseDetailPage = () => {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [progreso, setProgreso] = useState({});
  const [progresoOk, setProgresoOk] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // 1. Verificar acceso vía asignaciones
        const assignments = await pb.collection('asignaciones').getList(1, 1, {
          filter: `user_id = "${currentUser.id}" && curso_id = "${cursoId}"`,
          $autoCancel: false,
        });

        if (assignments.totalItems === 0) {
          throw new Error('No tienes acceso a este curso.');
        }

        // 2. Curso + lecciones + materiales + progreso en paralelo
        const [courseData, lessonsData, materialsData, progresoData] = await Promise.all([
          pb.collection('cursos').getOne(cursoId, { $autoCancel: false }),
          pb.collection('lecciones').getFullList({
            filter: `curso_id = "${cursoId}" && publicada = true`,
            sort: '+orden',
            $autoCancel: false,
          }),
          pb.collection('materiales').getFullList({
            filter: `curso_id = "${cursoId}"`,
            sort: '-created',
            $autoCancel: false,
          }),
          // Puede no existir aún la colección (pre-migración): degradamos a null.
          pb.collection('progreso_lecciones').getFullList({
            filter: `alumno_id = "${currentUser.id}" && leccion_id.curso_id = "${cursoId}"`,
            $autoCancel: false,
          }).catch(() => null),
        ]);

        setCourse(courseData);
        setLessons(lessonsData);
        setMaterials(materialsData);
        if (progresoData) {
          const map = {};
          for (const p of progresoData) map[p.leccion_id] = { id: p.id, visto: !!p.visto };
          setProgreso(map);
          setProgresoOk(true);
        }
      } catch (err) {
        console.error('Error loading course:', err);
        setError(err.message || 'Error al cargar el curso.');
        toast.error('No pudimos cargar la información del curso.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [cursoId, currentUser.id]);

  const toggleVisto = async (leccionId) => {
    const cur = progreso[leccionId];
    try {
      if (cur) {
        const visto = !cur.visto;
        await pb.collection('progreso_lecciones').update(
          cur.id,
          { visto, fecha_visto: visto ? new Date().toISOString() : null },
          { $autoCancel: false },
        );
        setProgreso((p) => ({ ...p, [leccionId]: { ...cur, visto } }));
      } else {
        const rec = await pb.collection('progreso_lecciones').create(
          { alumno_id: currentUser.id, leccion_id: leccionId, visto: true, fecha_visto: new Date().toISOString() },
          { $autoCancel: false },
        );
        setProgreso((p) => ({ ...p, [leccionId]: { id: rec.id, visto: true } }));
      }
    } catch (_e) {
      toast.error('No se pudo guardar el progreso');
    }
  };

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <FileQuestion className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Acceso Denegado</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/dashboard/estudiante')} className="mt-6">
            Volver a Mis Cursos
          </Button>
        </div>
      </div>
    );
  }

  const tema = TEMA[course?.color_tema] || TEMA.primary;
  const Icono = ICONOS[course?.icono] || BookOpen;
  const hasSyllabus = Boolean(course?.syllabus_markdown);
  const vistosCount = Object.values(progreso).filter((p) => p.visto).length;
  const avancePct = lessons.length ? Math.round((vistosCount / lessons.length) * 100) : 0;

  return (
    <>
      <Helmet>
        <title>{course ? `${course.nombre} | PrePa` : 'Cargando Curso | PrePa'}</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-16">
        {/* Hero */}
        <div className={`border-b border-border ${tema.soft}`}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="mb-6 -ml-3 text-muted-foreground hover:text-foreground"
            >
              <Link to="/dashboard/estudiante">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Mis Cursos
              </Link>
            </Button>

            {isLoading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-start gap-4 sm:gap-5">
                <div
                  className={`flex-shrink-0 h-16 w-16 rounded-2xl flex items-center justify-center ${tema.bg} ${tema.text}`}
                  aria-hidden="true"
                >
                  <Icono className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    {course?.nombre}
                  </h1>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed mt-2 max-w-3xl">
                    {course?.descripcion}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Badge variant="secondary" className="gap-1">
                      <PlayCircle className="h-3.5 w-3.5" />
                      {lessons.length} {lessons.length === 1 ? 'lección' : 'lecciones'}
                    </Badge>
                    {course?.nivel && (
                      <Badge variant="outline" className="capitalize">
                        Nivel {course.nivel}
                      </Badge>
                    )}
                    {course?.materia && (
                      <Badge variant="outline" className="capitalize">
                        {course.materia}
                      </Badge>
                    )}
                  </div>

                  {progresoOk && lessons.length > 0 && (
                    <div className="mt-5 max-w-sm">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Tu avance</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {vistosCount}/{lessons.length} · {avancePct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${avancePct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
          {isLoading ? (
            <MaterialListSkeleton />
          ) : (
            <Tabs defaultValue="lecciones" className="w-full">
              <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
                <TabsTrigger value="lecciones" className={tabTriggerCls}>
                  <PlayCircle className="h-4 w-4" />
                  Lecciones
                </TabsTrigger>
                <TabsTrigger value="temario" className={tabTriggerCls}>
                  <ListChecks className="h-4 w-4" />
                  Temario
                </TabsTrigger>
                <TabsTrigger value="material" className={tabTriggerCls}>
                  <BookOpen className="h-4 w-4" />
                  Material
                </TabsTrigger>
              </TabsList>

              {/* --- Lecciones --- */}
              <TabsContent value="lecciones" className="mt-6">
                {lessons.length > 0 ? (
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue={lessons[0]?.id}
                    className="space-y-3"
                  >
                    {lessons.map((leccion, idx) => (
                      <AccordionItem
                        key={leccion.id}
                        value={leccion.id}
                        className="border rounded-xl bg-card px-4 shadow-sm"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3 text-left">
                            {progreso[leccion.id]?.visto ? (
                              <span className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-success/15 text-success">
                                <CheckCircle2 className="h-5 w-5" />
                              </span>
                            ) : (
                              <span
                                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums ${tema.bg} ${tema.text}`}
                              >
                                {idx + 1}
                              </span>
                            )}
                            <span className="font-semibold text-foreground">
                              {leccion.titulo}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {leccion.descripcion && (
                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                              {leccion.descripcion}
                            </p>
                          )}
                          {Number(leccion.duracion_estimada_min) > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="tabular-nums">
                                {leccion.duracion_estimada_min} min aprox.
                              </span>
                            </div>
                          )}
                          <LeccionVideo url={leccion.video_url} titulo={leccion.titulo} />
                          {progresoOk && (
                            <Button
                              variant={progreso[leccion.id]?.visto ? 'secondary' : 'outline'}
                              size="sm"
                              onClick={() => toggleVisto(leccion.id)}
                            >
                              {progreso[leccion.id]?.visto ? (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
                                  Lección vista
                                </>
                              ) : (
                                <>
                                  <Circle className="mr-2 h-4 w-4" />
                                  Marcar como vista
                                </>
                              )}
                            </Button>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <EmptyState
                    icon={PlayCircle}
                    title="Lecciones en preparación"
                    description="Pronto publicaremos las clases en video de este curso. Mientras tanto, revisa el temario y el material."
                  />
                )}
              </TabsContent>

              {/* --- Temario --- */}
              <TabsContent value="temario" className="mt-6">
                {hasSyllabus ? (
                  <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
                    {/* HTML de confianza sembrado en migración (no input de usuario). */}
                    <div
                      className="prose-prepa"
                      dangerouslySetInnerHTML={{ __html: course.syllabus_markdown }}
                    />
                  </div>
                ) : (
                  <EmptyState
                    icon={ListChecks}
                    title="Temario no disponible"
                    description="Aún no se ha publicado el temario detallado de este curso."
                  />
                )}
              </TabsContent>

              {/* --- Material --- */}
              <TabsContent value="material" className="mt-6">
                {materials.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materials.map((material) => (
                      <MaterialCard key={material.id} material={material} isAdmin={false} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title="Sin materiales disponibles"
                    description="Aún no se ha subido material de estudio para este curso. Vuelve más tarde."
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
};

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-card">
    <Icon className="h-16 w-16 text-muted-foreground/40 mb-4" />
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-sm">{description}</p>
  </div>
);

export default CourseDetailPage;
