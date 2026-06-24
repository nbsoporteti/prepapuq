import React from 'react';
import { Helmet } from 'react-helmet';
import { Users, FileText, CreditCard, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext.jsx';

/**
 * Placeholder de Fase 0 — confirma routing + role guard.
 * La implementación real (matrículas, pagos, justificaciones, reportes) llega
 * en Fase 2.
 */
const AdministrativoDashboard = () => {
  const { currentUser } = useAuth();

  const stats = [
    { label: 'Alumnos activos', value: '—', icon: Users },
    { label: 'Pagos vencidos', value: '—', icon: CreditCard },
    { label: 'Justificaciones', value: '—', icon: FileText },
    { label: 'Matrículas pendientes', value: '—', icon: AlertCircle },
  ];

  return (
    <>
      <Helmet>
        <title>Panel administrativo | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-accent/5 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-sm font-medium uppercase tracking-wide text-accent mb-2">
              Secretaría
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              Hola, <span className="text-primary">{currentUser?.name || 'equipo'}</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Acá vas a gestionar matrículas, pagos, justificaciones y comunicación con apoderados. Por ahora es un esqueleto.
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
                Panel administrativo en construcción (Fase 2 del plan maestro). Pronto vas a poder matricular alumnos, registrar pagos y aprobar justificaciones desde acá.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AdministrativoDashboard;
