import React from 'react';
import { Quote, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import pb from '@/lib/pocketbaseClient';

/**
 * Card de testimonio para "Nuestros exalumnos". Diseño con cita destacada y
 * badge con birrete + {carrera} · {universidad} abajo.
 */
const AlumnoTestimonialCard = ({ testimonio, className }) => {
  if (!testimonio) return null;
  const fotoUrl = testimonio.foto ? pb.files.getUrl(testimonio, testimonio.foto, { thumb: '200x200' }) : null;
  const inicial = (testimonio.nombre_alumno || 'A').trim().charAt(0).toUpperCase();

  return (
    <article
      className={cn(
        'flex flex-col h-full rounded-2xl border bg-card shadow-sm p-6 md:p-7 transition-shadow duration-base hover:shadow-md',
        testimonio.destacado && 'ring-1 ring-primary/20',
        className,
      )}
    >
      <Quote className="h-7 w-7 text-primary/40 shrink-0" aria-hidden="true" />
      <blockquote className="mt-3 flex-1 text-base md:text-lg leading-relaxed text-foreground/90 font-display">
        &ldquo;{testimonio.cita}&rdquo;
      </blockquote>

      <div className="mt-5 pt-5 border-t flex items-center gap-3">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={testimonio.nombre_alumno}
            loading="lazy"
            className="h-12 w-12 rounded-full object-cover ring-2 ring-background shadow-sm"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
            {inicial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {testimonio.nombre_alumno}
          </p>
          {testimonio.carrera && testimonio.universidad && (
            <Badge variant="secondary" className="mt-1 inline-flex items-center gap-1 bg-primary/10 text-primary border-0 font-medium">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              {testimonio.carrera} · {testimonio.universidad}
            </Badge>
          )}
          {(!testimonio.carrera || !testimonio.universidad) && testimonio.promocion_anio && (
            <p className="text-xs text-muted-foreground mt-1">
              Promoción {testimonio.promocion_anio}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

export default AlumnoTestimonialCard;
