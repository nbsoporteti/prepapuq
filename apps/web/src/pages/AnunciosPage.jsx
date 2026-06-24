import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/shared/EmptyState.jsx';
import AnuncioCard from '@/components/anuncios/AnuncioCard.jsx';
import pb from '@/lib/pocketbaseClient';

/**
 * AnunciosPage maneja dos vistas:
 *  - sin :id → listado de anuncios accesibles, con filtro de categoría
 *  - con :id (vía /anuncios/:id) → detalle de un anuncio
 */
const AnunciosPage = () => {
  const { anuncioId } = useParams();

  if (anuncioId) {
    return <AnuncioDetalle id={anuncioId} />;
  }
  return <AnunciosLista />;
};

const AnunciosLista = () => {
  const [categoria, setCategoria] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  const { data: anuncios = [], isLoading } = useQuery({
    queryKey: ['anuncios', 'listado'],
    staleTime: 30_000,
    queryFn: async () => {
      const r = await pb.collection('anuncios').getList(1, 100, {
        sort: '-pinned,-publicado_at',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const filtrados = useMemo(() => {
    return anuncios.filter((a) => {
      if (categoria !== 'todas' && a.categoria !== categoria) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!a.titulo?.toLowerCase().includes(q) && !a.contenido_html?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [anuncios, categoria, busqueda]);

  return (
    <>
      <Helmet><title>Anuncios | PrePa</title></Helmet>
      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to={-1}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás
              </Link>
            </Button>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Anuncios</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-xs"
            />
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="academica">Académica</SelectItem>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="advertencia">Advertencia</SelectItem>
                <SelectItem value="felicitacion">Felicitación</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="font-mono">{filtrados.length}</Badge>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Sin anuncios"
              description="Cuando alguien publique un anuncio, aparecerá acá."
            />
          ) : (
            <div className="space-y-3">
              {filtrados.map((a) => (
                <Link key={a.id} to={`/anuncios/${a.id}`} className="block">
                  <AnuncioCard anuncio={a} compact />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const AnuncioDetalle = ({ id }) => {
  const { data: anuncio, isLoading } = useQuery({
    queryKey: ['anuncios', id],
    enabled: !!id,
    queryFn: async () => pb.collection('anuncios').getOne(id, { expand: 'autor_id,seccion_id,curso_id', $autoCancel: false }),
  });

  return (
    <>
      <Helmet><title>{anuncio?.titulo || 'Anuncio'} | PrePa</title></Helmet>
      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to="/anuncios">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a anuncios
              </Link>
            </Button>
            {isLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : !anuncio ? (
              <p className="text-muted-foreground">Anuncio no encontrado.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {anuncio.categoria && <Badge variant="outline" className="capitalize">{anuncio.categoria}</Badge>}
                  {anuncio.pinned && <Badge variant="secondary" className="bg-primary/10 text-primary">Fijado</Badge>}
                  {anuncio.importante && <Badge variant="secondary" className="bg-accent/15 text-accent">Importante</Badge>}
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{anuncio.titulo}</h1>
                <p className="text-xs text-muted-foreground mt-2">
                  {anuncio.expand?.autor_id?.name || 'Anónimo'} ·{' '}
                  {new Date(anuncio.publicado_at || anuncio.created).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </>
            )}
          </div>
        </div>

        {anuncio && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 max-w-3xl">
            <Card>
              <CardContent className="p-6 md:p-8">
                {anuncio.contenido_html ? (
                  <div
                    className="prose prose-base max-w-none text-foreground/90"
                    dangerouslySetInnerHTML={{ __html: anuncio.contenido_html }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin contenido.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default AnunciosPage;
