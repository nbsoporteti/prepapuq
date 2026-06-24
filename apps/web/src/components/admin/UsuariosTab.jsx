import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Pencil, Trash2, Power, PowerOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import DataTable from '@/components/shared/DataTable.jsx';
import ConfirmDialog from '@/components/shared/ConfirmDialog.jsx';
import UserFormSheet from '@/components/admin/UserFormSheet.jsx';

const ROL_LABEL = {
  estudiante: 'Estudiante',
  apoderado: 'Apoderado',
  profesor: 'Profesor',
  administrativo: 'Administrativo',
  admin: 'Admin',
};

const rolesDe = (u) => (Array.isArray(u.roles) && u.roles.length ? u.roles : u.rol ? [u.rol] : []);

const UserCell = ({ user }) => {
  const fotoUrl = user.foto ? pb.files.getUrl(user, user.foto, { thumb: '100x100' }) : null;
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 min-w-0">
      {fotoUrl ? (
        <img src={fotoUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-medium truncate">{user.name || <span className="text-muted-foreground italic">Sin nombre</span>}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email || '—'}</p>
      </div>
    </div>
  );
};

const UsuariosTab = () => {
  const qc = useQueryClient();
  const { currentUser } = useAuth();
  const [rolFilter, setRolFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    staleTime: 30_000,
    queryFn: () => pb.collection('users').getFullList({ sort: 'name', $autoCancel: false }),
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }) => pb.collection('users').update(id, { activo }, { $autoCancel: false }),
    onSuccess: (_r, vars) => {
      toast.success(vars.activo ? 'Cuenta activada' : 'Cuenta desactivada');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (e) => toast.error('No se pudo cambiar el estado: ' + (e?.message || 'error')),
  });

  const removeUser = useMutation({
    mutationFn: (id) => pb.collection('users').delete(id, { $autoCancel: false }),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (e) => toast.error('No se pudo eliminar: ' + (e?.message || 'error')),
  });

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const rs = rolesDe(u);
      const rolOk = rolFilter === 'todos' || rs.includes(rolFilter);
      const activo = u.activo !== false;
      const estadoOk =
        estadoFilter === 'todos' ||
        (estadoFilter === 'activos' && activo) ||
        (estadoFilter === 'inactivos' && !activo);
      return rolOk && estadoOk;
    });
  }, [users, rolFilter, estadoFilter]);

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (u) => { setEditing(u); setSheetOpen(true); };

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Usuario',
      cell: ({ row }) => <UserCell user={row.original} />,
    },
    {
      id: 'roles',
      header: 'Roles',
      enableSorting: false,
      cell: ({ row }) => {
        const rs = rolesDe(row.original);
        if (!rs.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {rs.map((r) => (
              <Badge
                key={r}
                variant={r === 'admin' ? 'default' : 'secondary'}
                className="text-[10px] gap-1"
              >
                {r === 'admin' && <ShieldCheck className="h-3 w-3" />}
                {ROL_LABEL[r] || r}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'contacto',
      header: 'Contacto',
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="text-sm">
            <p>{u.rut || <span className="text-muted-foreground">Sin RUT</span>}</p>
            <p className="text-xs text-muted-foreground">{u.telefono || '—'}</p>
          </div>
        );
      },
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const activo = row.original.activo !== false;
        return activo ? (
          <Badge variant="outline" className="border-success/40 text-success">Activo</Badge>
        ) : (
          <Badge variant="outline" className="border-destructive/40 text-destructive">Inactivo</Badge>
        );
      },
    },
    {
      id: 'acciones',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const activo = u.activo !== false;
        const isSelf = u.id === currentUser?.id;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleActivo.mutate({ id: u.id, activo: !activo })}
              disabled={isSelf || toggleActivo.isPending}
              title={isSelf ? 'No podés cambiar tu propio estado' : activo ? 'Desactivar' : 'Activar'}
            >
              {activo ? <PowerOff className="h-4 w-4 text-muted-foreground" /> : <Power className="h-4 w-4 text-success" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setToDelete(u)}
              disabled={isSelf}
              title={isSelf ? 'No podés eliminar tu propia cuenta' : 'Eliminar'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [currentUser?.id, toggleActivo]);

  const toolbar = (
    <>
      <Select value={rolFilter} onValueChange={setRolFilter}>
        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los roles</SelectItem>
          {Object.entries(ROL_LABEL).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={estadoFilter} onValueChange={setEstadoFilter}>
        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="activos">Activos</SelectItem>
          <SelectItem value="inactivos">Inactivos</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={openCreate}>
        <UserPlus className="h-4 w-4 mr-2" />
        Nuevo usuario
      </Button>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Usuarios ({filtered.length})</h3>
          <p className="text-sm text-muted-foreground">
            Crear, editar, activar/desactivar y eliminar cuentas de toda la plataforma.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyIcon={Users}
        emptyTitle="Sin usuarios"
        emptyDescription="No hay usuarios que coincidan con el filtro."
        searchPlaceholder="Buscar por nombre, email o RUT..."
        searchFn={(u, q) => {
          const hay = `${u.name || ''} ${u.email || ''} ${u.rut || ''} ${u.telefono || ''}`.toLowerCase();
          return hay.includes(String(q).toLowerCase());
        }}
        toolbar={toolbar}
        initialPageSize={15}
      />

      <UserFormSheet open={sheetOpen} onOpenChange={setSheetOpen} user={editing} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`¿Eliminar a ${toDelete?.name || toDelete?.email || 'este usuario'}?`}
        description="Se borrará la cuenta de forma permanente. Para conservar el historial, mejor desactivala en vez de eliminarla."
        confirmLabel="Eliminar"
        destructive
        isLoading={removeUser.isPending}
        onConfirm={() => toDelete && removeUser.mutate(toDelete.id)}
      />
    </div>
  );
};

export default UsuariosTab;
