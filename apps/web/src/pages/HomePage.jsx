import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Laptop,
  Layers,
  MapPin,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Footer from '@/components/Footer.jsx';
import ContactForm from '@/components/ContactForm.jsx';
import StatCounter from '@/components/landing/StatCounter.jsx';
import TeacherCard from '@/components/landing/TeacherCard.jsx';
import AlumnoTestimonialCard from '@/components/landing/AlumnoTestimonialCard.jsx';
import PaesTimeline from '@/components/landing/PaesTimeline.jsx';
import pb from '@/lib/pocketbaseClient';

const WHATSAPP_URL = 'https://wa.me/56900000000';

// Hitos PAES 2026 — calendario referencial DEMRE. Editables si DEMRE
// publica fechas oficiales distintas; idealmente migran a feriados_cl
// + hitos_paes en V2.
const PAES_HITOS_2026 = [
  { id: 'marzo', mes: 'Marzo', label: 'Inicio de clases', descripcion: 'Diagnóstico inicial', status: 'past' },
  { id: 'mayo', mes: 'Mayo', label: '1er simulacro PAES', descripcion: 'Línea base de cada alumno', status: 'past' },
  { id: 'julio', mes: 'Julio', label: 'Inscripción PAES', descripcion: 'DEMRE abre proceso', status: 'next', actual: true },
  { id: 'agosto', mes: 'Agosto', label: 'PAES de Invierno', descripcion: 'Primera rendición posible', status: 'future' },
  { id: 'octubre', mes: 'Oct-Nov', label: 'Simulacros intensivos', descripcion: 'Foco en debilidades', status: 'future' },
  { id: 'diciembre', mes: 'Diciembre', label: 'PAES Regular', descripcion: 'Rendición oficial', status: 'future' },
];

const FAQS = [
  {
    q: '¿En qué se diferencia PrePa de Cpech o Pedro de Valdivia?',
    a: 'En tres cosas. Primero: nuestros profesores son locales, tienen nombre y cara. Segundo: somos un preuniversitario regional de Magallanes con grupos chicos donde cada estudiante es conocido por nombre. Tercero: publicamos nuestros resultados PAES con número exacto de alumnos para que veas la realidad, no promesas de marketing.',
  },
  {
    q: '¿Qué modalidades ofrecen?',
    a: 'Presencial en Punta Arenas, online en vivo desde cualquier lugar de Chile, y mixta (combinás ambas según tu agenda). Las clases online se graban automáticamente, así que si te perdés una podés verla después.',
  },
  {
    q: '¿Cuándo es la PAES y cómo me preparo?',
    a: 'En Chile hay dos PAES por año: la de Invierno (agosto, opcional) y la Regular (diciembre, la principal). En PrePa hacés diagnóstico en marzo, simulacros mensuales, y un plan personalizado por materia según tus puntos débiles.',
  },
  {
    q: '¿Qué carreras puedo postular con qué puntajes?',
    a: 'Depende del año y la universidad. Medicina U. Chile / UC suele requerir 800+. Ingeniería Civil ronda los 700-780. En tu primer simulacro te entregamos un informe con tu puntaje proyectado y las carreras alcanzables en cada universidad chilena.',
  },
  {
    q: '¿Cuánto cuesta?',
    a: 'Hablá con nosotros por WhatsApp y armamos un plan de cuotas según tu situación. Tenemos becas parciales para alumnos destacados de Magallanes.',
  },
  {
    q: '¿Tienen clases gratuitas para conocerlos?',
    a: 'Sí. Cada mes hacemos simulacros y clases abiertas gratuitas. Mirá la sección "Clases gratis" del menú o inscribite directamente.',
  },
];

const useProfesores = () => useQuery({
  queryKey: ['landing', 'profesores_publicos'],
  queryFn: async () => {
    try {
      const res = await pb.collection('profesores_publicos').getList(1, 12, {
        filter: 'activo = true',
        sort: 'orden',
        $autoCancel: false,
      });
      return res.items;
    } catch (e) {
      console.error('Error fetching profesores:', e);
      return [];
    }
  },
  staleTime: 60_000,
});

const useTestimonios = () => useQuery({
  queryKey: ['landing', 'testimonios_publicos'],
  queryFn: async () => {
    try {
      const res = await pb.collection('testimonios_publicos').getList(1, 12, {
        filter: 'activo = true',
        sort: 'orden',
        $autoCancel: false,
      });
      return res.items;
    } catch (e) {
      console.error('Error fetching testimonios:', e);
      return [];
    }
  },
  staleTime: 60_000,
});

