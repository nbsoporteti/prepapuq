import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Star, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import pb from '@/lib/pocketbaseClient';
import { LOGROS } from '@/lib/gamificacion';

const useGamificacion = (userId) =>
  useQuery({
    queryKey: ['gamificacion', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        return await pb
          .collection('progreso_gamificacion')
          .getFirstListItem(`user_id = "${userId}"`, { $autoCancel: false });
      } catch (_e) {
        return null; // sin actividad aún o colección sin migrar
      }
    },
  });

const RachaCard = ({ userId }) => {
  const { data: g } = useGamificacion(userId);
  if (!g) return null; // no mostramos nada hasta que haya actividad

  const puntos = g.puntos || 0;
  const racha = g.racha_actual || 0;
  const logros = Array.isArray(g.logros) ? g.logros : [];
  const proximo = LOGROS.find((l) => !logros.includes(l.id));

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/10 via-card to-primary/5">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2.5">
            <Flame className="h-7 w-7 text-accent" />
            <div>
              <p className="font-mono text-2xl font-bold leading-none tabular-nums">{racha}</p>
              <p className="text-xs text-muted-foreground">{racha === 1 ? 'día de racha' : 'días de racha'}</p>
            </div>
          </div>

          <div className="hidden h-9 w-px bg-border sm:block" />

          <div className="flex items-center gap-2.5">
            <Star className="h-6 w-6 text-primary" />
            <div>
              <p className="font-mono text-2xl font-bold leading-none tabular-nums">{puntos}</p>
              <p className="text-xs text-muted-foreground">puntos</p>
            </div>
          </div>

          {logros.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Trophy className="h-4 w-4 text-accent" />
              {logros.length} {logros.length === 1 ? 'logro' : 'logros'}
            </div>
          )}
        </div>

        {proximo && (
          <p className="mt-3 text-xs text-muted-foreground">
            Próximo logro: <span className="font-medium text-foreground">{proximo.label}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RachaCard;
