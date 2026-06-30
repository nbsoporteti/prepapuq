import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Pencil,
  Highlighter,
  Eraser,
  Minus,
  Square,
  Circle,
  ArrowUpRight,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  PenLine,
  StickyNote,
  Grid3x3,
  AlignJustify,
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

const TOOLS = [
  { id: 'pencil', icon: Pencil, label: 'Lápiz' },
  { id: 'highlighter', icon: Highlighter, label: 'Resaltador' },
  { id: 'eraser', icon: Eraser, label: 'Goma' },
  { id: 'line', icon: Minus, label: 'Línea' },
  { id: 'rect', icon: Square, label: 'Rectángulo' },
  { id: 'ellipse', icon: Circle, label: 'Elipse' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Flecha' },
  { id: 'text', icon: Type, label: 'Texto' },
];

const BACKGROUNDS = [
  { id: 'blanco', icon: Square, label: 'Blanco' },
  { id: 'cuadriculado', icon: Grid3x3, label: 'Cuadriculado' },
  { id: 'lineas', icon: AlignJustify, label: 'Líneas' },
];

// Resolución interna del lienzo (independiente del tamaño en pantalla, para que
// el dibujo guardado sea estable al re-escalar el panel).
const CANVAS_W = 720;
const CANVAS_H = 940;
const UNDO_LIMIT = 20;
const GRID = 24; // px de la cuadrícula / interlineado

const isShape = (t) => t === 'line' || t === 'rect' || t === 'ellipse' || t === 'arrow';

// Estilo CSS del fondo del lienzo (no se hornea en el dibujo; queda detrás del
// canvas transparente).
const bgStyle = (b) => {
  if (b === 'cuadriculado') {
    return {
      backgroundColor: '#ffffff',
      backgroundImage:
        'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
      backgroundSize: `${GRID}px ${GRID}px`,
    };
  }
  if (b === 'lineas') {
    return {
      backgroundColor: '#ffffff',
      backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
      backgroundSize: `100% ${GRID + 4}px`,
    };
  }
  return { backgroundColor: '#ffffff' };
};

// Dibuja una forma vectorial sobre el contexto (trazo, sin relleno).
const drawShape = (ctx, tool, a, b) => {
  ctx.beginPath();
  if (tool === 'line') {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  } else if (tool === 'rect') {
    ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  } else if (tool === 'ellipse') {
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    ctx.ellipse(cx, cy, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tool === 'arrow') {
    const head = Math.max(12, ctx.lineWidth * 3.2);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(ang - Math.PI / 6), b.y - head * Math.sin(ang - Math.PI / 6));
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(ang + Math.PI / 6), b.y - head * Math.sin(ang + Math.PI / 6));
    ctx.stroke();
  }
};

