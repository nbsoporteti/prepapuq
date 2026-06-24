import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Users,
  Video,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import PasarListaDialog from '@/components/profesor/PasarListaDialog.jsx';
import QuickActionsFAB from '@/components/profesor/QuickActionsFAB.jsx';
import pb from '@/lib/pocketbaseClient';

const formatFecha = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch (_e) {
    return iso;
  }
};

const useSeccion = (id) => useQuery({
  queryKey: ['seccion', id],
  enabled: !!id,
  staleTime: 60_000,
  queryFn: async () => pb.collection('secciones_curso').getOne(id, { expand: 'curso_id,profesor_id', $autoCancel: false }),
});

const useMatriculas = (seccionId) => useQuery({
  queryKey: ['seccion', seccionId, 'matriculas'],
  enabled: !!seccionId,
  staleTime: 30_000,
  queryFn: async () => {
    const r = await pb.collection('matriculas_seccion').getList(1, 200, {
      filter: `seccion_id = "${seccionId}"`,
      expand: 'alumno_id',
      sort: 'expand.alumno_id.name',
      $autoCancel: false,
    });
    return r.items;
  },
});

const useMateriales = (seccionId, cursoId) => useQuery({
  queryKey: ['seccion', seccionId, 'materiales'],
  enabled: !!seccionId,
  staleTime: 60_000,
  queryFn: async () => {
    const filter = `seccion_id = "${seccionId}" || (seccion_id = "" && curso_id = "${cursoId || ''}")`;
    const r = await pb.collection('materiales').getList(1, 100, {
      filter,
      sort: '-created',
      $autoCancel: false,
    });
    return r.items;
  },
});

const useClases = (seccionId) => useQuery({
  queryKey: ['seccion', seccionId, 'clases'],
  enabled: !!seccionId,
  staleTime: 30_000,
  queryFn: async () => {
    const r = await pb.collection('clases_vivo').getList(1, 100, {
      filter: `seccion_id = "${seccionId}"`,
      sort: '-fecha',
      $autoCancel: false,
    });
    return r.items;
  },
});

const useAsistenciaResumen = (seccionId, matriculas) => useQuery({
  queryKey: ['seccion', seccionId, 'asistencia-resumen', matriculas?.length || 0],
  enabled: !!(seccionId && matriculas?.length > 0),
  staleTime: 30_000,
  queryFn: async () => {
    const alumnoIds = matriculas.map((m) => `"${m.alumno_id}"`);
    const filter = `(${alumnoIds.map((id) => `alumno_id = ${id}`).join(' || ')})`;
    const r = await pb.collection('asistencia_clase_vivo').getList(1, 1000, {
      filter,
      $autoCancel: false,
    });

    const porAlumno = new Map();
    for (const a of r.items) {
      const e = porAlumno.get(a.alumno_id) || { total: 0, presente: 0, ausente: 0, justificado: 0, tardanza: 0 };
      e.total++;
      e[a.estado] = (e[a.estado] || 0) + 1;
      porAlumno.set(a.alumno_id, e);
    }
    return porAlumno;
  },
});

