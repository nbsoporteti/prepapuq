import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ExternalLink, AlertCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

const LINK_REGEX = /^(https?:\/\/)?(meet\.google\.com\/[a-z0-9-]+|.*zoom\.us\/.+|teams\.microsoft\.com\/.+|.+)$/i;

const schema = z.object({
  seccion_id: z.string().min(1, 'Seleccioná una sección'),
  fecha: z.string().min(1, 'Fecha requerida'),
  hora_inicio: z.string().regex(/^[0-2]\d:[0-5]\d$/, 'Formato HH:MM'),
  hora_fin: z.string().regex(/^[0-2]\d:[0-5]\d$/, 'Formato HH:MM').optional().or(z.literal('')),
  plataforma: z.enum(['meet', 'zoom', 'teams', 'presencial', 'otra']),
  link: z.string().refine((v) => !v || LINK_REGEX.test(v), 'Link inválido').optional().or(z.literal('')),
  tema: z.string().max(300).optional(),
  descripcion: z.string().max(3000).optional(),
});

const CrearClaseVivoSheet = ({ open, onOpenChange, profesorId, seccionPreseleccionada }) => {
  const qc = useQueryClient();
  const [linkProbado, setLinkProbado] = useState(false);

  const { data: secciones = [] } = useQuery({
    queryKey: ['profesor', 'secciones', profesorId],
    enabled: !!(open && profesorId),
    staleTime: 60_000,
    queryFn: async () => {
      const r = await pb.collection('secciones_curso').getList(1, 50, {
        filter: `profesor_id = "${profesorId}" && estado != "archivada"`,
        expand: 'curso_id',
        sort: '+nombre',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      seccion_id: seccionPreseleccionada || '',
      plataforma: 'meet',
      fecha: new Date().toISOString().slice(0, 10),
      hora_inicio: '18:00',
      hora_fin: '19:30',
    },
  });

  // Reset cuando cambia la sección preseleccionada
  React.useEffect(() => {
    if (seccionPreseleccionada) {
      setValue('seccion_id', seccionPreseleccionada);
    }
  }, [seccionPreseleccionada, setValue]);

  const link = watch('link');

  const create = useMutation({
    mutationFn: async (values) => {
      const fechaISO = new Date(values.fecha + 'T00:00:00.000Z').toISOString();
      return pb.collection('clases_vivo').create({
        seccion_id: values.seccion_id,
        profesor_id: profesorId,
        fecha: fechaISO,
        hora_inicio: values.hora_inicio,
        hora_fin: values.hora_fin || '',
        plataforma: values.plataforma,
        link: values.link || '',
        tema: values.tema || '',
        descripcion: values.descripcion || '',
        estado: 'programada',
      }, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success('Clase programada. Asistencia prefilled como ausente para todos los matriculados.');
      qc.invalidateQueries({ queryKey: ['profesor'] });
      qc.invalidateQueries({ queryKey: ['seccion'] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error('No se pudo crear la clase');
    },
  });

  const probarLink = () => {
    if (!link) return;
    setLinkProbado(true);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Programar clase en vivo</SheetTitle>
          <SheetDescription>
            Pegá el link de Meet/Zoom que generaste a mano. Al guardar se crea la asistencia para todos los matriculados con estado "ausente" — solo cambiás los que vinieron.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(create.mutate)} className="mt-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="seccion_id">Sección <span className="text-destructive">*</span></Label>
            <Select
              value={watch('seccion_id')}
              onValueChange={(v) => setValue('seccion_id', v, { shouldValidate: true })}
            >
              <SelectTrigger id="seccion_id">
                <SelectValue placeholder="Elegí una sección" />
              </SelectTrigger>
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

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1 space-y-2">
              <Label htmlFor="fecha">Fecha <span className="text-destructive">*</span></Label>
              <Input id="fecha" type="date" {...register('fecha')} />
              {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Hora inicio <span className="text-destructive">*</span></Label>
              <Input id="hora_inicio" type="time" {...register('hora_inicio')} />
              {errors.hora_inicio && <p className="text-xs text-destructive">{errors.hora_inicio.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_fin">Hora fin</Label>
              <Input id="hora_fin" type="time" {...register('hora_fin')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plataforma">Plataforma</Label>
            <Select value={watch('plataforma')} onValueChange={(v) => setValue('plataforma', v)}>
              <SelectTrigger id="plataforma">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meet">Google Meet</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
                <SelectItem value="teams">Microsoft Teams</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="otra">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Link de la clase</Label>
            <div className="flex gap-2">
              <Input id="link" type="url" placeholder="https://meet.google.com/abc-defg-hij" {...register('link')} />
              <Button type="button" variant="outline" size="sm" onClick={probarLink} disabled={!link}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Probar
              </Button>
            </div>
            {errors.link && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.link.message}
              </p>
            )}
            {linkProbado && <Badge variant="secondary" className="bg-success/10 text-success">Abrí el link en otra pestaña — confirmá que funciona</Badge>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tema">Tema de la clase</Label>
            <Input id="tema" placeholder="Ej: Funciones cuadráticas" {...register('tema')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción / instrucciones previas</Label>
            <Textarea id="descripcion" rows={3} {...register('descripcion')} placeholder="Material que tienen que revisar antes, ejercicios sugeridos..." />
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Programar clase'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default CrearClaseVivoSheet;
