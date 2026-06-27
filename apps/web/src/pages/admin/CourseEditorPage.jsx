import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  PlayCircle,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useConfirm } from '@/components/shared/useConfirm.jsx';

const MATERIAS = [
  { value: 'matematica_m1', label: 'Matemática M1' },
  { value: 'matematica_m2', label: 'Matemática M2' },
  { value: 'competencia_lectora', label: 'Competencia Lectora' },
  { value: 'ciencias', label: 'Ciencias' },
  { value: 'historia', label: 'Historia y Cs. Sociales' },
  { value: 'ingles', label: 'Inglés' },
  { value: 'otra', label: 'Otra' },
];
const NIVELES = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];
const MODALIDADES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
  { value: 'mixta', label: 'Mixta' },
];
// color_tema / icono deben coincidir con los mapas de CourseDetailPage.
const TEMAS = [
  { value: 'primary', label: 'Verde' },
  { value: 'info', label: 'Azul' },
  { value: 'accent', label: 'Ámbar' },
  { value: 'success', label: 'Verde claro' },
];
const ICONOS = [
  { value: 'BookOpen', label: 'Libro' },
  { value: 'GraduationCap', label: 'Birrete' },
  { value: 'Dna', label: 'ADN' },
  { value: 'Atom', label: 'Átomo' },
  { value: 'FlaskConical', label: 'Matraz' },
];

const EMPTY = {
  nombre: '',
  descripcion: '',
  materia: '',
  nivel: '',
  modalidad_default: '',
  anio_lectivo: '',
  color_tema: 'primary',
  icono: 'BookOpen',
  syllabus_markdown: '',
};

