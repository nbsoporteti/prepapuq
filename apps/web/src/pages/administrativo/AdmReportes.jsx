import React, { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Users, CreditCard, GraduationCap, MessageCircle, CalendarCheck, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

// Mini lib para generar CSV. Maneja escape de comillas y comas.
const toCSV = (rows, headers) => {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const headerKeys = headers.map((h) => h.key);
  const headerLabels = headers.map((h) => h.label || h.key);
  const lines = [headerLabels.join(',')];
  for (const r of rows) {
    lines.push(headerKeys.map((k) => escape(r[k])).join(','));
  }
  return lines.join('\n');
};

const downloadCSV = (filename, csv) => {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }); // BOM para Excel CL
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ReportCard = ({ icon: Icon, title, description, onExport, isPending, accent }) => (
  <Card>
    <CardHeader>
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent || 'bg-primary/10 text-primary'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Button size="sm" variant="outline" onClick={onExport} disabled={isPending}>
        <Download className="h-3.5 w-3.5 mr-2" />
        {isPending ? 'Exportando...' : 'Exportar CSV'}
      </Button>
    </CardContent>
  </Card>
);

const pctColor = (pct) => (pct < 75 ? 'text-destructive' : pct < 85 ? 'text-accent' : 'text-success');

/**
 * Reporte analítico de asistencia (sobre la colección `asistencia`, la que
 * carga el admin desde AttendanceTab: estado Presente/Ausente/Justificado).
 * Calcula % promedio por curso y lista alumnos en riesgo (<75% con 4+ sesiones,
 * mismo umbral que la alerta server-side). No requiere backend nuevo.
 */
