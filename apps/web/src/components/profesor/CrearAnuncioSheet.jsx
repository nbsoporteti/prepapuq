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
  titulo: z.string().min(3).max(200),
  contenido_html: z.string().min(5).max(10000),
  categoria: z.enum(['general', 'academica', 'evento', 'advertencia', 'felicitacion']).optional(),
  pinned: z.boolean().optional(),
  importante: z.boolean().optional(),
});

const CrearAnuncioSheet = ({ open, onOpenChange, profesorId, seccionPreseleccionada }) => {
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
      categoria: 'general',
      pinned: false,
      importante: false,
    },
  });

  React.useEffect(() => {
    if (seccionPreseleccionada) setValue('seccion_id', seccionPreseleccionada);
  }, [seccionPreseleccionada, setValue]);

  const create = useMutation({
    mutationFn: async (values) => {
      return pb.collection('anuncios').create({
        autor_id: profesorId,
        scope: 'seccion',
        seccion_id: values.seccion_id,
        titulo: values.titulo,
        contenido_html: values.contenido_html,
        categoria: values.categoria || 'general',
        pinned: !!values.pinned,
        importante: !!values.importante,
        publicado_at: new Date().toISOString(),
      }, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success('Anuncio publicado');
      qc.invalidateQueries({ queryKey: ['profesor'] });
      qc.invalidateQueries({ queryKey: ['seccion'] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error('No se pudo publicar el anuncio');
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Publicar anuncio</SheetTitle>
          <SheetDescription>
            El anuncio aparece en el dashboard de los alumnos de la sección elegida. Marcalo como "importante" si querés que también lleguen por email.
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
            <Input id="titulo" {...register('titulo')} placeholder="Ej: Cambio de aula martes 12" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenido_html">Contenido</Label>
            <Textarea id="contenido_html" rows={6} {...register('contenido_html')} placeholder="El detalle del anuncio. Podés usar varios párrafos." />
            <p className="text-xs text-muted-foreground">
              Editor con formato avanzado (TipTap) en Fase 4. Por ahora texto plano funciona perfecto.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select value={watch('categoria')} onValueChange={(v) => setValue('categoria', v)}>
              <SelectTrigger id="categoria"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="academica">Académica</SelectItem>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="advertencia">Advertencia</SelectItem>
                <SelectItem value="felicitacion">Felicitación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-muted/40">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pinned" className="text-sm">Fijar arriba</Label>
                <p className="text-xs text-muted-foreground">Aparece destacado en los dashboards</p>
              </div>
              <Switch id="pinned" checked={watch('pinned')} onCheckedChange={(v) => setValue('pinned', v)} />
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <Label htmlFor="importante" className="text-sm">Importante (envía email)</Label>
                <p className="text-xs text-muted-foreground">Notificación email + in-app a todos</p>
              </div>
              <Switch id="importante" checked={watch('importante')} onCheckedChange={(v) => setValue('importante', v)} />
            </div>
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Publicando...' : 'Publicar anuncio'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default CrearAnuncioSheet;
