import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CreditCard, FileText, TrendingUp, UserPlus, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const Stat = ({ icon: Icon, label, value, hint, accent, isLoading, urgent }) => (
  <Card className={urgent ? 'border-destructive/30' : ''}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className={`h-4 w-4 ${accent || 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <p className={`text-3xl font-mono font-bold tabular-nums ${urgent ? 'text-destructive' : ''}`}>{value}</p>
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const AdmVistaDia = ({ overview, isLoading }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon={Users}
          label="Alumnos activos"
          value={overview?.alumnosActivos || 0}
          hint="Con matrícula vigente"
          accent="text-primary"
          isLoading={isLoading}
        />
        <Stat
          icon={CreditCard}
          label="Pagos vencidos"
          value={overview?.pagosVencidos || 0}
          urgent={(overview?.pagosVencidos || 0) > 0}
          hint="Requieren contacto"
          accent="text-destructive"
          isLoading={isLoading}
        />
        <Stat
          icon={FileText}
          label="Justificaciones"
          value={overview?.justificacionesPendientes || 0}
          hint="Pendientes de revisar"
          accent="text-warning-foreground"
          isLoading={isLoading}
        />
        <Stat
          icon={UserPlus}
          label="Matrículas en curso"
          value={overview?.matriculasPreInscritas || 0}
          hint="Pre-inscritos"
          accent="text-info"
          isLoading={isLoading}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-gradient-to-br from-success/5 to-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Ingresos de los últimos 30 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-1/2" />
            ) : (
              <p className="text-4xl font-mono font-bold tabular-nums text-success">
                {formatCLP(overview?.ingresosUltimoMes)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Suma de pagos en estado "pagado" en los últimos 30 días.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atajos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <ShortcutLink to="/dashboard/administrativo?tab=matriculas" label="Matricular alumno" icon={UserPlus} />
              <ShortcutLink to="/dashboard/administrativo?tab=pagos" label="Registrar pago" icon={CreditCard} />
              <ShortcutLink to="/dashboard/administrativo?tab=justificaciones" label="Revisar justificaciones" icon={FileText} />
              <ShortcutLink to="/dashboard/administrativo?tab=reportes" label="Exportar reportes" icon={TrendingUp} />
            </ul>
          </CardContent>
        </Card>
      </div>

      {(overview?.pagosVencidos || 0) > 0 && (
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm flex-1">
              <strong>{overview.pagosVencidos}</strong> pagos están vencidos. Conviene hacer contacto.
            </p>
            <Link
              to="/dashboard/administrativo?tab=pagos"
              className="text-sm font-medium text-destructive hover:underline flex items-center gap-1"
            >
              Ir a pagos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ShortcutLink = ({ to, label, icon: Icon }) => (
  <li>
    <Link to={to} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors group">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
    </Link>
  </li>
);

export default AdmVistaDia;
