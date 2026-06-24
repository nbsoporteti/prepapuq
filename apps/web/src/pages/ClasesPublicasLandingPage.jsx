import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, Clock, MapPin, Video, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState.jsx';
import Footer from '@/components/Footer.jsx';
import pb from '@/lib/pocketbaseClient';

const PLATAFORMA_LABEL = {
  meet: 'Google Meet',
  zoom: 'Zoom',
  teams: 'Teams',
  presencial: 'Presencial',
};

const formatFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch (_e) {
    return iso;
  }
};

const useClasesGratis = () => useQuery({
  queryKey: ['public', 'clases-gratis'],
  queryFn: async () => {
    const url = (import.meta.env.VITE_POCKETBASE_URL || '') + '/api/public/clases-gratis';
    const res = await fetch(url);
    if (!res.ok) throw new Error('http_' + res.status);
    return res.json();
  },
  staleTime: 60_000,
});

const ClasesPublicasLandingPage = () => {
  const { data, isLoading, isError } = useClasesGratis();
  const items = data?.items || [];

  return (
    <>
      <Helmet>
        <title>Clases gratuitas | PrePa</title>
        <meta name="description" content="Inscribite gratis en simulacros PAES, charlas de orientación y clases abiertas de PrePa Punta Arenas." />
      </Helmet>

      <section className="bg-gradient-to-br from-primary/5 to-secondary/5 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <Button variant="ghost" asChild className="-ml-3 mb-6 text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
          <Badge variant="secondary" className="mb-4 bg-accent/15 text-accent border-0">
            <Sparkles className="h-3 w-3 mr-1.5" />
            Sin costo · sin compromiso
          </Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-balance max-w-3xl">
            Clases abiertas para conocernos.
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl">
            Simulacros PAES, charlas de orientación y clases de prueba. Inscribite a una y te enviamos el link el día anterior.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border bg-card p-6 animate-pulse">
                  <div className="h-5 w-2/3 bg-muted rounded mb-3" />
                  <div className="h-4 w-full bg-muted rounded mb-2" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <EmptyState
              icon={Calendar}
              title="No pudimos cargar las clases"
              description="Probá nuevamente en unos minutos o contactanos por WhatsApp."
              action={{ label: 'Ir al inicio', href: '/', variant: 'outline' }}
            />
          )}

          {!isLoading && !isError && items.length === 0 && (
            <EmptyState
              icon={Calendar}
              title="No hay clases gratuitas programadas ahora mismo"
              description="Próximamente publicaremos nuevas fechas. Dejanos tu email en el formulario de contacto y te avisamos."
              action={{ label: 'Ir a contacto', href: '/#contacto' }}
            />
          )}

          {!isLoading && items.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-base">
                    <CardHeader>
                      <Badge variant="outline" className="self-start mb-2">
                        {PLATAFORMA_LABEL[c.plataforma] || 'Online'}
                      </Badge>
                      <CardTitle className="text-lg leading-snug">{c.titulo}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      {c.descripcion && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                          {c.descripcion}
                        </p>
                      )}
                      <ul className="space-y-2 text-sm text-foreground/80 mb-5">
                        <li className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="capitalize">{formatFecha(c.fecha)}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          {c.hora_inicio}{c.hora_fin ? ` – ${c.hora_fin}` : ''}
                          {c.duracion_min ? ` (${c.duracion_min} min)` : ''}
                        </li>
                        <li className="flex items-center gap-2">
                          {c.plataforma === 'presencial' ? <MapPin className="h-4 w-4 text-primary" /> : <Video className="h-4 w-4 text-primary" />}
                          {PLATAFORMA_LABEL[c.plataforma] || 'Online'}
                        </li>
                      </ul>
                      <Button asChild size="sm" className="mt-auto bg-accent text-accent-foreground hover:bg-accent/90">
                        <Link to={`/clases-gratis/${c.id}`}>
                          Inscribirme
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
};

export default ClasesPublicasLandingPage;
