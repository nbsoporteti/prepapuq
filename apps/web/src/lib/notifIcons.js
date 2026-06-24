import {
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  MessageCircle,
  Sparkles,
  Video,
  XCircle,
} from 'lucide-react';

/**
 * Mapa tipo de notificación → icono + color de tinte.
 * Los tipos coinciden con los valores del campo `tipo` en la colección
 * notificaciones (ver migración 1780617880).
 */
export const NOTIF_META = {
  tarea_calificada: { icon: GraduationCap, color: 'text-success', bg: 'bg-success/10' },
  tarea_devuelta: { icon: FileText, color: 'text-warning-foreground', bg: 'bg-warning/10' },
  nota_publicada: { icon: GraduationCap, color: 'text-primary', bg: 'bg-primary/10' },
  evaluacion_anulada: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  clase_proxima: { icon: Video, color: 'text-info', bg: 'bg-info/10' },
  clase_reagendada: { icon: Video, color: 'text-warning-foreground', bg: 'bg-warning/10' },
  clase_cancelada: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  grabacion_disponible: { icon: Video, color: 'text-info', bg: 'bg-info/10' },
  anuncio_nuevo: { icon: Sparkles, color: 'text-accent', bg: 'bg-accent/15' },
  anuncio_importante: { icon: Sparkles, color: 'text-accent', bg: 'bg-accent/15' },
  mensaje_nuevo: { icon: MessageCircle, color: 'text-secondary', bg: 'bg-secondary/10' },
  mensaje_admin: { icon: MessageCircle, color: 'text-info', bg: 'bg-info/10' },
  cuota_proxima: { icon: CreditCard, color: 'text-muted-foreground', bg: 'bg-muted' },
  cuota_vencida: { icon: CreditCard, color: 'text-destructive', bg: 'bg-destructive/10' },
  pago_registrado: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  justificacion_aprobada: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  justificacion_rechazada: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  inasistencias_seguidas: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  alerta_75pct: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  matricula_confirmada: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  matricula_pendiente: { icon: ClipboardList, color: 'text-warning-foreground', bg: 'bg-warning/10' },
  solicitud_revision_resuelta: { icon: ClipboardList, color: 'text-info', bg: 'bg-info/10' },
};

export const getNotifMeta = (tipo) => NOTIF_META[tipo] || { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' };

export const formatNotifFecha = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const ahora = new Date();
    const diffMs = ahora.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d`;
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  } catch (_e) {
    return '';
  }
};
