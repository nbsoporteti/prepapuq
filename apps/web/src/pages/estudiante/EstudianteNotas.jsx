import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Filter, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from '@/components/shared/EmptyState.jsx';
import BadgeNota from '@/components/shared/BadgeNota.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNotasAlumno } from '@/hooks/useNotasAlumno.js';
import { trimestrePorFecha, TRIMESTRES_OPCIONES } from '@/lib/trimestres.js';
import { promedioSimple } from '@/lib/promedios.js';

/**
 * Libreta del alumno: agrupada por curso, con filtro de trimestre.
 * Cada curso es un accordion expandible con tabla detalle.
 *
 * Recibe opcionalmente `pupiloId` para que el ApoderadoDashboard pueda
 * reutilizar esta vista.
 */
const EstudianteNotas = ({ pupiloId }) => {
  const { currentUser } = useAuth();
  const targetId = pupiloId || currentUser?.id;
  const { data: items = [], isLoading } = useNotasAlumno(targetId);
  const [trimestre, setTrimestre] = useState('todos');
  const isApoderadoMode = !!pupiloId;

  const filtradas = useMemo(() => {
    if (trimestre === 'todos') return items;
    return items.filter((i) => trimestrePorFecha(i.fecha) === trimestre);
  }, [items, trimestre]);

  const porCurso = useMemo(() => {
    const m = new Map();
    for (const n of filtradas) {
      const key = n.cursoId || '_';
      const arr = m.get(key) || { cursoId: n.cursoId, cursoNombre: n.cursoNombre, notas: [] };
      arr.notas.push(n);
      m.set(key, arr);
    }
    return Array.from(m.values()).sort((a, b) => (a.cursoNombre || '').localeCompare(b.cursoNombre || ''));
  }, [filtradas]);

  const promedioGeneral = useMemo(() => {
    return promedioSimple(filtradas.filter((n) => n.estado_nota === 'calificada' && n.nota != null).map((n) => n.nota));
  }, [filtradas]);

  return (
    <div className="space-y-6">
      {!isApoderadoMode && (
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
            <Link to="/dashboard/estudiante">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al dashboard
            </Link>
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {isApoderadoMode ? 'Libreta del pupilo' : 'Mi libreta'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Solo se muestran notas publicadas por los profesores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={trimestre} onValueChange={setTrimestre}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los trimestres</SelectItem>
              {TRIMESTRES_OPCIONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Promedio general */}
      {promedioGeneral !== null && (
        <Card className="bg-gradient-to-br from-primary/5 to-card">
          <CardContent className="p-5 flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                Promedio simple {trimestre === 'todos' ? 'general' : trimestre}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums">{promedioGeneral.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sobre {filtradas.filter((n) => n.estado_nota === 'calificada').length} notas
              </p>
            </div>
            <BadgeNota nota={promedioGeneral} size="lg" />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : porCurso.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sin notas publicadas"
          description="Cuando los profesores publiquen evaluaciones o califiquen tareas, las vas a ver acá."
        />
      ) : (
        <Accordion type="multiple" defaultValue={porCurso.map((c) => c.cursoId || '_')} className="space-y-3">
          {porCurso.map((c) => {
            const prom = promedioSimple(c.notas.filter((n) => n.estado_nota === 'calificada' && n.nota != null).map((n) => n.nota));
            return (
              <AccordionItem
                key={c.cursoId || '_'}
                value={c.cursoId || '_'}
                className="border rounded-xl bg-card shadow-sm px-4"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-left flex-1">
                      <p className="font-semibold">{c.cursoNombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.notas.length} {c.notas.length === 1 ? 'nota' : 'notas'}
                      </p>
                    </div>
                    <BadgeNota nota={prom} size="md" />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs uppercase tracking-wider">Evaluación</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider">Tipo</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider">Fecha</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-right">Nota</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {c.notas.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell>
                              <p className="font-medium text-sm">{n.titulo}</p>
                              {n.feedback && (
                                <p className="text-xs text-muted-foreground line-clamp-1 italic">{n.feedback}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {n.subtipo.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {n.fecha ? new Date(n.fecha).toLocaleDateString('es-CL') : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {n.estado_nota === 'calificada' ? (
                                <BadgeNota nota={n.nota} size="sm" />
                              ) : (
                                <Badge variant="secondary" className="text-xs capitalize">{n.estado_nota.replace('_', ' ')}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

export default EstudianteNotas;
