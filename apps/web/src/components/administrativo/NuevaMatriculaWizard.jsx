import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

const STEPS = [
  { key: 'alumno', label: 'Alumno' },
  { key: 'apoderado', label: 'Apoderado' },
  { key: 'seccion', label: 'Sección' },
  { key: 'confirmar', label: 'Confirmar' },
];

/**
 * Wizard de 4 pasos para matricular un alumno nuevo. Crea (o reusa)
 *   1. user con roles=["estudiante"]
 *   2. user con roles=["apoderado"] + parent_student
 *   3. matriculas_seccion (dispara cuotas_generator hook automáticamente)
 *
 * Simplificación V1: contraseñas auto-generadas (8 chars), el flow real de
 * invitación por email queda para Fase 4 cuando esté SMTP configurado.
 */
const NuevaMatriculaWizard = ({ open, onOpenChange }) => {
  const qc = useQueryClient();
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState({
    alumno: { name: '', email: '', rut: '', telefono: '', anio_que_cursa: '4medio', colegio_procedencia: '' },
    apoderado: { name: '', email: '', rut: '', telefono: '', usarExistente: false, existenteId: '' },
    seccion: { seccion_id: '' },
  });

  const { data: secciones = [] } = useQuery({
    queryKey: ['adm', 'secciones-activas'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await pb.collection('secciones_curso').getList(1, 50, {
        filter: 'estado = "activa"',
        expand: 'curso_id',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const { data: apoderadosExistentes = [] } = useQuery({
    queryKey: ['adm', 'apoderados-quick'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await pb.collection('users').getList(1, 200, {
        filter: 'roles ~ "apoderado"',
        sort: 'name',
        fields: 'id,name,email,rut',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const reset = () => {
    setStepIdx(0);
    setData({
      alumno: { name: '', email: '', rut: '', telefono: '', anio_que_cursa: '4medio', colegio_procedencia: '' },
      apoderado: { name: '', email: '', rut: '', telefono: '', usarExistente: false, existenteId: '' },
      seccion: { seccion_id: '' },
    });
  };

  const submit = useMutation({
    mutationFn: async () => {
      // 1. Crear alumno user
      const pwd = randomPwd();
      const alumno = await pb.collection('users').create({
        ...data.alumno,
        email: data.alumno.email,
        emailVisibility: true,
        roles: ['estudiante'],
        rol: 'estudiante',
        password: pwd,
        passwordConfirm: pwd,
        activo: true,
      }, { $autoCancel: false });

      // 2. Apoderado (nuevo o existente)
      let apoderadoId = data.apoderado.existenteId;
      if (!data.apoderado.usarExistente) {
        const pwd2 = randomPwd();
        const ap = await pb.collection('users').create({
          ...data.apoderado,
          email: data.apoderado.email,
          emailVisibility: true,
          roles: ['apoderado'],
          rol: 'apoderado',
          password: pwd2,
          passwordConfirm: pwd2,
          activo: true,
        }, { $autoCancel: false });
        apoderadoId = ap.id;
      }

      // 3. parent_student
      if (apoderadoId) {
        await pb.collection('parent_student').create({
          parent_id: apoderadoId,
          student_id: alumno.id,
        }, { $autoCancel: false });
      }

      // 4. Matrícula (dispara cuotas_generator)
      await pb.collection('matriculas_seccion').create({
        alumno_id: alumno.id,
        seccion_id: data.seccion.seccion_id,
        fecha_matricula: new Date().toISOString(),
        estado: 'matriculado',
        matriculado_por: pb.authStore.model?.id,
      }, { $autoCancel: false });

      return { alumnoId: alumno.id };
    },
    onSuccess: () => {
      toast.success('Matrícula completada. Se generaron las 10 cuotas + matrícula automáticamente.');
      qc.invalidateQueries({ queryKey: ['adm'] });
      qc.invalidateQueries({ queryKey: ['administrativo'] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error('No se pudo completar la matrícula: ' + (e.message || 'error desconocido'));
    },
  });

  const step = STEPS[stepIdx];

  const canNext = () => {
    if (step.key === 'alumno') return data.alumno.name && data.alumno.email;
    if (step.key === 'apoderado') {
      if (data.apoderado.usarExistente) return !!data.apoderado.existenteId;
      return data.apoderado.name && data.apoderado.email;
    }
    if (step.key === 'seccion') return !!data.seccion.seccion_id;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva matrícula</DialogTitle>
          <DialogDescription>
            Paso {stepIdx + 1} de {STEPS.length} — {step.label}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1.5 py-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`flex items-center gap-2 ${i === stepIdx ? 'text-foreground' : 'text-muted-foreground'}`}>
                <span className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-mono font-bold ${
                  i < stepIdx ? 'bg-success text-success-foreground' :
                  i === stepIdx ? 'bg-primary text-primary-foreground' :
                  'bg-muted'
                }`}>
                  {i < stepIdx ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </React.Fragment>
          ))}
        </div>

        <div className="py-3 min-h-[280px]">
          {step.key === 'alumno' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="al-name">Nombre completo <span className="text-destructive">*</span></Label>
                  <Input id="al-name" value={data.alumno.name} onChange={(e) => setData((d) => ({ ...d, alumno: { ...d.alumno, name: e.target.value } }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="al-rut">RUT</Label>
                  <Input id="al-rut" value={data.alumno.rut} onChange={(e) => setData((d) => ({ ...d, alumno: { ...d.alumno, rut: e.target.value } }))} placeholder="12.345.678-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="al-email">Email <span className="text-destructive">*</span></Label>
                <Input id="al-email" type="email" value={data.alumno.email} onChange={(e) => setData((d) => ({ ...d, alumno: { ...d.alumno, email: e.target.value } }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="al-tel">Teléfono</Label>
                  <Input id="al-tel" value={data.alumno.telefono} onChange={(e) => setData((d) => ({ ...d, alumno: { ...d.alumno, telefono: e.target.value } }))} placeholder="+56 9 ..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="al-anio">Año actual</Label>
                  <Select value={data.alumno.anio_que_cursa} onValueChange={(v) => setData((d) => ({ ...d, alumno: { ...d.alumno, anio_que_cursa: v } }))}>
                    <SelectTrigger id="al-anio"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3medio">3° medio</SelectItem>
                      <SelectItem value="4medio">4° medio</SelectItem>
                      <SelectItem value="egresado">Egresado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="al-colegio">Colegio de procedencia</Label>
                <Input id="al-colegio" value={data.alumno.colegio_procedencia} onChange={(e) => setData((d) => ({ ...d, alumno: { ...d.alumno, colegio_procedencia: e.target.value } }))} />
              </div>
            </div>
          )}

          {step.key === 'apoderado' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant={!data.apoderado.usarExistente ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setData((d) => ({ ...d, apoderado: { ...d.apoderado, usarExistente: false, existenteId: '' } }))}
                >
                  Apoderado nuevo
                </Button>
                <Button
                  variant={data.apoderado.usarExistente ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setData((d) => ({ ...d, apoderado: { ...d.apoderado, usarExistente: true } }))}
                >
                  Vincular existente
                </Button>
              </div>

              {data.apoderado.usarExistente ? (
                <div className="space-y-1.5">
                  <Label>Buscar apoderado</Label>
                  <Select
                    value={data.apoderado.existenteId}
                    onValueChange={(v) => setData((d) => ({ ...d, apoderado: { ...d.apoderado, existenteId: v } }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Elegí un apoderado existente" /></SelectTrigger>
                    <SelectContent>
                      {apoderadosExistentes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name || a.email} {a.rut ? `· ${a.rut}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-name">Nombre <span className="text-destructive">*</span></Label>
                      <Input id="ap-name" value={data.apoderado.name} onChange={(e) => setData((d) => ({ ...d, apoderado: { ...d.apoderado, name: e.target.value } }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-rut">RUT</Label>
                      <Input id="ap-rut" value={data.apoderado.rut} onChange={(e) => setData((d) => ({ ...d, apoderado: { ...d.apoderado, rut: e.target.value } }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ap-email">Email <span className="text-destructive">*</span></Label>
                    <Input id="ap-email" type="email" value={data.apoderado.email} onChange={(e) => setData((d) => ({ ...d, apoderado: { ...d.apoderado, email: e.target.value } }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ap-tel">Teléfono</Label>
                    <Input id="ap-tel" value={data.apoderado.telefono} onChange={(e) => setData((d) => ({ ...d, apoderado: { ...d.apoderado, telefono: e.target.value } }))} />
                  </div>
                </>
              )}
            </div>
          )}

          {step.key === 'seccion' && (
            <div className="space-y-3">
              <Label>Sección donde matricular <span className="text-destructive">*</span></Label>
              <Select value={data.seccion.seccion_id} onValueChange={(v) => setData((d) => ({ ...d, seccion: { seccion_id: v } }))}>
                <SelectTrigger><SelectValue placeholder="Elegí la sección" /></SelectTrigger>
                <SelectContent>
                  {secciones.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.expand?.curso_id?.nombre} — {s.nombre} ({s.anio_lectivo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Al confirmar, se crea la matrícula y automáticamente se generan: 1 cuota de matrícula + 10 mensualidades (vencimiento día 5 de cada mes marzo-diciembre).
              </p>
            </div>
          )}

          {step.key === 'confirmar' && (
            <div className="space-y-4">
              <Summary title="Alumno" rows={[
                ['Nombre', data.alumno.name],
                ['Email', data.alumno.email],
                ['RUT', data.alumno.rut || '—'],
                ['Año', data.alumno.anio_que_cursa],
              ]} />
              <Summary title="Apoderado" rows={data.apoderado.usarExistente
                ? [['Apoderado existente', apoderadosExistentes.find((a) => a.id === data.apoderado.existenteId)?.name || 'Seleccionado']]
                : [
                  ['Nombre', data.apoderado.name],
                  ['Email', data.apoderado.email],
                  ['RUT', data.apoderado.rut || '—'],
                ]
              } />
              <Summary title="Sección" rows={[
                ['Sección', (() => {
                  const s = secciones.find((x) => x.id === data.seccion.seccion_id);
                  return s ? `${s.expand?.curso_id?.nombre} — ${s.nombre}` : '—';
                })()],
              ]} />
              <Badge variant="secondary" className="bg-success/10 text-success">
                Se generarán 11 pagos automáticamente (matrícula + 10 cuotas)
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0 || submit.isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          {stepIdx < STEPS.length - 1 ? (
            <Button
              onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
              disabled={!canNext()}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? 'Procesando...' : 'Confirmar matrícula'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Summary = ({ title, rows }) => (
  <div className="rounded-lg border bg-muted/30 p-3">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
    <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="col-span-2 font-medium">{v || '—'}</dd>
        </React.Fragment>
      ))}
    </dl>
  </div>
);

const randomPwd = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
};

export default NuevaMatriculaWizard;
