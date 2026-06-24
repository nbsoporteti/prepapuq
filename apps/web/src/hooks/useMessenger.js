import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import pb from '@/lib/pocketbaseClient';

/**
 * Hook de mensajería. Trae threads donde participa el usuario actual,
 * cuenta no-leídas globales (suma de mensajes_no_leidos_por_user[uid]),
 * y expone sendMessage + markThreadRead.
 */
export const useMessenger = (userId) => {
  const qc = useQueryClient();

  const threadsQuery = useQuery({
    queryKey: ['messenger', 'threads', userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    staleTime: 15_000,
    queryFn: async () => {
      const r = await pb.collection('threads_mensajes').getList(1, 50, {
        filter: `participantes_ids ~ "${userId}"`,
        expand: 'participantes_ids',
        sort: '-ultima_actividad',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const threads = threadsQuery.data || [];

  const unreadTotal = threads.reduce((acc, t) => {
    try {
      const raw = t.mensajes_no_leidos_por_user;
      const obj = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
      return acc + (obj[userId] || 0);
    } catch (_e) { return acc; }
  }, 0);

  const sendMessage = useMutation({
    mutationFn: async ({ threadId, contenido }) => {
      return pb.collection('mensajes_internos').create({
        thread_id: threadId,
        autor_id: userId,
        contenido,
      }, { $autoCancel: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messenger'] });
    },
  });

  const markThreadRead = useMutation({
    mutationFn: async (threadId) => {
      const thread = await pb.collection('threads_mensajes').getOne(threadId, { $autoCancel: false });
      let noLeidos = {};
      try {
        const raw = thread.mensajes_no_leidos_por_user;
        noLeidos = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
      } catch (_e) {}
      if (noLeidos[userId]) {
        noLeidos[userId] = 0;
        await pb.collection('threads_mensajes').update(threadId, { mensajes_no_leidos_por_user: noLeidos }, { $autoCancel: false });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messenger', 'threads', userId] }),
  });

  const startThread = useMutation({
    mutationFn: async ({ destinatarioId, primerMensaje, asunto }) => {
      // Verificar si ya existe thread entre los dos
      try {
        const existing = await pb.collection('threads_mensajes').getList(1, 5, {
          filter: `participantes_ids ~ "${userId}" && participantes_ids ~ "${destinatarioId}"`,
          $autoCancel: false,
        });
        for (const t of existing.items) {
          const parr = Array.isArray(t.participantes_ids) ? t.participantes_ids : [];
          if (parr.length === 2 && parr.includes(userId) && parr.includes(destinatarioId)) {
            // Reusar
            await pb.collection('mensajes_internos').create({
              thread_id: t.id,
              autor_id: userId,
              contenido: primerMensaje,
            }, { $autoCancel: false });
            return t;
          }
        }
      } catch (_e) {}

      // Crear thread nuevo
      const t = await pb.collection('threads_mensajes').create({
        participantes_ids: [userId, destinatarioId],
        asunto: asunto || '',
        ultima_actividad: new Date().toISOString(),
      }, { $autoCancel: false });
      await pb.collection('mensajes_internos').create({
        thread_id: t.id,
        autor_id: userId,
        contenido: primerMensaje,
      }, { $autoCancel: false });
      return t;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messenger'] }),
  });

  return {
    threads,
    isLoading: threadsQuery.isLoading,
    unreadTotal,
    sendMessage,
    markThreadRead,
    startThread,
  };
};

export const useMensajesThread = (threadId) => useQuery({
  queryKey: ['messenger', 'mensajes', threadId],
  enabled: !!threadId,
  refetchInterval: 15_000,
  staleTime: 5_000,
  queryFn: async () => {
    const r = await pb.collection('mensajes_internos').getList(1, 200, {
      filter: `thread_id = "${threadId}"`,
      expand: 'autor_id',
      sort: '+created',
      $autoCancel: false,
    });
    return r.items;
  },
});
