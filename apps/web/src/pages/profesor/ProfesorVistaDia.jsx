import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, Clock, ExternalLink, Users, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import PasarListaDialog from '@/components/profesor/PasarListaDialog.jsx';

const formatFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch (_e) {
    return iso;
  }
};

const ProfesorVistaDia = ({ overview, isLoading }) => {
  const [claseEnLista, setClaseEnLista] = useState(null);

  const proxima = overview?.proximaClase;
  const stats = [
    { label: 'Mis cursos', value: overview?.secciones?.length || 0, icon: BookOpen },
    { label: 'Alumnos', value: overview?.alumnosTotales || 0, icon: Users },
    { label: 'Por calificar', value: overview?.entregasPendientes || 0, icon: ClipboardList },
    { label: 'Clases hoy', value: overview?.clasesHoy?.length || 0, icon: Clock },
  ];

  return (
    <div className="space-y-8">
      {/* Próxima clase hero */}
      <Card className="border-primary/30 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-card to-secondary/5 p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex-1 min-w-0">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 mb-3">
                <Video className="h-3 w-3 mr-1.5" />
                Próxima clase
              </Badge>
              {isLoading ? (
                <Skeleton className="h-7 w-2/3" />
              ) : proxima ? (
                <>
                  <h2 className="text-xl md:text-2xl font-bold text-balance">
                    {proxima.tema || proxima.expand?.seccion_id?.nombre || 'Clase programada'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 capitalize">
                    {formatFecha(proxima.fecha)} · {proxima.hora_inicio}{proxima.hora_fin ? ` – ${proxima.hora_fin}` : ''}
                  </p>
                </>
              ) : (
                <h2 className="text-xl font-semibold text-muted-foreground">Sin clases próximas</h2>
              )}
            </div>
            {proxima && (
              <div className="flex flex-col sm:flex-row gap-2">
                {proxima.link && (
                  <Button asChild size="lg" className="bg-primary text-primary-foreground">
                    <a href={proxima.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Entrar
                    </a>
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setClaseEnLista(proxima)}
                >
                  Pasar lista
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-mono font-bold tabular-nums">
                  {isLoading ? <Skeleton className="h-9 w-12" /> : s.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hoy: agenda */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Clases de hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (overview?.clasesHoy || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Hoy no tenés clases agendadas.
              </p>
            ) : (
              <ul className="divide-y -mx-2">
                {overview.clasesHoy.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-2 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {c.hora_inicio}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {c.tema || c.expand?.seccion_id?.nombre || 'Clase'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.expand?.seccion_id?.nombre}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setClaseEnLista(c)}>
                      Pasar lista
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-secondary" />
              Mis secciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (overview?.secciones || []).length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Sin secciones asignadas"
                description="Cuando un administrador te asigne una sección la vas a ver acá."
                className="border-0 shadow-none bg-transparent p-2"
              />
            ) : (
              <ul className="divide-y -mx-2">
                {overview.secciones.slice(0, 5).map((s) => (
                  <li key={s.id} className="px-2 py-2.5">
                    <Link to={`/dashboard/profesor/seccion/${s.id}`} className="block hover:bg-muted/40 rounded -mx-2 px-2 py-1 transition-colors">
                      <p className="font-medium text-sm">
                        {s.expand?.curso_id?.nombre} — {s.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.modalidad} · {s.capacidad ? `cap. ${s.capacidad}` : 'sin capacidad definida'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <PasarListaDialog
        open={!!claseEnLista}
        onOpenChange={(o) => !o && setClaseEnLista(null)}
        clase={claseEnLista}
      />
    </div>
  );
};

export default ProfesorVistaDia;
