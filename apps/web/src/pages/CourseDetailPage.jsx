import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, BookOpen, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import MaterialCard from '@/components/MaterialCard.jsx';
import { MaterialListSkeleton } from '@/components/LoadingSkeletons.jsx';

const CourseDetailPage = () => {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // 1. Verify access
        const assignments = await pb.collection('asignaciones').getList(1, 1, {
          filter: `user_id = "${currentUser.id}" && curso_id = "${cursoId}"`,
          $autoCancel: false
        });

        if (assignments.totalItems === 0) {
          throw new Error('No tienes acceso a este curso.');
        }

        // 2. Fetch course details
        const courseData = await pb.collection('cursos').getOne(cursoId, { $autoCancel: false });
        setCourse(courseData);

        // 3. Fetch materials
        const materialsData = await pb.collection('materiales').getFullList({
          filter: `curso_id = "${cursoId}"`,
          sort: '-created',
          $autoCancel: false
        });
        setMaterials(materialsData);

      } catch (err) {
        console.error('Error loading course:', err);
        setError(err.message || 'Error al cargar el curso.');
        toast.error('No pudimos cargar la información del curso.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [cursoId, currentUser.id]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <FileQuestion className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Acceso Denegado</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/dashboard/estudiante')} className="mt-6">
            Volver a Mis Cursos
          </Button>
        </div>
      </div>
    );
  }

  const imageUrl = course?.portada ? pb.files.getUrl(course, course.portada) : null;

  return (
    <>
      <Helmet>
        <title>{course ? `${course.nombre} | PrePa` : 'Cargando Curso | PrePa'}</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-12">
        {/* Header Section */}
        <div className="bg-card border-b border-border relative overflow-hidden">
          {imageUrl && (
            <div className="absolute inset-0 z-0 opacity-10">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
            <Button variant="ghost" size="sm" asChild className="mb-6 -ml-3 text-muted-foreground hover:text-foreground">
              <Link to="/dashboard/estudiante">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Mis Cursos
              </Link>
            </Button>
            
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
            ) : (
              <div className="max-w-4xl">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{course?.nombre}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">{course?.descripcion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Materials Section */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Material de Estudio
            </h2>
            <p className="text-muted-foreground mt-1">Documentos, guías y enlaces compartidos por el profesor.</p>
          </div>

          {isLoading ? (
            <MaterialListSkeleton />
          ) : materials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((material) => (
                <MaterialCard 
                  key={material.id} 
                  material={material} 
                  isAdmin={false} 
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-card">
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sin materiales disponibles</h3>
              <p className="text-muted-foreground max-w-sm">
                Aún no se ha subido material de estudio para este curso. Vuelve más tarde.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CourseDetailPage;