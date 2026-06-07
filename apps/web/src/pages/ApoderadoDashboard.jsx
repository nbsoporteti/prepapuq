import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Users, FileText, Calendar, AlertCircle, CheckCircle2, XCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import JustificationModal from '@/components/JustificationModal.jsx';

const ApoderadoDashboard = () => {
  const { currentUser } = useAuth();
  
  const [linkedStudentsCount, setLinkedStudentsCount] = useState(null);
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const computeAttendancePct = (records) => {
    if (records.length === 0) return null;
    const presente = records.filter((r) => r.estado === 'Presente').length;
    return Math.round((presente / records.length) * 100);
  };

  const overallAttendancePct = computeAttendancePct(attendanceRecords);
  const unjustifiedAbsences = attendanceRecords.filter(
    (r) => r.estado === 'Ausente',
  ).length;

  const fetchDashboardData = async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const parentStudentResponse = await pb.collection('parent_student').getList(1, 50, {
        filter: `parent_id = "${currentUser.id}"`,
        expand: 'student_id',
        $autoCancel: false,
      });

      setLinkedStudentsCount(parentStudentResponse.totalItems);

      const students = parentStudentResponse.items
        .map((r) => r.expand?.student_id)
        .filter(Boolean);
      setLinkedStudents(students);

      const studentIds = students.map((s) => s.id);

      if (studentIds.length === 0) {
        setAttendanceRecords([]);
        return;
      }

      const attendanceFilter = studentIds
        .map((id) => `user_id = "${id}"`)
        .join(' || ');

      const response = await pb.collection('asistencia').getList(1, 50, {
        filter: attendanceFilter,
        expand: 'curso_id,user_id',
        sort: '-fecha',
        $autoCancel: false,
      });

      const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
      const enrichedRecords = response.items.map((item) => ({
        ...item,
        expand: {
          ...item.expand,
          user_id: item.expand?.user_id ?? studentMap[item.user_id] ?? null,
        },
      }));

      setAttendanceRecords(enrichedRecords);
    } catch (err) {
      console.error('Error fetching apoderado data:', err);
      setError(err.message || 'Error al cargar los datos del panel');
      toast.error('Error al cargar los datos del panel');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const handleOpenJustification = (record, studentId) => {
    setSelectedRecord(record);
    setSelectedStudentId(studentId);
    setIsModalOpen(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Presente': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'Ausente': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'Justificado': return <FileText className="w-4 h-4 text-orange-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Presente': return 'bg-green-100 text-green-800 border-green-200';
      case 'Ausente': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Justificado': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 pt-20 px-4 flex flex-col items-center">
        <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-destructive/5 text-center max-w-lg w-full shadow-sm">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold text-destructive mb-2 text-balance">Error de conexión</h3>
          <p className="text-destructive/80 mb-6">{error}</p>
          <Button onClick={fetchDashboardData} variant="outline" className="gap-2 transition-all duration-200 active:scale-[0.98]">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Panel de Apoderado | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-secondary/5 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-balance">
              Bienvenido <span className="text-secondary">{currentUser?.name || 'Apoderado'}</span>
            </h1>
            <p className="text-muted-foreground">Supervisa el progreso académico y asistencia de tus pupilos.</p>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pupilos Vinculados</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {linkedStudentsCount === null ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <div className="text-2xl font-bold tabular-nums">{linkedStudentsCount}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Estudiantes a tu cargo</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Asistencia General</CardTitle>
                <TrendingUp className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : overallAttendancePct === null ? (
                  <div className="text-2xl font-bold tabular-nums text-muted-foreground">—</div>
                ) : (
                  <div className="text-2xl font-bold tabular-nums">{overallAttendancePct}%</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Promedio de los pupilos</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ausencias por Justificar</CardTitle>
                <FileText className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <div className="text-2xl font-bold tabular-nums">{unjustifiedAbsences}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Registros marcados como ausente</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Linked Students & Progress */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-balance">Estudiantes a Cargo</h3>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="shadow-sm border-border/50">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <Skeleton className="h-12 w-12 rounded-xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Skeleton className="h-2 w-full" />
                          <Skeleton className="h-2 w-3/4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : linkedStudents.length === 0 ? (
                <Card className="shadow-sm border-border/50">
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-foreground font-medium">No tienes estudiantes vinculados a tu cuenta.</p>
                    <p className="text-sm text-muted-foreground mt-2">Por favor, contacta a administración si crees que esto es un error.</p>
                  </CardContent>
                </Card>
              ) : (
                linkedStudents.map((student) => {
                  const studentRecords = attendanceRecords.filter(
                    (r) => r.user_id === student.id,
                  );
                  const studentPct = computeAttendancePct(studentRecords);

                  return (
                    <Card key={student.id} className="overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md border-border/50">
                      <div className="bg-primary/5 p-4 border-b border-border/50 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {student.name ? student.name.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg text-foreground">{student.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {student.email} {student.rut && `• RUT: ${student.rut}`}
                          </p>
                        </div>
                      </div>
                      <CardContent className="p-4 bg-card">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-foreground">Asistencia</span>
                            {studentPct === null ? (
                              <span className="text-muted-foreground text-xs">Sin registros</span>
                            ) : (
                              <span className="font-bold text-green-600 tabular-nums">{studentPct}%</span>
                            )}
                          </div>
                          {studentPct !== null && (
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${studentPct}%` }}
                              ></div>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {studentRecords.length} {studentRecords.length === 1 ? 'registro' : 'registros'} totales
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Right Column: Attendance Records */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-balance">Registro de Asistencia Reciente</h3>
              <Card className="shadow-sm border-border/50">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="divide-y divide-border/50">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 flex justify-between items-center">
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-8 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : attendanceRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No hay registros de asistencia recientes.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
                      {attendanceRecords.map(record => {
                        const student = record.expand?.user_id;
                        const course = record.expand?.curso_id;
                        const date = new Date(record.fecha).toLocaleDateString('es-CL', { 
                          weekday: 'short', day: 'numeric', month: 'short' 
                        });
                        
                        return (
                          <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-foreground">{student?.name || 'Estudiante'}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${getStatusBadgeClass(record.estado)}`}>
                                  {getStatusIcon(record.estado)}
                                  {record.estado}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {date} &bull; {course?.nombre || 'Curso'}
                              </p>
                            </div>
                            
                            {record.estado === 'Ausente' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenJustification(record, student?.id)}
                                className="shrink-0 transition-all duration-200 active:scale-[0.98]"
                              >
                                Justificar Inasistencia
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Justification Modal */}
      {isModalOpen && selectedRecord && (
        <JustificationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          asistenciaRecord={selectedRecord}
          studentId={selectedStudentId}
          onSuccess={fetchDashboardData}
        />
      )}
    </>
  );
};

export default ApoderadoDashboard;