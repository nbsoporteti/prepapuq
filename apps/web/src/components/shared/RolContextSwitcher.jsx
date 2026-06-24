import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, GraduationCap, Users, BookOpen, ClipboardList, ShieldCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext.jsx';

const ROL_META = {
  estudiante: { label: 'Estudiante', icon: GraduationCap, dashboard: '/dashboard/estudiante' },
  apoderado: { label: 'Apoderado', icon: Users, dashboard: '/dashboard/apoderado' },
  profesor: { label: 'Profesor', icon: BookOpen, dashboard: '/dashboard/profesor' },
  administrativo: { label: 'Administrativo', icon: ClipboardList, dashboard: '/dashboard/administrativo' },
  admin: { label: 'Administrador', icon: ShieldCheck, dashboard: '/dashboard/admin' },
};

/**
 * Switcher que aparece solo si el usuario tiene más de un rol. Cambia el rol
 * activo y navega al dashboard correspondiente.
 *
 * Si tiene un solo rol → renderea null (sin chip ni botón) para no ensuciar UI.
 */
const RolContextSwitcher = () => {
  const { rolesEffective, rolActivo, switchRol } = useAuth();
  const navigate = useNavigate();

  if (!rolesEffective || rolesEffective.length <= 1) {
    return null;
  }

  const meta = ROL_META[rolActivo] || { label: rolActivo, icon: GraduationCap };
  const ActiveIcon = meta.icon;

  const handleSwitch = (rol) => {
    switchRol(rol);
    const target = ROL_META[rol]?.dashboard;
    if (target) navigate(target);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ActiveIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{meta.label}</span>
          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 hidden md:inline-flex">
            {rolesEffective.length}
          </Badge>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Cambiar de rol
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {rolesEffective.map((rol) => {
          const m = ROL_META[rol] || { label: rol, icon: GraduationCap };
          const Icon = m.icon;
          const isActive = rol === rolActivo;
          return (
            <DropdownMenuItem
              key={rol}
              onSelect={() => handleSwitch(rol)}
              className="gap-2"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{m.label}</span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RolContextSwitcher;
