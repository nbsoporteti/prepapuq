import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  ArrowLeft,
  FileUp,
  FileText,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Image as ImageIcon,
  X,
  Eye,
  Pencil,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Loader2,
  Wand2,
  BookOpen,
  Info,
  ShieldAlert,
  ClipboardPaste,
  Calculator,
  Sigma,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { RichText } from '@/lib/richText';
import {
  ASIGNATURAS,
  DIFICULTADES,
  DIFICULTAD_LABEL,
  EJES_POR_ASIGNATURA,
  EJEMPLO_PEGADO,
  LETTERS,
  parsePreguntas,
  parseTabla,
  serializeTabla,
  tablaConversionRef,
  validateTabla,
} from '@/lib/paesImport';
import { extractPdfText } from '@/lib/pdfText';

const hoyISO = () => new Date().toISOString().slice(0, 10);

// URL de un archivo de PocketBase (compatibilidad getURL/getUrl según SDK).
const fileUrl = (record, name) => {
  if (!name) return null;
  if (pb.files.getURL) return pb.files.getURL(record, name);
  return pb.files.getUrl(record, name);
};

const FORMATO_AYUDA = `Cada pregunta empieza con un número (1. , 2) , …).
Alternativas con letra: A) , B) , *C) , D)   (marcá la correcta con * o "Correcta: C").
Opcionales por pregunta:  Eje: …  /  Dificultad: Fácil|Media|Difícil  /  Piloto  /  Explicación: …
Texto de lectura compartido: empezá con "Texto:" (se aplica a las preguntas siguientes
hasta el próximo "Texto:" o una línea "---").
Fórmulas: escribí LaTeX entre signos $…$  (ej: $\\frac{a}{b}$, $x^2$, $\\sqrt{2}$).`;

// --- Modelo editable ---------------------------------------------------------
const emptyAlt = () => ({ texto: '', correct: false, img: null });

