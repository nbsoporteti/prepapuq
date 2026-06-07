import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Users, CheckCircle2, XCircle, FileText, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { Skeleton } from '@/components/ui/skeleton';

const AttendanceTab = ({ 
  cursos = [], 
  selectedCourse = '', 
  onCourseChange = () => {}, 
  asignaciones = [], 
  isLoading = false 
}) => {
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedCourse) {
      setStudents([]);
      setAttendanceState({});
      return;
    }

    if (!asignaciones || asignaciones.length === 0) {
      setStudents([]);
      setAttendanceState({});
      return;
    }

    // Extract students from asignaciones (using the stitched expand.user_id from AdminDashboard)
    const enrolledStudents = asignaciones
      .map(r => r.expand?.user_id)
      .filter(Boolean);
      
    // Sort on the frontend by student name
    enrolledStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    setStudents(enrolledStudents);
    
    // Initialize attendance state to 'Presente' by default
    const initialState = {};
    enrolledStudents.forEach(student => {
      initialState[student.id] = 'Presente';
    });
    setAttendanceState(initialState);
    
  }, [selectedCourse, asignaciones]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourse || students.length === 0) return;
    
    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD for date field

    try {
      // Create an attendance record for each student
      const promises = students.map(student => {
        const estado = attendanceState[student.id];
        return pb.collection('asistencia').create({
          fecha: today,
          estado: estado,
          user_id: student.id,
          curso_id: selectedCourse
        }, { $autoCancel: false });
      });

      await Promise.all(promises);
      toast.success('Asistencia guardada exitosamente');
      
      // Reset selection to force a clean state
      onCourseChange('');
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Error al guardar la asistencia');
    } finally {
      setIsSaving(false);
    }
  };

  const isEmptyState = students.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Curso</CardTitle>
            <CardDescription>Elige un curso para registrar la asistencia de hoy.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Curso</Label>
                <Select value={selectedCourse} onValueChange={onCourseChange}>
                  <SelectTrigger className="w-full text-foreground font-medium">
                    <SelectValue placeholder="Selecciona un curso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cursos.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm font-medium text-muted-foreground mb-1">Fecha de Registro</p>
                <p className="text-lg font-semibold text-foreground">
                  {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle>Lista de Estudiantes</CardTitle>
              <CardDescription>
                {students.length} estudiantes matriculados
              </CardDescription>
            </div>
            {students.length > 0 && (
              <Button 
                onClick={handleSaveAttendance} 
                disabled={isSaving}
                className="bg-primary text-primary-foreground"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar Asistencia'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {!selectedCourse ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
                <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Selecciona un curso para ver la lista de estudiantes.</p>
              </div>
            ) : isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : isEmptyState ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No hay estudiantes matriculados en este curso.</p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-y-auto max-h-[600px]">
                {students.map(student => (
                  <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {student.name ? student.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{student.name || 'Usuario sin nombre'}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                      <Button
                        type="button"
                        variant={attendanceState[student.id] === 'Presente' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, 'Presente')}
                        className={attendanceState[student.id] === 'Presente' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-muted-foreground hover:text-foreground'}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Presente
                      </Button>
                      <Button
                        type="button"
                        variant={attendanceState[student.id] === 'Ausente' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, 'Ausente')}
                        className={attendanceState[student.id] === 'Ausente' ? 'bg-destructive hover:bg-destructive/90 text-white' : 'text-muted-foreground hover:text-foreground'}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Ausente
                      </Button>
                      <Button
                        type="button"
                        variant={attendanceState[student.id] === 'Justificado' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, 'Justificado')}
                        className={attendanceState[student.id] === 'Justificado' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-muted-foreground hover:text-foreground'}
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Justificado
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceTab;