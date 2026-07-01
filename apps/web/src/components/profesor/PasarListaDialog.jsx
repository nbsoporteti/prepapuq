import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, CheckCircle2, XCircle, Clock, FileText, LogOut } from 'lucide-react';
import AsistenciaConfirmDialog from '@/components/asistencia/AsistenciaConfirmDialog.jsx';
import pb from '@/lib/pocketbaseClient';

const ESTADOS = [
  { key: 'presente', label: 'P', icon: CheckCircle2, color: 'text-success', desc: 'Presente' },
  { key: 'tardanza', label: 'T', icon: Clock, color: 'text-warning', desc: 'Tardanza' },
  { key: 'ausente', label: 'A', icon: XCircle, color: 'text-destructive', desc: 'Ausente' },
  { key: 'justificado', label: 'J', icon: FileText, color: 'text-info', desc: 'Justificado' },
  { key: 'retirado', label: 'R', icon: LogOut, color: 'text-muted-foreground', desc: 'Retirado' },
];

/**
 * Diálogo para pasar lista de asistencia rápido (< 90s objetivo).
 *
 * Props:
 *  - open / onOpenChange
 *  - clase: registro de clases_vivo (debe traer id y opcionalmente expand.seccion_id)
 *  - onSaved: callback al guardar exitosamente
 *
 * Carga las filas pre-existentes de asistencia_clase_vivo (el hook
 * clases_lifecycle crea una por matriculado al programar la clase) y permite
 * cambiar el estado de cada una. Submit hace upsert batch (Promise.all).
 */
const PasarListaDialog = ({ open, onOpenChange, clase, onSaved }) => {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [estados, setEstados] = useState({}); // { alumno_id: estado }
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: filas = [], isLoading, refetch } = useQuery({
    queryKey: ['profesor', 'pasar-lista', clase?.id],
    enabled: !!(open && clase?.id),
    staleTime: 0,
    queryFn: async () => {
      const r = await pb.collection('asistencia_clase_vivo').getList(1, 200, {
        filter: `clase_vivo_id = "${clase.id}"`,
        expand: 'alumno_id',
        sort: 'expand.alumno_id.name',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  // Inicializar estados con lo que viene de la BD.
  useEffect(() => {
    if (!filas.length) return;
    const next = {};
    for (const f of filas) {
      next[f.alumno_id] = f.estado || 'ausente';
    }
    setEstados(next);
  }, [filas]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) => {
      const u = f.expand?.alumno_id;
      const nombre = (u?.name || '').toLowerCase();
      const rut = (u?.rut || '').toLowerCase();
      return nombre.includes(q) || rut.includes(q);
    });
  }, [filas, busqueda]);

  const counts = useMemo(() => {
    const c = { presente: 0, tardanza: 0, ausente: 0, justificado: 0, retirado: 0 };
    for (const id of Object.keys(estados)) {
      const e = estados[id];
      if (c[e] !== undefined) c[e]++;
    }
    return c;
  }, [estados]);

  const setBulk = (estado) => {
    const next = { ...estados };
    for (const f of filtradas) {
      next[f.alumno_id] = estado;
    }
    setEstados(next);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pasar lista — {clase?.tema || 'Clase'}</DialogTitle>
          <DialogDescription>
            Marca el estado de cada alumno. Por defecto todos están como ausente.
            Atajos: usá los botones P/T/A/J/R o las acciones rápidas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 py-2 border-y">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o RUT"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Button variant="outline" size="sm" onClick={() => setBulk('presente')}>Todos P</Button>
            <Button variant="outline" size="sm" onClick={() => setBulk('ausente')}>Todos A</Button>
          </div>
          <div className="flex items-center gap-2 ml-auto text-xs">
            <Badge variant="secondary" className="bg-success/10 text-success">P: {counts.presente}</Badge>
            <Badge variant="secondary" className="bg-warning/10 text-warning-foreground">T: {counts.tardanza}</Badge>
            <Badge variant="secondary" className="bg-destructive/10 text-destructive">A: {counts.ausente}</Badge>
            <Badge variant="secondary" className="bg-info/10 text-info">J: {counts.justificado}</Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-2 py-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtradas.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {filas.length === 0
                ? 'No hay alumnos matriculados en esta sección todavía.'
                : 'Ningún alumno coincide con la búsqueda.'}
            </p>
          ) : (
            <ul className="divide-y">
              {filtradas.map((f) => {
                const u = f.expand?.alumno_id;
                const estado = estados[f.alumno_id] || 'ausente';
                return (
                  <li key={f.alumno_id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u?.name || 'Alumno'}</p>
                      {u?.rut && <p className="text-xs text-muted-foreground font-mono">{u.rut}</p>}
                    </div>
                    <ToggleGroup
                      type="single"
                      value={estado}
                      onValueChange={(v) => v && setEstados((prev) => ({ ...prev, [f.alumno_id]: v }))}
                      size="sm"
                    >
                      {ESTADOS.map((e) => (
                        <ToggleGroupItem
                          key={e.key}
                          value={e.key}
                          aria-label={e.desc}
                          title={e.desc}
                          className="w-9 h-9 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {e.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={filas.length === 0}>
            Confirmar y guardar ({Object.keys(estados).length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AsistenciaConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      payload={{ scope: 'clase', claseId: clase?.id, estados }}
      resumen={(
        <span>
          {Object.keys(estados).length} alumnos · P {counts.presente} · A {counts.ausente} · T {counts.tardanza} · J {counts.justificado}
        </span>
      )}
      onConfirmed={() => {
        qc.invalidateQueries({ queryKey: ['profesor'] });
        qc.invalidateQueries({ queryKey: ['seccion'] });
        onSaved?.();
        onOpenChange(false);
      }}
    />
    </>
  );
};

export default PasarListaDialog;
