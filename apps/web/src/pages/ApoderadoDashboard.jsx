import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle2, ClipboardList, CreditCard, FileText, Sparkles, Users, XCircle } from 'lucide-react';
import { Gauge, CalendarCheck, ListChecks, Target, CreditCard as CreditCardPh } from '@phosphor-icons/react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import DashboardNav from '@/components/shared/DashboardNav.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import BadgeNota from '@/components/shared/BadgeNota.jsx';
import EstudianteNotas from './estudiante/EstudianteNotas.jsx';
import EstudiantePAES from './estudiante/EstudiantePAES.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNotasAlumno } from '@/hooks/useNotasAlumno.js';
import { promedioSimple } from '@/lib/promedios.js';
import pb from '@/lib/pocketbaseClient';

const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
const formatFecha = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-CL'); } catch (_e) { return iso; }
};

const usePupilos = (apoderadoId) => useQuery({
  queryKey: ['apoderado', 'pupilos', apoderadoId],
  enabled: !!apoderadoId,
  staleTime: 60_000,
  queryFn: async () => {
    const r = await pb.collection('parent_student').getList(1, 20, {
      filter: `parent_id = "${apoderadoId}"`,
      expand: 'student_id',
      $autoCancel: false,
    });
    return r.items.map((x) => x.expand?.student_id).filter(Boolean);
  },
});

const useAsistenciaPupilo = (pupiloId) => useQuery({
  queryKey: ['apoderado', 'asistencia', pupiloId],
  enabled: !!pupiloId,
  staleTime: 30_000,
  queryFn: async () => {
    // Trae asistencia legacy + por-clase
    const [legacy, clases] = await Promise.all([
      pb.collection('asistencia').getFullList({
        filter: `user_id = "${pupiloId}"`,
        sort: '-fecha',
        $autoCancel: false,
      }).catch(() => []),
      pb.collection('asistencia_clase_vivo').getFullList({
        filter: `alumno_id = "${pupiloId}"`,
        expand: 'clase_vivo_id,clase_vivo_id.seccion_id',
        sort: '-created',
        $autoCancel: false,
      }).catch(() => []),
    ]);
    return { legacy, clases };
  },
});

const usePagosPupilo = (pupiloId) => useQuery({
  queryKey: ['apoderado', 'pagos', pupiloId],
  enabled: !!pupiloId,
  staleTime: 30_000,
  queryFn: async () => {
    const r = await pb.collection('pagos').getFullList({
      filter: `alumno_id = "${pupiloId}"`,
      sort: 'fecha_vencimiento',
      $autoCancel: false,
    });
    return r;
  },
});

