import React from 'react';
import { cn } from '@/lib/utils';
import { formatNota } from '@/lib/escala-notas';

/**
 * Badge visual para una nota chilena 1.0-7.0 con semáforo:
 *   >= 6.0 verde, 5-6 azul, 4-5 amarillo, < 4 rojo.
 *
 * Props:
 *  - nota: number | null
 *  - size: 'sm' | 'md' | 'lg'  (default 'md')
 *  - showSign: bool (default false) — para mostrar diff (+0.4 / -0.2)
 */
const BadgeNota = ({ nota, size = 'md', className }) => {
  const sizeCls = {
    sm: 'h-5 px-1.5 text-[11px]',
    md: 'h-7 px-2 text-sm',
    lg: 'h-9 px-3 text-base',
  }[size] || 'h-7 px-2 text-sm';

  if (nota === null || nota === undefined || isNaN(nota)) {
    return (
      <span className={cn(
        'inline-flex items-center justify-center rounded-md bg-muted text-muted-foreground font-mono font-semibold tabular-nums',
        sizeCls,
        className,
      )}>
        —
      </span>
    );
  }

  const tone = nota >= 6
    ? 'bg-success/10 text-success border-success/30'
    : nota >= 5
    ? 'bg-info/10 text-info border-info/30'
    : nota >= 4
    ? 'bg-warning/15 text-warning-foreground border-warning/30'
    : 'bg-destructive/10 text-destructive border-destructive/30';

  return (
    <span className={cn(
      'inline-flex items-center justify-center rounded-md border font-mono font-bold tabular-nums',
      tone,
      sizeCls,
      className,
    )}>
      {formatNota(nota)}
    </span>
  );
};

export default BadgeNota;
