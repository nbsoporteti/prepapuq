import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  UserX,
  CreditCard,
  Sparkles,
  FileUp,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import pb from '@/lib/pocketbaseClient';

// Conteo resiliente: si la colección no existe (backend sin redeploy) o falla,
// devuelve null y la tarjeta muestra "—" en vez de romper el panel.
const countOf = async (collection, filter) => {
  try {
    const opts = { $autoCancel: false };
    if (filter) opts.filter = filter;
    const r = await pb.collection(collection).getList(1, 1, opts);
    return r.totalItems;
  } catch (_e) {
    return null;
  }
};

const MetricCard = ({ icon: Icon, label, value, hint, tone = 'primary', isLoading }) => {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    orange: 'bg-orange-100 text-orange-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-destructive/10 text-destructive',
    slate: 'bg-slate-100 text-slate-700',
  }[tone] || 'bg-primary/10 text-primary';

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${toneClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          {isLoading ? (
            <Skeleton className="h-7 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-bold tabular-nums leading-tight">
              {value === null || value === undefined ? <span className="text-muted-foreground">—</span> : value}
            </p>
          )}
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          {hint && <p className="text-[11px] text-muted-foreground/70 truncate">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

const AdminOverviewTab = () => {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-overview'],
    staleTime: 60_000,
    queryFn: async () => {
      const [
        estudiantes,
        apoderados,
        profesores,
        administrativos,
        inactivos,
        cursos,
        simulacros,
        pagosPendientes,
        leads,
      ] = await Promise.all([
        countOf('users', "roles ~ 'estudiante'"),
        countOf('users', "roles ~ 'apoderado'"),
        countOf('users', "roles ~ 'profesor'"),
        countOf('users', "roles ~ 'administrativo'"),
        countOf('users', 'activo = false'),
        countOf('cursos'),
        countOf('simulacros_paes'),
        countOf('pagos', "estado = 'pendiente'"),
        countOf('leads'),
      ]);
      return { estudiantes, apoderados, profesores, administrativos, inactivos, cursos, simulacros, pagosPendientes, leads };
    },
  });

  const d = data || {};

  const metrics = [
    { icon: GraduationCap, label: 'Estudiantes', value: d.estudiantes, tone: 'primary' },
    { icon: Users, label: 'Apoderados', value: d.apoderados, tone: 'secondary' },
    { icon: BookOpen, label: 'Profesores', value: d.profesores, tone: 'orange' },
    { icon: ClipboardList, label: 'Administrativos', value: d.administrativos, tone: 'slate' },
    { icon: BookOpen, label: 'Cursos', value: d.cursos, tone: 'green' },
    { icon: GraduationCap, label: 'Simulacros PAES', value: d.simulacros, tone: 'primary', hint: 'Requiere backend al día' },
    { icon: CreditCard, label: 'Pagos pendientes', value: d.pagosPendientes, tone: 'red', hint: 'Estado “pendiente”' },
    { icon: Sparkles, label: 'Leads', value: d.leads, tone: 'orange', hint: 'Formularios de contacto' },
    { icon: UserX, label: 'Cuentas inactivas', value: d.inactivos, tone: 'red' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Resumen general</h3>
          <p className="text-sm text-muted-foreground">Una mirada rápida al estado de la plataforma.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} isLoading={isLoading} />
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-medium">¿Necesitás cargar un ensayo PAES?</p>
            <p className="text-sm text-muted-foreground">
              Pegá las preguntas y el sistema arma la clave y la autocorrección solo.
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/admin/paes">
              <FileUp className="h-4 w-4 mr-2" />
              Nuevo ensayo
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Algunas métricas (simulacros, pagos, leads) muestran “—” si el backend todavía no corrió las
        migraciones correspondientes. Tras el redeploy aparecen los valores reales.
      </p>
    </div>
  );
};

export default AdminOverviewTab;
