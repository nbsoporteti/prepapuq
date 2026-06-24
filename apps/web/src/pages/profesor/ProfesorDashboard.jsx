import React from 'react';
import { Helmet } from 'react-helmet';
import { BookOpen, Clock, Users, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext.jsx';

/**
 * Placeholder de Fase 0 — solo confirma que el routing + el role guard
 * funcionan. La implementación real (tabs Hoy/Mis cursos/Calendario/
 * Calificar/Comunicaciones/Mi perfil) llega en Fase 2.
 */
const ProfesorDashboard = () => {
  const { currentUser } = useAuth();

  const stats = [
    { label: 'Mis cursos', value: '—', icon: BookOpen },
    { label: 'Alumnos', value: '—', icon: Users },
    { label: 'Por calificar', value: '—', icon: ClipboardList },
    { label: 'Próxima clase', value: '—', icon: Clock },
  ];

  return (
    <>
      <Helmet>
        <title>Panel del profesor | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-secondary/5 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-sm font-medium uppercase tracking-wide text-secondary mb-2">
              Profesor
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              Hola, <span className="text-primary">{currentUser?.name || 'docente'}</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Este es tu panel. Próximamente vas a ver acá tus clases del día, las tareas pendientes de calificar y la asistencia a marcar.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {s.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-8 border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Panel del profesor en construcción (Fase 2 del plan maestro). Las funciones de programar clase, pasar lista, crear tareas y calificar estarán disponibles próximamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ProfesorDashboard;