const CourseEditorPage = () => {
  const { cursoId } = useParams();
  const isNew = !cursoId || cursoId === 'nuevo';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState('detalles');
  const [form, setForm] = useState(EMPTY);
  const [portada, setPortada] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: course } = useQuery({
    enabled: !isNew,
    queryKey: ['curso-editor', cursoId],
    queryFn: () => pb.collection('cursos').getOne(cursoId, { $autoCancel: false }),
  });

  useEffect(() => {
    if (!course) return;
    setForm({
      nombre: course.nombre || '',
      descripcion: course.descripcion || '',
      materia: course.materia || '',
      nivel: course.nivel || '',
      modalidad_default: course.modalidad_default || '',
      anio_lectivo: course.anio_lectivo || '',
      color_tema: course.color_tema || 'primary',
      icono: course.icono || 'BookOpen',
      syllabus_markdown: course.syllabus_markdown || '',
    });
  }, [course]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('El nombre del curso es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nombre', form.nombre.trim());
      fd.append('descripcion', form.descripcion || '');
      fd.append('color_tema', form.color_tema || 'primary');
      fd.append('icono', form.icono || 'BookOpen');
      fd.append('syllabus_markdown', form.syllabus_markdown || '');
      if (form.materia) fd.append('materia', form.materia);
      if (form.nivel) fd.append('nivel', form.nivel);
      if (form.modalidad_default) fd.append('modalidad_default', form.modalidad_default);
      if (form.anio_lectivo) fd.append('anio_lectivo', String(form.anio_lectivo));
      if (portada) fd.append('portada', portada);

      if (isNew) {
        const rec = await pb.collection('cursos').create(fd, { $autoCancel: false });
        toast.success('Curso creado. Ahora agregá las lecciones.');
        navigate(`/dashboard/admin/curso/${rec.id}`, { replace: true });
        setTab('lecciones');
      } else {
        await pb.collection('cursos').update(cursoId, fd, { $autoCancel: false });
        qc.invalidateQueries({ queryKey: ['curso-editor', cursoId] });
        toast.success('Cambios guardados');
      }
    } catch (err) {
      toast.error('No se pudo guardar: ' + (err?.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{isNew ? 'Nuevo curso' : 'Editar curso'} | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-16">
        <div className="border-b bg-card">
          <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground hover:text-foreground">
              <Link to="/dashboard/admin?tab=cursos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a cursos
              </Link>
            </Button>
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              {isNew ? 'Nuevo curso' : form.nombre || 'Editar curso'}
            </h1>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="detalles">Detalles</TabsTrigger>
              <TabsTrigger value="lecciones" disabled={isNew}>
                Lecciones
              </TabsTrigger>
            </TabsList>

            {/* DETALLES */}
            <TabsContent value="detalles" className="mt-6">
              <form onSubmit={guardar}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Información del curso</CardTitle>
                    <CardDescription>Lo que ve el estudiante en la portada y el detalle.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">
                        Nombre <span className="text-destructive">*</span>
                      </Label>
                      <Input id="nombre" value={form.nombre} onChange={(e) => setField('nombre', e.target.value)} placeholder="Ej: Ciencias — Biología" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="descripcion">Descripción</Label>
                      <Textarea id="descripcion" rows={2} value={form.descripcion} onChange={(e) => setField('descripcion', e.target.value)} placeholder="Resumen corto del curso" className="resize-none" />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Materia</Label>
                        <Select value={form.materia} onValueChange={(v) => setField('materia', v)}>
                          <SelectTrigger><SelectValue placeholder="Elegí materia" /></SelectTrigger>
                          <SelectContent>
                            {MATERIAS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nivel</Label>
                        <Select value={form.nivel} onValueChange={(v) => setField('nivel', v)}>
                          <SelectTrigger><SelectValue placeholder="Elegí nivel" /></SelectTrigger>
                          <SelectContent>
                            {NIVELES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Modalidad por defecto</Label>
                        <Select value={form.modalidad_default} onValueChange={(v) => setField('modalidad_default', v)}>
                          <SelectTrigger><SelectValue placeholder="Elegí modalidad" /></SelectTrigger>
                          <SelectContent>
                            {MODALIDADES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="anio">Año lectivo</Label>
                        <Input id="anio" type="number" min={2024} max={2099} value={form.anio_lectivo} onChange={(e) => setField('anio_lectivo', e.target.value)} placeholder="2027" />
                      </div>
                      <div className="space-y-2">
                        <Label>Color del tema</Label>
                        <Select value={form.color_tema} onValueChange={(v) => setField('color_tema', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TEMAS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Icono</Label>
                        <Select value={form.icono} onValueChange={(v) => setField('icono', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ICONOS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portada">Imagen de portada</Label>
                      <Input id="portada" type="file" accept="image/*" onChange={(e) => setPortada(e.target.files?.[0] || null)} className="cursor-pointer" />
                      {!isNew && course?.portada && <p className="text-xs text-muted-foreground">Ya hay una portada cargada. Subí una nueva para reemplazarla.</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="syllabus">Temario (acepta HTML)</Label>
                      <Textarea id="syllabus" rows={6} value={form.syllabus_markdown} onChange={(e) => setField('syllabus_markdown', e.target.value)} placeholder="<h3>Unidad 1</h3><ul><li>...</li></ul>" className="font-mono text-xs" />
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-4 flex justify-end">
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Guardando…' : isNew ? 'Crear curso' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* LECCIONES */}
            <TabsContent value="lecciones" className="mt-6">
              {isNew ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    Guardá los detalles del curso primero para empezar a agregar lecciones.
                  </CardContent>
                </Card>
              ) : (
                <LeccionesManager cursoId={cursoId} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

const LECCION_EMPTY = { titulo: '', descripcion: '', video_url: '', duracion_estimada_min: '', publicada: true };

const LeccionesManager = ({ cursoId }) => {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState(null); // null | 'new' | leccion
  const [lf, setLf] = useState(LECCION_EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: lecciones = [], isLoading } = useQuery({
    queryKey: ['curso-lecciones', cursoId],
    queryFn: () => pb.collection('lecciones').getFullList({ filter: `curso_id = "${cursoId}"`, sort: '+orden', $autoCancel: false }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['curso-lecciones', cursoId] });

  const startNew = () => { setLf(LECCION_EMPTY); setEditing('new'); };
  const startEdit = (l) => {
    setLf({
      titulo: l.titulo || '',
      descripcion: l.descripcion || '',
      video_url: l.video_url || '',
      duracion_estimada_min: l.duracion_estimada_min || '',
      publicada: !!l.publicada,
    });
    setEditing(l);
  };

  const save = async () => {
    if (!lf.titulo.trim()) { toast.error('El título de la lección es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = {
        curso_id: cursoId,
        titulo: lf.titulo.trim(),
        descripcion: lf.descripcion || '',
        video_url: lf.video_url || '',
        duracion_estimada_min: lf.duracion_estimada_min ? Number(lf.duracion_estimada_min) : null,
        publicada: lf.publicada,
      };
      if (editing === 'new') {
        const nextOrden = lecciones.length ? Math.max(...lecciones.map((l) => l.orden || 0)) + 1 : 1;
        await pb.collection('lecciones').create({ ...payload, orden: nextOrden }, { $autoCancel: false });
        toast.success('Lección agregada');
      } else {
        await pb.collection('lecciones').update(editing.id, payload, { $autoCancel: false });
        toast.success('Lección actualizada');
      }
      invalidate();
      setEditing(null);
    } catch (err) {
      toast.error('No se pudo guardar la lección');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    try {
      await pb.collection('lecciones').delete(id, { $autoCancel: false });
      invalidate();
      toast.success('Lección eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const move = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= lecciones.length) return;
    const a = lecciones[idx];
    const b = lecciones[target];
    try {
      await Promise.all([
        pb.collection('lecciones').update(a.id, { orden: b.orden ?? target }, { $autoCancel: false }),
        pb.collection('lecciones').update(b.id, { orden: a.orden ?? idx }, { $autoCancel: false }),
      ]);
      invalidate();
    } catch {
      toast.error('No se pudo reordenar');
    }
  };

  const togglePub = async (l) => {
    try {
      await pb.collection('lecciones').update(l.id, { publicada: !l.publicada }, { $autoCancel: false });
      invalidate();
    } catch {
      toast.error('No se pudo cambiar el estado');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {lecciones.length} {lecciones.length === 1 ? 'lección' : 'lecciones'}
        </p>
        {!editing && (
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar lección
          </Button>
        )}
      </div>

      {editing && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{editing === 'new' ? 'Nueva lección' : 'Editar lección'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="l-titulo">Título <span className="text-destructive">*</span></Label>
              <Input id="l-titulo" value={lf.titulo} onChange={(e) => setLf((p) => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Unidad 1 — La célula" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l-desc">Descripción</Label>
              <Textarea id="l-desc" rows={2} value={lf.descripcion} onChange={(e) => setLf((p) => ({ ...p, descripcion: e.target.value }))} className="resize-none" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="l-video">URL del video</Label>
                <Input id="l-video" type="url" value={lf.video_url} onChange={(e) => setLf((p) => ({ ...p, video_url: e.target.value }))} placeholder="https://youtube.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-dur">Duración (min)</Label>
                <Input id="l-dur" type="number" min={0} value={lf.duracion_estimada_min} onChange={(e) => setLf((p) => ({ ...p, duracion_estimada_min: e.target.value }))} placeholder="45" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="l-pub" checked={lf.publicada} onCheckedChange={(v) => setLf((p) => ({ ...p, publicada: v }))} />
              <Label htmlFor="l-pub" className="cursor-pointer">Publicada (visible para el alumno)</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando…' : 'Guardar lección'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando lecciones…</CardContent></Card>
      ) : lecciones.length === 0 && !editing ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <PlayCircle className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">Todavía no hay lecciones. Agregá la primera.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lecciones.map((l, idx) => (
            <Card key={l.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold tabular-nums text-primary">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{l.titulo}</p>
                    {!l.publicada && <Badge variant="secondary" className="text-[10px]">Borrador</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.video_url ? l.video_url : 'Sin video'}
                    {Number(l.duracion_estimada_min) > 0 ? ` · ${l.duracion_estimada_min} min` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(idx, -1)} disabled={idx === 0} title="Subir">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(idx, 1)} disabled={idx === lecciones.length - 1} title="Bajar">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePub(l)} title={l.publicada ? 'Despublicar' : 'Publicar'}>
                    {l.publicada ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(l)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => confirm({ title: 'Eliminar lección', description: 'Se elimina la lección. No se puede deshacer.', confirmLabel: 'Eliminar', destructive: true, action: () => del(l.id) })}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
};

export default CourseEditorPage;
