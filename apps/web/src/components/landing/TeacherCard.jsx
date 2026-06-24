import React, { useState } from 'react';
import { GraduationCap, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import pb from '@/lib/pocketbaseClient';

const MATERIA_LABEL = {
  matematica_m1: 'Matemática M1',
  matematica_m2: 'Matemática M2',
  competencia_lectora: 'Competencia Lectora',
  ciencias: 'Ciencias',
  historia: 'Historia',
  ingles: 'Inglés',
  otra: 'Optativo',
};

const initials = (nombre, apellido) => {
  const a = (nombre || '').trim().charAt(0).toUpperCase();
  const b = (apellido || '').trim().charAt(0).toUpperCase();
  return (a + b) || 'P';
};

/**
 * Card de profesor para la sección "Conocé al equipo docente" de la landing.
 * Muestra foto (o iniciales si no hay), nombre, materia, universidad, frase.
 * Click → modal con CV completo en markdown.
 */
const TeacherCard = ({ profesor, className }) => {
  const [open, setOpen] = useState(false);
  if (!profesor) return null;

  const fotoUrl = profesor.foto ? pb.files.getUrl(profesor, profesor.foto, { thumb: '400x400' }) : null;
  const materia = MATERIA_LABEL[profesor.materia] || profesor.materia || '—';

  return (
    <>
      <article
        className={cn(
          'group relative flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden transition-all duration-base hover:shadow-lg hover:-translate-y-0.5',
          className,
        )}
      >
        <div className="relative aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={`${profesor.nombre} ${profesor.apellido}`}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-slow group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-6xl font-bold text-primary/40">
                {initials(profesor.nombre, profesor.apellido)}
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-background/90 text-foreground backdrop-blur-sm shadow-sm">
              {materia}
            </Badge>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-5">
          <h3 className="font-semibold text-lg text-foreground">
            {profesor.nombre} {profesor.apellido}
          </h3>
          {profesor.universidad && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{profesor.universidad}</span>
            </div>
          )}
          {profesor.frase && (
            <p className="mt-3 text-sm italic text-foreground/80 leading-relaxed line-clamp-3">
              &ldquo;{profesor.frase}&rdquo;
            </p>
          )}
          {profesor.cv_completo_markdown && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-auto self-start pl-0 hover:bg-transparent hover:text-primary"
              onClick={() => setOpen(true)}
            >
              Ver perfil completo
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {profesor.nombre} {profesor.apellido}
            </DialogTitle>
            <DialogDescription>
              {materia} · {profesor.universidad || ''}
            </DialogDescription>
          </DialogHeader>
          {profesor.titulo && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Título: </span>
              {profesor.titulo}
            </p>
          )}
          {profesor.magister && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Magíster: </span>
              {profesor.magister}
            </p>
          )}
          {profesor.cv_completo_markdown && (
            <div
              className="prose prose-sm max-w-none text-foreground/90"
              // El admin escribe esto, sin entrada de terceros. Igual sanitizar a futuro
              // si se permite que profesores no-admin lo editen.
              dangerouslySetInnerHTML={{ __html: profesor.cv_completo_markdown }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeacherCard;
