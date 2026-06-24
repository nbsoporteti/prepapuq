import React, { useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Save, Upload, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';

const PerfilGeneral = () => {
  const { currentUser, rolesEffective } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [pwd, setPwd] = useState({ oldPwd: '', newPwd: '', newPwdConfirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm({
    values: {
      name: currentUser?.name || '',
      telefono: currentUser?.telefono || '',
      direccion: currentUser?.direccion || '',
      comuna: currentUser?.comuna || '',
      colegio_procedencia: currentUser?.colegio_procedencia || '',
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (values) => pb.collection('users').update(currentUser.id, values, { $autoCancel: false }),
    onSuccess: () => {
      toast.success('Perfil actualizado');
      qc.invalidateQueries({ queryKey: ['users', currentUser.id] });
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const uploadFoto = async (file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('foto', file);
      await pb.collection('users').update(currentUser.id, fd, { $autoCancel: false });
      toast.success('Foto actualizada');
      // refrescar el authStore para que se vea
      try { await pb.collection('users').authRefresh({ $autoCancel: false }); } catch (_e) {}
    } catch (e) {
      console.error(e);
      toast.error('No se pudo subir la foto');
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    if (pwd.newPwd.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (pwd.newPwd !== pwd.newPwdConfirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setPwdLoading(true);
    try {
      await pb.collection('users').update(currentUser.id, {
        oldPassword: pwd.oldPwd,
        password: pwd.newPwd,
        passwordConfirm: pwd.newPwdConfirm,
      }, { $autoCancel: false });
      toast.success('Contraseña actualizada');
      setPwd({ oldPwd: '', newPwd: '', newPwdConfirm: '' });
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cambiar la contraseña. Revisá la actual.');
    } finally {
      setPwdLoading(false);
    }
  };

  const fotoUrl = currentUser?.foto ? pb.files.getUrl(currentUser, currentUser.foto, { thumb: '200x200' }) : null;
  const initial = (currentUser?.name || currentUser?.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <Helmet><title>Mi perfil | PrePa</title></Helmet>
      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to={-1}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás
              </Link>
            </Button>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Mi perfil</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid lg:grid-cols-3 gap-6">
          {/* Foto + datos cuenta */}
          <Card className="lg:col-span-1 h-fit">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="relative">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Foto" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold">
                    {initial}
                  </div>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 absolute bottom-0 right-0 rounded-full shadow-md"
                  onClick={() => fileRef.current?.click()}
                  title="Cambiar foto"
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => uploadFoto(e.target.files?.[0])}
                />
              </div>
              <p className="font-semibold mt-3">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              <div className="flex flex-wrap justify-center gap-1 mt-3">
                {(rolesEffective || []).map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px] capitalize">{r}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Datos personales */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos personales</CardTitle>
                <CardDescription>Estos datos los usa secretaría para contactarte y emitir documentos.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(updateProfile.mutate)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input id="name" {...register('name')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input id="telefono" type="tel" {...register('telefono')} placeholder="+56 9 ..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comuna">Comuna</Label>
                      <Input id="comuna" {...register('comuna')} placeholder="Punta Arenas" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="direccion">Dirección</Label>
                      <Input id="direccion" {...register('direccion')} />
                    </div>
                    {(rolesEffective || []).includes('estudiante') && (
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="colegio_procedencia">Colegio de procedencia</Label>
                        <Input id="colegio_procedencia" {...register('colegio_procedencia')} />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => reset()} disabled={!isDirty || isSubmitting}>
                      Descartar
                    </Button>
                    <Button type="submit" disabled={!isDirty || isSubmitting}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Cambiar contraseña */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Cambiar contraseña
                </CardTitle>
                <CardDescription>Necesitás ingresar tu contraseña actual para confirmar el cambio.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={cambiarPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldPwd">Contraseña actual</Label>
                    <Input
                      id="oldPwd"
                      type="password"
                      value={pwd.oldPwd}
                      onChange={(e) => setPwd((p) => ({ ...p, oldPwd: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="newPwd">Nueva contraseña</Label>
                      <Input
                        id="newPwd"
                        type="password"
                        minLength={8}
                        value={pwd.newPwd}
                        onChange={(e) => setPwd((p) => ({ ...p, newPwd: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPwdConfirm">Confirmar</Label>
                      <Input
                        id="newPwdConfirm"
                        type="password"
                        minLength={8}
                        value={pwd.newPwdConfirm}
                        onChange={(e) => setPwd((p) => ({ ...p, newPwdConfirm: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={pwdLoading}>
                      {pwdLoading ? 'Actualizando...' : 'Cambiar contraseña'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default PerfilGeneral;
