import React from 'react';
import { Pin, Megaphone, Calendar, AlertTriangle, Heart, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CATEGORIA_META = {
  general: { Icon: Megaphone, color: 'text-secondary', bg: 'bg-secondary/10' },
  academica: { Icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
  evento: { Icon: Calendar, color: 'text-info', bg: 'bg-info/10' },
  advertencia: { Icon: AlertTriangle, color: 'text-warning-foreground', bg: 'bg-warning/15' },
  felicitacion: { Icon: Heart, color: 'text-success', bg: 'bg-success/10' },
  feriado: { Icon: Info, color: 'text-muted-foreground', bg: 'bg-muted' },
};

const formatFecha = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (_e) { return iso; }
};

const AnuncioCard = ({ anuncio, compact = false }) => {
  if (!anuncio) return null;
  const meta = CATEGORIA_META[anuncio.categoria] || CATEGORIA_META.general;
  const Icon = meta.Icon;

  return (
    <Card className={cn(
      'transition-shadow duration-base hover:shadow-md',
      anuncio.pinned && 'border-primary/30 ring-1 ring-primary/10',
      anuncio.importante && 'border-accent/40',
    )}>
      <CardContent className={cn('flex gap-3', compact ? 'p-3' : 'p-5')}>
        <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0', meta.bg)}>
          <Icon className={cn('h-4 w-4', meta.color)} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold leading-snug">{anuncio.titulo}</h3>
            {anuncio.pinned && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary">
                <Pin className="h-2.5 w-2.5 mr-1" />Fijado
              </Badge>
            )}
            {anuncio.importante && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-accent/15 text-accent">
                Importante
              </Badge>
            )}
          </div>
          {anuncio.contenido_html && !compact && (
            <div
              className="prose prose-sm max-w-none text-foreground/90 mt-2"
              dangerouslySetInnerHTML={{ __html: anuncio.contenido_html }}
            />
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {formatFecha(anuncio.publicado_at || anuncio.created)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnuncioCard;