// --- Página ------------------------------------------------------------------
const AdminPAESImportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get('id') || null;

  // Generador de ids locales estables (para keys y reordenamiento).
  const idRef = useRef(0);
  const nextId = () => `q${(idRef.current += 1)}`;
  const newItem = () => ({
    _id: nextId(),
    enunciado: '',
    eje: '',
    dificultad: '',
    piloto: false,
    contexto: '',
    explicacion: '',
    alternativas: [emptyAlt(), emptyAlt(), emptyAlt(), emptyAlt()],
    imgEnunciado: null,
    imgContexto: null,
  });

  const [meta, setMeta] = useState({
    titulo: '',
    asignatura: '',
    fecha: hoyISO(),
    duracion_min: 60,
    descripcion: '',
    instrucciones: '',
    estado: 'publicado',
  });
  const [items, setItems] = useState(() => [newItem()]);
  const [view, setView] = useState('editar'); // editar | previa
  const [tablaMode, setTablaMode] = useState('ref'); // ref | custom
  const [tablaText, setTablaText] = useState('');
  const [showTabla, setShowTabla] = useState(false);

  const [existingSims, setExistingSims] = useState([]);
  const [loadingEdit, setLoadingEdit] = useState(!!editingId);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteReplace, setPasteReplace] = useState(true);
  const pdfInputRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [done, setDone] = useState(null);

  const setMetaField = (k, v) => setMeta((m) => ({ ...m, [k]: v }));

  // --- Carga: lista de simulacros (colisiones de título) -------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sims = await pb.collection('simulacros_paes').getFullList({ sort: '-created', $autoCancel: false });
        if (alive) setExistingSims(sims);
      } catch (_e) {
        if (alive) setExistingSims([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // --- Modo edición: cargar simulacro + preguntas al modelo ----------------
  useEffect(() => {
    if (!editingId) return undefined;
    let alive = true;
    (async () => {
      try {
        setLoadingEdit(true);
        const sim = await pb.collection('simulacros_paes').getOne(editingId, { $autoCancel: false });
        if (!alive) return;
        setMeta({
          titulo: sim.titulo || '',
          asignatura: sim.asignatura || '',
          fecha: sim.fecha ? String(sim.fecha).slice(0, 10) : hoyISO(),
          duracion_min: sim.duracion_min || 60,
          descripcion: sim.descripcion || '',
          instrucciones: sim.instrucciones || '',
          estado: sim.estado === 'publicado' ? 'publicado' : 'programado',
        });
        if (Array.isArray(sim.tabla_conversion_json) && sim.tabla_conversion_json.length) {
          setTablaMode('custom');
          setTablaText(serializeTabla(sim.tabla_conversion_json));
        }

        const pregs = await pb.collection('preguntas_paes').getFullList({
          filter: `simulacro_id = "${editingId}"`,
          sort: 'numero',
          $autoCancel: false,
        });
        if (!alive) return;
        if (pregs.length) setItems(pregs.map((p) => recordToItem(p, nextId)));
      } catch (err) {
        console.error('Error cargando simulacro a editar:', err);
        toast.error('No se pudo cargar el simulacro para editar.');
      } finally {
        if (alive) setLoadingEdit(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [editingId]);

  // --- Derivados ------------------------------------------------------------
  const nScore = useMemo(() => items.filter((it) => !it.piloto).length, [items]);
  const refTabla = useMemo(() => tablaConversionRef(nScore || items.length || 1), [nScore, items.length]);
  const customRows = useMemo(() => parseTabla(tablaText), [tablaText]);
  const tablaErr = useMemo(
    () => (tablaMode === 'custom' ? validateTabla(customRows, nScore || items.length) : null),
    [tablaMode, customRows, nScore, items.length],
  );

  const itemErrors = useMemo(() => validateItems(items), [items]);
  const errorsByIdx = useMemo(() => {
    const m = {};
    for (const e of itemErrors) if (typeof e.idx === 'number') (m[e.idx] = m[e.idx] || []).push(e.msg);
    return m;
  }, [itemErrors]);

  const dupSim = useMemo(() => {
    const t = meta.titulo.trim().toLowerCase();
    if (!t) return null;
    return existingSims.find((s) => s.id !== editingId && (s.titulo || '').trim().toLowerCase() === t);
  }, [existingSims, meta.titulo, editingId]);

  const metaComplete = meta.titulo.trim() && meta.asignatura && meta.fecha && Number(meta.duracion_min) > 0;
  const canImport =
    !!metaComplete && items.length > 0 && itemErrors.length === 0 && !tablaErr && !importing && !loadingEdit;

  const ejeSugeridos = EJES_POR_ASIGNATURA[meta.asignatura] || [];

  // --- Mutadores del modelo -------------------------------------------------
  const move = (arr, from, to) => {
    const a = [...arr];
    const [x] = a.splice(from, 1);
    a.splice(to, 0, x);
    return a;
  };
  const patchItem = (i, patch) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const patchAlt = (i, j, patch) =>
    setItems((p) =>
      p.map((it, idx) =>
        idx !== i ? it : { ...it, alternativas: it.alternativas.map((a, k) => (k === j ? { ...a, ...patch } : a)) },
      ),
    );
  const addAlt = (i) =>
    setItems((p) =>
      p.map((it, idx) => (idx !== i || it.alternativas.length >= 5 ? it : { ...it, alternativas: [...it.alternativas, emptyAlt()] })),
    );
  const removeAlt = (i, j) =>
    setItems((p) => p.map((it, idx) => (idx !== i ? it : { ...it, alternativas: it.alternativas.filter((_, k) => k !== j) })));
  const moveAlt = (i, j, dir) =>
    setItems((p) =>
      p.map((it, idx) => {
        if (idx !== i) return it;
        const to = j + dir;
        if (to < 0 || to >= it.alternativas.length) return it;
        return { ...it, alternativas: move(it.alternativas, j, to) };
      }),
    );
  const setCorrect = (i, j) =>
    setItems((p) =>
      p.map((it, idx) => (idx !== i ? it : { ...it, alternativas: it.alternativas.map((a, k) => ({ ...a, correct: k === j })) })),
    );
  const setImg = (i, slot, file) => {
    const ref = { kind: 'file', file, url: URL.createObjectURL(file) };
    setItems((p) =>
      p.map((it, idx) => {
        if (idx !== i) return it;
        if (slot === 'enunciado') return { ...it, imgEnunciado: ref };
        if (slot === 'contexto') return { ...it, imgContexto: ref };
        return { ...it, alternativas: it.alternativas.map((a, k) => (k === slot ? { ...a, img: ref } : a)) };
      }),
    );
  };
  const clearImg = (i, slot) =>
    setItems((p) =>
      p.map((it, idx) => {
        if (idx !== i) return it;
        if (slot === 'enunciado') return { ...it, imgEnunciado: null };
        if (slot === 'contexto') return { ...it, imgContexto: null };
        return { ...it, alternativas: it.alternativas.map((a, k) => (k === slot ? { ...a, img: null } : a)) };
      }),
    );
  const addItem = () => setItems((p) => [...p, newItem()]);
  const removeItem = (i) => setItems((p) => (p.length <= 1 ? [newItem()] : p.filter((_, idx) => idx !== i)));
  const moveItem = (i, dir) =>
    setItems((p) => {
      const to = i + dir;
      if (to < 0 || to >= p.length) return p;
      return move(p, i, to);
    });
  const duplicateItem = (i) =>
    setItems((p) => {
      const src = p[i];
      const copy = {
        ...src,
        _id: nextId(),
        _recordId: undefined,
        alternativas: src.alternativas.map((a) => ({ ...a })),
      };
      const a = [...p];
      a.splice(i + 1, 0, copy);
      return a;
    });
  const copyContextoFromPrev = (i) =>
    setItems((p) => {
      if (i <= 0) return p;
      const prev = p[i - 1];
      return p.map((it, idx) => (idx === i ? { ...it, contexto: prev.contexto, imgContexto: prev.imgContexto } : it));
    });

  // --- Importar desde texto -------------------------------------------------
  const pastePreview = useMemo(() => (pasteOpen ? parsePreguntas(pasteText) : { questions: [] }), [pasteOpen, pasteText]);
  const aplicarPaste = () => {
    const parsed = parsePreguntas(pasteText);
    const nuevos = parsed.questions.map((q) => questionToItem(q, nextId));
    if (!nuevos.length) {
      toast.error('No se detectó ninguna pregunta en el texto.');
      return;
    }
    setItems((p) => (pasteReplace ? nuevos : [...p, ...nuevos]));
    setPasteOpen(false);
    setPasteText('');
    setView('editar');
    toast.success(`${nuevos.length} pregunta${nuevos.length === 1 ? '' : 's'} cargada${nuevos.length === 1 ? '' : 's'} al editor.`);
  };

  // --- Importar desde PDF: extrae el texto y lo vuelca al editor de texto ---
  const handlePdf = async (file) => {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') {
      toast.error('El archivo no es un PDF.');
      return;
    }
    setPdfBusy(true);
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) {
        toast.error('No se extrajo texto del PDF. ¿Es escaneado o son imágenes? En ese caso, pegá el texto a mano.');
        return;
      }
      setPasteText(text);
      setPasteReplace(true);
      setPasteOpen(true);
      toast.success('Texto extraído del PDF. Revisalo, marcá las correctas y cargá al editor.');
    } catch (err) {
      console.error('Error extrayendo el PDF:', err);
      toast.error('No se pudo leer el PDF.');
    } finally {
      setPdfBusy(false);
    }
  };

  // --- Guardar --------------------------------------------------------------
  const handleImport = async () => {
    if (!canImport) return;
    const n = items.length;
    const clave = items.map((it) => {
      if (it.piloto) return null;
      const k = it.alternativas.findIndex((a) => a.correct);
      return k >= 0 ? LETTERS[k] : null;
    });
    const tabla = tablaMode === 'custom' ? customRows : tablaConversionRef(nScore || n);

    setImporting(true);
    setProgress({ done: 0, total: n });
    try {
      const payload = {
        titulo: meta.titulo.trim(),
        asignatura: meta.asignatura,
        fecha: `${meta.fecha} 12:00:00.000Z`,
        n_preguntas_total: n,
        tabla_conversion_json: tabla,
        puntaje_max_chile: 1000,
        descripcion: meta.descripcion.trim(),
        instrucciones: meta.instrucciones.trim(),
        duracion_min: Number(meta.duracion_min) || 0,
        modo: 'interactivo',
        estado: meta.estado,
        clave_respuestas_json: clave,
      };

      let sim;
      if (editingId) sim = await pb.collection('simulacros_paes').update(editingId, payload, { $autoCancel: false });
      else if (dupSim) sim = await pb.collection('simulacros_paes').update(dupSim.id, payload, { $autoCancel: false });
      else sim = await pb.collection('simulacros_paes').create(payload, { $autoCancel: false });

      const existing = await pb.collection('preguntas_paes').getFullList({
        filter: `simulacro_id = "${sim.id}"`,
        sort: 'numero',
        $autoCancel: false,
      });

      const applyImg = (fd, field, ref, rec) => {
        if (ref && ref.kind === 'file') fd.append(field, ref.file);
        else if (ref && ref.kind === 'existing') {
          /* sin tocar: PocketBase conserva el archivo actual en el update */
        } else if (rec && rec[field]) fd.append(field, ''); // limpiar el que había
      };

      for (let i = 0; i < items.length; i += 1) {
        const it = items[i];
        const numero = i + 1;
        const rec = existing.find((e) => Number(e.numero) === numero) || null;
        const k = it.alternativas.findIndex((a) => a.correct);

        const fd = new FormData();
        fd.append('simulacro_id', sim.id);
        fd.append('numero', String(numero));
        fd.append('eje', it.eje || '');
        fd.append('dificultad', it.dificultad || '');
        fd.append('piloto', it.piloto ? 'true' : 'false');
        fd.append('contexto', it.contexto || '');
        fd.append('enunciado', it.enunciado || '');
        fd.append('explicacion', it.explicacion || '');
        fd.append('respuesta_correcta', k >= 0 ? LETTERS[k] : 'A');
        fd.append(
          'alternativas_json',
          JSON.stringify(it.alternativas.map((a, j) => ({ letra: LETTERS[j], texto: a.texto || '' }))),
        );
        applyImg(fd, 'imagen_enunciado', it.imgEnunciado, rec);
        applyImg(fd, 'imagen_contexto', it.imgContexto, rec);
        for (let j = 0; j < 5; j += 1) {
          const ref = j < it.alternativas.length ? it.alternativas[j].img : null;
          applyImg(fd, `imagen_${LETTERS[j].toLowerCase()}`, ref, rec);
        }

        if (rec) await pb.collection('preguntas_paes').update(rec.id, fd, { $autoCancel: false });
        else await pb.collection('preguntas_paes').create(fd, { $autoCancel: false });
        setProgress({ done: i + 1, total: n });
      }

      // Borrar preguntas sobrantes (si el ensayo quedó más corto que antes).
      for (const e of existing) {
        if (Number(e.numero) > items.length) await pb.collection('preguntas_paes').delete(e.id, { $autoCancel: false });
      }

      toast.success(`Simulacro guardado con ${n} preguntas.`);
      setDone({ n, estado: meta.estado, simId: sim.id, titulo: sim.titulo });
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error('Error guardando preguntas PAES:', err);
      toast.error('Falló el guardado: ' + (err?.message || 'error desconocido'));
    } finally {
      setImporting(false);
    }
  };

  const resetTodo = () => {
    idRef.current = 0;
    setMeta({ titulo: '', asignatura: '', fecha: hoyISO(), duracion_min: 60, descripcion: '', instrucciones: '', estado: 'publicado' });
    setItems([newItem()]);
    setTablaMode('ref');
    setTablaText('');
    setDone(null);
    setView('editar');
    if (editingId) navigate('/dashboard/admin/paes');
  };

  // ----------------------------------------------------------------- DONE
  if (done) {
    return (
      <>
        <Helmet>
          <title>Simulacro guardado | PrePa</title>
        </Helmet>
        <div className="container mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">¡Simulacro guardado!</h1>
              <p className="mt-2 text-muted-foreground">
                <span className="font-semibold text-foreground">{done.titulo}</span> quedó con{' '}
                <span className="font-mono tabular-nums">{done.n}</span> preguntas, corrección automática y la clave
                armada sola.
              </p>
              {done.estado === 'publicado' ? (
                <Badge className="mt-4 border-0 bg-success/15 text-success">Publicado · visible para estudiantes</Badge>
              ) : (
                <Badge variant="secondary" className="mt-4">
                  Borrador · oculto hasta que lo publiques
                </Badge>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={resetTodo}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Crear otro
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/dashboard/admin/paes?id=${done.simId}`}>Editar este</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/dashboard/admin">Volver al panel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // ----------------------------------------------------------------- FORM
  return (
    <>
      <Helmet>
        <title>{editingId ? 'Editar' : 'Crear'} ensayo PAES | PrePa</title>
      </Helmet>

      {/* datalist de ejes sugeridos para la asignatura elegida */}
      <datalist id="paes-ejes">
        {ejeSugeridos.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>

      <div className="min-h-screen bg-muted/30 pb-28">
        <div className="border-b border-border bg-slate-950">
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-slate-300 hover:text-white">
              <Link to="/dashboard/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Panel de administración
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-white text-balance">
              {editingId ? 'Editar' : 'Crear'} ensayo <span className="text-primary">PAES</span>
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Armá las preguntas con el editor visual: alternativas, imágenes, fórmulas y dificultad. El sistema arma la
              clave solo y queda auto-corrigiendo.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Nota de responsabilidad de contenido */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p>
              Cargá solo preguntas que tengas derecho a usar (propias o autorizadas). No subas la transcripción de
              ensayos oficiales DEMRE: su licencia prohíbe reproducirlos. El contenido que cargues queda bajo tu
              responsabilidad.
            </p>
          </div>

          {/* Metadatos del simulacro */}
          <Card className="mb-6 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Datos del simulacro</CardTitle>
              <CardDescription>
                {editingId
                  ? 'Estás editando un simulacro existente. Al guardar se reemplazan sus preguntas.'
                  : 'Si el título coincide con uno existente, se actualiza ese simulacro.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="titulo">
                    Título <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="titulo"
                    value={meta.titulo}
                    onChange={(e) => setMetaField('titulo', e.target.value)}
                    placeholder="Ej: Ensayo Competencia Lectora N°1"
                    className="text-foreground"
                  />
                  {dupSim && !editingId && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Info className="h-3.5 w-3.5" />
                      Ya existe un simulacro con este título: se actualizará (se reemplazan sus preguntas).
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Asignatura <span className="text-destructive">*</span>
                  </Label>
                  <Select value={meta.asignatura} onValueChange={(v) => setMetaField('asignatura', v)}>
                    <SelectTrigger className="text-foreground">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ASIGNATURAS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracion">
                    Duración (minutos) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="duracion"
                    type="number"
                    min={1}
                    max={480}
                    value={meta.duracion_min}
                    onChange={(e) => setMetaField('duracion_min', e.target.value)}
                    className="text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha">
                    Fecha <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={meta.fecha}
                    onChange={(e) => setMetaField('fecha', e.target.value)}
                    className="text-foreground"
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
                    <Switch
                      id="publicar"
                      checked={meta.estado === 'publicado'}
                      onCheckedChange={(v) => setMetaField('estado', v ? 'publicado' : 'programado')}
                    />
                    <Label htmlFor="publicar" className="cursor-pointer">
                      {meta.estado === 'publicado' ? 'Publicado (visible)' : 'Borrador (oculto)'}
                    </Label>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Input
                    id="descripcion"
                    value={meta.descripcion}
                    onChange={(e) => setMetaField('descripcion', e.target.value)}
                    placeholder="Breve detalle que verá el estudiante antes de comenzar."
                    className="text-foreground"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="instrucciones">Instrucciones (opcional)</Label>
                  <Textarea
                    id="instrucciones"
                    value={meta.instrucciones}
                    onChange={(e) => setMetaField('instrucciones', e.target.value)}
                    placeholder="Indicaciones más largas que verá el alumno antes de comenzar (materiales, criterios, etc.)."
                    className="min-h-[72px] text-foreground"
                  />
                </div>
              </div>

              {/* Tabla de conversión */}
              <div className="mt-4 rounded-lg border border-border/60 bg-card/60 p-3">
                <button
                  type="button"
                  onClick={() => setShowTabla((s) => !s)}
                  className="flex w-full items-center justify-between gap-2 text-sm font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    Tabla de conversión a puntaje
                    <Badge variant="secondary" className="font-normal">
                      {tablaMode === 'custom' ? 'Personalizada' : 'Referencial'}
                    </Badge>
                  </span>
                  {showTabla ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showTabla && (
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={tablaMode === 'ref' ? 'default' : 'outline'}
                        onClick={() => setTablaMode('ref')}
                      >
                        Referencial (automática)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={tablaMode === 'custom' ? 'default' : 'outline'}
                        onClick={() => {
                          setTablaMode('custom');
                          if (!tablaText.trim()) setTablaText(serializeTabla(refTabla));
                        }}
                      >
                        Personalizada (tabla oficial)
                      </Button>
                    </div>

                    {tablaMode === 'ref' ? (
                      <p className="text-xs text-muted-foreground">
                        Curva 100–1000 aproximada según {nScore || items.length} preguntas que puntúan. Para usar la
                        tabla oficial DEMRE, elegí “Personalizada”.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Una fila por línea con el formato <code className="font-mono">correctas: puntaje</code>. Se
                          interpola entre las filas que cargues.
                        </p>
                        <Textarea
                          value={tablaText}
                          onChange={(e) => setTablaText(e.target.value)}
                          spellCheck={false}
                          placeholder={'0: 100\n10: 450\n25: 700\n45: 1000'}
                          className="min-h-[120px] font-mono text-xs text-foreground"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => setTablaText(serializeTabla(refTabla))}>
                            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                            Cargar la referencial como base
                          </Button>
                          {tablaErr ? (
                            <span className="flex items-center gap-1 text-xs text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {tablaErr}
                            </span>
                          ) : (
                            <span className="text-xs text-success">{customRows.length} filas OK</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Barra de herramientas del editor */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setView('editar')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  view === 'editar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setView('previa')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  view === 'previa' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Eye className="h-4 w-4" />
                Vista previa
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {items.length} preg.
              </Badge>
              {nScore !== items.length && (
                <Badge variant="outline" className="font-mono" title="Preguntas que puntúan (sin piloto)">
                  {nScore} puntúan
                </Badge>
              )}
              {itemErrors.length > 0 ? (
                <Badge variant="destructive" className="font-mono">
                  {itemErrors.length} a revisar
                </Badge>
              ) : (
                <Badge className="border-0 bg-success/15 font-mono text-success">OK</Badge>
              )}
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePdf(f);
                  e.target.value = '';
                }}
              />
              <Button variant="outline" size="sm" onClick={() => pdfInputRef.current?.click()} disabled={pdfBusy}>
                {pdfBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
                Importar desde PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
                <ClipboardPaste className="mr-1.5 h-4 w-4" />
                Importar desde texto
              </Button>
            </div>
          </div>

          {/* Cuerpo: editor o vista previa */}
          {view === 'editar' ? (
            <div className="space-y-4">
              {items.map((it, i) => (
                <QuestionEditor
                  key={it._id}
                  item={it}
                  index={i}
                  total={items.length}
                  errors={errorsByIdx[i] || []}
                  onPatch={(patch) => patchItem(i, patch)}
                  onRemove={() => removeItem(i)}
                  onMove={(dir) => moveItem(i, dir)}
                  onDuplicate={() => duplicateItem(i)}
                  onAltPatch={(j, patch) => patchAlt(i, j, patch)}
                  onAltAdd={() => addAlt(i)}
                  onAltRemove={(j) => removeAlt(i, j)}
                  onAltMove={(j, dir) => moveAlt(i, j, dir)}
                  onSetCorrect={(j) => setCorrect(i, j)}
                  onImg={(slot, file) => setImg(i, slot, file)}
                  onImgClear={(slot) => clearImg(i, slot)}
                  onCopyContexto={() => copyContextoFromPrev(i)}
                />
              ))}

              <Button variant="outline" className="w-full border-dashed py-6" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar pregunta
              </Button>
            </div>
          ) : (
            <PreviewEnsayo items={items} />
          )}
        </div>

        {/* Barra de guardado fija */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0 text-sm text-muted-foreground">
              {importing ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums">
                    {progress.done}/{progress.total}
                  </span>
                  <Progress
                    value={progress.total ? Math.round((progress.done / progress.total) * 100) : 0}
                    className="h-1.5 w-40"
                  />
                </div>
              ) : !metaComplete ? (
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Completá título, asignatura, duración y fecha.
                </span>
              ) : tablaErr ? (
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Revisá la tabla de conversión.
                </span>
              ) : itemErrors.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Hay {itemErrors.length} cosa{itemErrors.length === 1 ? '' : 's'} por corregir en las preguntas.
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Listo para guardar {items.length} preguntas con corrección automática.
                </span>
              )}
            </div>

            <Button size="lg" onClick={handleImport} disabled={!canImport}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              {editingId || dupSim ? 'Guardar cambios' : 'Crear simulacro'}
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogo: importar desde texto */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar preguntas desde texto</DialogTitle>
            <DialogDescription>
              Pegá las preguntas en formato simple y se cargan al editor visual (después podés agregarles imágenes).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <pre className="whitespace-pre-wrap font-sans">{FORMATO_AYUDA}</pre>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Si el texto vino de un PDF puede traer cortes raros: revisá la numeración y las alternativas. El PDF de
              preguntas no trae la clave — marcá la correcta con <code className="font-mono">*</code> (o después en el editor).
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              spellCheck={false}
              placeholder="Pegá acá tus preguntas…"
              className="min-h-[220px] font-mono text-sm text-foreground"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setPasteText(EJEMPLO_PEGADO)}>
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  Ejemplo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPasteText('')} disabled={!pasteText}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {pastePreview.questions.length} pregunta{pastePreview.questions.length === 1 ? '' : 's'} detectada
                {pastePreview.questions.length === 1 ? '' : 's'}
              </span>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={pasteReplace} onCheckedChange={setPasteReplace} />
              {pasteReplace ? 'Reemplazar las preguntas actuales' : 'Agregar al final de las actuales'}
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={aplicarPaste} disabled={!pastePreview.questions.length}>
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Cargar al editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// === Conversión record/parsed → modelo editable =============================
function questionToItem(q, nextId) {
  return {
    _id: nextId(),
    enunciado: q.enunciado || '',
    eje: q.eje || '',
    dificultad: q.dificultad || '',
    piloto: !!q.piloto,
    contexto: q.contexto || '',
    explicacion: q.explicacion || '',
    alternativas: (q.alternativas || []).map((a) => ({ texto: a.texto || '', correct: a.letra === q.correcta, img: null })),
    imgEnunciado: null,
    imgContexto: null,
  };
}

function recordToItem(p, nextId) {
  const alts = (Array.isArray(p.alternativas_json) ? p.alternativas_json : []).map((a) => {
    const letra = String(a.letra || '').toUpperCase();
    const fname = p[`imagen_${letra.toLowerCase()}`];
    return {
      texto: a.texto || '',
      correct: letra === p.respuesta_correcta,
      img: fname ? { kind: 'existing', name: fname, url: fileUrl(p, fname) } : null,
    };
  });
  return {
    _id: nextId(),
    _recordId: p.id,
    enunciado: p.enunciado || '',
    eje: p.eje || '',
    dificultad: p.dificultad || '',
    piloto: !!p.piloto,
    contexto: p.contexto || '',
    explicacion: p.explicacion || '',
    alternativas: alts.length ? alts : [emptyAlt(), emptyAlt()],
    imgEnunciado: p.imagen_enunciado ? { kind: 'existing', name: p.imagen_enunciado, url: fileUrl(p, p.imagen_enunciado) } : null,
    imgContexto: p.imagen_contexto ? { kind: 'existing', name: p.imagen_contexto, url: fileUrl(p, p.imagen_contexto) } : null,
  };
}

// === Validación del modelo ==================================================
function validateItems(items) {
  const out = [];
  if (!items.length) {
    out.push({ msg: 'Agregá al menos una pregunta.' });
    return out;
  }
  items.forEach((it, i) => {
    const n = i + 1;
    if (!it.enunciado.trim() && !it.imgEnunciado) out.push({ idx: i, msg: `Pregunta ${n}: falta el enunciado.` });
    const alts = it.alternativas;
    if (alts.length < 2) out.push({ idx: i, msg: `Pregunta ${n}: necesita al menos 2 alternativas.` });
    if (alts.length > 5) out.push({ idx: i, msg: `Pregunta ${n}: máximo 5 alternativas (A–E).` });
    alts.forEach((a, j) => {
      if (!a.texto.trim() && !a.img) out.push({ idx: i, msg: `Pregunta ${n}, alternativa ${LETTERS[j]}: agregá texto o imagen.` });
    });
    const nCorrect = alts.filter((a) => a.correct).length;
    if (!it.piloto && nCorrect !== 1) out.push({ idx: i, msg: `Pregunta ${n}: marcá exactamente una alternativa correcta.` });
    if (it.piloto && nCorrect > 1) out.push({ idx: i, msg: `Pregunta ${n} (piloto): no marques más de una correcta.` });
  });
  return out;
}

// === Subcomponente: input de imagen =========================================
const ImageInput = ({ value, onPick, onClear, label = 'Imagen', size = 'h-16' }) => {
  const inputRef = useRef(null);
  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={value.url} alt="" className={`${size} w-auto rounded border bg-white object-contain`} />
          <button
            type="button"
            onClick={onClear}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow"
            aria-label="Quitar imagen"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => inputRef.current?.click()}>
          <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </Button>
      )}
    </div>
  );
};

// === Subcomponente: editor de una pregunta ==================================
const QuestionEditor = ({
  item,
  index,
  total,
  errors,
  onPatch,
  onRemove,
  onMove,
  onDuplicate,
  onAltPatch,
  onAltAdd,
  onAltRemove,
  onAltMove,
  onSetCorrect,
  onImg,
  onImgClear,
  onCopyContexto,
}) => {
  const [showCtx, setShowCtx] = useState(!!(item.contexto || item.imgContexto));
  const hasErr = errors.length > 0;

  return (
    <Card className={hasErr ? 'border-destructive/40' : ''}>
      <CardContent className="p-4 sm:p-5">
        {/* Cabecera */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
              {index + 1}
            </span>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-2 py-1 text-xs">
              <Switch checked={item.piloto} onCheckedChange={(v) => onPatch({ piloto: v })} />
              Piloto (no puntúa)
            </label>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(-1)} disabled={index === 0} title="Subir">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              title="Bajar"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="Duplicar">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onRemove}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Texto de lectura compartido (opcional) */}
        {showCtx ? (
          <div className="mb-3 rounded-lg border border-info/30 bg-info/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-info">
                <BookOpen className="h-3.5 w-3.5" />
                Texto de lectura
              </span>
              <div className="flex items-center gap-1">
                {index > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCopyContexto}>
                    <Copy className="mr-1 h-3 w-3" />
                    Copiar de la anterior
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    onPatch({ contexto: '' });
                    onImgClear('contexto');
                    setShowCtx(false);
                  }}
                >
                  Quitar
                </Button>
              </div>
            </div>
            <Textarea
              value={item.contexto}
              onChange={(e) => onPatch({ contexto: e.target.value })}
              placeholder="Pasaje / texto base que comparten varias preguntas. Se muestra una vez encabezando el grupo."
              className="min-h-[80px] bg-card text-foreground"
            />
            <div className="mt-2">
              <ImageInput
                value={item.imgContexto}
                onPick={(f) => onImg('contexto', f)}
                onClear={() => onImgClear('contexto')}
                label="Imagen del texto"
              />
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="mb-3 h-7 text-xs text-muted-foreground" onClick={() => setShowCtx(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Texto de lectura compartido
          </Button>
        )}

        {/* Enunciado */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Enunciado <span className="text-destructive">*</span>
            </Label>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sigma className="h-3 w-3" />
              fórmulas entre $…$
            </span>
          </div>
          <Textarea
            value={item.enunciado}
            onChange={(e) => onPatch({ enunciado: e.target.value })}
            placeholder="Escribí la pregunta. Para fórmulas usá LaTeX entre $…$, ej: ¿cuánto vale $x^2 + 1$?"
            className="min-h-[64px] text-foreground"
          />
          <ImageInput value={item.imgEnunciado} onPick={(f) => onImg('enunciado', f)} onClear={() => onImgClear('enunciado')} label="Imagen del enunciado" />
        </div>

        {/* Eje + dificultad */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Eje / contenido</Label>
            <Input
              list="paes-ejes"
              value={item.eje}
              onChange={(e) => onPatch({ eje: e.target.value })}
              placeholder="Ej: Álgebra y funciones"
              className="text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Dificultad</Label>
            <Select value={item.dificultad || 'none'} onValueChange={(v) => onPatch({ dificultad: v === 'none' ? '' : v })}>
              <SelectTrigger className="text-foreground">
                <SelectValue placeholder="Sin definir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin definir</SelectItem>
                {DIFICULTADES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Alternativas */}
        <div className="mt-4 space-y-2">
          <Label className="text-xs text-muted-foreground">
            Alternativas {item.piloto ? '(marcá la correcta si la hay)' : '— marcá la correcta'}
          </Label>
          {item.alternativas.map((alt, j) => {
            const letra = LETTERS[j];
            return (
              <div key={j} className={`flex items-start gap-2 rounded-lg border p-2 ${alt.correct ? 'border-success/50 bg-success/5' : 'border-border/60'}`}>
                <button
                  type="button"
                  onClick={() => onSetCorrect(j)}
                  title="Marcar como correcta"
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    alt.correct ? 'border-success bg-success/10 text-success' : 'text-muted-foreground'
                  }`}
                >
                  {alt.correct ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </button>
                <span className="mt-1.5 w-4 shrink-0 text-center font-mono text-sm font-bold text-muted-foreground">{letra}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input
                    value={alt.texto}
                    onChange={(e) => onAltPatch(j, { texto: e.target.value })}
                    placeholder={`Texto de la alternativa ${letra}`}
                    className="text-foreground"
                  />
                  <ImageInput value={alt.img} onPick={(f) => onImg(j, f)} onClear={() => onImgClear(j)} label="Imagen" size="h-12" />
                </div>
                <div className="flex flex-col">
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAltMove(j, -1)} disabled={j === 0} title="Subir">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onAltMove(j, 1)}
                    disabled={j === item.alternativas.length - 1}
                    title="Bajar"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => onAltRemove(j)}
                    disabled={item.alternativas.length <= 2}
                    title="Quitar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {item.alternativas.length < 5 && (
            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={onAltAdd}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Agregar alternativa
            </Button>
          )}
        </div>

        {/* Explicación */}
        <div className="mt-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Explicación (opcional, se muestra al revisar)</Label>
          <Textarea
            value={item.explicacion}
            onChange={(e) => onPatch({ explicacion: e.target.value })}
            placeholder="Por qué la correcta es la correcta (también admite $fórmulas$)."
            className="min-h-[52px] text-foreground"
          />
        </div>

        {/* Errores de esta pregunta */}
        {hasErr && (
          <ul className="mt-3 space-y-0.5">
            {errors.map((m, k) => (
              <li key={k} className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

// === Subcomponente: vista previa (como la ve el alumno) =====================
const ctxKeyOf = (it) => `${it.contexto || ''}|${it.imgContexto?.url || ''}`;

const PreviewEnsayo = ({ items }) => {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card/40 p-10 text-center text-sm text-muted-foreground">
        Agregá preguntas para ver la vista previa.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {items.map((it, idx, arr) => {
        const ctxKey = ctxKeyOf(it);
        const showCtx = (it.contexto || it.imgContexto) && ctxKey !== (arr[idx - 1] ? ctxKeyOf(arr[idx - 1]) : null);
        return (
          <React.Fragment key={it._id}>
            {showCtx && (
              <Card className="border-info/30 bg-info/5">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-info">
                    <BookOpen className="h-3.5 w-3.5" />
                    Texto
                  </div>
                  {it.imgContexto && (
                    <img src={it.imgContexto.url} alt="" className="mb-2 max-h-72 w-auto rounded border bg-white object-contain" />
                  )}
                  {it.contexto && (
                    <RichText as="div" className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                      {it.contexto}
                    </RichText>
                  )}
                </CardContent>
              </Card>
            )}
            <PreviewPregunta it={it} idx={idx} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

const PreviewPregunta = ({ it, idx }) => (
  <Card>
    <CardContent className="p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
          {idx + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {it.eje && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {it.eje}
              </Badge>
            )}
            {it.dificultad && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {DIFICULTAD_LABEL[it.dificultad] || it.dificultad}
              </Badge>
            )}
            {it.piloto && (
              <Badge className="border-0 bg-amber-100 text-[10px] font-normal text-amber-800">Piloto</Badge>
            )}
          </div>
          <RichText as="p" className="whitespace-pre-line font-medium leading-relaxed">
            {it.enunciado || '(sin enunciado)'}
          </RichText>
          {it.imgEnunciado && (
            <img src={it.imgEnunciado.url} alt="" className="mt-2 max-h-72 w-auto rounded border bg-white object-contain" />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {it.alternativas.map((alt, j) => {
          const letra = LETTERS[j];
          return (
            <div
              key={j}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                alt.correct ? 'border-success/50 bg-success/10' : 'border-transparent'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  alt.correct ? 'border-success/50 text-success' : 'text-muted-foreground'
                }`}
              >
                {letra}
              </span>
              <div className="min-w-0 flex-1">
                {alt.texto && (
                  <RichText as="span" className="leading-snug">
                    {alt.texto}
                  </RichText>
                )}
                {alt.img && <img src={alt.img.url} alt="" className="mt-1 max-h-40 w-auto rounded border bg-white object-contain" />}
              </div>
              {alt.correct && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
            </div>
          );
        })}
      </div>

      {it.explicacion && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Explicación: </span>
          <RichText as="span">{it.explicacion}</RichText>
        </div>
      )}
    </CardContent>
  </Card>
);

export default AdminPAESImportPage;
