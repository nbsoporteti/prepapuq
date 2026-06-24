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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const schema = z.object({
  seccion_id: z.string().min(1, 'Seleccioná una sección'),
  titulo: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  descripcion_markdown: z.string().max(50000).optional(),
  fecha_limite: z.string().min(1, 'Fecha requerida'),
  puntaje_max: z.coerce.number().min(0).max(1000).optional(),
  tipo: z.enum(['individual', 'grupal']),
  allow_resubmit: z.boolean().optional(),
  late_penalty_pct_dia: z.coerce.number().min(0).max(100).optional(),
  publicar_ahora: z.boolean().optional(),
});

const CrearTareaSheet = ({ open, onOpenChange, profesorId, seccionPreseleccionada }) => {
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
      tipo: 'individual',
      puntaje_max: 100,
      late_penalty_pct_dia: 10,
      allow_resubmit: true,
      publicar_ahora: true,
    },
  });

  React.useEffect(() => {
    if (seccionPreseleccionada) setValue('seccion_id', seccionPreseleccionada);
  }, [seccionPreseleccionada, setValue]);

  const create = useMutation({
    mutationFn: async (values) => {
      const fechaLimite = new Date(values.fecha_limite + 'T23:59:59.000Z').toISOString();
      return pb.collection('tareas').create({
        seccion_id: values.seccion_id,
        profesor_id: profesorId,
        titulo: values.titulo,
        descripcion_markdown: values.descripcion_markdown || '',
        fecha_publicacion: new Date().toISOString(),
        fecha_limite: fechaLimite,
        puntaje_max: values.puntaje_max || 100,
        tipo: values.tipo,
        allow_resubmit: values.allow_resubmit || false,
        late_penalty_pct_dia: values.late_penalty_pct_dia || 0,
        late_max_dias: 7,
        max_intentos: values.allow_resubmit ? 3 : 1,
        estado: values.publicar_ahora ? 'publicada' : 'borrador',
      }, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success('Tarea creada');
      qc.invalidateQueries({ queryKey: ['profesor'] });
      qc.invalidateQueries({ queryKey: ['seccion'] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error('No se pudo crear la tarea');
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Crear tarea</SheetTitle>
          <SheetDescription>
            La tarea se publica para todos los alumnos matriculados en la sección elegida.
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
            <Input id="titulo" {...register('titulo')} placeholder="Ej: TP3 — Ejercicios de derivadas" />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion_markdown">Consignas</Label>
            <Textarea id="descripcion_markdown" rows={5} {...register('descripcion_markdown')} placeholder="Lo que tienen que hacer, formato esperado, etc." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fecha_limite">Fecha límite <span className="text-destructive">*</span></Label>
              <Input id="fecha_limite" type="date" {...register('fecha_limite')} />
              {errors.fecha_limite && <p className="text-xs text-destructive">{errors.fecha_limite.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="puntaje_max">Puntaje máximo</Label>
              <Input id="puntaje_max" type="number" min={0} max={1000} {...register('puntaje_max')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={watch('tipo')} onValueChange={(v) => setValue('tipo', v)}>
              <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="grupal">Grupal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="late_penalty_pct_dia">Penalty por día tarde (%)</Label>
              <Input id="late_penalty_pct_dia" type="number" min={0} max={100} {...register('late_penalty_pct_dia')} />
            </div>
            <div className="flex flex-col gap-1 pb-2">
              <Label htmlFor="allow_resubmit" className="text-sm">Permitir re-entrega</Label>
              <Switch
                id="allow_resubmit"
                checked={watch('allow_resubmit')}
                onCheckedChange={(v) => setValue('allow_resubmit', v)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div>
              <Label htmlFor="publicar_ahora" className="text-sm">Publicar ahora</Label>
              <p className="text-xs text-muted-foreground">Si está apagado, queda en borrador.</p>
            </div>
            <Switch
              id="publicar_ahora"
              checked={watch('publicar_ahora')}
              onCheckedChange={(v) => setValue('publicar_ahora', v)}
            />
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear tarea'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default CrearTareaSheet;
