import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';

const MATERIA_LABEL = {
  matematica_m1: 'Matemática M1',
  matematica_m2: 'Matemática M2',
  competencia_lectora: 'Competencia Lectora',
  ciencias: 'Ciencias',
  historia: 'Historia',
  ingles: 'Inglés',
  otra: 'Optativo',
};

const ProfesorMisCursos = ({ overview, isLoading }) => {
  const secciones = overview?.secciones || [];

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  if (secciones.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Sin secciones asignadas todavía"
        description="Un administrador debe asignarte como profesor titular de al menos una sección. Cuando suceda, aparecerá acá."
      />
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {secciones.map((s) => {
        const curso = s.expand?.curso_id;
        const materia = curso?.materia ? MATERIA_LABEL[curso.materia] : null;
        return (
          <Link
            key={s.id}
            to={`/dashboard/profesor/seccion/${s.id}`}
            className="group"
          >
            <Card className="h-full hover:shadow-md transition-shadow duration-base">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">
                      {curso?.nombre || 'Curso'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      Sección {s.nombre}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 group-hover:text-primary transition-all duration-base" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {materia && <Badge variant="secondary" className="text-xs">{materia}</Badge>}
                  {s.modalidad && <Badge variant="outline" className="text-xs">{s.modalidad}</Badge>}
                  {s.anio_lectivo && <Badge variant="outline" className="text-xs font-mono">{s.anio_lectivo}</Badge>}
                </div>
                {s.capacidad && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Capacidad {s.capacidad}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default ProfesorMisCursos;
