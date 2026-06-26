import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Laptop,
  Layers,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import CifrasBand from '@/components/landing/CifrasBand.jsx';
import ProgramasSection from '@/components/landing/ProgramasSection.jsx';
import pb from '@/lib/pocketbaseClient';

const WHATSAPP_URL = 'https://wa.me/56900000000';

// Structured data para Google (rich results). Solo datos verdaderos —
// sin teléfono/dirección inventados.
const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'PrePa — Prepara tu futuro',
  alternateName: 'PrePa',
  url: 'https://prepapuq.cl',
  logo: 'https://prepapuq.cl/logo.webp',
  image: 'https://prepapuq.cl/hero-puntaarenas.webp',
  description:
    'Preuniversitario PAES en Punta Arenas, Magallanes. Profesores locales con CV verificable, grupos chicos (≤25) y simulacros mensuales con percentil. Modalidad presencial, online o mixta.',
  areaServed: { '@type': 'AdministrativeArea', name: 'Región de Magallanes, Chile' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Punta Arenas',
    addressRegion: 'Magallanes',
    addressCountry: 'CL',
  },
};

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

// "¿Por qué PrePa?" — fusiona los bullets del hero anterior con la lista
// "por qué local". Es el diferenciador frente a los preus nacionales.
const METODOLOGIA_FEATURES = [
  {
    icon: MapPin,
    titulo: 'Profesores que viven acá',
    descripcion: 'No vienen y se van: están todo el año, en tu misma zona horaria, para responder dudas.',
  },
  {
    icon: Users,
    titulo: 'Grupos chicos, atención real',
    descripcion: 'Máximo 25 alumnos por grupo. Cada estudiante es conocido por nombre, no por número de lista.',
  },
  {
    icon: GraduationCap,
    titulo: 'Foco en universidades chilenas',
    descripcion: 'Conocemos los procesos de la UC, U. de Chile, UMAG, USACH y las pasarelas SUR.',
  },
  {
    icon: Clock,
    titulo: 'Horarios pensados para Magallanes',
    descripcion: 'Adaptados a las horas de luz, los días de viento blanco y los tiempos de viaje a la sede.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Resultados auditables',
    descripcion: 'Publicamos las cifras con el N exacto. Cualquier apoderado puede verificarlas con DEMRE.',
  },
  {
    icon: MessageCircle,
    titulo: 'Sin call center',
    descripcion: 'Te atiende una persona del equipo. Siempre, por WhatsApp directo.',
  },
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
  const location = useLocation();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Deep-link a sección: si la URL trae #hash (p. ej. /#programas desde el
  // Header en otra ruta, o una recarga directa), baja a la sección al montar
  // y en cada cambio de hash. El timeout deja renderizar el contenido primero.
  useEffect(() => {
    if (!location.hash) return undefined;
    const id = location.hash.slice(1);
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(t);
  }, [location.hash]);

  const anioPromocion = new Date().getFullYear() + 1;

  return (
    <>
      <Helmet>
        <title>PrePa · Preuniversitario PAES en Punta Arenas | Profesores locales, resultados reales</title>
        <meta
          name="description"
          content="Preuniversitario PAES en Punta Arenas (Magallanes). Planes para 3° medio, 4° medio y egresados, profesores locales con CV verificable y simulacros mensuales con percentil. Modalidad presencial, online o mixta. Admisión 2027 abierta."
        />
        <meta name="keywords" content="preuniversitario, PAES, Punta Arenas, Magallanes, ensayo PAES, admisión universitaria, Competencia Lectora, Matemática M1, Matemática M2" />
        <meta property="og:title" content="PrePa — Preuniversitario PAES Punta Arenas" />
        <meta property="og:description" content="El preuniversitario de Magallanes que conoce a cada alumno por nombre. Planes por nivel, profesores locales con CV verificable y resultados PAES auditables. Admisión 2027 abierta." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_CL" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="og:url" content="https://prepapuq.cl/" />
        <meta property="og:image" content="https://prepapuq.cl/hero-puntaarenas.webp" />
        <meta name="twitter:image" content="https://prepapuq.cl/hero-puntaarenas.webp" />
        <link rel="canonical" href="https://prepapuq.cl/" />
        <script type="application/ld+json">{JSON.stringify(ORG_JSONLD)}</script>
      </Helmet>

      <main>
        {/* =========================================================== */}
        {/* SECCIÓN 1 — HERO INSTITUCIONAL                              */}
        {/* =========================================================== */}
        <section
          id="inicio"
          className="relative overflow-hidden border-b bg-slate-950"
        >
          {/* Fondo: foto real de Punta Arenas y el Estrecho de Magallanes (Unsplash,
              licencia libre). Swappable por una foto propia en /hero-puntaarenas.webp */}
          <img
            src="/hero-puntaarenas.webp"
            alt="Vista de Punta Arenas y el Estrecho de Magallanes"
            className="absolute inset-0 h-full w-full object-cover object-center"
            width="1920"
            height="1280"
          />
          {/* Scrim de legibilidad: capa base pareja + refuerzo a la izquierda (texto). */}
          <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/10"
            aria-hidden="true"
          />
          <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                className="lg:col-span-7"
              >
                <h1 className="font-editorial text-display-2xl font-bold text-balance text-white">
                  El preuniversitario PAES de Magallanes que te conoce por <span className="text-primary">nombre</span>.
                </h1>
                <p className="mt-6 text-lg md:text-xl text-slate-200 max-w-2xl leading-relaxed">
                  Profesores locales con CV verificable, simulacros mensuales con percentil y
                  planes presenciales, online o mixtos. Preparate para entrar a la universidad
                  sin salir de Punta Arenas.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    onClick={() => scrollToSection('programas')}
                    className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-8"
                  >
                    Conocer los programas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-full border-white/30 !bg-transparent !text-white hover:!bg-white/10 text-base px-8"
                  >
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4 text-success" />
                      Hablanos por WhatsApp
                    </a>
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Grupos chicos (≤25)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Profes con CV verificable
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Resultados auditables
                  </span>
                </div>
              </motion.div>

              {/* Panel de marca — logo real + cifras estructurales verdaderas */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                className="lg:col-span-5"
              >
                {/* Panel de marca — logo real + cifras estructurales verdaderas */}
                <div className="rounded-2xl border bg-card shadow-sm p-8 md:p-10">
                  <img
                    src="/logo.webp"
                    alt="PrePa — Prepara tu futuro"
                    className="mx-auto h-28 w-auto"
                    width="224"
                    height="224"
                  />

                  <div className="mt-8 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-mono text-2xl md:text-3xl font-bold tabular-nums text-primary">5</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-tight">pruebas PAES</p>
                    </div>
                    <div className="border-x">
                      <p className="font-mono text-2xl md:text-3xl font-bold tabular-nums text-secondary">≤25</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-tight">por grupo</p>
                    </div>
                    <div>
                      <p className="font-mono text-2xl md:text-3xl font-bold tabular-nums text-foreground">3</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-tight">modalidades</p>
                    </div>
                  </div>

                  {resultados?.puntaje_promedio_general ? (
                    <div className="mt-7 pt-6 border-t text-center">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Puntaje PAES promedio · Promoción {resultados.anio_promocion}
                      </p>
                      <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-foreground">
                        {Math.round(resultados.puntaje_promedio_general)}
                        <span className="text-base font-normal text-muted-foreground ml-1">/ 1000</span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-7 pt-6 border-t text-center text-sm text-muted-foreground">
                      Preuniversitario PAES en Punta Arenas, Magallanes
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 2 — BANDA DE CIFRAS                                  */}
        {/* =========================================================== */}
        <CifrasBand resultados={resultados} />

        {/* =========================================================== */}
        {/* SECCIÓN 3 — PROGRAMAS / PLANES (centro de la página)        */}
        {/* =========================================================== */}
        <ProgramasSection />

        {/* =========================================================== */}
        {/* SECCIÓN 4 — MODALIDADES                                      */}
        {/* =========================================================== */}
        <section id="modalidades" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Adaptado a tu vida</p>
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance">
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
                bullets={['Mayor flexibilidad', 'Mismo valor que online', 'Asistencia auto-ajustada']}
                accent="accent"
              />
            </div>
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 5 — METODOLOGÍA / ¿POR QUÉ PREPA?                   */}
        {/* =========================================================== */}
        <section id="metodologia" className="py-20 md:py-24 bg-muted/30 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">¿Por qué PrePa?</p>
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance">
                Hecho para estudiar en Magallanes
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                No es lo mismo prepararse en Santiago que en Punta Arenas. Nuestra metodología
                está pensada para tu realidad: cercana, local y verificable.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {METODOLOGIA_FEATURES.map((f, idx) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.titulo}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.45, delay: idx * 0.04 }}
                    className="rounded-2xl border bg-card p-6 shadow-sm"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-semibold text-foreground">{f.titulo}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.descripcion}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================== */}
        {/* SECCIÓN 6 — EQUIPO DOCENTE                                   */}
        {/* =========================================================== */}
        <section id="equipo" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-14">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Equipo local</p>
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance">
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
        {/* SECCIÓN 7 — RESULTADOS                                       */}
        {/* =========================================================== */}
        <section id="resultados" className="py-20 md:py-24 border-t bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Resultados verificables</p>
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance">
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
                <GraduationCap className="h-8 w-8 text-primary mx-auto mb-3" />
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
        {/* SECCIÓN 8 — CALENDARIO PAES                                  */}
        {/* =========================================================== */}
        <section id="calendario" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Tu hoja de ruta</p>
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance">
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
        {/* SECCIÓN 9 — TESTIMONIOS                                      */}
        {/* =========================================================== */}
        <section id="testimonios" className="py-20 md:py-24 bg-muted/30 border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Voces de exalumnos</p>
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance">
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
        {/* SECCIÓN 10 — FAQ                                             */}
        {/* =========================================================== */}
        <section id="faq" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <div className="text-center mb-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Preguntas frecuentes</p>
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance">
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
        {/* SECCIÓN 11 — CTA FINAL / CONTACTO                            */}
        {/* =========================================================== */}
        <section id="contacto" className="py-20 md:py-24 border-t bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="grid lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
                  Admisión {anioPromocion} · cupos limitados
                </p>
                <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance">
                  Reservá tu cupo en la promoción {anioPromocion}
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
                    className="mt-4 w-full rounded-full bg-success text-success-foreground hover:bg-success/90"
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

        {/* =========================================================== */}
        {/* SECCIÓN 12 — BANDA CTA FINAL (navy, estilo Calendly)        */}
        {/* =========================================================== */}
        <section className="bg-slate-900 text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-balance text-white">
                No dejes tu PAES para último momento.
              </h2>
              <p className="mt-4 text-lg text-slate-300">
                La preparación que empieza antes rinde más. Sumate a la promoción {anioPromocion} y
                armá tu plan con el equipo.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-success text-success-foreground hover:bg-success/90 font-semibold text-base px-8"
                >
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Hablar por WhatsApp
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToSection('programas')}
                  className="rounded-full border-white/40 !bg-transparent !text-white hover:!bg-white/10 text-base px-8"
                >
                  Ver los programas
                </Button>
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