const PizarraPanel = () => {
  const { open, setOpen } = usePizarra();
  const { currentUser } = useAuth();
  const uid = currentUser?.id || 'anon';

  const drawKey = `prepa:pizarra:draw:${uid}`;
  const notesKey = `prepa:pizarra:notes:${uid}`;
  const bgKey = `prepa:pizarra:bg:${uid}`;

  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const startRef = useRef(null); // punto inicial (formas)
  const baseRef = useRef(null); // snapshot para preview (formas/resaltador)
  const hlPointsRef = useRef([]); // puntos del trazo de resaltador en curso
  const cancelTextRef = useRef(false); // Escape cancela sin comitear el texto
  const undoRef = useRef([]);
  const redoRef = useRef([]);

  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(4);
  const [bg, setBg] = useState('blanco');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [notes, setNotes] = useState('');
  const [textInput, setTextInput] = useState(null); // { xCss,yCss,xCanvas,yCanvas,fontPx,fontCss,value }

  // Mantener herramienta/color/grosor accesibles en los handlers de puntero.
  const styleRef = useRef({ tool, color, size });
  styleRef.current = { tool, color, size };

  // --- Inicialización: contexto, carga desde localStorage ------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
    undoRef.current = [];
    redoRef.current = [];
    setCanUndo(false);
    setCanRedo(false);

    // Lienzo transparente: el fondo (blanco/cuadrícula) lo da el contenedor.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
      setBg(localStorage.getItem(bgKey) || 'blanco');
    } catch (_e) {
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // --- Cerrar con Escape + foco al abrir -----------------------------------
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !textInput) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen, textInput]);

  // --- Helpers --------------------------------------------------------------
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const resetCtx = (ctx) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };

  const pushUndo = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx) return;
    try {
      undoRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoRef.current.length > UNDO_LIMIT) undoRef.current.shift();
      redoRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
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

  const configureFreehand = (ctx) => {
    const { tool: t, color: c, size: s } = styleRef.current;
    if (t === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = s * 2.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c;
      ctx.lineWidth = s;
    }
  };

  const strokeHighlighter = (ctx, pts) => {
    const { color: c, size: s } = styleRef.current;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = c;
    ctx.lineWidth = s * 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  };

  const configureShape = (ctx) => {
    const { color: c, size: s } = styleRef.current;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c;
    ctx.lineWidth = s;
  };

  // --- Texto ----------------------------------------------------------------
  const openTextInput = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const xCss = e.clientX - rect.left;
    const yCss = e.clientY - rect.top;
    const scale = rect.width / canvas.width;
    const fontPx = Math.max(16, styleRef.current.size * 6);
    setTextInput({
      xCss,
      yCss,
      xCanvas: xCss / scale,
      yCanvas: yCss / scale,
      fontPx,
      fontCss: fontPx * scale,
      value: '',
    });
  };

  const commitText = () => {
    const t = textInput;
    setTextInput(null);
    if (cancelTextRef.current) {
      cancelTextRef.current = false;
      return;
    }
    if (!t || !t.value.trim()) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    pushUndo();
    resetCtx(ctx);
    ctx.fillStyle = styleRef.current.color;
    ctx.textBaseline = 'top';
    ctx.font = `${t.fontPx}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(t.value, t.xCanvas, t.yCanvas);
    saveDrawing();
  };

  // --- Punteros -------------------------------------------------------------
  const handlePointerDown = (e) => {
    const { tool: t } = styleRef.current;
    if (t === 'text') {
      if (!textInput) openTextInput(e);
      return;
    }
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;
    pushUndo();
    drawingRef.current = true;
    const pos = getPos(e);
    startRef.current = pos;

    if (isShape(t) || t === 'highlighter') {
      baseRef.current = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      if (t === 'highlighter') hlPointsRef.current = [pos];
    } else {
      configureFreehand(ctx);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x + 0.01, pos.y + 0.01); // punto en un tap simple
      ctx.stroke();
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_e) {
      /* ignore */
    }
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const ctx = ctxRef.current;
    const { tool: t } = styleRef.current;
    const pos = getPos(e);

    if (isShape(t)) {
      ctx.putImageData(baseRef.current, 0, 0);
      configureShape(ctx);
      drawShape(ctx, t, startRef.current, pos);
    } else if (t === 'highlighter') {
      hlPointsRef.current.push(pos);
      ctx.putImageData(baseRef.current, 0, 0);
      strokeHighlighter(ctx, hlPointsRef.current);
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.closePath();
      resetCtx(ctx);
    }
    baseRef.current = null;
    hlPointsRef.current = [];
    saveDrawing();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_e) {
      /* ignore */
    }
  };

  // --- Acciones -------------------------------------------------------------
  const restoreFrom = (fromRef, toRef, setCanFrom, setCanTo) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || fromRef.current.length === 0) return;
    try {
      toRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      ctx.putImageData(fromRef.current.pop(), 0, 0);
      setCanFrom(fromRef.current.length > 0);
      setCanTo(true);
      saveDrawing();
    } catch (_e) {
      /* ignore */
    }
  };

  const handleUndo = () => restoreFrom(undoRef, redoRef, setCanUndo, setCanRedo);
  const handleRedo = () => restoreFrom(redoRef, undoRef, setCanRedo, setCanUndo);

  const handleClear = () => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx) return;
    pushUndo();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveDrawing();
  };

  // Exporta el lienzo con fondo sólido (blanco + cuadrícula si está activa).
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const o = off.getContext('2d');
    o.fillStyle = '#ffffff';
    o.fillRect(0, 0, off.width, off.height);
    if (bg !== 'blanco') {
      o.strokeStyle = '#e5e7eb';
      o.lineWidth = 1;
      const step = bg === 'lineas' ? GRID + 4 : GRID;
      for (let y = step; y < off.height; y += step) {
        o.beginPath();
        o.moveTo(0, y);
        o.lineTo(off.width, y);
        o.stroke();
      }
      if (bg === 'cuadriculado') {
        for (let x = GRID; x < off.width; x += GRID) {
          o.beginPath();
          o.moveTo(x, 0);
          o.lineTo(x, off.height);
          o.stroke();
        }
      }
    }
    o.drawImage(canvas, 0, 0);
    const a = document.createElement('a');
    a.href = off.toDataURL('image/png');
    a.download = `pizarra-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
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
    setTool((t) => (t === 'eraser' ? 'pencil' : t));
  };

  const selectBg = (value) => {
    setBg(value);
    try {
      localStorage.setItem(bgKey, value);
    } catch (_e) {
      /* ignore */
    }
  };

  const colorActive = (v) => tool !== 'eraser' && color === v;

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-label="Pizarra de apoyo"
      aria-hidden={!open}
      className={cn(
        'fixed right-0 top-0 z-[60] flex h-[100dvh] w-full flex-col border-l border-border bg-card shadow-lg outline-none transition-transform duration-300 ease-out sm:w-[420px]',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
      )}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Pizarra</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar pizarra">
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
        <TabsContent value="dibujo" className="mt-0 flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="space-y-3">
            {/* Herramientas */}
            <div className="grid grid-cols-8 gap-1 rounded-lg bg-muted p-1">
              {TOOLS.map((tl) => {
                const Icon = tl.icon;
                return (
                  <Button
                    key={tl.id}
                    type="button"
                    variant={tool === tl.id ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-full"
                    onClick={() => setTool(tl.id)}
                    aria-label={tl.label}
                    aria-pressed={tool === tl.id}
                    title={tl.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleUndo}
                disabled={!canUndo}
                aria-label="Deshacer"
                title="Deshacer"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRedo}
                disabled={!canRedo}
                aria-label="Rehacer"
                title="Rehacer"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                aria-label="Descargar PNG"
                title="Descargar PNG"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
                aria-label="Limpiar todo"
                title="Limpiar todo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Colores */}
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => selectColor(c.value)}
                  aria-label={`Color ${c.name}`}
                  aria-pressed={colorActive(c.value)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    colorActive(c.value) ? 'scale-110 border-foreground' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
              {/* Color personalizado (nativo) */}
              <label
                className={cn(
                  'relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2',
                  !COLORS.some((c) => c.value === color) && tool !== 'eraser'
                    ? 'scale-110 border-foreground'
                    : 'border-dashed border-muted-foreground/50',
                )}
                style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
                title="Color personalizado"
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => selectColor(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Color personalizado"
                />
              </label>
            </div>

            {/* Grosor + Fondo */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Grosor</span>
              <Slider
                value={[size]}
                onValueChange={([v]) => setSize(v)}
                min={1}
                max={28}
                step={1}
                className="flex-1"
                aria-label="Grosor del trazo"
              />
              <span className="w-6 text-right font-mono text-xs tabular-nums text-muted-foreground">
                {size}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-muted-foreground">Fondo</span>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {BACKGROUNDS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <Button
                      key={b.id}
                      type="button"
                      variant={bg === b.id ? 'default' : 'ghost'}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => selectBg(b.id)}
                      aria-label={b.label}
                      aria-pressed={bg === b.id}
                      title={b.label}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lienzo */}
          <div
            className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-border"
            style={bgStyle(bg)}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={cn('block h-auto w-full touch-none', tool === 'text' ? 'cursor-text' : 'cursor-crosshair')}
            />
            {textInput && (
              <input
                autoFocus
                value={textInput.value}
                onChange={(e) => setTextInput((t) => ({ ...t, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitText();
                  } else if (e.key === 'Escape') {
                    cancelTextRef.current = true;
                    setTextInput(null);
                  }
                }}
                onBlur={commitText}
                placeholder="Escribí…"
                style={{
                  left: textInput.xCss,
                  top: textInput.yCss,
                  fontSize: `${textInput.fontCss}px`,
                  color,
                  lineHeight: 1,
                }}
                className="absolute z-10 min-w-[40px] rounded border border-primary/60 bg-white/95 px-1 py-0.5 font-sans outline-none"
              />
            )}
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Tu pizarra se guarda en este navegador automáticamente.
          </p>
        </TabsContent>

        {/* --- Notas --- */}
        <TabsContent value="notas" className="mt-0 flex min-h-0 flex-1 flex-col gap-2 p-4">
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