const ApoderadoDashboard = () => {
  const { currentUser } = useAuth();
  const { data: pupilos = [], isLoading: loadingPupilos } = usePupilos(currentUser?.id);
  const [pupiloId, setPupiloId] = useState('');
  const [tab, setTab] = useState('resumen');

  useEffect(() => {
    if (!pupiloId && pupilos.length > 0) setPupiloId(pupilos[0].id);
  }, [pupilos, pupiloId]);

  const pupiloActivo = pupilos.find((p) => p.id === pupiloId);

  const navItems = [
    { value: 'resumen', label: 'Resumen', icon: Gauge },
    { value: 'asistencia', label: 'Asistencia', icon: CalendarCheck },
    { value: 'notas', label: 'Libreta', icon: ListChecks },
    { value: 'paes', label: 'PAES', icon: Target },
    { value: 'pagos', label: 'Pagos', icon: CreditCardPh },
  ];

  return (
    <>
      <Helmet><title>Panel del apoderado | PrePa</title></Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Apoderado</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-balance">
              Hola, <span className="text-primary">{currentUser?.name?.split(' ')[0] || 'apoderado'}</span>
            </h1>

            {pupilos.length > 1 && (
              <div className="mt-4 flex items-center gap-2 max-w-xs">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Select value={pupiloId} onValueChange={setPupiloId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir pupilo" />
                  </SelectTrigger>
                  <SelectContent>
                    {pupilos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {loadingPupilos ? (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : pupilos.length === 0 ? (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <EmptyState
              icon={Users}
              title="Sin pupilos vinculados"
              description="Pedile a secretaría que vincule tu cuenta con la de tu pupilo/a desde el panel administrativo."
            />
          </div>
        ) : (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            {pupiloActivo && (
              <div className="mb-6 flex items-center gap-3 text-sm">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {(pupiloActivo.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{pupiloActivo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pupiloActivo.email}
                    {pupiloActivo.rut && ` · ${pupiloActivo.rut}`}
                  </p>
                </div>
              </div>
            )}

            <Tabs value={tab} onValueChange={setTab} className="lg:flex lg:gap-6">
              <DashboardNav items={navItems} value={tab} onChange={setTab} />

              <div className="min-w-0 flex-1">
                <TabsContent value="resumen" className="m-0">
                  <ResumenPupilo pupiloId={pupiloId} pupiloName={pupiloActivo?.name} />
                </TabsContent>
                <TabsContent value="asistencia" className="m-0">
                  <AsistenciaPupilo pupiloId={pupiloId} />
                </TabsContent>
                <TabsContent value="notas" className="m-0">
                  <EstudianteNotas pupiloId={pupiloId} />
                </TabsContent>
                <TabsContent value="paes" className="m-0">
                  <EstudiantePAES pupiloId={pupiloId} />
                </TabsContent>
                <TabsContent value="pagos" className="m-0">
                  <PagosPupilo pupiloId={pupiloId} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </>
  );
};

const ResumenPupilo = ({ pupiloId, pupiloName }) => {
  const { data: notas = [] } = useNotasAlumno(pupiloId);
  const { data: asist } = useAsistenciaPupilo(pupiloId);
  const { data: pagos = [] } = usePagosPupilo(pupiloId);

  const promedio = useMemo(() => promedioSimple(notas.filter((n) => n.estado_nota === 'calificada' && n.nota != null).map((n) => n.nota)), [notas]);
  const ultimaNota = notas[0]; // ya viene sorted desc

  const pctAsist = useMemo(() => {
    if (!asist) return null;
    const all = [...(asist.legacy || []), ...(asist.clases || [])];
    if (all.length === 0) return null;
    const presentes = all.filter((a) => {
      const e = (a.estado || '').toLowerCase();
      return e === 'presente' || e === 'tardanza' || e === 'justificado';
    }).length;
    return Math.round((presentes / all.length) * 100);
  }, [asist]);

  const pagosVencidos = pagos.filter((p) => p.estado === 'vencido').length;
  const proximoPago = pagos.find((p) => p.estado === 'pendiente' && p.fecha_vencimiento);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Asistencia</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-bold tabular-nums">{pctAsist === null ? '—' : pctAsist + '%'}</p>
            {pctAsist !== null && pctAsist < 75 && (
              <p className="text-xs text-destructive mt-1">Bajo el umbral</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promedio</CardTitle>
            <ClipboardList className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            {promedio === null
              ? <p className="text-3xl font-mono text-muted-foreground">—</p>
              : <BadgeNota nota={promedio} size="lg" />}
            <p className="text-xs text-muted-foreground mt-1">{notas.length} notas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Última nota</CardTitle>
            <Sparkles className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {ultimaNota
              ? <>
                  <BadgeNota nota={ultimaNota.nota} size="md" />
                  <p className="text-xs text-muted-foreground mt-1 truncate">{ultimaNota.titulo}</p>
                </>
              : <p className="text-3xl font-mono text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card className={pagosVencidos > 0 ? 'border-destructive/30' : ''}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagos</CardTitle>
            <CreditCard className={pagosVencidos > 0 ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-muted-foreground'} />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-mono font-bold tabular-nums ${pagosVencidos > 0 ? 'text-destructive' : ''}`}>
              {pagosVencidos}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pagosVencidos > 0 ? 'vencidos' : 'al día'}
            </p>
          </CardContent>
        </Card>
      </div>

      {pagosVencidos > 0 && (
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm flex-1">
              <strong>{pagosVencidos}</strong> cuota{pagosVencidos > 1 ? 's' : ''} vencida{pagosVencidos > 1 ? 's' : ''} para {pupiloName}. Acércate a secretaría para regularizar.
            </p>
          </CardContent>
        </Card>
      )}

      {proximoPago && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximo pago</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium">{proximoPago.concepto} {proximoPago.periodo && `· ${proximoPago.periodo}`}</p>
              <p className="text-sm text-muted-foreground">Vence: {formatFecha(proximoPago.fecha_vencimiento)}</p>
            </div>
            <p className="font-mono text-xl font-bold tabular-nums">{formatCLP(proximoPago.monto)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const AsistenciaPupilo = ({ pupiloId }) => {
  const { data: asist, isLoading } = useAsistenciaPupilo(pupiloId);
  const items = useMemo(() => {
    if (!asist) return [];
    const flat = [
      ...(asist.legacy || []).map((a) => ({ id: 'l_' + a.id, fecha: a.fecha, estado: a.estado, curso: '' })),
      ...(asist.clases || []).map((a) => ({
        id: 'c_' + a.id,
        fecha: a.expand?.clase_vivo_id?.fecha,
        estado: a.estado,
        curso: a.expand?.clase_vivo_id?.expand?.seccion_id?.nombre || '',
      })),
    ];
    return flat.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
  }, [asist]);

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }
  if (items.length === 0) {
    return <EmptyState icon={Calendar} title="Sin registros de asistencia" description="Aparecerán acá una vez que los profesores empiecen a pasar lista." />;
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {items.map((a) => {
          const e = (a.estado || '').toLowerCase();
          const cfg = e === 'presente' ? { Icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Presente' }
            : e === 'ausente' ? { Icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Ausente' }
            : e === 'justificado' ? { Icon: FileText, color: 'text-info', bg: 'bg-info/10', label: 'Justificado' }
            : e === 'tardanza' ? { Icon: Calendar, color: 'text-warning-foreground', bg: 'bg-warning/10', label: 'Tardanza' }
            : { Icon: Calendar, color: 'text-muted-foreground', bg: 'bg-muted', label: a.estado };
          return (
            <div key={a.id} className="flex items-center gap-3 p-4">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${cfg.bg}`}>
                <cfg.Icon className={`h-4 w-4 ${cfg.color}`} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{a.fecha ? formatFecha(a.fecha) : '—'}</p>
                {a.curso && <p className="text-xs text-muted-foreground truncate">{a.curso}</p>}
              </div>
              <Badge variant="secondary" className={cfg.bg + ' ' + cfg.color}>{cfg.label}</Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const PagosPupilo = ({ pupiloId }) => {
  const { data: pagos = [], isLoading } = usePagosPupilo(pupiloId);
  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }
  if (pagos.length === 0) {
    return <EmptyState icon={CreditCard} title="Sin pagos cargados" description="Cuando matriculen al alumno se generarán las cuotas automáticamente." />;
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {pagos.map((p) => {
          const tone = p.estado === 'vencido' ? 'bg-destructive/10 text-destructive'
            : p.estado === 'pagado' ? 'bg-success/10 text-success'
            : p.estado === 'pendiente' ? 'bg-muted text-muted-foreground'
            : 'bg-info/10 text-info';
          return (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm capitalize">{p.concepto} {p.periodo && <span className="text-muted-foreground font-mono text-xs ml-1">{p.periodo}</span>}</p>
                <p className="text-xs text-muted-foreground">Vence: {formatFecha(p.fecha_vencimiento)}{p.fecha_pago && ` · Pagado ${formatFecha(p.fecha_pago)}`}</p>
              </div>
              <p className="font-mono font-bold tabular-nums">{formatCLP(p.monto)}</p>
              <Badge variant="secondary" className={tone}>{p.estado}</Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ApoderadoDashboard;
