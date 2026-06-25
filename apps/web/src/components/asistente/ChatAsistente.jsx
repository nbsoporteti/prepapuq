import React, { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

// Asistente de ayuda técnica con IA (Claude). Widget flotante para usuarios
// logueados. Manda la conversación a POST /api/asistente (hook de PocketBase),
// que es quien tiene la API key de Anthropic — acá nunca toca la clave.

const ERROR_MSGS = {
  no_configurado:
    'El asistente todavía no está activado. Pedile al administrador que configure la clave de IA en el servidor.',
  default: 'Uy, no pude responder en este momento. Probá de nuevo en un ratito.',
};

const ChatAsistente = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // turnos reales {role, content}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!isAuthenticated) return null;

  const enviar = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await pb.send('/api/asistente', { method: 'POST', body: { messages: next } });
      const reply = (res && res.reply) || ERROR_MSGS.default;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const code = err?.data?.error || err?.response?.error;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: ERROR_MSGS[code] || ERROR_MSGS.default, _error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  // ---- Botón flotante ----
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente de ayuda"
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  // ---- Panel de chat ----
  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[560px] max-h-[calc(100vh-3rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b bg-primary px-4 py-3 text-primary-foreground">
        <Bot className="h-5 w-5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Asistente PrePa</p>
          <p className="text-xs leading-tight text-primary-foreground/80">Ayuda con la plataforma</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar asistente"
          className="rounded-md p-1 transition-colors hover:bg-white/15"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
            ¡Hola! Soy el asistente de PrePa. Preguntame cómo hacer algo en la plataforma
            (importar un ensayo, cargar notas, ver tus cursos, etc.) y te guío paso a paso.
          </div>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'items-start gap-2'}`}>
            {m.role === 'assistant' && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
            )}
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-tr-sm bg-primary text-primary-foreground'
                  : `rounded-tl-sm ${m._error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pensando…
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Escribí tu pregunta…"
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={!input.trim() || loading}
            aria-label="Enviar"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Asistente con IA · puede equivocarse, verificá lo importante.
        </p>
      </div>
    </div>
  );
};

export default ChatAsistente;