const useResultadosPAES = () => useQuery({
  queryKey: ['landing', 'resultados_paes'],
  queryFn: async () => {
    try {
      const res = await pb.collection('resultados_paes').getFirstListItem('publicado = true', {
        sort: '-anio_promocion',
        $autoCancel: false,
      });
      return res;
    } catch (_e) {
      return null; // sin datos publicados aún
    }
  },
  staleTime: 60_000,
});

const HomePage = () => {
  const { data: profesores = [] } = useProfesores();
  const { data: testimonios = [] } = useTestimonios();
  const { data: resultados } = useResultadosPAES();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <title>PrePa · Preuniversitario PAES en Punta Arenas | Profesores locales, resultados reales</title>
        <meta
          name="description"
          content="Preuniversitario PAES en Punta Arenas. Profesores con nombre y CV verificable, simulacros mensuales con percentil, modalidad presencial u online. Conocé al equipo y reservá tu cupo 2027."
        />
        <meta property="og:title" content="PrePa — Preuniversitario PAES Punta Arenas" />
        <meta property="og:description" content="El único preu de Magallanes que conoce a cada alumno por nombre. Resultados PAES verificables, profesores locales, simulacros mensuales con percentil." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_CL" />
        <link rel="canonical" href="https://prepa.cl/" />
      </Helmet>

      <main>
        {/* =========================================================== */}
        {/* SECCIÓN 1 — HERO                                            */}
        {/* =========================================================== */}
        <section
          id="hero"
          className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5"
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                className="lg:col-span-7"
              >
                <Badge variant="secondary" className="mb-5 bg-secondary/15 text-secondary border-0 font-medium">
                  <MapPin className="h-3 w-3 mr-1.5" />
                  Punta Arenas · Magallanes
                </Badge>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.05]">
                  Conocemos a cada estudiante por su <span className="text-primary">nombre</span>.
                  <br className="hidden md:block" />
                  Y a qué <span className="underline decoration-accent decoration-4 underline-offset-4">universidad</span> quiere llegar.
                </h1>
                <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  El único preuniversitario de Magallanes con profesores locales, simulacros PAES mensuales con percentil interno y modalidades flexibles (presencial, online o mixta).
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    onClick={() => scrollToSection('contacto')}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-7"
                  >
                    Quiero más información
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="text-base px-7"
                  >
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4 text-success" />
                      Hablanos por WhatsApp
                    </a>
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Clases en grupos chicos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Profesores con CV verificable
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Sin contratos largos
                  </span>
                </div>
              </motion.div>

              {/* Card flotante con preview de resultados */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                className="lg:col-span-5"
              >
                <div className="relative">
                  <div className="absolute -inset-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-2xl" aria-hidden="true" />
                  <div className="relative rounded-3xl border bg-card shadow-lg p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-5">
                      <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse-soft" aria-hidden="true" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Promoción {resultados?.anio_promocion || 'en curso'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Puntaje PAES promedio</p>
                    <p className="font-mono text-5xl md:text-6xl font-bold tabular-nums text-foreground">
                      {resultados?.puntaje_promedio_general
                        ? Math.round(resultados.puntaje_promedio_general)
                        : '—'}
                      <span className="text-base font-normal text-muted-foreground ml-2">/ 1000</span>
                    </p>
                    {resultados?.mejora_promedio_pts ? (
                      <p className="mt-3 text-sm text-success font-medium flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        +{resultados.mejora_promedio_pts} pts vs diagnóstico inicial
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Cargá los resultados reales desde el panel admin
                      </p>
                    )}
                    <div className="mt-6 pt-6 border-t flex items-center gap-4">
                      <div className="flex -space-x-2">
                        <div className="h-10 w-10 rounded-full bg-primary/20 ring-2 ring-card flex items-center justify-center text-xs font-semibold text-primary">PA</div>
                        <div className="h-10 w-10 rounded-full bg-secondary/20 ring-2 ring-card flex items-center justify-center text-xs font-semibold text-secondary">MS</div>
                        <div className="h-10 w-10 rounded-full bg-accent/20 ring-2 ring-card flex items-center justify-center text-xs font-semibold text-accent">JC</div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Equipo docente con experiencia universitaria comprobable
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 2 — RESULTADOS                                       */}
        {/* =========================================================== */}
        <section id="resultados" className="py-20 md:py-24 border-t bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="outline" className="mb-3">Resultados verificables</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                Lo que logran nuestros estudiantes
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Publicamos los números con el N exacto. Sin promedios inflados, sin promesas vacías.
              </p>
            </div>

            {resultados ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
                {resultados.n_alumnos > 0 && (
                  <StatCounter
                    eyebrow={`Promoción ${resultados.anio_promocion}`}
                    value={resultados.n_alumnos}
                    label="Alumnos en la promoción"
                  />
                )}
                {resultados.pct_ingreso_carrera_elegida > 0 && (
                  <StatCounter
                    eyebrow="Ingreso"
                    value={resultados.pct_ingreso_carrera_elegida}
                    suffix="%"
                    label="Ingresaron a la carrera que eligieron"
                  />
                )}
                {resultados.puntaje_promedio_general > 0 && (
                  <StatCounter
                    eyebrow="Puntaje PAES"
                    value={Math.round(resultados.puntaje_promedio_general)}
                    label="Promedio general en escala 100-1000"
                  />
                )}
                {resultados.mejora_promedio_pts > 0 && (
                  <StatCounter
                    eyebrow="Mejora real"
                    value={resultados.mejora_promedio_pts}
                    prefix="+"
                    suffix=" pts"
                    label="Crecimiento desde el diagnóstico inicial"
                  />
                )}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto p-8 rounded-2xl border bg-card shadow-sm text-center">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">
                  Estamos preparando nuestra primera promoción
                </p>
                <p className="mt-2 text-muted-foreground">
                  Los resultados PAES verificables se publican apenas DEMRE entrega los puntajes oficiales.
                  Mientras tanto, conocé al equipo y la metodología.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 3 — EQUIPO DOCENTE                                   */}
        {/* =========================================================== */}
        <section id="equipo" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-14">
              <Badge variant="outline" className="mb-3">Equipo local</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                Profesores con nombre, cara y CV.
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                No es un call center de tutores anónimos. Cada profesor de PrePa publica su universidad de origen y su trayectoria.
              </p>
            </div>

            {profesores.length === 0 ? (
              <div className="p-8 rounded-2xl border bg-card text-center max-w-xl mx-auto">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Estamos cargando el equipo docente desde el panel admin. Volvé en unos días.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {profesores.map((p) => (
                  <TeacherCard key={p.id} profesor={p} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 4 — MODALIDADES                                      */}
        {/* =========================================================== */}
        <section id="modalidades" className="py-20 md:py-24 bg-muted/30 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="outline" className="mb-3">Adaptado a tu vida</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                Tres formas de prepararte.
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Punta Arenas tiene su propio ritmo. Elegí la modalidad que se adapta al tuyo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <ModalidadCard
                icon={Users}
                titulo="Presencial"
                descripcion="Clases en nuestra sede en Punta Arenas, en grupos chicos de máximo 25 alumnos. Espacio de estudio abierto en horarios extendidos."
                bullets={['Cara a cara con el profesor', 'Espacio de estudio incluido', 'Grupos chicos']}
                accent="primary"
              />
              <ModalidadCard
                icon={Laptop}
                titulo="Online"
                descripcion="Mismas clases en vivo por Meet o Zoom, todas grabadas. Ideal si vivís en Puerto Natales, Porvenir, Tierra del Fuego o fuera de la región."
                bullets={['En vivo + grabadas', 'Material descargable', 'Tutorías 1-a-1 incluidas']}
                accent="secondary"
              />
              <ModalidadCard
                icon={Layers}
                titulo="Mixta"
                descripcion="Combinás presencial y online según tu semana. Perfecta si trabajás, hacés deporte federado o tenés agenda variable."
                bullets={['Mayor flexibilidad', 'Mismo precio que online', 'Asistencia auto-ajustada']}
                accent="accent"
              />
            </div>
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 5 — CALENDARIO PAES                                  */}
        {/* =========================================================== */}
        <section id="calendario" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="outline" className="mb-3">Tu hoja de ruta</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                Calendario PAES {new Date().getFullYear()}
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                Los hitos clave para no llegar tarde a ningún proceso DEMRE.
              </p>
            </div>
            <PaesTimeline hitos={PAES_HITOS_2026} className="max-w-5xl mx-auto" />
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 6 — TESTIMONIOS                                      */}
        {/* =========================================================== */}
        <section id="testimonios" className="py-20 md:py-24 bg-muted/30 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="outline" className="mb-3">Voces de exalumnos</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                Ya están donde querían llegar.
              </h2>
            </div>

            {testimonios.length === 0 ? (
              <div className="p-8 rounded-2xl border bg-card text-center max-w-xl mx-auto">
                <p className="text-muted-foreground">
                  Pronto compartiremos historias reales de nuestros primeros egresados.
                </p>
              </div>
            ) : (
              <Carousel opts={{ align: 'start', loop: testimonios.length > 2 }} className="max-w-5xl mx-auto">
                <CarouselContent>
                  {testimonios.map((t) => (
                    <CarouselItem key={t.id} className="basis-full md:basis-1/2 lg:basis-1/2">
                      <div className="h-full p-1">
                        <AlumnoTestimonialCard testimonio={t} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden md:block">
                  <CarouselPrevious />
                  <CarouselNext />
                </div>
              </Carousel>
            )}
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 7 — POR QUÉ LOCAL                                    */}
        {/* =========================================================== */}
        <section id="por-que-local" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6">
                <Badge variant="outline" className="mb-3 border-secondary/30 text-secondary">
                  <MapPin className="h-3 w-3 mr-1.5" />
                  Magallanes
                </Badge>
                <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                  Punta Arenas merece un preuniversitario <span className="text-primary">que sepa que vivís acá</span>.
                </h2>
                <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
                  No es lo mismo prepararse en Santiago que en Magallanes. Los horarios, la conectividad, el contexto familiar, los tiempos de viaje a la sede — todo es diferente. PrePa está hecho para esa realidad.
                </p>
              </div>
              <div className="lg:col-span-6">
                <ul className="space-y-4">
                  {[
                    { t: 'Profesores que viven en la región', d: 'No vienen y se van. Están todo el año para responder dudas.' },
                    { t: 'Horarios compatibles con el clima', d: 'Adaptados a las horas de luz y los días de viento blanco.' },
                    { t: 'Foco en universidades chilenas', d: 'Conocemos los procesos UC, U. Chile, UMAG, USACH y las pasarelas SUR.' },
                    { t: 'Resultados auditables', d: 'Cualquier apoderado puede verificar las cifras con DEMRE.' },
                    { t: 'Sin call center', d: 'Te atiende una persona del equipo. Siempre. Por WhatsApp directo.' },
                  ].map((b, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      className="flex gap-3"
                    >
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">{b.t}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{b.d}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 8 — FAQ                                              */}
        {/* =========================================================== */}
        <section id="faq" className="py-20 md:py-24 bg-muted/30 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3">Preguntas frecuentes</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                Lo que más nos preguntan
              </h2>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((f, idx) => (
                <AccordionItem
                  key={idx}
                  value={`faq-${idx}`}
                  className="border rounded-xl bg-card px-5 shadow-sm"
                >
                  <AccordionTrigger className="text-left font-semibold py-5 hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 9 — CTA FINAL                                        */}
        {/* =========================================================== */}
        <section id="contacto" className="py-20 md:py-24 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="grid lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5">
                <Badge variant="outline" className="mb-3 bg-accent/10 text-accent border-accent/20">
                  Cupos limitados
                </Badge>
                <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                  Reservá tu cupo en la promoción {new Date().getFullYear() + 1}
                </h2>
                <p className="mt-5 text-muted-foreground text-lg">
                  Trabajamos con grupos chicos para mantener la calidad. Dejanos tus datos y nos contactamos en menos de 24 horas hábiles.
                </p>
                <div className="mt-7 p-5 rounded-2xl bg-success/10 border border-success/20">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-success" />
                    ¿Querés hablar antes de dejar tus datos?
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Escribinos por WhatsApp y te atendemos directo, sin formularios.
                  </p>
                  <Button
                    asChild
                    className="mt-4 w-full bg-success text-success-foreground hover:bg-success/90"
                  >
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Abrir WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-7">
                <div className="rounded-3xl border bg-card shadow-sm p-6 md:p-8">
                  <ContactForm />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

// ---- componentes locales ---------------------------------------------------

const ACCENT_CLASSES = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  accent: 'bg-accent/15 text-accent border-accent/30',
};

const ModalidadCard = ({ icon: Icon, titulo, descripcion, bullets, accent = 'primary' }) => (
  <motion.article
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.5 }}
    className="flex flex-col rounded-2xl border bg-card p-6 md:p-7 shadow-sm hover:shadow-md transition-shadow duration-base"
  >
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${ACCENT_CLASSES[accent]}`}>
      <Icon className="h-5 w-5" />
    </span>
    <h3 className="mt-4 text-xl font-semibold text-foreground">{titulo}</h3>
    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{descripcion}</p>
    <ul className="mt-5 space-y-2">
      {bullets.map((b) => (
        <li key={b} className="flex items-center gap-2 text-sm text-foreground/80">
          <CheckCircle2 className="h-4 w-4 text-success" />
          {b}
        </li>
      ))}
    </ul>
  </motion.article>
);

export default HomePage;
