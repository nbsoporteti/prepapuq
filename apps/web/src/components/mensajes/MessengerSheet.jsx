import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Plus, Send } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import NuevoMensajeDialog from './NuevoMensajeDialog.jsx';
import { useMessenger, useMensajesThread } from '@/hooks/useMessenger.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { cn } from '@/lib/utils';

const formatHora = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch (_e) { return ''; }
};
const formatRelativo = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  } catch (_e) { return ''; }
};

/**
 * Sheet lateral de mensajería estilo Slack:
 * - Lista de threads a la izq (mobile: cambia entre lista y chat)
 * - Chat panel a la der
 * - Si URL trae ?thread=xxx, abre ese thread directamente
 */
const MessengerSheet = ({ open, onOpenChange }) => {
  const { currentUser } = useAuth();
  const [params] = useSearchParams();
  const initialThread = params.get('thread');

  const { threads, isLoading, markThreadRead } = useMessenger(currentUser?.id);
  const [threadId, setThreadId] = useState(initialThread || '');
  const [showNuevo, setShowNuevo] = useState(false);

  // Si abren la sheet con ?thread=xxx, autoseleccionar
  useEffect(() => {
    if (open && initialThread && !threadId) {
      setThreadId(initialThread);
    }
  }, [open, initialThread, threadId]);

  const handleSelect = (tid) => {
    setThreadId(tid);
    markThreadRead.mutate(tid);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-secondary" />
                Mensajes
              </SheetTitle>
              <Button size="sm" onClick={() => setShowNuevo(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nuevo
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Lista de threads */}
            <aside className={cn(
              'md:col-span-5 border-r overflow-hidden flex flex-col',
              threadId && 'hidden md:flex',
            )}>
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : threads.length === 0 ? (
                  <EmptyState
                    icon={MessageCircle}
                    title="Sin conversaciones"
                    description='Tocá "Nuevo" para empezar tu primer mensaje.'
                    className="border-0 shadow-none bg-transparent"
                  />
                ) : (
                  <ul className="divide-y">
                    {threads.map((t) => <ThreadItem key={t.id} thread={t} active={threadId === t.id} onClick={() => handleSelect(t.id)} userId={currentUser.id} />)}
                  </ul>
                )}
              </ScrollArea>
            </aside>

            {/* Chat panel */}
            <section className={cn(
              'md:col-span-7 flex flex-col overflow-hidden',
              !threadId && 'hidden md:flex',
            )}>
              {threadId ? (
                <ChatPanel
                  threadId={threadId}
                  userId={currentUser.id}
                  onBack={() => setThreadId('')}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                  <div>
                    <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Elegí una conversación</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <NuevoMensajeDialog
        open={showNuevo}
        onOpenChange={setShowNuevo}
        onCreated={(t) => setThreadId(t.id)}
      />
    </>
  );
};

const ThreadItem = ({ thread, active, onClick, userId }) => {
  const otros = (thread.expand?.participantes_ids || []).filter((u) => u && u.id !== userId);
  const noLeidos = (() => {
    try {
      const raw = thread.mensajes_no_leidos_por_user;
      const obj = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
      return obj[userId] || 0;
    } catch (_e) { return 0; }
  })();
  const titulo = otros.length > 0 ? otros.map((o) => o.name || o.email).join(', ') : 'Conversación';

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left p-3 hover:bg-muted/40 transition-colors flex gap-2',
          active && 'bg-primary/10',
        )}
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
          {(otros[0]?.name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('text-sm font-medium truncate', noLeidos > 0 && 'font-bold')}>{titulo}</p>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {formatRelativo(thread.ultima_actividad)}
            </span>
          </div>
          {thread.asunto && (
            <p className="text-xs text-muted-foreground truncate">{thread.asunto}</p>
          )}
        </div>
        {noLeidos > 0 && (
          <span className="inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold shrink-0">
            {noLeidos}
          </span>
        )}
      </button>
    </li>
  );
};

const ChatPanel = ({ threadId, userId, onBack }) => {
  const { data: mensajes = [], isLoading } = useMensajesThread(threadId);
  const { sendMessage } = useMessenger(userId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes.length]);

  const enviar = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage.mutate({ threadId, contenido: draft.trim() });
    setDraft('');
  };

  return (
    <>
      <header className="border-b p-3 flex items-center gap-2">
        <Button size="icon" variant="ghost" className="h-8 w-8 md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-sm">Conversación</h3>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-2/3" />)}</div>
        ) : mensajes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Sin mensajes todavía.</p>
        ) : (
          mensajes.map((m) => <MessageBubble key={m.id} mensaje={m} isMe={m.autor_id === userId} />)
        )}
      </div>
      <form onSubmit={enviar} className="border-t p-3 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribí tu mensaje..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || sendMessage.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
};

const MessageBubble = ({ mensaje, isMe }) => (
  <div className={cn('flex', isMe && 'justify-end')}>
    <div className={cn(
      'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
      isMe
        ? 'bg-primary text-primary-foreground rounded-br-sm'
        : 'bg-muted text-foreground rounded-bl-sm',
    )}>
      {!isMe && mensaje.expand?.autor_id?.name && (
        <p className="text-[10px] font-semibold opacity-80 mb-0.5">{mensaje.expand.autor_id.name}</p>
      )}
      <p className="whitespace-pre-wrap break-words">{mensaje.contenido}</p>
      <p className={cn('text-[10px] mt-0.5', isMe ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
        {formatHora(mensaje.created)}
      </p>
    </div>
  </div>
);

export default MessengerSheet;
