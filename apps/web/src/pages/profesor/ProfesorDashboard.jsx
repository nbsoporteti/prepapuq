import React from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { House, BookOpen, ClipboardText, UserCircle } from '@phosphor-icons/react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import DashboardNav from '@/components/shared/DashboardNav.jsx';
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

  const navItems = [
    { value: 'hoy', label: 'Hoy', icon: House },
    { value: 'cursos', label: 'Mis cursos', icon: BookOpen },
    { value: 'calificar', label: 'Calificar', icon: ClipboardText, badge: pendientesBadge || undefined },
    { value: 'perfil', label: 'Mi perfil', icon: UserCircle },
  ];

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
          <Tabs value={tab} onValueChange={handleTabChange} className="lg:flex lg:gap-6">
            <DashboardNav items={navItems} value={tab} onChange={handleTabChange} />

            <div className="min-w-0 flex-1">
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
