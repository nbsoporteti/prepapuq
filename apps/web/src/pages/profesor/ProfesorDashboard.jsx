import React from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarDays, ClipboardList, Home, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProfesorOverview } from '@/hooks/useProfesorOverview.js';
import ProfesorVistaDia from './ProfesorVistaDia.jsx';
import ProfesorMisCursos from './ProfesorMisCursos.jsx';
import ProfesorCalificarQueue from './ProfesorCalificarQueue.jsx';
import ProfesorPerfil from './ProfesorPerfil.jsx';
import QuickActionsFAB from '@/components/profesor/QuickActionsFAB.jsx';

const ProfesorDashboard = () => {
  const { currentUser } = useAuth();
  const { data: overview, isLoading } = useProfesorOverview(currentUser?.id);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'hoy';

  const handleTabChange = (value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'hoy') next.delete('tab');
      else next.set('tab', value);
      return next;
    });
  };

  const pendientesBadge = overview?.entregasPendientes || 0;

  return (
    <>
      <Helmet>
        <title>Panel del profesor | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-20">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
              Profesor
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
              Hola, <span className="text-primary">{currentUser?.name || 'docente'}</span>
            </h1>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-1">
              <TabsTrigger value="hoy" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-3">
                <Home className="h-4 w-4 mr-2" />
                Hoy
              </TabsTrigger>
              <TabsTrigger value="cursos" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-3">
                <BookOpen className="h-4 w-4 mr-2" />
                Mis cursos
              </TabsTrigger>
              <TabsTrigger value="calificar" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-3">
                <ClipboardList className="h-4 w-4 mr-2" />
                Calificar
                {pendientesBadge > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-[10px] font-mono">
                    {pendientesBadge}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="perfil" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-3">
                <User className="h-4 w-4 mr-2" />
                Mi perfil
              </TabsTrigger>
            </TabsList>

            <div className="py-6">
              <TabsContent value="hoy" className="m-0">
                <ProfesorVistaDia overview={overview} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="cursos" className="m-0">
                <ProfesorMisCursos overview={overview} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="calificar" className="m-0">
                <ProfesorCalificarQueue overview={overview} />
              </TabsContent>

              <TabsContent value="perfil" className="m-0">
                <ProfesorPerfil />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <QuickActionsFAB />
      </div>
    </>
  );
};

export default ProfesorDashboard;
