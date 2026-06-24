import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DataTable from '@/components/shared/DataTable.jsx';
import NuevaMatriculaWizard from '@/components/administrativo/NuevaMatriculaWizard.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const ESTADO_VARIANT = {
  matriculado: 'bg-success/10 text-success',
  pre_inscrito: 'bg-warning/10 text-warning-foreground',
  retirado: 'bg-muted text-muted-foreground',
  suspendido: 'bg-destructive/10 text-destructive',
};

const AdmMatriculas = () => {
  const qc = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);

  const { data: matriculas = [], isLoading } = useQuery({
    queryKey: ['adm', 'matriculas'],
    staleTime: 30_000,
    queryFn: async () => {
      const r = await pb.collection('matriculas_seccion').getList(1, 500, {
        expand: 'alumno_id,seccion_id,seccion_id.curso_id',
        sort: '-created',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado, motivo }) => pb.collection('matriculas_seccion').update(id, { estado, motivo_retiro: motivo || '' }, { $autoCancel: false }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['adm'] });
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const columns = useMemo(() => ([
    {
      accessorKey: 'expand.alumno_id.name',
      header: 'Alumno',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.expand?.alumno_id?.name || '—'}</p>
          {row.original.expand?.alumno_id?.rut && (
            <p className="text-xs text-muted-foreground font-mono">{row.original.expand.alumno_id.rut}</p>
          )}
        </div>
      ),
    },
    {
      id: 'seccion',
      header: 'Sección',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.expand?.seccion_id?.expand?.curso_id?.nombre || '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.expand?.seccion_id?.nombre}</p>
        </div>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant="secondary" className={ESTADO_VARIANT[row.original.estado] || ''}>
          {row.original.estado}
        </Badge>
      ),
    },
    {
      accessorKey: 'fecha_matricula',
      header: 'Matriculado',
      cell: ({ row }) => row.original.fecha_matricula
        ? new Date(row.original.fecha_matricula).toLocaleDateString('es-CL')
        : '—',
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.estado !== 'matriculado' && (
              <DropdownMenuItem onSelect={() => cambiarEstado.mutate({ id: row.original.id, estado: 'matriculado' })}>
                Marcar como matriculado
              </DropdownMenuItem>
            )}
            {row.original.estado !== 'suspendido' && (
              <DropdownMenuItem onSelect={() => cambiarEstado.mutate({ id: row.original.id, estado: 'suspendido' })}>
                Suspender
              </DropdownMenuItem>
            )}
            {row.original.estado !== 'retirado' && (
              <DropdownMenuItem
                onSelect={() => {
                  const motivo = window.prompt('Motivo del retiro:');
                  if (motivo !== null) cambiarEstado.mutate({ id: row.original.id, estado: 'retirado', motivo });
                }}
                className="text-destructive"
              >
                Marcar retirado
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]), [cambiarEstado]);

  return (
    <>
      <DataTable
        columns={columns}
        data={matriculas}
        isLoading={isLoading}
        emptyIcon={UserPlus}
        emptyTitle="Sin matrículas"
        emptyDescription='Empezá tu primera matrícula con el botón de arriba.'
        searchPlaceholder="Buscar alumno o sección..."
        toolbar={
          <Button onClick={() => setShowWizard(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nueva matrícula
          </Button>
        }
      />

      <NuevaMatriculaWizard open={showWizard} onOpenChange={setShowWizard} />
    </>
  );
};

export default AdmMatriculas;
