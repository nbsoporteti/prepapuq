import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Lock, Medal, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        return null;
      }
    },
  });

const useRanking = () =>
  useQuery({
    queryKey: ['ranking'],
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const r = await pb.send('/api/ranking', { method: 'GET' });
        return r?.ranking || [];
      } catch (_e) {
        return [];
      }
    },
  });

const LogrosRanking = ({ userId }) => {
  const { data: g } = useGamificacion(userId);
  const { data: ranking = [] } = useRanking();

  if (!g) return null; // aparece cuando el alumno ya tiene actividad

  const desbloqueados = new Set(Array.isArray(g.logros) ? g.logros : []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-accent" />
            Logros ({desbloqueados.size}/{LOGROS.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LOGROS.map((l) => {
              const on = desbloqueados.has(l.id);
              return (
                <div
                  key={l.id}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${
                    on ? 'border-accent/40 bg-accent/10 text-foreground' : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {on ? <Medal className="h-4 w-4 shrink-0 text-accent" /> : <Lock className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{l.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-primary" />
            Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ranking. Sumá puntos para aparecer.</p>
          ) : (
            <ol className="space-y-1">
              {ranking.map((r, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${r.esYo ? 'bg-primary/10 font-medium' : ''}`}
                >
                  <span className="w-5 text-center font-mono text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {r.nombre}
                    {r.esYo ? ' (vos)' : ''}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{r.puntos} pts</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogrosRanking;
