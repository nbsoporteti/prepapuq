import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import TaskCard from '@/components/estudiante/TaskCard.jsx';
import { useTareasAlumno } from '@/hooks/useTareasAlumno.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const EstudianteTareasPage = () => {
  const { currentUser } = useAuth();
  const { data: tareas = [], isLoading } = useTareasAlumno(currentUser?.id);
  const [params, setParams] = useSearchParams();
  const tab = params.get('estado') || 'pendientes';

  const setTab = (v) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (v === 'pendientes') next.delete('estado');
      else next.set('estado', v);
      return next;
    });
  };

  const grupos = useMemo(() => {
    const now = Date.now();
    const g = { pendientes: [], en_progreso: [], entregadas: [], calificadas: [] };
    for (const t of tareas) {
      const e = t.entrega;
      if (!e) {
        // sin entrega: si la fecha ya pasó es no_entregada; igual la pongo en pendientes para que la vea
        g.pendientes.push(t);
        continue;
      }
      if (e.estado === 'calificada') g.calificadas.push(t);
      else if (e.estado === 'entregada' || e.estado === 'atrasada') g.entregadas.push(t);
      else if (e.estado === 'en_progreso' || e.estado === 'devuelta_correccion') g.en_progreso.push(t);
      else g.pendientes.push(t);
    }
    return g;
  }, [tareas]);

  const tabsConfig = [
    { key: 'pendientes', label: 'Pendientes', items: grupos.pendientes },
    { key: 'en_progreso', label: 'En borrador', items: grupos.en_progreso },
    { key: 'entregadas', label: 'Entregadas', items: grupos.entregadas },
    { key: 'calificadas', label: 'Calificadas', items: grupos.calificadas },
  ];

  return (
    <>
      <Helmet><title>Mis tareas | PrePa</title></Helmet>
      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to="/dashboard/estudiante">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al dashboard
              </Link>
            </Button>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Mis tareas</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-transparent border-b rounded-none h-auto p-0 gap-1 w-full justify-start">
              {tabsConfig.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-3"
                >
                  {t.label}
                  {t.items.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-[10px] font-mono h-5 px-1.5">
                      {t.items.length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabsConfig.map((t) => (
              <TabsContent key={t.key} value={t.key} className="m-0 pt-6">
                {isLoading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
                  </div>
                ) : t.items.length === 0 ? (
                  <EmptyState
                    icon={t.key === 'calificadas' ? ClipboardList : FileText}
                    title={
                      t.key === 'pendientes' ? 'Sin tareas pendientes' :
                      t.key === 'en_progreso' ? 'No tenés borradores guardados' :
                      t.key === 'entregadas' ? 'Sin entregas en revisión' :
                      'Sin tareas calificadas aún'
                    }
                    description={
                      t.key === 'pendientes'
                        ? 'Cuando tus profesores publiquen tareas las vas a ver acá.'
                        : 'Volvé a la sección pendientes para entregar nuevas tareas.'
                    }
                  />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {t.items.map((tarea) => (
                      <TaskCard
                        key={tarea.id}
                        tarea={tarea}
                        entrega={tarea.entrega}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default EstudianteTareasPage;
