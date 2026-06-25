import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
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

const ASIGNATURA_PAES_LABEL = {
  competencia_lectora: 'Competencia Lectora',
  matematica_m1: 'Matemática M1',
  matematica_m2: 'Matemática M2',
  historia: 'Historia y Cs. Sociales',
  ciencias: 'Ciencias',
};

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  
  // Shared State
  const [cursos, setCursos] = useState([]);
  const [simulacrosPaes, setSimulacrosPaes] = useState([]);

  // Tab 1 State: Cursos
  const [courseForm, setCourseForm] = useState({ nombre: '', descripcion: '', portada: null });
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);

  // Tab 2 State: Materiales
  const [selectedCourseForMaterial, setSelectedCourseForMaterial] = useState('');
  const [materiales, setMateriales] = useState([]);
  const [materialForm, setMaterialForm] = useState({ titulo: '', tipo: '', enlace: '' });
  const [isSubmittingMaterial, setIsSubmittingMaterial] = useState(false);

  // Tab 3 & 4 Shared State: Matriculación & Asistencia
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState('');
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState('');
  const [asignaciones, setAsignaciones] = useState([]);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [isLoadingAsignaciones, setIsLoadingAsignaciones] = useState(false);

  // Derived Array of enrolled student IDs from the fetched asignaciones
  const enrolledStudentIds = asignaciones.map(a => String(a.user_id));

  // Cursos visibles vs archivados (soft-delete: "archivar" en vez de borrar).
  const cursosActivos = cursos.filter((c) => !c.archivado);
  const cursosArchivados = cursos.filter((c) => c.archivado);

  // Helper function to check if student is already enrolled (UI level)
  const isStudentAlreadyEnrolled = (studentId) => {
    if (!studentId) return false;
    return enrolledStudentIds.includes(String(studentId));
  };

  // Initial Load
  useEffect(() => {
    fetchCursos();
    fetchSimulacrosPaes();
  }, []);

  const fetchCursos = async () => {
    try {
      const records = await pb.collection('cursos').getFullList({ sort: '-created', $autoCancel: false });
      setCursos(records);
    } catch (err) {
      console.error('[ENROLLMENT DEBUG]', 'Error fetching courses:', err);
      toast.error('Error al cargar cursos');
    }
  };

  const fetchSimulacrosPaes = async () => {
    try {
      const records = await pb.collection('simulacros_paes').getFullList({ sort: '-created', $autoCancel: false });
      setSimulacrosPaes(records);
    } catch (err) {
      // La colección puede no existir todavía (backend sin redeploy): no es fatal.
      setSimulacrosPaes([]);
    }
  };

  const handleDeleteSimulacro = async (id) => {
    if (!window.confirm('¿Eliminar este simulacro y todas sus preguntas? No se puede deshacer.')) return;
    try {
      await pb.collection('simulacros_paes').delete(id, { $autoCancel: false });
      toast.success('Simulacro eliminado');
      fetchSimulacrosPaes();
    } catch (err) {
      toast.error('Error al eliminar el simulacro');
    }
  };

  // --- ACTIONS: CURSOS ---
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.nombre || !courseForm.descripcion) {
      toast.error('Nombre y descripción son requeridos');
      return;
    }
    setIsSubmittingCourse(true);
    try {
      const formData = new FormData();
      formData.append('nombre', courseForm.nombre);
      formData.append('descripcion', courseForm.descripcion);
      if (courseForm.portada) {
        formData.append('portada', courseForm.portada);
      }
      
      await pb.collection('cursos').create(formData, { $autoCancel: false });
      toast.success('Curso creado exitosamente');
      setCourseForm({ nombre: '', descripcion: '', portada: null });
      document.getElementById('portada').value = '';
      fetchCursos();
    } catch (err) {
      toast.error('Error al crear el curso');
      console.error(err);
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  // "Eliminar" = archivar (soft-delete). Borrar de verdad falla porque el curso
  // está referenciado por relaciones obligatorias (secciones, matrículas, etc.).
  const handleArchiveCourse = async (id) => {
    if (!window.confirm('¿Archivar este curso? Se oculta de la gestión pero no se borra; podés restaurarlo cuando quieras.')) return;
    try {
      await pb.collection('cursos').update(id, { archivado: true }, { $autoCancel: false });
      toast.success('Curso archivado');
      fetchCursos();
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
      fetchCursos();
    } catch (err) {
      toast.error('No se pudo restaurar el curso: ' + (err?.message || 'error desconocido'));
    }
  };

  // --- ACTIONS: MATERIALES ---
  useEffect(() => {
    if (selectedCourseForMaterial) {
      fetchMateriales(selectedCourseForMaterial);
    } else {
      setMateriales([]);
    }
  }, [selectedCourseForMaterial]);

  const fetchMateriales = async (cursoId) => {
    try {
      const records = await pb.collection('materiales').getFullList({
        filter: `curso_id = "${cursoId}"`,
        sort: '-created',
        $autoCancel: false
      });
      setMateriales(records);
    } catch (err) {
      toast.error('Error al cargar materiales');
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!selectedCourseForMaterial) {
      toast.error('Selecciona un curso primero');
      return;
    }
    if (!materialForm.titulo || !materialForm.tipo || !materialForm.enlace) {
      toast.error('Completa todos los campos');
      return;
    }
    setIsSubmittingMaterial(true);
    try {
      await pb.collection('materiales').create({
        ...materialForm,
        curso_id: selectedCourseForMaterial
      }, { $autoCancel: false });
      toast.success('Material añadido exitosamente');
      setMaterialForm({ titulo: '', tipo: '', enlace: '' });
      fetchMateriales(selectedCourseForMaterial);
    } catch (err) {
      toast.error('Error al añadir material');
    } finally {
      setIsSubmittingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('¿Eliminar material?')) return;
    try {
      await pb.collection('materiales').delete(id, { $autoCancel: false });
      toast.success('Material eliminado');
      fetchMateriales(selectedCourseForMaterial);
    } catch (err) {
      toast.error('Error al eliminar material');
    }
  };

  // --- ACTIONS: MATRICULACIÓN Y ASISTENCIA ---
  useEffect(() => {
    setSelectedStudentForAssign(''); 
    if (selectedCourseForAssign) {
      fetchAsignaciones(selectedCourseForAssign);
    } else {
      setAsignaciones([]); 
    }
  }, [selectedCourseForAssign]);

  const fetchAsignaciones = async (cursoId) => {
    setIsLoadingAsignaciones(true);
    try {
      // Included expand: 'user_id' parameter
      const records = await pb.collection('asignaciones').getList(1, 500, {
        filter: `curso_id="${cursoId}"`,
        expand: 'user_id',
        sort: '-created',
        $autoCancel: false
      });
      
      const missingExpand = records.items.some(r => !r.expand?.user_id && r.user_id);
      
      if (missingExpand) {
        const userIds = [...new Set(records.items.map(r => r.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const filterStr = userIds.map(id => `id="${id}"`).join(' || ');
          const users = await pb.collection('users').getFullList({
            filter: filterStr,
            $autoCancel: false
          });
          
          const userMap = Object.fromEntries(users.map(u => [u.id, u]));
          
          records.items.forEach(r => {
            if (!r.expand) r.expand = {};
            if (!r.expand.user_id && userMap[r.user_id]) {
              r.expand.user_id = userMap[r.user_id];
            }
          });
        }
      }
      
      setAsignaciones(records.items);
    } catch (err) {
      console.error('Error fetching asignaciones:', err);
      toast.error('Error al cargar matriculados');
      setAsignaciones([]); 
    } finally {
      setIsLoadingAsignaciones(false);
    }
  };

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
      await fetchAsignaciones(selectedCourseForAssign);
    } catch (err) {
      toast.error('Error al matricular estudiante: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRemoveStudent = async (id) => {
    if (!window.confirm('¿Remover estudiante de este curso?')) return;
    try {
      await pb.collection('asignaciones').delete(id, { $autoCancel: false });
      toast.success('Matrícula removida exitosamente');
      await fetchAsignaciones(selectedCourseForAssign);
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
                    <CardTitle>Crear Nuevo Curso</CardTitle>
                    <CardDescription>Añade un programa al catálogo educativo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateCourse} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre del Curso <span className="text-destructive">*</span></Label>
                        <Input 
                          id="nombre" 
                          value={courseForm.nombre}
                          onChange={e => setCourseForm({...courseForm, nombre: e.target.value})}
                          placeholder="Ej: Matemáticas M1" 
                          className="text-foreground"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descripcion">Descripción <span className="text-destructive">*</span></Label>
                        <Input 
                          id="descripcion" 
                          value={courseForm.descripcion}
                          onChange={e => setCourseForm({...courseForm, descripcion: e.target.value})}
                          placeholder="Breve resumen del contenido" 
                          className="text-foreground"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="portada">Imagen de Portada</Label>
                        <Input 
                          id="portada" 
                          type="file" 
                          accept="image/*"
                          onChange={e => setCourseForm({...courseForm, portada: e.target.files[0]})}
                          className="cursor-pointer text-foreground"
                        />
                      </div>
                      <Button type="submit" className="w-full mt-4 transition-all duration-200 active:scale-[0.98]" disabled={isSubmittingCourse}>
                        {isSubmittingCourse ? 'Creando...' : 'Guardar Curso'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="lg:col-span-2">
                  <h3 className="text-xl font-semibold mb-4">Cursos Activos ({cursosActivos.length})</h3>
                  {cursosActivos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center shadow-sm">
                      <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground font-medium">No hay cursos activos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cursosActivos.map(curso => (
                        <div key={curso.id} className="relative group">
                          <CourseCard course={curso} />
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                            onClick={() => handleArchiveCourse(curso.id)}
                            title="Archivar curso"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
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
                          <MaterialCard key={mat.id} material={mat} onDelete={handleDeleteMaterial} isAdmin={true} />
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
                     onRemove={handleRemoveStudent} 
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
                                onClick={() => handleDeleteSimulacro(s.id)}
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
    </>
  );
};

export default AdminDashboard;