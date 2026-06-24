import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import pb from '@/lib/pocketbaseClient';

/**
 * Hook de notificaciones: polling 30s a la colección notificaciones del
 * usuario actual. Devuelve { items, unreadCount, markRead, markAllRead }.
 */
export const useNotificaciones = (userId) => {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notif', 'user', userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    queryFn: async () => {
      const r = await pb.collection('notificaciones').getList(1, 50, {
        filter: `user_id = "${userId}"`,
        sort: '-created',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const unreadCount = items.filter((n) => !n.leida).length;

  const markRead = useMutation({
    mutationFn: async (id) => pb.collection('notificaciones').update(id, {
      leida: true,
      fecha_leida: new Date().toISOString(),
    }, { $autoCancel: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif', 'user', userId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const pendientes = items.filter((n) => !n.leida);
      await Promise.all(pendientes.map((n) =>
        pb.collection('notificaciones').update(n.id, {
          leida: true,
          fecha_leida: new Date().toISOString(),
        }, { $autoCancel: false }),
      ));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif', 'user', userId] }),
  });

  return { items, unreadCount, isLoading, markRead, markAllRead };
};