const AsistenciaReporte = () => {
  const { data: recs, isLoading } = useQuery({
    queryKey: ['reportes', 'asistencia'],
    queryFn: () =>
      pb.collection('asistencia').getFullList({
        expand: 'user_id,curso_id',
        sort: '-fecha',
        $autoCancel: false,
      }),
    staleTime: 60_000,
  });

  const { porCurso, enRiesgo, totalRegs } = useMemo(() => {
    const list = recs || [];
    const cursoAgg = new Map();
    const alumnoAgg = new Map();
    for (const r of list) {
      const presente = r.estado === 'Presente';
      const cursoNombre = r.expand?.curso_id?.nombre || '— sin curso —';
      const cursoId = r.curso_id || cursoNombre;
      const alumno = r.expand?.user_id?.name || '— sin nombre —';
      const c = cursoAgg.get(cursoId) || { curso: cursoNombre, total: 0, presentes: 0 };
      c.total += 1;
      if (presente) c.presentes += 1;
      cursoAgg.set(cursoId, c);
      const key = `${r.user_id}|${cursoId}`;
      const a = alumnoAgg.get(key) || { alumno, curso: cursoNombre, total: 0, presentes: 0 };
      a.total += 1;
      if (presente) a.presentes += 1;
      alumnoAgg.set(key, a);
    }
    const withPct = (o) => ({ ...o, pct: o.total ? Math.round((o.presentes / o.total) * 100) : 0 });
    return {
      porCurso: [...cursoAgg.values()].map(withPct).sort((x, y) => x.pct - y.pct),
      enRiesgo: [...alumnoAgg.values()]
        .map(withPct)
        .filter((a) => a.total >= 4 && a.pct < 75)
        .sort((x, y) => x.pct - y.pct),
      totalRegs: list.length,
    };
  }, [recs]);

  const exportRiesgo = () => {
    const csv = toCSV(
      enRiesgo.map((a) => ({ alumno: a.alumno, curso: a.curso, presentes: a.presentes, total: a.total, pct: a.pct })),
      [
        { key: 'alumno', label: 'Alumno' },
        { key: 'curso', label: 'Curso' },
        { key: 'presentes', label: 'Presentes' },
        { key: 'total', label: 'Sesiones' },
        { key: 'pct', label: '% asistencia' },
      ],
    );
    downloadCSV(`asistencia-riesgo-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`${enRiesgo.length} alumnos exportados`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Calculando asistencia…</CardContent>
      </Card>
    );
  }

  if (!totalRegs) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <CalendarCheck className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
          Aún no hay registros de asistencia. Cargá asistencia desde el panel de admin para ver el análisis.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Asistencia promedio por curso</CardTitle>
              <CardDescription className="mt-1">Sobre {totalRegs} registros de asistencia.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="py-2 font-medium">Curso</th>
                <th className="py-2 font-medium text-right">Sesiones</th>
                <th className="py-2 font-medium text-right">% asistencia</th>
              </tr>
            </thead>
            <tbody>
              {porCurso.map((c) => (
                <tr key={c.curso} className="border-b last:border-0">
                  <td className="py-2 text-foreground">{c.curso}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{c.total}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${pctColor(c.pct)}`}>{c.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base">Alumnos en riesgo</CardTitle>
                <CardDescription className="mt-1">Bajo 75% de asistencia (con 4+ sesiones).</CardDescription>
              </div>
            </div>
            {enRiesgo.length > 0 && (
              <Button size="sm" variant="outline" onClick={exportRiesgo}>
                <Download className="h-3.5 w-3.5 mr-2" />
                CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {enRiesgo.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Ningún alumno bajo 75%.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                  <th className="py-2 font-medium">Alumno</th>
                  <th className="py-2 font-medium">Curso</th>
                  <th className="py-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {enRiesgo.map((a) => (
                  <tr key={`${a.alumno}|${a.curso}`} className="border-b last:border-0">
                    <td className="py-2 text-foreground">{a.alumno}</td>
                    <td className="py-2 text-muted-foreground">{a.curso}</td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${pctColor(a.pct)}`}>{a.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AdmReportes = () => {
  const expNomina = useMutation({
    mutationFn: async () => {
      const matriculas = await pb.collection('matriculas_seccion').getFullList({
        expand: 'alumno_id,seccion_id,seccion_id.curso_id',
        $autoCancel: false,
      });
      return matriculas.map((m) => ({
        seccion: `${m.expand?.seccion_id?.expand?.curso_id?.nombre || ''} ${m.expand?.seccion_id?.nombre || ''}`.trim(),
        alumno: m.expand?.alumno_id?.name || '',
        rut: m.expand?.alumno_id?.rut || '',
        email: m.expand?.alumno_id?.email || '',
        telefono: m.expand?.alumno_id?.telefono || '',
        estado: m.estado || '',
        fecha_matricula: m.fecha_matricula || '',
      }));
    },
    onSuccess: (rows) => {
      const csv = toCSV(rows, [
        { key: 'seccion', label: 'Sección' },
        { key: 'alumno', label: 'Alumno' },
        { key: 'rut', label: 'RUT' },
        { key: 'email', label: 'Email' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'estado', label: 'Estado' },
        { key: 'fecha_matricula', label: 'Fecha matrícula' },
      ]);
      downloadCSV(`nomina-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(`${rows.length} matriculados exportados`);
    },
    onError: () => toast.error('Error al exportar'),
  });

  const expMorosidad = useMutation({
    mutationFn: async () => {
      const pagos = await pb.collection('pagos').getFullList({
        filter: 'estado = "vencido" || estado = "pendiente"',
        expand: 'alumno_id,apoderado_id',
        sort: 'fecha_vencimiento',
        $autoCancel: false,
      });
      return pagos.map((p) => ({
        alumno: p.expand?.alumno_id?.name || '',
        apoderado: p.expand?.apoderado_id?.name || '',
        email_apoderado: p.expand?.apoderado_id?.email || '',
        telefono: p.expand?.apoderado_id?.telefono || p.expand?.alumno_id?.telefono || '',
        concepto: p.concepto,
        periodo: p.periodo || '',
        monto: p.monto,
        estado: p.estado,
        vence: p.fecha_vencimiento || '',
      }));
    },
    onSuccess: (rows) => {
      const csv = toCSV(rows, [
        { key: 'alumno', label: 'Alumno' },
        { key: 'apoderado', label: 'Apoderado' },
        { key: 'email_apoderado', label: 'Email apoderado' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'concepto', label: 'Concepto' },
        { key: 'periodo', label: 'Período' },
        { key: 'monto', label: 'Monto' },
        { key: 'estado', label: 'Estado' },
        { key: 'vence', label: 'Vence' },
      ]);
      downloadCSV(`morosidad-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(`${rows.length} cuotas exportadas`);
    },
    onError: () => toast.error('Error al exportar'),
  });

  const expApoderados = useMutation({
    mutationFn: async () => {
      const ap = await pb.collection('users').getFullList({
        filter: 'roles ~ "apoderado"',
        sort: 'name',
        $autoCancel: false,
      });
      const links = await pb.collection('parent_student').getFullList({
        expand: 'student_id',
        $autoCancel: false,
      });
      const pupilosByParent = new Map();
      for (const l of links) {
        const arr = pupilosByParent.get(l.parent_id) || [];
        arr.push(l.expand?.student_id?.name);
        pupilosByParent.set(l.parent_id, arr);
      }
      return ap.map((a) => ({
        nombre: a.name || '',
        email: a.email || '',
        rut: a.rut || '',
        telefono: a.telefono || '',
        pupilos: (pupilosByParent.get(a.id) || []).filter(Boolean).join('; '),
      }));
    },
    onSuccess: (rows) => {
      const csv = toCSV(rows, [
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Email' },
        { key: 'rut', label: 'RUT' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'pupilos', label: 'Pupilos' },
      ]);
      downloadCSV(`apoderados-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(`${rows.length} apoderados exportados`);
    },
    onError: () => toast.error('Error al exportar'),
  });

  const expLeads = useMutation({
    mutationFn: async () => {
      const leads = await pb.collection('leads').getFullList({
        sort: '-created',
        $autoCancel: false,
      });
      return leads.map((l) => ({
        fecha: new Date(l.created).toLocaleString('es-CL'),
        nombre: l.nombre,
        email: l.email,
        telefono: l.telefono || '',
        interes: l.interes || '',
        mensaje: l.mensaje || '',
        utm_source: l.utm_source || '',
        utm_campaign: l.utm_campaign || '',
        estado: l.estado_seguimiento || 'nuevo',
      }));
    },
    onSuccess: (rows) => {
      const csv = toCSV(rows, [
        { key: 'fecha', label: 'Fecha' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Email' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'interes', label: 'Interés' },
        { key: 'mensaje', label: 'Mensaje' },
        { key: 'utm_source', label: 'UTM source' },
        { key: 'utm_campaign', label: 'UTM campaign' },
        { key: 'estado', label: 'Estado' },
      ]);
      downloadCSV(`leads-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(`${rows.length} leads exportados`);
    },
    onError: () => toast.error('Error al exportar'),
  });

  return (
    <div className="space-y-6">
      <AsistenciaReporte />
      <div className="grid md:grid-cols-2 gap-4">
      <ReportCard
        icon={GraduationCap}
        title="Nómina por sección"
        description="Lista de matriculados con datos de contacto, agrupados por sección."
        onExport={() => expNomina.mutate()}
        isPending={expNomina.isPending}
        accent="bg-primary/10 text-primary"
      />
      <ReportCard
        icon={CreditCard}
        title="Estado de morosidad"
        description="Cuotas pendientes y vencidas con datos del apoderado para contacto."
        onExport={() => expMorosidad.mutate()}
        isPending={expMorosidad.isPending}
        accent="bg-destructive/10 text-destructive"
      />
      <ReportCard
        icon={Users}
        title="Lista de apoderados"
        description="Todos los apoderados activos con sus pupilos vinculados."
        onExport={() => expApoderados.mutate()}
        isPending={expApoderados.isPending}
        accent="bg-secondary/10 text-secondary"
      />
      <ReportCard
        icon={MessageCircle}
        title="Leads de contacto"
        description="Formulario de contacto + UTM tracking para análisis de marketing."
        onExport={() => expLeads.mutate()}
        isPending={expLeads.isPending}
        accent="bg-accent/15 text-accent"
      />
      <Card className="md:col-span-2 border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <FileSpreadsheet className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
          Gráficos Recharts y exportación XLSX llegan en una próxima fase.
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AdmReportes;
