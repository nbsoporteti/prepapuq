import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Mail, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable.jsx';
import pb from '@/lib/pocketbaseClient';

const AdmApoderados = () => {
  const { data: apoderados = [], isLoading: loadingApod } = useQuery({
    queryKey: ['adm', 'apoderados'],
    staleTime: 30_000,
    queryFn: async () => {
      const r = await pb.collection('users').getList(1, 500, {
        filter: 'roles ~ "apoderado"',
        sort: 'name',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const { data: vinculos = [], isLoading: loadingVinc } = useQuery({
    queryKey: ['adm', 'parent_student'],
    staleTime: 30_000,
    queryFn: async () => {
      const r = await pb.collection('parent_student').getList(1, 1000, {
        expand: 'student_id',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const pupilosByParent = useMemo(() => {
    const map = new Map();
    for (const v of vinculos) {
      const arr = map.get(v.parent_id) || [];
      arr.push(v.expand?.student_id);
      map.set(v.parent_id, arr);
    }
    return map;
  }, [vinculos]);

  const rows = useMemo(() => apoderados.map((a) => ({
    ...a,
    pupilos: pupilosByParent.get(a.id) || [],
  })), [apoderados, pupilosByParent]);

  const columns = useMemo(() => ([
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium text-sm">{row.original.name || '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'rut',
      header: 'RUT',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.rut || '—'}</span>,
    },
    {
      id: 'pupilos',
      header: 'Pupilos',
      enableSorting: false,
      cell: ({ row }) => {
        const ps = row.original.pupilos.filter(Boolean);
        if (ps.length === 0) return <span className="text-xs text-muted-foreground">Sin vincular</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {ps.map((p) => (
              <Badge key={p.id} variant="secondary" className="text-xs">{p.name || p.email}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'telefono',
      header: 'Teléfono',
      cell: ({ row }) => row.original.telefono || '—',
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          {row.original.email && (
            <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Email">
              <a href={`mailto:${row.original.email}`}><Mail className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          {row.original.telefono && (
            <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="WhatsApp">
              <a href={`https://wa.me/${row.original.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      ),
    },
  ]), []);

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={loadingApod || loadingVinc}
      emptyIcon={Users}
      emptyTitle="Sin apoderados"
      emptyDescription="Los apoderados se crean al matricular alumnos. También podés invitarlos manualmente desde el admin de PB."
      searchPlaceholder="Buscar apoderado..."
    />
  );
};

export default AdmApoderados;