const SeccionDetalle = () => {
  const { seccionId } = useParams();
  const [params, setParams] = useSearchParams();
  const subtab = params.get('sub') || 'alumnos';
  const [claseEnLista, setClaseEnLista] = useState(null);

  const { data: seccion, isLoading } = useSeccion(seccionId);
  const cursoId = seccion?.expand?.curso_id?.id;

  const setSubtab = (v) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === 'alumnos') next.delete('sub');
      else next.set('sub', v);
      return next;
    });
  };

  return (
    <>
      <Helmet>
        <title>{seccion ? `${seccion.expand?.curso_id?.nombre} ${seccion.nombre} | PrePa` : 'Sección | PrePa'}</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-20">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to="/dashboard/profesor?tab=cursos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a mis cursos
              </Link>
            </Button>
            {isLoading ? (
              <Skeleton className="h-9 w-1/2" />
            ) : seccion ? (
              <>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                    {seccion.expand?.curso_id?.nombre}
                  </h1>
                  <Badge variant="secondary">Sección {seccion.nombre}</Badge>
                  {seccion.modalidad && <Badge variant="outline">{seccion.modalidad}</Badge>}
                  {seccion.anio_lectivo && <Badge variant="outline" className="font-mono">{seccion.anio_lectivo}</Badge>}
                </div>
                {seccion.expand?.curso_id?.descripcion && (
                  <p className="mt-2 text-muted-foreground max-w-2xl">
                    {seccion.expand.curso_id.descripcion}
                  </p>
                )}
              </>
            ) : (
              <h1 className="text-2xl font-bold">Sección no encontrada</h1>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Tabs value={subtab} onValueChange={setSubtab} className="w-full">
            <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-1 overflow-x-auto">
              <TabsTrigger value="alumnos" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-2">
                <Users className="h-4 w-4 mr-2" />
                Alumnos
              </TabsTrigger>
              <TabsTrigger value="materiales" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-2">
                <BookOpen className="h-4 w-4 mr-2" />
                Materiales
              </TabsTrigger>
              <TabsTrigger value="clases" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-2">
                <Video className="h-4 w-4 mr-2" />
                Clases
              </TabsTrigger>
              <TabsTrigger value="asistencia" className="data-[state=active]:bg-transparent data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Asistencia
              </TabsTrigger>
            </TabsList>

            <div className="py-6">
              <TabsContent value="alumnos" className="m-0">
                <SubtabAlumnos seccionId={seccionId} />
              </TabsContent>
              <TabsContent value="materiales" className="m-0">
                <SubtabMateriales seccionId={seccionId} cursoId={cursoId} />
              </TabsContent>
              <TabsContent value="clases" className="m-0">
                <SubtabClases seccionId={seccionId} onPasarLista={setClaseEnLista} />
              </TabsContent>
              <TabsContent value="asistencia" className="m-0">
                <SubtabAsistencia seccionId={seccionId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <PasarListaDialog
          open={!!claseEnLista}
          onOpenChange={(o) => !o && setClaseEnLista(null)}
          clase={claseEnLista}
        />

        <QuickActionsFAB seccionPreseleccionada={seccionId} />
      </div>
    </>
  );
};

// ---- Subtab: Alumnos ----
const SubtabAlumnos = ({ seccionId }) => {
  const { data: matriculas = [], isLoading } = useMatriculas(seccionId);

  const columns = useMemo(() => ([
    {
      accessorKey: 'expand.alumno_id.name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.expand?.alumno_id?.name || '—'}</p>
          {row.original.expand?.alumno_id?.email && (
            <p className="text-xs text-muted-foreground">{row.original.expand.alumno_id.email}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'expand.alumno_id.rut',
      header: 'RUT',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.expand?.alumno_id?.rut || '—'}</span>,
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const e = row.original.estado;
        const variant = e === 'matriculado' ? 'bg-success/10 text-success' :
          e === 'pre_inscrito' ? 'bg-warning/10 text-warning-foreground' :
          'bg-muted text-muted-foreground';
        return <Badge variant="secondary" className={variant}>{e || '—'}</Badge>;
      },
    },
    {
      accessorKey: 'fecha_matricula',
      header: 'Matriculado',
      cell: ({ row }) => row.original.fecha_matricula ? formatFecha(row.original.fecha_matricula) : '—',
    },
  ]), []);

  return (
    <DataTable
      columns={columns}
      data={matriculas}
      isLoading={isLoading}
      emptyIcon={Users}
      emptyTitle="Sin alumnos matriculados"
      emptyDescription="Cuando el administrador matricule alumnos en esta sección, aparecerán acá."
      searchPlaceholder="Buscar por nombre o RUT..."
    />
  );
};

// ---- Subtab: Materiales ----
const SubtabMateriales = ({ seccionId, cursoId }) => {
  const { data: materiales = [], isLoading } = useMateriales(seccionId, cursoId);

  if (isLoading) {
    return <div className="grid md:grid-cols-2 gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  }
  if (materiales.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Sin materiales aún"
        description="Los materiales se cargan desde el AdminDashboard. Próximamente vas a poder subirlos vos mismo desde acá."
      />
    );
  }
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {materiales.map((m) => (
        <Card key={m.id}>
          <CardContent className="p-4 flex items-start gap-3">
            <FileText className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{m.titulo}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{m.tipo}</Badge>
                {m.publicado === false && <Badge variant="secondary" className="text-xs bg-warning/10">Borrador</Badge>}
              </div>
              {m.enlace && (
                <a
                  href={m.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Abrir <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ---- Subtab: Clases ----
const SubtabClases = ({ seccionId, onPasarLista }) => {
  const { data: clases = [], isLoading } = useClases(seccionId);

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }
  if (clases.length === 0) {
    return (
      <EmptyState
        icon={Video}
        title="Sin clases programadas"
        description='Usá el botón "Crear" abajo a la derecha para programar la primera clase de esta sección.'
      />
    );
  }

  const ahora = Date.now();
  return (
    <div className="space-y-3">
      {clases.map((c) => {
        const ts = new Date(c.fecha).getTime();
        const esFutura = ts > ahora;
        return (
          <Card key={c.id} className={esFutura ? 'border-primary/20' : 'opacity-90'}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-sm capitalize">{formatFecha(c.fecha)}</p>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{c.hora_inicio}</span>
                  {c.estado && c.estado !== 'programada' && (
                    <Badge variant="secondary" className="text-xs">{c.estado}</Badge>
                  )}
                </div>
                {c.tema && <p className="text-sm text-foreground/80 mt-1 truncate">{c.tema}</p>}
              </div>
              <div className="flex items-center gap-2">
                {c.link && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={c.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Link
                    </a>
                  </Button>
                )}
                <Button size="sm" onClick={() => onPasarLista(c)}>
                  Pasar lista
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ---- Subtab: Asistencia ----
const SubtabAsistencia = ({ seccionId }) => {
  const { data: matriculas = [], isLoading: loadingMatric } = useMatriculas(seccionId);
  const { data: porAlumno = new Map(), isLoading: loadingAsist } = useAsistenciaResumen(seccionId, matriculas);

  const isLoading = loadingMatric || loadingAsist;

  const rows = useMemo(() => {
    return matriculas.map((m) => {
      const stat = porAlumno.get(m.alumno_id) || { total: 0, presente: 0, ausente: 0, justificado: 0, tardanza: 0 };
      const presentesEquivalentes = (stat.presente || 0) + (stat.tardanza || 0) + (stat.justificado || 0);
      const pct = stat.total > 0 ? Math.round((presentesEquivalentes / stat.total) * 100) : null;
      return {
        id: m.id,
        alumno: m.expand?.alumno_id?.name || '—',
        rut: m.expand?.alumno_id?.rut || '',
        total: stat.total,
        presente: stat.presente,
        ausente: stat.ausente,
        pct,
      };
    });
  }, [matriculas, porAlumno]);

  const columns = useMemo(() => ([
    {
      accessorKey: 'alumno',
      header: 'Alumno',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.alumno}</p>
          {row.original.rut && <p className="text-xs font-mono text-muted-foreground">{row.original.rut}</p>}
        </div>
      ),
    },
    { accessorKey: 'total', header: 'Clases', cell: ({ row }) => <span className="font-mono tabular-nums text-sm">{row.original.total || '—'}</span> },
    { accessorKey: 'presente', header: 'Presente', cell: ({ row }) => <span className="font-mono tabular-nums text-sm text-success">{row.original.presente || 0}</span> },
    { accessorKey: 'ausente', header: 'Ausente', cell: ({ row }) => <span className="font-mono tabular-nums text-sm text-destructive">{row.original.ausente || 0}</span> },
    {
      accessorKey: 'pct',
      header: '%',
      cell: ({ row }) => {
        const pct = row.original.pct;
        if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
        const color = pct >= 85 ? 'text-success' : pct >= 75 ? 'text-warning-foreground' : 'text-destructive';
        return <span className={`font-mono font-bold tabular-nums ${color}`}>{pct}%</span>;
      },
    },
  ]), []);

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      emptyIcon={Calendar}
      emptyTitle="Sin asistencia registrada"
      emptyDescription='Cada vez que pases lista, se acumula acá. El umbral de alerta automática es 75% (notifica al apoderado).'
      searchPlaceholder="Buscar alumno..."
    />
  );
};

export default SeccionDetalle;
