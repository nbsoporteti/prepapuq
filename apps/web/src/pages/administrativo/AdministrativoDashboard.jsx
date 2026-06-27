import React from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { Home, Users, UserCircle2, UserPlus, CreditCard, FileText, BarChart3, Inbox } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
          <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b overflow-x-auto">
              <TabsList className="bg-transparent rounded-none h-auto p-0 gap-1 flex w-max">
                <TabsTrigger value="hoy" className={tabTriggerCls}>
                  <Home className="h-4 w-4 mr-2" />Hoy
                </TabsTrigger>
                <TabsTrigger value="alumnos" className={tabTriggerCls}>
                  <Users className="h-4 w-4 mr-2" />Alumnos
                </TabsTrigger>
                <TabsTrigger value="apoderados" className={tabTriggerCls}>
                  <UserCircle2 className="h-4 w-4 mr-2" />Apoderados
                </TabsTrigger>
                <TabsTrigger value="matriculas" className={tabTriggerCls}>
                  <UserPlus className="h-4 w-4 mr-2" />Matrículas
                </TabsTrigger>
                <TabsTrigger value="pagos" className={tabTriggerCls}>
                  <CreditCard className="h-4 w-4 mr-2" />Pagos
                  {pagosVencidosBadge > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-[10px] font-mono">
                      {pagosVencidosBadge}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="justificaciones" className={tabTriggerCls}>
                  <FileText className="h-4 w-4 mr-2" />Justificaciones
                  {justifBadge > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] font-mono bg-warning/15 text-warning-foreground">
                      {justifBadge}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="leads" className={tabTriggerCls}>
                  <Inbox className="h-4 w-4 mr-2" />Leads
                </TabsTrigger>
                <TabsTrigger value="reportes" className={tabTriggerCls}>
                  <BarChart3 className="h-4 w-4 mr-2" />Reportes
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="py-6">
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

const tabTriggerCls = 'data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-3 whitespace-nowrap shrink-0';

export default AdministrativoDashboard;
