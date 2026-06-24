import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, UserPlus, KeyRound } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const ROLES = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'apoderado', label: 'Apoderado' },
  { value: 'profesor', label: 'Profesor' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'admin', label: 'Administrador' },
];

const ANIOS = [
  { value: '3medio', label: '3° Medio' },
  { value: '4medio', label: '4° Medio' },
  { value: 'egresado', label: 'Egresado' },
];

// Deriva el `rol` legacy (single, requerido: estudiante/apoderado/admin) desde el
// array `roles`. profesor/administrativo no existen en el enum legacy → caen a
// 'estudiante' como placeholder de mínimo privilegio (igual que los seeds).
const legacyRol = (roles) => {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('apoderado')) return 'apoderado';
  return 'estudiante';
};

const schema = z
  .object({
    name: z.string().min(2, 'Ingresá el nombre completo'),
    email: z.string().email('Email inválido'),
    rut: z.string().optional(),
    telefono: z.string().optional(),
    roles: z.array(z.string()).min(1, 'Asigná al menos un rol'),
    anio_que_cursa: z.string().optional(),
    activo: z.boolean(),
    _isCreate: z.boolean(),
    password: z.string().optional(),
    passwordConfirm: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const pwd = data.password || '';
    const pc = data.passwordConfirm || '';
    // Password obligatorio al crear; opcional al editar (solo si se quiere resetear).
    if (data._isCreate || pwd || pc) {
      if (pwd.length < 8) {
        ctx.addIssue({ path: ['password'], code: z.ZodIssueCode.custom, message: 'Mínimo 8 caracteres' });
      }
      if (pwd !== pc) {
        ctx.addIssue({ path: ['passwordConfirm'], code: z.ZodIssueCode.custom, message: 'No coinciden' });
      }
    }
  });

const emptyValues = {
  name: '',
  email: '',
  rut: '',
  telefono: '',
  roles: ['estudiante'],
  anio_que_cursa: '',
  activo: true,
  password: '',
  passwordConfirm: '',
};

/**
 * Sheet para crear o editar un usuario desde el panel admin.
 *
 * Props:
 *  - open / onOpenChange
 *  - user: registro a editar, o null/undefined para crear
 */
