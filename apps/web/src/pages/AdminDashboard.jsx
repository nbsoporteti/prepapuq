import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { BookOpen, FolderOpen, Users, Trash2, Plus, AlertCircle, CalendarCheck, GraduationCap, Pencil, FileUp, LayoutDashboard, UserCog, Archive, ArchiveRestore } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import MaterialCard from '@/components/MaterialCard.jsx';
import CourseCard from '@/components/CourseCard.jsx';
import StudentSearchCombobox from '@/components/StudentSearchCombobox.jsx';
import EnrolledStudentsList from '@/components/EnrolledStudentsList.jsx';
import AttendanceTab from '@/components/AttendanceTab.jsx';
import AdminOverviewTab from '@/components/admin/AdminOverviewTab.jsx';
import UsuariosTab from '@/components/admin/UsuariosTab.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/components/shared/useConfirm.jsx';

const ASIGNATURA_PAES_LABEL = {
  competencia_lectora: 'Competencia Lectora',
  matematica_m1: 'Matemática M1',
  matematica_m2: 'Matemática M2',
  historia: 'Historia y Cs. Sociales',
  ciencias: 'Ciencias',
};

// Validación del material antes de crearlo (el enlace debe ser una URL real).
const materialSchema = z.object({
  titulo: z.string().trim().min(2, 'Título muy corto').max(150, 'Demasiado largo'),
  tipo: z.enum(['PDF', 'Link'], { errorMap: () => ({ message: 'Elegí el tipo' }) }),
  enlace: z.string().trim().url('Tiene que ser una URL válida (https://…)').max(500),
});

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const { confirm, dialog } = useConfirm();
  
  const qc = useQueryClient();

  // --- DATOS (react-query: caché + invalidación, sin refetch manual ni carreras) ---
  const { data: cursos = [], isLoading: loadingCursos } = useQuery({
    queryKey: ['admin', 'cursos'],
    queryFn: () => pb.collection('cursos').getFullList({ sort: '-created', $autoCancel: false }),
  });

  const { data: simulacrosPaes = [] } = useQuery({
    queryKey: ['admin', 'simulacros'],
    queryFn: async () => {
      // La colección puede no existir todavía (backend sin redeploy): no es fatal.
      try {
        return await pb.collection('simulacros_paes').getFullList({ sort: '-created', $autoCancel: false });
      } catch (_e) {
        return [];
      }
    },
  });

  // Tab 2: Materiales (form local + query por curso seleccionado)
  const [selectedCourseForMaterial, setSelectedCourseForMaterial] = useState('');
  const [materialForm, setMaterialForm] = useState({ titulo: '', tipo: '', enlace: '' });
  const [materialErrors, setMaterialErrors] = useState({});
  const [isSubmittingMaterial, setIsSubmittingMaterial] = useState(false);

  const { data: materiales = [] } = useQuery({
    queryKey: ['admin', 'materiales', selectedCourseForMaterial],
    enabled: !!selectedCourseForMaterial,
    queryFn: () =>
      pb.collection('materiales').getFullList({
        filter: `curso_id = "${selectedCourseForMaterial}"`,
        sort: '-created',
        $autoCancel: false,
      }),
  });

  // Tab 3 & 4: Matriculación & Asistencia
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState('');
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const { data: asignaciones = [], isFetching: isLoadingAsignaciones } = useQuery({
    queryKey: ['admin', 'asignaciones', selectedCourseForAssign],
    enabled: !!selectedCourseForAssign,
    queryFn: async () => {
      const records = await pb.collection('asignaciones').getList(1, 500, {
        filter: `curso_id="${selectedCourseForAssign}"`,
        expand: 'user_id',
        sort: '-created',
        $autoCancel: false,
      });
      // Fallback: si el expand no vino, resolvemos los users a mano.
      const missingExpand = records.items.some((r) => !r.expand?.user_id && r.user_id);
      if (missingExpand) {
        const userIds = [...new Set(records.items.map((r) => r.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const filterStr = userIds.map((id) => `id="${id}"`).join(' || ');
          const users = await pb.collection('users').getFullList({ filter: filterStr, $autoCancel: false });
          const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
          records.items.forEach((r) => {
            if (!r.expand) r.expand = {};
            if (!r.expand.user_id && userMap[r.user_id]) r.expand.user_id = userMap[r.user_id];
          });
        }
      }
      return records.items;
    },
  });

  // Derived Array of enrolled student IDs from the fetched asignaciones
  const enrolledStudentIds = asignaciones.map((a) => String(a.user_id));

  // Cursos visibles vs archivados (soft-delete: "archivar" en vez de borrar).
  const cursosActivos = cursos.filter((c) => !c.archivado);
  const cursosArchivados = cursos.filter((c) => c.archivado);

  // Helper function to check if student is already enrolled (UI level)
  const isStudentAlreadyEnrolled = (studentId) => {
    if (!studentId) return false;
    return enrolledStudentIds.includes(String(studentId));
  };

  // Al cambiar de curso para matricular, limpiamos el alumno seleccionado.
  useEffect(() => {
    setSelectedStudentForAssign('');
  }, [selectedCourseForAssign]);

  const handleDeleteSimulacro = async (id) => {
    try {
      await pb.collection('simulacros_paes').delete(id, { $autoCancel: false });
      toast.success('Simulacro eliminado');
      qc.invalidateQueries({ queryKey: ['admin', 'simulacros'] });
    } catch (err) {
      toast.error('Error al eliminar el simulacro');
    }
  };

  // --- ACTIONS: CURSOS ---
  // El alta y la edición de cursos (metadata + temario + lecciones) viven en
  // CourseEditorPage (/dashboard/admin/curso/:id). Acá solo archivar/restaurar.

  // "Eliminar" = archivar (soft-delete). Borrar de verdad falla porque el curso
  // está referenciado por relaciones obligatorias (secciones, matrículas, etc.).
  const handleArchiveCourse = async (id) => {
    try {
      await pb.collection('cursos').update(id, { archivado: true }, { $autoCancel: false });
      toast.success('Curso archivado');
      qc.invalidateQueries({ queryKey: ['admin', 'cursos'] });
      if (selectedCourseForMaterial === id) setSelectedCourseForMaterial('');
      if (selectedCourseForAssign === id) setSelectedCourseForAssign('');
    } catch (err) {
      toast.error('No se pudo archivar el curso: ' + (err?.message || 'error desconocido'));
    }
  };

  const handleRestoreCourse = async (id) => {
    try {
      await pb.collection('cursos').update(id, { archivado: false }, { $autoCancel: false });
      toast.success('Curso restaurado');
      qc.invalidateQueries({ queryKey: ['admin', 'cursos'] });
    } catch (err) {
      toast.error('No se pudo restaurar el curso: ' + (err?.message || 'error desconocido'));
    }
  };

  // --- ACTIONS: MATERIALES ---

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!selectedCourseForMaterial) {
      toast.error('Selecciona un curso primero');
      return;
    }
    const parsed = materialSchema.safeParse(materialForm);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setMaterialErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]])));
      toast.error('Revisá los datos del material');
      return;
    }
    setMaterialErrors({});
    setIsSubmittingMaterial(true);
    try {
      await pb.collection('materiales').create({
        ...parsed.data,
        curso_id: selectedCourseForMaterial
      }, { $autoCancel: false });
      toast.success('Material añadido exitosamente');
      setMaterialForm({ titulo: '', tipo: '', enlace: '' });
      qc.invalidateQueries({ queryKey: ['admin', 'materiales', selectedCourseForMaterial] });
    } catch (err) {
      toast.error('Error al añadir material');
    } finally {
      setIsSubmittingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    try {
      await pb.collection('materiales').delete(id, { $autoCancel: false });
      toast.success('Material eliminado');
      qc.invalidateQueries({ queryKey: ['admin', 'materiales', selectedCourseForMaterial] });
    } catch (err) {
      toast.error('Error al eliminar material');
    }
  };

  // --- ACTIONS: MATRICULACIÓN ---

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!selectedCourseForAssign || !selectedStudentForAssign) {
      toast.error('Selecciona curso y estudiante');
      return;
    }

    if (isStudentAlreadyEnrolled(selectedStudentForAssign)) {
      toast.error('El estudiante ya está matriculado en este curso');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const filterQuery = `curso_id="${selectedCourseForAssign}" && user_id="${selectedStudentForAssign}"`;
      const duplicateCheck = await pb.collection('asignaciones').getList(1, 1, {
        filter: filterQuery,
        $autoCancel: false
      });

      if (duplicateCheck.items.length > 0) {
        toast.error('El estudiante ya está matriculado en este curso');
        return;
      }

      await pb.collection('asignaciones').create({
        user_id: selectedStudentForAssign,
        curso_id: selectedCourseForAssign
      }, { $autoCancel: false });
      
      toast.success('Estudiante matriculado exitosamente');
      setSelectedStudentForAssign(''); 
      qc.invalidateQueries({ queryKey: ['admin', 'asignaciones', selectedCourseForAssign] });
    } catch (err) {
      toast.error('Error al matricular estudiante: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRemoveStudent = async (id) => {
    try {
      await pb.collection('asignaciones').delete(id, { $autoCancel: false });
      toast.success('Matrícula removida exitosamente');
      qc.invalidateQueries({ queryKey: ['admin', 'asignaciones', selectedCourseForAssign] });
    } catch (err) {
      toast.error('Error al remover matrícula');
    }
  };

  return (
    <>
      <Helmet>
        <title>Panel de Administración | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-slate-950 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-white text-balance">
              Panel de <span className="text-primary">Administración</span>
            </h1>
            <p className="text-slate-400">Gestiona cursos, materiales, matrículas y asistencia del sistema educativo.</p>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="resumen" className="w-full">
            <TabsList className="mb-8 grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 max-w-6xl bg-card shadow-sm h-auto p-1 border border-border/50">
              <TabsTrigger value="resumen" className="py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="cursos" className="py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                <BookOpen className="w-4 h-4 mr-2" />
                Cursos
              </TabsTrigger>
              <TabsTrigger value="materiales" className="py-3 data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary transition-all">
                <FolderOpen className="w-4 h-4 mr-2" />
                Materiales
              </TabsTrigger>
              <TabsTrigger value="alumnos" className="py-3 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 transition-all">
                <Users className="w-4 h-4 mr-2" />
                Matriculación
              </TabsTrigger>
              <TabsTrigger value="asistencia" className="py-3 data-[state=active]:bg-green-100 data-[state=active]:text-green-700 transition-all">
                <CalendarCheck className="w-4 h-4 mr-2" />
                Asistencia
              </TabsTrigger>
              <TabsTrigger value="paes" className="py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                <GraduationCap className="w-4 h-4 mr-2" />
                Ensayos PAES
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                <UserCog className="w-4 h-4 mr-2" />
                Usuarios
              </TabsTrigger>
            </TabsList>

            {/* TAB 0: RESUMEN */}
            <TabsContent value="resumen" className="space-y-8 animate-in fade-in-50 duration-500">
              <AdminOverviewTab />
            </TabsContent>

            {/* TAB 1: CURSOS */}
            <TabsContent value="cursos" className="space-y-8 animate-in fade-in-50 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 h-fit border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle>Crear nuevo curso</CardTitle>
                    <CardDescription>Editor completo: metadata, temario, portada y lecciones.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full transition-all duration-200 active:scale-[0.98]">
                      <Link to="/dashboard/admin/curso/nuevo">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo curso
                      </Link>
                    </Button>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      Vas a poder cargar materia, nivel, temario, imagen y las lecciones en video,
                      todo en una pantalla.
                    </p>
                  </CardContent>
                </Card>

                <div className="lg:col-span-2">
                  <h3 className="text-xl font-semibold mb-4">Cursos Activos ({cursosActivos.length})</h3>
                  {loadingCursos ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-40 rounded-2xl" />
                      <Skeleton className="h-40 rounded-2xl" />
                    </div>
                  ) : cursosActivos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center shadow-sm">
                      <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground font-medium">No hay cursos activos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cursosActivos.map(curso => (
                        <div key={curso.id} className="relative group">
                          <CourseCard course={curso} />
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Button variant="secondary" size="icon" className="shadow-sm" asChild title="Editar curso">
                              <Link to={`/dashboard/admin/curso/${curso.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="shadow-sm"
                              onClick={() => confirm({
                                title: 'Archivar curso',
                                description: 'Se oculta de la gestión pero no se borra; podés restaurarlo cuando quieras.',
                                confirmLabel: 'Archivar',
                                action: () => handleArchiveCourse(curso.id),
                              })}
                              title="Archivar curso"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cursosArchivados.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                        Archivados ({cursosArchivados.length})
                      </h4>
                      <div className="space-y-2">
                        {cursosArchivados.map(curso => (
                          <div
                            key={curso.id}
                            className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2.5"
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-foreground">{curso.nombre}</span>
                            <Button variant="outline" size="sm" onClick={() => handleRestoreCourse(curso.id)}>
                              <ArchiveRestore className="mr-1.5 h-4 w-4" />
                              Restaurar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: MATERIALES */}
            <TabsContent value="materiales" className="space-y-8 animate-in fade-in-50 duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-1 space-y-6">
                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>Seleccionar Curso</CardTitle>
                        <CardDescription>Elige un curso para gestionar su material.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select value={selectedCourseForMaterial} onValueChange={setSelectedCourseForMaterial}>
                          <SelectTrigger className="w-full text-foreground font-medium">
                            <SelectValue placeholder="Selecciona un curso..." />
                          </SelectTrigger>
                          <SelectContent>
                            {cursosActivos.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {selectedCourseForMaterial && (
                      <Card className="border-secondary/50 shadow-sm">
                        <CardHeader>
                          <CardTitle>Añadir Material</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleCreateMaterial} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="tituloMat">Título</Label>
                              <Input 
                                id="tituloMat" 
                                value={materialForm.titulo}
                                onChange={e => setMaterialForm({...materialForm, titulo: e.target.value})}
                                placeholder="Ej: Guía de Álgebra" 
                                className="text-foreground"
                                required
                              />
                              {materialErrors.titulo && <p className="text-xs text-destructive">{materialErrors.titulo}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo de Material</Label>
                              <Select value={materialForm.tipo} onValueChange={v => setMaterialForm({...materialForm, tipo: v})}>
                                <SelectTrigger className="text-foreground">
                                  <SelectValue placeholder="Seleccione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PDF">Documento PDF</SelectItem>
                                  <SelectItem value="Link">Enlace / Video</SelectItem>
                                </SelectContent>
                              </Select>
                              {materialErrors.tipo && <p className="text-xs text-destructive">{materialErrors.tipo}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="enlaceMat">URL / Enlace</Label>
                              <Input 
                                id="enlaceMat" 
                                value={materialForm.enlace}
                                onChange={e => setMaterialForm({...materialForm, enlace: e.target.value})}
                                placeholder="https://..." 
                                type="url"
                                className="text-foreground"
                                required
                              />
                              {materialErrors.enlace && <p className="text-xs text-destructive">{materialErrors.enlace}</p>}
                            </div>
                            <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 transition-all duration-200 active:scale-[0.98]" disabled={isSubmittingMaterial}>
                              <Plus className="h-4 w-4 mr-2" /> Añadir al Curso
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    )}
                 </div>

                 <div className="lg:col-span-2">
                   <h3 className="text-xl font-semibold mb-4">Materiales Asignados</h3>
                   {!selectedCourseForMaterial ? (
                      <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center shadow-sm">
                        <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">Selecciona un curso primero para ver sus materiales.</p>
                      </div>
                   ) : materiales.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center shadow-sm">
                        <FolderOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">El curso no tiene materiales todavía.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {materiales.map(mat => (
                          <MaterialCard
                            key={mat.id}
                            material={mat}
                            onDelete={(id) => confirm({ title: 'Eliminar material', description: '¿Eliminar este material del curso?', confirmLabel: 'Eliminar', destructive: true, action: () => handleDeleteMaterial(id) })}
                            isAdmin={true}
                          />
                        ))}
                      </div>
                   )}
                 </div>
               </div>
            </TabsContent>

            {/* TAB 3: MATRICULACIÓN */}
            <TabsContent value="alumnos" className="space-y-8 animate-in fade-in-50 duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-1 space-y-6">
                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>Seleccionar Curso</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={selectedCourseForAssign} onValueChange={setSelectedCourseForAssign}>
                          <SelectTrigger className="w-full text-foreground font-medium">
                            <SelectValue placeholder="Selecciona un curso..." />
                          </SelectTrigger>
                          <SelectContent>
                            {cursosActivos.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {selectedCourseForAssign && (
                      <Card className="border-orange-500/30 shadow-sm">
                        <CardHeader>
                          <CardTitle>Matricular Estudiante</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleAssignStudent} className="space-y-4">
                            <div className="space-y-2">
                              <Label>Estudiante</Label>
                              <StudentSearchCombobox 
                                value={selectedStudentForAssign}
                                onChange={setSelectedStudentForAssign}
                                enrolledStudentIds={enrolledStudentIds}
                              />
                            </div>

                            {isStudentAlreadyEnrolled(selectedStudentForAssign) && (
                              <div className="flex items-center gap-2 text-sm text-destructive mt-2 bg-destructive/10 p-2.5 rounded-md border border-destructive/20 animate-in fade-in-50">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>El estudiante ya está matriculado en este curso</span>
                              </div>
                            )}

                            <Button 
                              type="submit" 
                              className="w-full bg-orange-600 hover:bg-orange-700 text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed" 
                              disabled={isSubmittingAssign || !selectedStudentForAssign || isStudentAlreadyEnrolled(selectedStudentForAssign)}
                            >
                              {isSubmittingAssign ? 'Matriculando...' : 'Matricular'}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    )}
                 </div>

                 <div className="lg:col-span-2">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xl font-semibold">
                       {asignaciones.length} {asignaciones.length === 1 ? 'estudiante matriculado' : 'estudiantes matriculados'}
                     </h3>
                     {isLoadingAsignaciones && (
                       <span className="text-sm text-muted-foreground animate-pulse">Cargando...</span>
                     )}
                   </div>
                   
                   <EnrolledStudentsList 
                     asignaciones={asignaciones} 
                     onRemove={(id) => confirm({ title: 'Remover estudiante', description: '¿Sacar a este estudiante del curso?', confirmLabel: 'Remover', destructive: true, action: () => handleRemoveStudent(id) })}
                     courseSelected={!!selectedCourseForAssign}
                   />
                 </div>
               </div>
            </TabsContent>

            {/* TAB 4: ASISTENCIA */}
            <TabsContent value="asistencia" className="space-y-8 animate-in fade-in-50 duration-500">
              <AttendanceTab
                cursos={cursos}
                selectedCourse={selectedCourseForAssign}
                onCourseChange={setSelectedCourseForAssign}
                asignaciones={asignaciones}
                isLoading={isLoadingAsignaciones}
              />
            </TabsContent>

            {/* TAB 5: ENSAYOS PAES */}
            <TabsContent value="paes" className="space-y-8 animate-in fade-in-50 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 h-fit border-primary/30 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Importar ensayo PAES
                    </CardTitle>
                    <CardDescription>
                      Pegá las preguntas en texto y el sistema arma la clave solo. Queda
                      auto-corrigiendo, igual que los mini-ensayos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button asChild className="w-full">
                      <Link to="/dashboard/admin/paes">
                        <FileUp className="h-4 w-4 mr-2" />
                        Nuevo ensayo (pegar preguntas)
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Solo contenido propio o autorizado. No subas transcripciones de ensayos
                      oficiales DEMRE (su licencia lo prohíbe).
                    </p>
                  </CardContent>
                </Card>

                <div className="lg:col-span-2">
                  <h3 className="text-xl font-semibold mb-4">
                    Simulacros cargados ({simulacrosPaes.length})
                  </h3>
                  {simulacrosPaes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center shadow-sm">
                      <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground font-medium">No hay simulacros todavía</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Creá el primero con “Nuevo ensayo”.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {simulacrosPaes.map((s) => {
                        const interactivo = s.modo === 'interactivo';
                        const publicado = s.estado === 'publicado';
                        return (
                          <div
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{s.titulo}</span>
                                <Badge variant="outline" className="font-normal">
                                  {ASIGNATURA_PAES_LABEL[s.asignatura] || s.asignatura}
                                </Badge>
                                {interactivo ? (
                                  <Badge className="border-0 bg-primary/10 text-primary">Interactivo</Badge>
                                ) : (
                                  <Badge variant="secondary">PDF</Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={publicado ? 'border-success/40 text-success' : 'text-muted-foreground'}
                                >
                                  {publicado ? 'Publicado' : s.estado}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {s.n_preguntas_total || 0} preguntas
                                {s.duracion_min ? ` · ${s.duracion_min} min` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {interactivo && (
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/dashboard/admin/paes?id=${s.id}`}>
                                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                    Editar
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => confirm({
                                  title: 'Eliminar simulacro',
                                  description: 'Se elimina el simulacro y todas sus preguntas. No se puede deshacer.',
                                  confirmLabel: 'Eliminar',
                                  destructive: true,
                                  action: () => handleDeleteSimulacro(s.id),
                                })}
                                title="Eliminar simulacro"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 6: USUARIOS */}
            <TabsContent value="usuarios" className="space-y-8 animate-in fade-in-50 duration-500">
              <UsuariosTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {dialog}
    </>
  );
};

export default AdminDashboard;