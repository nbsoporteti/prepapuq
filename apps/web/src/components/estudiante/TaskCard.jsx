import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import BadgeNota from '@/components/shared/BadgeNota.jsx';

const formatFecha = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }); } catch (_e) { return iso; }
};

const horasRestantes = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms / (1000 * 60 * 60);
};

/**
 * Card de tarea desde la vista del alumno. Variantes según estado:
 *  - pendiente / atrasada: countdown urgente
 *  - entregada: en revisión
 *  - calificada: muestra nota destacada
 */
const TaskCard = ({ tarea, entrega }) => {
  const horas = horasRestantes(tarea.fecha_limite);
  const venceHoy = horas !== null && horas >= 0 && horas <= 24;
  const atrasada = horas !== null && horas < 0 && (!entrega || entrega.estado === 'en_progreso');

  const estado = entrega?.estado || (atrasada ? 'no_entregada' : 'pendiente');

  return (
    <Link to={`/dashboard/estudiante/tarea/${tarea.id}`} className="group block">
      <Card className={cn(
        'h-full hover:shadow-md transition-shadow duration-base',
        atrasada && 'border-destructive/40',
        venceHoy && !atrasada && 'border-warning/40',
      )}>
        <CardContent className="p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <FileText className="h-4 w-4 text-secondary mb-1.5" />
              <h3 className="font-semibold leading-snug line-clamp-2">{tarea.titulo}</h3>
            </div>
            {entrega?.calificacion?.nota_1_a_7 !== undefined && (
              <BadgeNota nota={entrega.calificacion.nota_1_a_7} size="md" />
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatFecha(tarea.fecha_limite)}
            </span>
            {horas !== null && horas >= 0 && horas <= 48 && (
              <span className={cn(
                'flex items-center gap-1 font-medium',
                venceHoy ? 'text-warning-foreground' : 'text-foreground/70',
              )}>
                <Clock className="h-3 w-3" />
                {horas < 1
                  ? `${Math.round(horas * 60)} min`
                  : `${Math.floor(horas)}h`} restantes
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t mt-auto">
            <EstadoBadge estado={estado} atrasada={atrasada} />
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const EstadoBadge = ({ estado, atrasada }) => {
  const map = {
    pendiente: { label: atrasada ? 'Atrasada' : 'Pendiente', cls: atrasada ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground' },
    en_progreso: { label: 'En borrador', cls: 'bg-warning/10 text-warning-foreground' },
    entregada: { label: 'Entregada', cls: 'bg-info/10 text-info' },
    calificada: { label: 'Calificada', cls: 'bg-success/10 text-success' },
    atrasada: { label: 'Atrasada', cls: 'bg-destructive/10 text-destructive' },
    no_entregada: { label: 'No entregada', cls: 'bg-destructive/10 text-destructive' },
    devuelta_correccion: { label: 'Para corregir', cls: 'bg-warning/10 text-warning-foreground' },
  };
  const e = map[estado] || map.pendiente;
  return <Badge variant="secondary" className={cn('text-xs font-medium', e.cls)}>{e.label}</Badge>;
};

export default TaskCard;
