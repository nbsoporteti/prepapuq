import React from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { House, Student, UsersThree, UserPlus, CreditCard, FileText, ChartBar, Tray } from '@phosphor-icons/react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import DashboardNav from '@/components/shared/DashboardNav.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useAdministrativoOverview } from '@/hooks/useAdministrativoOverview.js';
import AdmVistaDia from './AdmVistaDia.jsx';
import AdmAlumnos from './AdmAlumnos.jsx';
import AdmApoderados from './AdmApoderados.jsx';
import AdmMatriculas from './AdmMatriculas.jsx';
import AdmPagos from './AdmPagos.jsx';
import AdmJustificaciones from './AdmJustificaciones.jsx';
import AdmReportes from './AdmReportes.jsx';
import AdmLeads from './AdmLeads.jsx';

const AdministrativoDashboard = () => {
  const { currentUser } = useAuth();
  const { data: overview, isLoading } = useAdministrativoOverview();
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

  const justifBadge = overview?.justificacionesPendientes || 0;
  const pagosVencidosBadge = overview?.pagosVencidos || 0;

  const navItems = [
    { value: 'hoy', label: 'Hoy', icon: House },
    { value: 'alumnos', label: 'Alumnos', icon: Student },
    { value: 'apoderados', label: 'Apoderados', icon: UsersThree },
    { value: 'matriculas', label: 'Matrículas', icon: UserPlus },
    { value: 'pagos', label: 'Pagos', icon: CreditCard, badge: pagosVencidosBadge || undefined },
    { value: 'justificaciones', label: 'Justificaciones', icon: FileText, badge: justifBadge || undefined },
    { value: 'leads', label: 'Leads', icon: Tray },
    { value: 'reportes', label: 'Reportes', icon: ChartBar },
  ];

  return (
    <>
      <Helmet>
        <title>Panel administrativo | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-20">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">
              Secretaría / Administración
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
              Hola, <span className="text-primary">{currentUser?.name || 'equipo'}</span>
            </h1>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Tabs value={tab} onValueChange={handleTabChange} className="lg:flex lg:gap-6">
            <DashboardNav items={navItems} value={tab} onChange={handleTabChange} />

            <div className="min-w-0 flex-1">
              <TabsContent value="hoy" className="m-0">
                <AdmVistaDia overview={overview} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="alumnos" className="m-0">
                <AdmAlumnos />
              </TabsContent>
              <TabsContent value="apoderados" className="m-0">
                <AdmApoderados />
              </TabsContent>
              <TabsContent value="matriculas" className="m-0">
                <AdmMatriculas />
              </TabsContent>
              <TabsContent value="pagos" className="m-0">
                <AdmPagos />
              </TabsContent>
              <TabsContent value="justificaciones" className="m-0">
                <AdmJustificaciones />
              </TabsContent>
              <TabsContent value="leads" className="m-0">
                <AdmLeads />
              </TabsContent>
              <TabsContent value="reportes" className="m-0">
                <AdmReportes />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdministrativoDashboard;
