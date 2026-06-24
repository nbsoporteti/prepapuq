import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const schema = z.object({
  seccion_id: z.string().min(1, 'Seleccioná una sección'),
  titulo: z.string().min(3).max(200),
  tipo: z.enum(['prueba', 'control', 'simulacro_paes', 'ensayo', 'trabajo', 'oral', 'proyecto']),
  fecha: z.string().min(1, 'Fecha requerida'),
  ponderacion_pct: z.coerce.number().min(0).max(100).optional(),
  puntaje_max: z.coerce.number().min(1).max(1000).optional(),
  escala_exigencia_pct: z.coerce.number().min(30).max(80).optional(),
  duracion_min: z.coerce.number().min(1).max(480).optional(),
  modalidad: z.enum(['presencial', 'online']).optional(),
  instrucciones: z.string().max(3000).optional(),
});

const CrearEvaluacionSheet = ({ open, onOpenChange, profesorId, seccionPreseleccionada }) => {
  const qc = useQueryClient();

  const { data: secciones = [] } = useQuery({
    queryKey: ['profesor', 'secciones', profesorId],
    enabled: !!(open && profesorId),
    staleTime: 60_000,
    queryFn: async () => {
      const r = await pb.collection('secciones_curso').getList(1, 50, {
        filter: `profesor_id = "${profesorId}" && estado != "archivada"`,
        expand: 'curso_id',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      seccion_id: seccionPreseleccionada || '',
      tipo: 'prueba',
      puntaje_max: 100,
      escala_exigencia_pct: 60,
      duracion_min: 90,
      modalidad: 'presencial',
    },
  });

  React.useEffect(() => {
    if (seccionPreseleccionada) setValue('seccion_id', seccionPreseleccionada);
  }, [seccionPreseleccionada, setValue]);

  const create = useMutation({
    mutationFn: async (values) => {
      const fechaISO = new Date(values.fecha + 'T00:00:00.000Z').toISOString();
      return pb.collection('evaluaciones').create({
        seccion_id: values.seccion_id,
        profesor_id: profesorId,
        titulo: values.titulo,
        tipo: values.tipo,
        fecha: fechaISO,
        ponderacion_pct: values.ponderacion_pct || 0,
        puntaje_max: values.puntaje_max || 100,
        escala_exigencia_pct: values.escala_exigencia_pct || 60,
        duracion_min: values.duracion_min || 90,
        modalidad: values.modalidad || 'presencial',
        instrucciones: values.instrucciones || '',
        estado: 'programada',
      }, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success('Evaluación programada');
      qc.invalidateQueries({ queryKey: ['profesor'] });
      qc.invalidateQueries({ queryKey: ['seccion'] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error('No se pudo crear la evaluación');
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Programar evaluación</SheetTitle>
          <SheetDescription>
            Prueba, control, simulacro PAES, ensayo, oral o proyecto. Las notas se cargan después de la fecha.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(create.mutate)} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seccion_id">Sección <span className="text-destructive">*</span></Label>
            <Select value={watch('seccion_id')} onValueChange={(v) => setValue('seccion_id', v, { shouldValidate: true })}>
              <SelectTrigger id="seccion_id"><SelectValue placeholder="Elegí" /></SelectTrigger>
              <SelectContent>
                {secciones.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.expand?.curso_id?.nombre} — {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.seccion_id && <p className="text-xs text-destructive">{errors.seccion_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título <span className="text-destructive">*</span></Label>
            <Input id="titulo" {...register('titulo')} placeholder="Ej: Prueba 1 — Trigonometría" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={watch('tipo')} onValueChange={(v) => setValue('tipo', v)}>
                <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prueba">Prueba</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="simulacro_paes">Simulacro PAES</SelectItem>
                  <SelectItem value="ensayo">Ensayo</SelectItem>
                  <SelectItem value="trabajo">Trabajo</SelectItem>
                  <SelectItem value="oral">Oral</SelectItem>
                  <SelectItem value="proyecto">Proyecto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha <span className="text-destructive">*</span></Label>
              <Input id="fecha" type="date" {...register('fecha')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="puntaje_max">Pje. máx.</Label>
              <Input id="puntaje_max" type="number" min={1} max={1000} {...register('puntaje_max')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="escala_exigencia_pct">Exigencia %</Label>
              <Input id="escala_exigencia_pct" type="number" min={30} max={80} {...register('escala_exigencia_pct')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duracion_min">Duración (min)</Label>
              <Input id="duracion_min" type="number" min={1} max={480} {...register('duracion_min')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="modalidad">Modalidad</Label>
              <Select value={watch('modalidad')} onValueChange={(v) => setValue('modalidad', v)}>
                <SelectTrigger id="modalidad"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ponderacion_pct">Ponderación (%)</Label>
              <Input id="ponderacion_pct" type="number" min={0} max={100} {...register('ponderacion_pct')} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instrucciones">Instrucciones</Label>
            <Textarea id="instrucciones" rows={3} {...register('instrucciones')} placeholder="Qué tienen que estudiar, materiales permitidos, etc." />
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Programar'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default CrearEvaluacionSheet;
