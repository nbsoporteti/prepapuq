import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Counter animado que sube de 0 hasta `value` cuando el componente entra
 * al viewport. Usado en la sección "Resultados" de la landing.
 *
 * Props:
 *  - value: número final (ej. 87)
 *  - suffix: ej. "%" | " pts" | "+"
 *  - prefix: ej. "$"
 *  - label: descripción debajo
 *  - eyebrow: pequeño tag opcional arriba
 *  - duration: ms para llegar al final (default 1400)
 *  - decimals: cuántos decimales mostrar (default 0)
 */
const StatCounter = ({
  value,
  suffix = '',
  prefix = '',
  label,
  eyebrow,
  duration = 1400,
  decimals = 0,
  className,
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || typeof value !== 'number') return;
    const start = performance.now();
    let raf = 0;
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      setDisplay(value * ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString('es-CL');

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn('flex flex-col gap-1', className)}
    >
      {eyebrow && (
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </span>
      )}
      <div className="flex items-baseline gap-1">
        {prefix && (
          <span className="text-2xl md:text-3xl font-semibold text-foreground/70">
            {prefix}
          </span>
        )}
        <span className="font-mono font-bold text-4xl md:text-5xl lg:text-6xl text-foreground tabular-nums leading-none">
          {formatted}
        </span>
        {suffix && (
          <span className="text-2xl md:text-3xl font-semibold text-foreground/70">
            {suffix}
          </span>
        )}
      </div>
      <div className="h-1 w-12 bg-accent rounded-full mt-2"></div>
      {label && (
        <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-[18ch]">
          {label}
        </p>
      )}
    </motion.div>
  );
};

export default StatCounter;
