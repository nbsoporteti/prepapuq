import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const authData = await login(email, password);
      toast.success('Sesión iniciada correctamente');
      
      const rol = authData.record?.rol;
      
      // Navigate to appropriate dashboard based on role
      if (rol === 'estudiante') {
        navigate('/dashboard/estudiante');
      } else if (rol === 'apoderado') {
        navigate('/dashboard/apoderado');
      } else if (rol === 'admin') {
        navigate('/dashboard/admin');
      } else {
        navigate('/'); // Fallback
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg('Correo o contraseña incorrectos. Por favor, intenta de nuevo.');
      toast.error('Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Iniciar Sesión | PrePa</title>
        <meta name="description" content="Ingresa a tu cuenta de PrePa para acceder a tus recursos de estudio y progreso." />
      </Helmet>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
        
        {/* Left column - Branding & Image (hidden on small screens) */}
        <div className="hidden lg:flex flex-col justify-between bg-muted relative overflow-hidden p-12">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop" 
              alt="Estudiantes universitarios conversando en el campus" 
              className="object-cover w-full h-full opacity-20 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/40 to-transparent"></div>
          </div>
          
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="text-primary-foreground h-6 w-6" />
            </div>
            <span className="text-3xl font-bold text-foreground">PrePa</span>
          </div>

          <div className="relative z-10 max-w-lg">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Tu futuro comienza con una excelente preparación.
            </h2>
            <p className="text-lg text-foreground/80">
              Accede a tu plataforma de estudio, revisa tus avances, material de apoyo y comunícate con tus profesores.
            </p>
          </div>
        </div>

        {/* Right column - Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative">
          <Button 
            variant="ghost" 
            asChild 
            className="absolute top-6 left-6 text-muted-foreground hover:text-foreground"
          >
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>

          <Card className="w-full max-w-md border-none shadow-none sm:border-solid sm:shadow-lg">
            <CardHeader className="space-y-2 text-center sm:text-left">
              <div className="flex justify-center sm:justify-start mb-2 lg:hidden">
                 <span className="text-3xl font-bold text-primary">PrePa</span>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Iniciar Sesión</CardTitle>
              <CardDescription className="text-base">
                Ingresa tus credenciales para acceder a tu panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {errorMsg && (
                  <div className="p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-medium">
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="estudiante@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-medium">Contraseña</Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-secondary hover:text-secondary/80 font-medium transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full text-foreground"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default LoginPage;