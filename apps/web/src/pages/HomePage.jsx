import React from 'react';
import { Helmet } from 'react-helmet';
import { BookOpen, Users, Award, Clock, GraduationCap, Target, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Footer from '@/components/Footer.jsx';
import ContactForm from '@/components/ContactForm.jsx';

const HomePage = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const courses = [
    {
      title: 'Matemáticas',
      description: 'Domina álgebra, cálculo y geometría con métodos probados que simplifican conceptos complejos.',
      icon: Target
    },
    {
      title: 'Lenguaje',
      description: 'Mejora tu comprensión lectora, redacción y análisis de textos para destacar en la prueba.',
      icon: BookOpen
    },
    {
      title: 'Ciencias',
      description: 'Prepárate en biología, química y física con enfoque práctico y ejercicios tipo PAES.',
      icon: Lightbulb
    }
  ];

  const benefits = [
    {
      title: 'Clases presenciales en Punta Arenas',
      description: 'Instalaciones modernas en el centro de la ciudad con grupos reducidos para atención personalizada.',
      icon: Users
    },
    {
      title: 'Modalidad online flexible',
      description: 'Accede a clases en vivo y grabadas desde cualquier lugar, adaptándose a tu horario.',
      icon: Clock
    },
    {
      title: 'Profesores especializados',
      description: 'Equipo docente con experiencia universitaria y conocimiento profundo de la PAES.',
      icon: GraduationCap
    },
    {
      title: 'Resultados comprobados',
      description: 'Más del 87% de nuestros estudiantes logran ingresar a la carrera de su elección.',
      icon: Award
    }
  ];

  return (
    <>
      <Helmet>
        <title>PrePa - Preuniversitario en Punta Arenas | Clases Presenciales y Online</title>
        <meta 
          name="description" 
          content="Preuniversitario en Punta Arenas con clases presenciales y online. Prepárate para la PAES con profesores especializados y resultados comprobados. ¡Inscríbete ahora!" 
        />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <section 
            id="hero" 
            className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden"
          >
            <div 
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1567057419565-4349c49d8a04)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/85"></div>
            </div>

            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="mb-6">
                  Preuniversitario en Punta Arenas: Asegura tu ingreso a la educación superior
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Prepárate para el éxito con clases presenciales y online
                </p>
                <Button 
                  size="lg" 
                  onClick={() => scrollToSection('contacto')}
                  className="text-lg px-8 py-6 transition-all duration-200 active:scale-[0.98]"
                >
                  ¡Inscribirme Ahora!
                </Button>
              </div>
            </div>
          </section>

          <section id="cursos" className="py-20 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="mb-4">Nuestros cursos</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Programas diseñados para cubrir todas las áreas de la PAES con metodología efectiva
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {courses.map((course, index) => {
                  const Icon = course.icon;
                  return (
                    <Card 
                      key={index}
                      className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                    >
                      <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base leading-relaxed mb-4">
                          {course.description}
                        </CardDescription>
                        <Button 
                          variant="outline" 
                          onClick={() => scrollToSection('contacto')}
                          className="w-full transition-all duration-200"
                        >
                          Ver detalles
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="beneficios" className="py-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="mb-4">
                  Clases presenciales y online diseñadas para la realidad regional
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Combinamos lo mejor de ambas modalidades para adaptarnos a tus necesidades
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div 
                      key={index}
                      className="flex gap-4 p-6 rounded-2xl bg-card border transition-all duration-300 hover:shadow-lg"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-secondary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="contacto" className="py-20 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="mb-4">Contáctanos</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Completa el formulario y nos pondremos en contacto contigo para resolver tus dudas
                </p>
              </div>

              <ContactForm />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;