const UserFormSheet = ({ open, onOpenChange, user }) => {
  const qc = useQueryClient();
  const isCreate = !user?.id;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { ...emptyValues, _isCreate: isCreate },
  });

  // Rehidrata el form cada vez que se abre / cambia el usuario objetivo.
  useEffect(() => {
    if (!open) return;
    if (user?.id) {
      const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : (user.rol ? [user.rol] : []);
      reset({
        name: user.name || '',
        email: user.email || '',
        rut: user.rut || '',
        telefono: user.telefono || '',
        roles,
        anio_que_cursa: user.anio_que_cursa || '',
        activo: user.activo !== false,
        password: '',
        passwordConfirm: '',
        _isCreate: false,
      });
    } else {
      reset({ ...emptyValues, _isCreate: true });
    }
  }, [open, user, reset]);

  const roles = watch('roles') || [];
  const activo = watch('activo');
  const esEstudiante = roles.includes('estudiante');

  const toggleRole = (value) => {
    const next = roles.includes(value) ? roles.filter((r) => r !== value) : [...roles, value];
    setValue('roles', next, { shouldValidate: true });
  };

  const save = useMutation({
    mutationFn: async (values) => {
      const r = values.roles;
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        rut: (values.rut || '').trim(),
        telefono: (values.telefono || '').trim(),
        roles: r,
        rol: legacyRol(r),
        anio_que_cursa: r.includes('estudiante') ? (values.anio_que_cursa || '') : '',
        activo: values.activo,
        emailVisibility: true,
      };
      if (isCreate) {
        payload.password = values.password;
        payload.passwordConfirm = values.passwordConfirm;
        payload.verified = true; // creado por admin → ya verificado (requiere manageRule)
        return pb.collection('users').create(payload, { $autoCancel: false });
      }
      if (values.password) {
        payload.password = values.password;
        payload.passwordConfirm = values.passwordConfirm;
      }
      return pb.collection('users').update(user.id, payload, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success(isCreate ? 'Usuario creado' : 'Cambios guardados');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
      onOpenChange(false);
    },
    onError: (e) => {
      const data = e?.response?.data || e?.data;
      const detail = data
        ? Object.entries(data).map(([k, v]) => `${k}: ${v?.message || v}`).join(' · ')
        : e?.message;
      toast.error('No se pudo guardar' + (detail ? `: ${detail}` : ''));
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isCreate ? <UserPlus className="h-5 w-5 text-primary" /> : <Save className="h-5 w-5 text-primary" />}
            {isCreate ? 'Nuevo usuario' : 'Editar usuario'}
          </SheetTitle>
          <SheetDescription>
            {isCreate
              ? 'Crea una cuenta y asigná uno o más roles. La contraseña se la entregás vos a la persona.'
              : 'Modificá los datos, roles y estado de la cuenta.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(save.mutate)} className="space-y-5 py-6">
          {/* Datos básicos */}
          <div className="space-y-2">
            <Label htmlFor="uf-name">Nombre completo <span className="text-destructive">*</span></Label>
            <Input id="uf-name" {...register('name')} placeholder="Ej: Camila Soto Pérez" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uf-email">Email <span className="text-destructive">*</span></Label>
              <Input id="uf-email" type="email" {...register('email')} placeholder="persona@correo.cl" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf-rut">RUT</Label>
              <Input id="uf-rut" {...register('rut')} placeholder="12.345.678-9" />
              {errors.rut && <p className="text-xs text-destructive">{errors.rut.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf-telefono">Teléfono</Label>
            <Input id="uf-telefono" type="tel" {...register('telefono')} placeholder="+56 9 ..." />
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label>Roles <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  htmlFor={`uf-rol-${r.value}`}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    id={`uf-rol-${r.value}`}
                    checked={roles.includes(r.value)}
                    onCheckedChange={() => toggleRole(r.value)}
                  />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
            {errors.roles && <p className="text-xs text-destructive">{errors.roles.message}</p>}
          </div>

          {/* Año que cursa (solo estudiantes) */}
          {esEstudiante && (
            <div className="space-y-2">
              <Label>Año que cursa</Label>
              <Select
                value={watch('anio_que_cursa') || ''}
                onValueChange={(v) => setValue('anio_que_cursa', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  {ANIOS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Estado */}
          <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-3">
            <div>
              <p className="text-sm font-medium">Cuenta activa</p>
              <p className="text-xs text-muted-foreground">
                Si la desactivás, la persona no podrá iniciar sesión.
              </p>
            </div>
            <Switch checked={!!activo} onCheckedChange={(v) => setValue('activo', v)} />
          </div>

          {/* Contraseña */}
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              {isCreate ? 'Contraseña inicial' : 'Resetear contraseña (opcional)'}
            </div>
            {!isCreate && (
              <p className="text-xs text-muted-foreground">
                Dejalo en blanco para no cambiarla. Si la cambiás, no necesitás la contraseña anterior.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uf-pwd">
                  {isCreate ? 'Contraseña' : 'Nueva contraseña'}
                  {isCreate && <span className="text-destructive"> *</span>}
                </Label>
                <Input id="uf-pwd" type="password" autoComplete="new-password" {...register('password')} placeholder="Mínimo 8 caracteres" />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf-pwd2">Confirmar</Label>
                <Input id="uf-pwd2" type="password" autoComplete="new-password" {...register('passwordConfirm')} placeholder="Repetir" />
                {errors.passwordConfirm && <p className="text-xs text-destructive">{errors.passwordConfirm.message}</p>}
              </div>
            </div>
          </div>

          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || save.isPending}>
              {save.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> {isCreate ? 'Crear usuario' : 'Guardar cambios'}</>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default UserFormSheet;
