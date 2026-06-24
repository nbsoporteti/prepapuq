import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';

const ProfesorPerfil = () => {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  const { data: profExtra } = useQuery({
    queryKey: ['profesor', 'extra', currentUser?.id],
    enabled: !!currentUser?.id,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await pb.collection('profesores_extra').getFirstListItem(`user_id = "${currentUser.id}"`, { $autoCancel: false });
      } catch (_e) {
        return null;
      }
    },
  });

  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm({
    values: {
      bio: profExtra?.bio || '',
      especialidad: profExtra?.especialidad || '',
      universidad_origen: profExtra?.universidad_origen || '',
      anio_egreso: profExtra?.anio_egreso || '',
      titulo_profesional: profExtra?.titulo_profesional || '',
      magister: profExtra?.magister || '',
      frase_destacada: profExtra?.frase_destacada || '',
    },
  });

  const save = useMutation({
    mutationFn: async (values) => {
      const payload = {
        ...values,
        anio_egreso: values.anio_egreso ? Number(values.anio_egreso) : null,
        user_id: currentUser.id,
      };
      if (profExtra?.id) {
        return pb.collection('profesores_extra').update(profExtra.id, payload, { $autoCancel: false });
      }
      return pb.collection('profesores_extra').create(payload, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success('Perfil actualizado');
      qc.invalidateQueries({ queryKey: ['profesor', 'extra'] });
    },
    onError: (e) => {
      console.error(e);
      toast.error('No se pudo guardar');
    },
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos profesionales</CardTitle>
            <CardDescription>
              Esta información es la que ven los alumnos en tu perfil dentro de la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(save.mutate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="frase_destacada">Frase destacada</Label>
                <Input id="frase_destacada" {...register('frase_destacada')} placeholder="Una línea que te represente como docente" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="especialidad">Especialidad</Label>
                  <Input id="especialidad" {...register('especialidad')} placeholder="Ej: Matemática avanzada PAES" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anio_egreso">Año de egreso</Label>
                  <Input id="anio_egreso" type="number" min={1970} max={2099} {...register('anio_egreso')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="universidad_origen">Universidad de origen</Label>
                <Input id="universidad_origen" {...register('universidad_origen')} placeholder="Ej: Universidad de Magallanes" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo_profesional">Título profesional</Label>
                <Input id="titulo_profesional" {...register('titulo_profesional')} placeholder="Ej: Profesor de Matemática y Computación" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="magister">Magíster / posgrado</Label>
                <Input id="magister" {...register('magister')} placeholder="Opcional" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={5} {...register('bio')} placeholder="Tu trayectoria, enfoque pedagógico, experiencia con PAES, etc." />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => reset()} disabled={!isDirty || isSubmitting}>
                  Descartar
                </Button>
                <Button type="submit" disabled={!isDirty || isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{currentUser?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Roles</p>
              <p className="font-medium">{(currentUser?.roles || [currentUser?.rol].filter(Boolean)).join(', ')}</p>
            </div>
            <p className="text-xs text-muted-foreground pt-3 border-t">
              Para cambiar contraseña usá "Olvidé mi contraseña" desde el login.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfesorPerfil;
