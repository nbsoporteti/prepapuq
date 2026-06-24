import React from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Timeline horizontal (desktop) o vertical (mobile) que muestra los hitos
 * del proceso PAES. Recibe `hitos` como prop; el hito con `actual: true`
 * pulsa en accent ámbar.
 *
 * Cada hito: { id, mes, label, descripcion, status: 'past'|'next'|'future', actual? }
 */
const PaesTimeline = ({ hitos = [], className }) => {
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Desktop: horizontal --------------------------------------------- */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Línea base */}
          <div className="absolute top-7 left-7 right-7 h-0.5 bg-border" aria-hidden="true" />
          {/* Línea coloreada según progreso */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ transformOrigin: 'left' }}
            className="absolute top-7 left-7 right-7 h-0.5 bg-primary"
            aria-hidden="true"
          />

          <ol className="relative grid grid-cols-1 md:grid-flow-col md:auto-cols-fr gap-6">
            {hitos.map((h, idx) => (
              <motion.li
                key={h.id || idx}
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <HitoDot status={h.status} actual={h.actual} />
                <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {h.mes}
                </p>
                <p className="mt-1 font-semibold text-foreground text-balance max-w-[16ch]">
                  {h.label}
                </p>
                {h.descripcion && (
                  <p className="mt-1 text-xs text-muted-foreground max-w-[20ch]">
                    {h.descripcion}
                  </p>
                )}
              </motion.li>
            ))}
          </ol>
        </div>
      </div>

      {/* Mobile: vertical ------------------------------------------------ */}
      <ol className="md:hidden relative pl-7">
        <div className="absolute top-2 bottom-2 left-3 w-0.5 bg-border" aria-hidden="true" />
        {hitos.map((h, idx) => (
          <li key={h.id || idx} className="relative pb-6 last:pb-0">
            <div className="absolute -left-7 top-1">
              <HitoDot status={h.status} actual={h.actual} compact />
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {h.mes}
            </p>
            <p className="font-semibold text-foreground">{h.label}</p>
            {h.descripcion && (
              <p className="text-sm text-muted-foreground mt-0.5">{h.descripcion}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

const HitoDot = ({ status, actual, compact = false }) => {
  const sizeCls = compact ? 'h-6 w-6' : 'h-14 w-14';
  const inner = compact ? 'h-4 w-4' : 'h-7 w-7';

  if (actual) {
    return (
      <div className={cn('relative flex items-center justify-center', sizeCls)}>
        <span className={cn('absolute inset-0 rounded-full bg-accent animate-ping opacity-40')} aria-hidden="true" />
        <span className={cn('relative flex items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md font-bold', sizeCls)}>
          <CalendarIcon className={cn(inner, 'p-1')} />
        </span>
      </div>
    );
  }

  if (status === 'past') {
    return (
      <span className={cn('flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm', sizeCls)}>
        <Check className={cn(inner, 'p-1')} />
      </span>
    );
  }

  // future / next default
  return (
    <span className={cn(
      'flex items-center justify-center rounded-full border-2 bg-background',
      status === 'next' ? 'border-primary text-primary' : 'border-border text-muted-foreground',
      sizeCls,
    )}>
      <span className={cn('rounded-full', compact ? 'h-1.5 w-1.5' : 'h-3 w-3', status === 'next' ? 'bg-primary' : 'bg-muted-foreground')} />
    </span>
  );
};

export default PaesTimeline;
