import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Video, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Footer from '@/components/Footer.jsx';
import { getUtmParams } from '@/lib/utm';

const PLATAFORMA_LABEL = {
  meet: 'Google Meet',
  zoom: 'Zoom',
  teams: 'Teams',
  presencial: 'Presencial',
};

const useClaseDetalle = (id) => useQuery({
  queryKey: ['public', 'clase-detalle', id],
  enabled: !!id,
  queryFn: async () => {
    const url = (import.meta.env.VITE_POCKETBASE_URL || '') + '/api/public/clases-gratis/' + id;
    const res = await fetch(url);
    if (!res.ok) throw new Error('http_' + res.status);
    return res.json();
  },
  staleTime: 60_000,
});

const formatFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (_e) {
    return iso;
  }
};

const ClasePublicaDetallePage = () => {
  const { id } = useParams();
  const { data: clase, isLoading, isError } = useClaseDetalle(id);

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    colegio: '',
    anio_que_cursa: '',
    honeypot: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (form.honeypot) {
      // bot
      setDone(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const utm = getUtmParams();
      const url = (import.meta.env.VITE_POCKETBASE_URL || '') + '/api/public/clases-gratis/' + id + '/inscribirse';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ...utm,
        }),
      });
      if (res.status === 429) {
        setErrorMsg('Recibimos muchas inscripciones desde tu conexión. Probá más tarde o escribinos por WhatsApp.');
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.error === 'datos_invalidos') {
          setErrorMsg('Revisá los datos: necesitamos al menos nombre y email válidos.');
          return;
        }
        if (json.error === 'clase_no_disponible') {
          setErrorMsg('Esta clase ya no está disponible. Volvé a la lista para ver otras fechas.');
          return;
        }
        throw new Error('unknown_' + res.status);
      }
      setDone(true);
      toast.success('¡Inscripción confirmada! Te enviamos el link al email.');
    } catch (err) {
      console.error('Inscripción err:', err);
      setErrorMsg('Algo falló. Probá nuevamente o escribinos por WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{clase ? `${clase.titulo} | PrePa` : 'Clase gratuita | PrePa'}</title>
      </Helmet>

      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Button variant="ghost" asChild className="-ml-3 mb-6 text-muted-foreground hover:text-foreground">
            <Link to="/clases-gratis">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a clases gratuitas
            </Link>
          </Button>

          {isLoading && (
            <div className="space-y-3">
              <div className="h-7 w-1/2 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
            </div>
          )}

          {isError && (
            <div className="flex items-start gap-3 p-5 rounded-xl border bg-card max-w-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">No encontramos esta clase</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Puede que ya haya pasado o no esté publicada. Mirá las clases activas.
                </p>
                <Button asChild className="mt-3" size="sm" variant="outline">
                  <Link to="/clases-gratis">Ver clases disponibles</Link>
                </Button>
              </div>
            </div>
          )}

          {clase && (
            <>
              <Badge variant="outline" className="mb-3">{PLATAFORMA_LABEL[clase.plataforma] || 'Online'}</Badge>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance max-w-3xl">
                {clase.titulo}
              </h1>
              {clase.descripcion && (
                <p className="mt-3 text-muted-foreground text-lg max-w-2xl">
                  {clase.descripcion}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {clase && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="grid lg:grid-cols-12 gap-10">
              <aside className="lg:col-span-5">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Detalles
                    </h2>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Fecha</p>
                          <p className="font-medium text-foreground capitalize">{formatFecha(clase.fecha)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">Horario</p>
                          <p className="font-medium text-foreground">
                            {clase.hora_inicio}{clase.hora_fin ? ` – ${clase.hora_fin}` : ''}
                            {clase.duracion_min ? ` · ${clase.duracion_min} min` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        {clase.plataforma === 'presencial'
                          ? <MapPin className="h-4 w-4 text-primary mt-0.5" />
                          : <Video className="h-4 w-4 text-primary mt-0.5" />}
                        <div>
                          <p className="text-muted-foreground">Modalidad</p>
                          <p className="font-medium text-foreground">
                            {PLATAFORMA_LABEL[clase.plataforma] || 'Online'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t text-xs text-muted-foreground">
                      Te enviaremos el link de la clase al email registrado el día anterior. Si no llega, revisá el spam.
                    </div>
                  </CardContent>
                </Card>
              </aside>

              <div className="lg:col-span-7">
                {done ? (
                  <div className="rounded-2xl border bg-success/10 p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                    <h3 className="text-2xl font-semibold text-foreground">¡Inscripción confirmada!</h3>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Te enviamos el link de acceso al email que registraste. Si no lo ves en unos minutos revisá la carpeta de spam.
                    </p>
                    <Button asChild className="mt-6" variant="outline">
                      <Link to="/clases-gratis">Ver otras clases</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
                    <h3 className="font-display text-2xl font-bold tracking-tight mb-2">
                      Reservá tu cupo
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Sin compromiso. Te enviamos el link el día anterior.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {errorMsg && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/30">
                          {errorMsg}
                        </div>
                      )}

                      {/* honeypot */}
                      <div className="absolute -left-[9999px] pointer-events-none" aria-hidden="true">
                        <Input
                          name="honeypot"
                          tabIndex={-1}
                          autoComplete="off"
                          value={form.honeypot}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombre">Nombre <span className="text-destructive">*</span></Label>
                          <Input id="nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefono">Teléfono</Label>
                          <Input id="telefono" name="telefono" type="tel" value={form.telefono} onChange={handleChange} placeholder="+56 9 ..." />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                        <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="tu@correo.cl" />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="colegio">Colegio</Label>
                          <Input id="colegio" name="colegio" value={form.colegio} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="anio_que_cursa">Año actual</Label>
                          <Input id="anio_que_cursa" name="anio_que_cursa" value={form.anio_que_cursa} onChange={handleChange} placeholder="Ej: 4° medio" />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        disabled={isSubmitting}
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {isSubmitting ? 'Inscribiendo...' : 'Confirmar inscripción'}
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
};

export default ClasePublicaDetallePage;
