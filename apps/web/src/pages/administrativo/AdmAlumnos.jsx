import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Mail, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/shared/DataTable.jsx';
import pb from '@/lib/pocketbaseClient';

const AdmAlumnos = () => {
  const { data: alumnos = [], isLoading } = useQuery({
    queryKey: ['adm', 'alumnos'],
    staleTime: 30_000,
    queryFn: async () => {
      const r = await pb.collection('users').getList(1, 500, {
        filter: 'roles ~ "estudiante"',
        sort: 'name',
        $autoCancel: false,
      });
      return r.items;
    },
  });

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
      accessorKey: 'telefono',
      header: 'Teléfono',
      cell: ({ row }) => row.original.telefono || '—',
    },
    {
      accessorKey: 'anio_que_cursa',
      header: 'Año',
      cell: ({ row }) => row.original.anio_que_cursa
        ? <Badge variant="outline" className="text-xs">{row.original.anio_que_cursa.replace('medio', '° medio')}</Badge>
        : '—',
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row }) => row.original.activo === false
        ? <Badge variant="secondary" className="text-xs">Inactivo</Badge>
        : <Badge variant="secondary" className="text-xs bg-success/10 text-success">Activo</Badge>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          {row.original.email && (
            <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Email">
              <a href={`mailto:${row.original.email}`}>
                <Mail className="h-3.5 w-3.5" />
              </a>
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
      data={alumnos}
      isLoading={isLoading}
      emptyIcon={Users}
      emptyTitle="Sin alumnos cargados"
      emptyDescription="Cuando matricules un alumno desde la pestaña Matrículas, aparecerá acá."
      searchPlaceholder="Buscar por nombre, RUT, email..."
    />
  );
};

export default AdmAlumnos;
