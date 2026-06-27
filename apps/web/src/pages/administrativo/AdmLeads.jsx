import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

// Estados del embudo de leads (mismos valores que el select de la colección).
const ESTADOS = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'cotizando', label: 'Cotizando' },
  { value: 'matriculado', label: 'Matriculado' },
  { value: 'no_interesado', label: 'No interesado' },
  { value: 'descartado', label: 'Descartado' },
];

const ESTADO_STYLE = {
  nuevo: 'bg-secondary/15 text-secondary',
  contactado: 'bg-primary/15 text-primary',
  cotizando: 'bg-accent/20 text-accent',
  matriculado: 'bg-success/15 text-success',
  no_interesado: 'bg-muted text-muted-foreground',
  descartado: 'bg-muted text-muted-foreground',
};

// Link de WhatsApp a partir de un teléfono chileno escrito de cualquier forma.
const waLink = (tel) => {
  const digits = (tel || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  const intl = digits.startsWith('56') ? digits : '56' + digits.replace(/^0+/, '');
  return `https://wa.me/${intl}`;
};

const FiltroPill = ({ active, onClick, label, count }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
    }`}
  >
    {label}
    <span className="tabular-nums opacity-70">{count}</span>
  </button>
);

const AdmLeads = () => {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState('todos');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['adm', 'leads'],
    staleTime: 30_000,
    queryFn: () => pb.collection('leads').getFullList({ sort: '-created', $autoCancel: false }),
  });

  const updateEstado = useMutation({
    mutationFn: ({ id, estado }) =>
      pb.collection('leads').update(id, { estado_seguimiento: estado }, { $autoCancel: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adm', 'leads'] });
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('No se pudo actualizar'),
  });

  const counts = useMemo(() => {
    const c = { todos: leads.length };
    for (const l of leads) {
      const e = l.estado_seguimiento || 'nuevo';
      c[e] = (c[e] || 0) + 1;
    }
    return c;
  }, [leads]);

  const visibles = useMemo(
    () => (filtro === 'todos' ? leads : leads.filter((l) => (l.estado_seguimiento || 'nuevo') === filtro)),
    [leads, filtro],
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Cargando leads…</CardContent>
      </Card>
    );
  }

  if (!leads.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Inbox className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Todavía no llegaron consultas del formulario de contacto.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FiltroPill active={filtro === 'todos'} onClick={() => setFiltro('todos')} label="Todos" count={counts.todos} />
        {ESTADOS.map((e) => (
          <FiltroPill
            key={e.value}
            active={filtro === e.value}
            onClick={() => setFiltro(e.value)}
            label={e.label}
            count={counts[e.value] || 0}
          />
        ))}
      </div>

      <div className="space-y-2">
        {visibles.map((l) => {
          const wa = waLink(l.telefono);
          const estado = l.estado_seguimiento || 'nuevo';
          return (
            <Card key={l.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{l.nombre}</p>
                    {l.interes && (
                      <Badge variant="secondary" className="text-[10px]">
                        {l.interes}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Mail className="h-3 w-3" />
                      {l.email}
                    </a>
                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-success">
                        <MessageCircle className="h-3 w-3" />
                        {l.telefono}
                      </a>
                    ) : (
                      <span>{l.telefono}</span>
                    )}
                    <span className="tabular-nums">{new Date(l.created).toLocaleDateString('es-CL')}</span>
                  </div>
                  {l.mensaje && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground/90">{l.mensaje}</p>}
                </div>
                <div className="shrink-0">
                  <Select value={estado} onValueChange={(v) => updateEstado.mutate({ id: l.id, estado: v })}>
                    <SelectTrigger className={`h-8 w-[150px] text-xs font-medium ${ESTADO_STYLE[estado] || ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdmLeads;
