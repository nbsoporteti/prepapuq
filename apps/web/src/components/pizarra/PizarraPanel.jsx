import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Pencil,
  Eraser,
  Undo2,
  Trash2,
  PenLine,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { usePizarra } from '@/contexts/PizarraContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

const COLORS = [
  { name: 'Tinta', value: '#1f2937' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Ámbar', value: '#f59e0b' },
  { name: 'Morado', value: '#8b5cf6' },
];

// Resolución interna del lienzo (independiente del tamaño en pantalla, para que
// el dibujo guardado sea estable al re-escalar el panel).
const CANVAS_W = 720;
const CANVAS_H = 940;
const UNDO_LIMIT = 25;

const PizarraPanel = () => {
  const { open, setOpen } = usePizarra();
  const { currentUser } = useAuth();
  const uid = currentUser?.id || 'anon';

  const drawKey = `prepa:pizarra:draw:${uid}`;
  const notesKey = `prepa:pizarra:notes:${uid}`;

  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const undoRef = useRef([]);

  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(4);
  const [canUndo, setCanUndo] = useState(false);
  const [notes, setNotes] = useState('');

  // Mantener el color/grosor actuales accesibles en los handlers de puntero.
  const styleRef = useRef({ tool, color, size });
  styleRef.current = { tool, color, size };

  // --- Inicialización: contexto, fondo y carga desde localStorage ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
    undoRef.current = [];
    setCanUndo(false);

    // Fondo blanco (el borrador pinta blanco encima).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      const saved = localStorage.getItem(drawKey);
      if (saved) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = saved;
      }
    } catch (_e) {
      /* localStorage no disponible */
    }

    try {
      setNotes(localStorage.getItem(notesKey) || '');
    } catch (_e) {
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // --- Cerrar con Escape + foco al abrir -----------------------------------
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  // --- Helpers de dibujo ----------------------------------------------------
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const pushUndo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx) return;
    try {
      undoRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoRef.current.length > UNDO_LIMIT) undoRef.current.shift();
      setCanUndo(true);
    } catch (_e) {
      /* ignore */
    }
  };

  const saveDrawing = () => {
    try {
      localStorage.setItem(drawKey, canvasRef.current.toDataURL('image/png'));
    } catch (_e) {
      /* cuota llena / no disponible */
    }
  };

  const applyStroke = (ctx) => {
    const { tool: t, color: c, size: s } = styleRef.current;
    if (t === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s * 2.5;
    } else {
      ctx.strokeStyle = c;
      ctx.lineWidth = s;
    }
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    pushUndo();
    drawingRef.current = true;
    const { x, y } = getPos(e);
    applyStroke(ctx);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01); // marca un punto en un tap simple
    ctx.stroke();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_e) {
      /* ignore */
    }
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const ctx = ctxRef.current;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    ctxRef.current.closePath();
    saveDrawing();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_e) {
      /* ignore */
    }
  };

  const handleUndo = () => {
    const ctx = ctxRef.current;
    if (!ctx || undoRef.current.length === 0) return;
    ctx.putImageData(undoRef.current.pop(), 0, 0);
    setCanUndo(undoRef.current.length > 0);
    saveDrawing();
  };

  const handleClear = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx) return;
    pushUndo();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveDrawing();
  };

  const handleNotesChange = (e) => {
    const v = e.target.value;
    setNotes(v);
    try {
      localStorage.setItem(notesKey, v);
    } catch (_e) {
      /* ignore */
    }
  };

  const selectColor = (value) => {
    setColor(value);
    setTool('pencil');
  };

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-label="Pizarra de apoyo"
      aria-hidden={!open}
      className={cn(
        'fixed right-0 top-0 z-[60] flex h-[100dvh] w-full flex-col border-l border-border bg-card shadow-lg outline-none transition-transform duration-300 ease-out sm:w-[400px]',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      )}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Pizarra</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Cerrar pizarra"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Tabs defaultValue="dibujo" className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dibujo" className="gap-1.5">
              <Pencil className="h-4 w-4" />
              Dibujo
            </TabsTrigger>
            <TabsTrigger value="notas" className="gap-1.5">
              <StickyNote className="h-4 w-4" />
              Notas
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- Dibujo --- */}
        <TabsContent
          value="dibujo"
          className="mt-0 flex min-h-0 flex-1 flex-col gap-3 p-4"
        >
          {/* Herramientas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <Button
                  type="button"
                  variant={tool === 'pencil' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTool('pencil')}
                  aria-label="Lápiz"
                  aria-pressed={tool === 'pencil'}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={tool === 'eraser' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTool('eraser')}
                  aria-label="Borrador"
                  aria-pressed={tool === 'eraser'}
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </div>

              <div className="ml-auto flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  aria-label="Deshacer"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={handleClear}
                  aria-label="Limpiar todo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Colores */}
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => selectColor(c.value)}
                  aria-label={`Color ${c.name}`}
                  aria-pressed={tool === 'pencil' && color === c.value}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    tool === 'pencil' && color === c.value
                      ? 'border-foreground scale-110'
                      : 'border-transparent',
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>

            {/* Grosor */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Grosor</span>
              <Slider
                value={[size]}
                onValueChange={([v]) => setSize(v)}
                min={1}
                max={24}
                step={1}
                className="flex-1"
                aria-label="Grosor del trazo"
              />
              <span className="w-6 text-right font-mono text-xs tabular-nums text-muted-foreground">
                {size}
              </span>
            </div>
          </div>

          {/* Lienzo */}
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-white">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="block h-auto w-full cursor-crosshair touch-none"
            />
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Tu dibujo se guarda en este navegador automáticamente.
          </p>
        </TabsContent>

        {/* --- Notas --- */}
        <TabsContent
          value="notas"
          className="mt-0 flex min-h-0 flex-1 flex-col gap-2 p-4"
        >
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Escribe acá tus apuntes rápidos: fórmulas, dudas, recordatorios…"
            className="min-h-0 flex-1 resize-none rounded-xl border border-border bg-background p-3 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Notas"
          />
          <p className="text-center text-[11px] text-muted-foreground">
            Tus notas se guardan en este navegador automáticamente.
          </p>
        </TabsContent>
      </Tabs>
    </aside>
  );
};

export default PizarraPanel;
