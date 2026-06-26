import React from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Target,
  Rocket,
  Check,
  Star,
  ArrowRight,
  BookOpen,
  Calculator,
  Sigma,
  FlaskConical,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const scrollToContacto = () => {
  const el = document.getElementById('contacto');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

// Planes por nivel/audiencia. Contenido de marketing editable; sin precios
// (se cotizan por WhatsApp / formulario). El plan de 4° medio va destacado.
const PLANES = [
  {
    id: 'tercero',
    icon: Compass,
    nivel: '3° Medio',
    titulo: 'Plan Anticipado',
    descripcion:
      'Empezá un año antes: bases sólidas en Matemática y Competencia Lectora, hábitos de estudio y un diagnóstico claro para llegar a 4° con ventaja.',
    bullets: [
      'Clases en vivo semanales',
      'Material y guías PrePa',
      'Primer diagnóstico PAES',
      'Acompañamiento al apoderado',
    ],
    destacado: false,
  },
  {
    id: 'cuarto',
    icon: Target,
    nivel: '4° Medio',
    titulo: 'PAES Integral',
    descripcion:
      'La preparación completa para rendir en diciembre: todas las pruebas, simulacros mensuales con percentil y un plan personalizado según tus puntos débiles.',
    bullets: [
      'Las 5 pruebas PAES',
      'Simulacros mensuales con percentil',
      'Tutorías 1-a-1 incluidas',
      'Informe de puntaje proyectado',
      'Seguimiento al apoderado',
    ],
    destacado: true,
  },
  {
    id: 'egresados',
    icon: Rocket,
    nivel: 'Egresados',
    titulo: 'Intensivo PAES',
    descripcion:
      'Volvé a rendir con foco en lo que te falta. Repaso intensivo por asignatura y simulacros para subir tu puntaje justo donde más pesa para tu carrera.',
    bullets: [
      'Foco en tus debilidades',
      'Repaso por asignatura',
      'Simulacros intensivos',
      'Horarios compatibles con trabajo',
    ],
    destacado: false,
  },
];

// Las pruebas PAES que se preparan. M2 y Ciencias dependen del electivo.
const ASIGNATURAS = [
  { icon: BookOpen, nombre: 'Competencia Lectora' },
  { icon: Calculator, nombre: 'Matemática M1' },
  { icon: Sigma, nombre: 'Matemática M2' },
  { icon: FlaskConical, nombre: 'Ciencias' },
  { icon: Landmark, nombre: 'Historia y Cs. Sociales' },
];

const ProgramaCard = ({ plan }) => {
  const Icon = plan.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
      className={`relative flex flex-col rounded-2xl border bg-card p-6 md:p-7 transition-all duration-base ${
        plan.destacado
          ? 'border-primary/40 ring-2 ring-primary/20 shadow-lg md:-mt-3 md:mb-3'
          : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {plan.destacado && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
          <Star className="h-3 w-3 fill-current" />
          Más elegido
        </span>
      )}

      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${
            plan.destacado
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-secondary/10 text-secondary border-secondary/20'
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {plan.nivel}
          </p>
          <h3 className="text-xl font-bold text-foreground leading-tight">{plan.titulo}</h3>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{plan.descripcion}</p>

      <ul className="mt-5 space-y-2.5 flex-1">
        {plan.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-foreground/85">
            <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
            {b}
          </li>
        ))}
      </ul>

      <Button
        onClick={scrollToContacto}
        className={`mt-6 w-full rounded-full font-semibold ${
          plan.destacado
            ? 'bg-accent text-accent-foreground hover:bg-accent/90'
            : ''
        }`}
        variant={plan.destacado ? 'default' : 'outline'}
      >
        Conocer este plan
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.article>
  );
};

/**
 * Sección "Programas" — el centro de la landing institucional (estilo Cpech).
 * Planes por nivel + tira de las asignaturas PAES que se preparan.
 * Renderiza su propia <section id="programas">.
 */
const ProgramasSection = () => {
  return (
    <section id="programas" className="relative overflow-hidden py-20 md:py-24 bg-muted/30 border-t">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 right-[-60px] h-72 w-72 rounded-full bg-primary/10" />
        <div className="absolute bottom-10 left-[-40px] h-52 w-52 rounded-full bg-secondary/10" />
        <div className="absolute top-24 left-[12%] h-12 w-12 rotate-12 rounded-2xl bg-accent/20" />
      </div>
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Admisión 2027</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
            Un programa para cada etapa
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Elegí según el momento en que estás. Todos incluyen clases en vivo, material
            PrePa y simulacros con percentil. Los valores y becas se cotizan según tu caso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {PLANES.map((plan) => (
            <ProgramaCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Tira de asignaturas PAES ------------------------------------- */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground">
              Preparamos las pruebas que rendís
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Matemática M2 y Ciencias según tu electivo.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {ASIGNATURAS.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.nombre}
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {a.nombre}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProgramasSection;
