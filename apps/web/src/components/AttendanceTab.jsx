import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, XCircle, FileText, ShieldCheck, AlertCircle, CalendarDays, Lock } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import AsistenciaConfirmDialog from '@/components/asistencia/AsistenciaConfirmDialog.jsx';
import { ymd, rangoDia } from '@/lib/asistenciaPin';

const ESTADOS = [
  { key: 'Presente', label: 'Presente', icon: CheckCircle2, on: 'bg-green-600 hover:bg-green-700 text-white' },
  { key: 'Ausente', label: 'Ausente', icon: XCircle, on: 'bg-destructive hover:bg-destructive/90 text-white' },
  { key: 'Justificado', label: 'Justificado', icon: FileText, on: 'bg-orange-500 hover:bg-orange-600 text-white' },
];

const AttendanceTab = ({
  cursos = [],
  selectedCourse = '',
  onCourseChange = () => {},
  asignaciones = [],
  isLoading = false,
}) => {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date());
  const [attendanceState, setAttendanceState] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fechaStr = ymd(date);

  const students = useMemo(() => {
    if (!selectedCourse) return [];
    return asignaciones
      .map((r) => r.expand?.user_id)
      .filter(Boolean)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [selectedCourse, asignaciones]);

  // Asistencia ya registrada para curso + fecha (prefill / ver-editar días pasados).
  const { data: existentes = [] } = useQuery({
    queryKey: ['admin', 'asistencia', selectedCourse, fechaStr],
    enabled: !!selectedCourse,
    queryFn: () => {
      const { d0, d1 } = rangoDia(fechaStr);
      return pb.collection('asistencia').getFullList({
        filter: `curso_id = "${selectedCourse}" && fecha >= "${d0}" && fecha < "${d1}"`,
        expand: 'confirmada_por',
        $autoCancel: false,
      });
    },
  });

  // Inicializar estados: lo ya registrado ese día, o "Presente" por defecto.
  useEffect(() => {
    if (!students.length) {
      setAttendanceState({});
      return;
    }
    const previo = {};
    for (const r of existentes) previo[r.user_id] = r.estado;
    const next = {};
    for (const s of students) next[s.id] = previo[s.id] || 'Presente';
    setAttendanceState(next);
  }, [students, existentes, fechaStr]);

  const confirmada = existentes.find((r) => r.confirmada);
  const isEmptyState = students.length === 0;

  const handleStatusChange = (studentId, status) => {
    setAttendanceState((prev) => ({ ...prev, [studentId]: status }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Curso y fecha</CardTitle>
            <CardDescription>Elegí el curso y el día para registrar (o revisar) la asistencia.</CardDescription>
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
                    {cursos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal capitalize">
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      {date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      disabled={{ after: new Date() }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {confirmada && (
                <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <div>
                    <p className="font-medium text-success">Asistencia confirmada</p>
                    <p className="text-xs text-muted-foreground">
                      por {confirmada.expand?.confirmada_por?.name || 'staff'}
                      {confirmada.confirmada_el
                        ? ` · ${new Date(confirmada.confirmada_el).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle>Lista de estudiantes</CardTitle>
              <CardDescription>
                {students.length} matriculados{confirmada ? ' · podés re-confirmar para corregir' : ''}
              </CardDescription>
            </div>
            {students.length > 0 && (
              <Button onClick={() => setConfirmOpen(true)} className="bg-primary text-primary-foreground">
                <Lock className="w-4 h-4 mr-2" />
                Confirmar con PIN
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
                {students.map((student) => {
                  const previo = existentes.find((r) => r.user_id === student.id);
                  return (
                    <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {student.name ? student.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{student.name || 'Usuario sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                        {previo && <Badge variant="outline" className="hidden sm:inline-flex">registrado</Badge>}
                      </div>

                      <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                        {ESTADOS.map((e) => {
                          const Icon = e.icon;
                          const active = attendanceState[student.id] === e.key;
                          return (
                            <Button
                              key={e.key}
                              type="button"
                              variant={active ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleStatusChange(student.id, e.key)}
                              className={active ? e.on : 'text-muted-foreground hover:text-foreground'}
                            >
                              <Icon className="w-4 h-4 mr-1.5" />
                              {e.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AsistenciaConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        payload={{ scope: 'curso', cursoId: selectedCourse, fecha: fechaStr, estados: attendanceState }}
        resumen={(
          <span>
            {students.length} alumnos · {date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
          </span>
        )}
        onConfirmed={() => qc.invalidateQueries({ queryKey: ['admin', 'asistencia', selectedCourse, fechaStr] })}
      />
    </div>
  );
};

export default AttendanceTab;
