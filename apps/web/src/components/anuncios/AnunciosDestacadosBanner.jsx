import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import pb from '@/lib/pocketbaseClient';

/**
 * Banner que aparece en los dashboards mostrando los anuncios "pinned"
 * activos. Usuario puede pasar entre ellos con flechas, dismiss los
 * descarta para esta sesión.
 *
 * Recibe `seccionIds` opcional para filtrar solo los relevantes.
 */
const AnunciosDestacadosBanner = ({ seccionIds = [], cursoIds = [] }) => {
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('prepa:anuncios_dismissed') || '[]'); }
    catch (_e) { return []; }
  });
  const [idx, setIdx] = useState(0);

  const { data: anuncios = [] } = useQuery({
    queryKey: ['anuncios', 'destacados', seccionIds.join(','), cursoIds.join(',')],
    staleTime: 60_000,
    queryFn: async () => {
      const filters = ['pinned = true'];

      // Scope institucional siempre se ve
      const scopeFilters = ['scope = "institucional"'];
      if (seccionIds.length > 0) {
        scopeFilters.push(`(scope = "seccion" && (${seccionIds.map((id) => `seccion_id = "${id}"`).join(' || ')}))`);
      }
      if (cursoIds.length > 0) {
        scopeFilters.push(`(scope = "curso" && (${cursoIds.map((id) => `curso_id = "${id}"`).join(' || ')}))`);
      }
      filters.push(`(${scopeFilters.join(' || ')})`);

      const r = await pb.collection('anuncios').getList(1, 10, {
        filter: filters.join(' && '),
        sort: '-publicado_at',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const visibles = anuncios.filter((a) => !dismissedIds.includes(a.id));
  if (visibles.length === 0) return null;

  const actual = visibles[Math.min(idx, visibles.length - 1)];

  const dismiss = () => {
    const next = [...dismissedIds, actual.id];
    setDismissedIds(next);
    try { sessionStorage.setItem('prepa:anuncios_dismissed', JSON.stringify(next)); } catch (_e) {}
    setIdx(0);
  };

  return (
    <div className={cn(
      'rounded-2xl border bg-gradient-to-r from-primary/5 via-card to-secondary/5 p-4 md:p-5',
      actual.importante && 'border-accent/40 from-accent/5 to-card',
    )}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <Megaphone className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
              Destacado
            </Badge>
            {actual.importante && (
              <Badge variant="secondary" className="text-[10px] bg-accent/15 text-accent border-0">
                Importante
              </Badge>
            )}
          </div>
          <h3 className="font-semibold mt-1.5">{actual.titulo}</h3>
          {actual.contenido_html && (
            <div
              className="prose prose-sm max-w-none text-foreground/80 mt-1 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: actual.contenido_html }}
            />
          )}
          <div className="flex items-center justify-between mt-3">
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to={`/anuncios/${actual.id}`}>Ver detalle →</Link>
            </Button>
            {visibles.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="font-mono">{idx + 1} / {visibles.length}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIdx((i) => Math.min(visibles.length - 1, i + 1))} disabled={idx >= visibles.length - 1}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={dismiss} title="Descartar (volverá en otra sesión)">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default AnunciosDestacadosBanner;
