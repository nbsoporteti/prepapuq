import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import CourseCard from '@/components/CourseCard.jsx';
import { CourseCardSkeleton } from '@/components/LoadingSkeletons.jsx';
import { toast } from 'sonner';

const EstudianteDashboard = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [asignaciones, setAsignaciones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssignedCourses = async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const filterQuery = 'user_id ~ "' + currentUser.id + '"';
      
      const response = await pb.collection('asignaciones').getList(1, 50, {
        filter: filterQuery,
        expand: 'curso_id',
        $autoCancel: false
      });

      let fetchedItems = response.items || [];

      const missingExpand = fetchedItems.some(r => !r.expand?.curso_id && r.curso_id);
      
      if (missingExpand) {
        const courseIds = [...new Set(fetchedItems.map(r => r.curso_id).filter(Boolean))];
        
        if (courseIds.length > 0) {
          const filterStr = courseIds.map(id => 'id="' + id + '"').join(' || ');
          const courses = await pb.collection('cursos').getFullList({
            filter: filterStr,
            $autoCancel: false
          });
          
          const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));
          
          fetchedItems = fetchedItems.map(r => {
            if (!r.expand) r.expand = {};
            if (!r.expand.curso_id && courseMap[r.curso_id]) {
              r.expand.curso_id = courseMap[r.curso_id];
            }
            return r;
          });
        }
      }

      setAsignaciones(fetchedItems);
    } catch (err) {
      console.error('Error fetching student courses:', err);
      setError(err.message || 'Error al cargar tus cursos');
      toast.error('Error al cargar tus cursos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedCourses();
  }, [currentUser]);

  const handleCourseClick = (cursoId) => {
    navigate(`/dashboard/estudiante/curso/${cursoId}`);
  };

  return (
    <>
      <Helmet>
        <title>Mi Panel | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-primary/5 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-balance">
              Bienvenido, <span className="text-primary">{currentUser?.name || 'Estudiante'}</span>
            </h1>
            <p className="text-muted-foreground text-lg">Aquí tienes acceso directo a tus cursos y material de estudio.</p>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-balance">Mis Cursos Asignados</h2>
            <p className="text-muted-foreground mt-1">Selecciona un curso para acceder a su contenido.</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => <CourseCardSkeleton key={n} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-destructive/5 text-center max-w-2xl mx-auto shadow-sm">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-semibold text-destructive mb-2 text-balance">No se pudieron cargar los cursos</h3>
              <p className="text-destructive/80 mb-6">{error}</p>
              <Button onClick={fetchAssignedCourses} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </Button>
            </div>
          ) : asignaciones.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {asignaciones.map((record) => {
                const curso = record.expand?.curso_id;
                
                if (!curso) return null;
                
                return (
                  <CourseCard 
                    key={curso.id} 
                    course={curso} 
                    onClick={() => handleCourseClick(curso.id)} 
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center border rounded-2xl bg-card max-w-2xl mx-auto shadow-sm">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-balance">Aún no tienes cursos</h3>
              <p className="text-muted-foreground mb-8 text-lg">
                Actualmente no tienes cursos asignados en tu perfil. 
                Contacta con administración para regularizar tu matrícula.
              </p>
              <Button asChild variant="outline" className="font-medium px-8 transition-all duration-200 active:scale-[0.98]">
                <a href="mailto:contacto@prepapuq.cl">Contactar Soporte</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EstudianteDashboard;