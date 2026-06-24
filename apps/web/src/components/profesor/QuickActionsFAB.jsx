import React, { useState } from 'react';
import { Plus, Video, FileText, ClipboardList, Megaphone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import CrearClaseVivoSheet from './CrearClaseVivoSheet.jsx';
import CrearTareaSheet from './CrearTareaSheet.jsx';
import CrearEvaluacionSheet from './CrearEvaluacionSheet.jsx';
import CrearAnuncioSheet from './CrearAnuncioSheet.jsx';

/**
 * Botón flotante "Crear" con menú de 4 acciones rápidas para el profesor.
 * Cada acción abre su Sheet correspondiente. La sección se puede pasar como
 * prop `seccionPreseleccionada` cuando se usa desde la vista de detalle de
 * sección (autollenado del select).
 */
const QuickActionsFAB = ({ seccionPreseleccionada }) => {
  const { currentUser } = useAuth();
  const [sheet, setSheet] = useState(null); // 'clase' | 'tarea' | 'evaluacion' | 'anuncio' | null

  const profesorId = currentUser?.id;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-base bg-accent text-accent-foreground hover:bg-accent/90"
              aria-label="Acciones rápidas"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Crear
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSheet('clase')} className="gap-2">
              <Video className="h-4 w-4 text-primary" />
              <span className="flex-1">Clase en vivo</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSheet('tarea')} className="gap-2">
              <FileText className="h-4 w-4 text-secondary" />
              <span className="flex-1">Tarea</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSheet('evaluacion')} className="gap-2">
              <ClipboardList className="h-4 w-4 text-warning" />
              <span className="flex-1">Evaluación</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSheet('anuncio')} className="gap-2">
              <Megaphone className="h-4 w-4 text-accent" />
              <span className="flex-1">Anuncio</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CrearClaseVivoSheet
        open={sheet === 'clase'}
        onOpenChange={(o) => !o && setSheet(null)}
        profesorId={profesorId}
        seccionPreseleccionada={seccionPreseleccionada}
      />
      <CrearTareaSheet
        open={sheet === 'tarea'}
        onOpenChange={(o) => !o && setSheet(null)}
        profesorId={profesorId}
        seccionPreseleccionada={seccionPreseleccionada}
      />
      <CrearEvaluacionSheet
        open={sheet === 'evaluacion'}
        onOpenChange={(o) => !o && setSheet(null)}
        profesorId={profesorId}
        seccionPreseleccionada={seccionPreseleccionada}
      />
      <CrearAnuncioSheet
        open={sheet === 'anuncio'}
        onOpenChange={(o) => !o && setSheet(null)}
        profesorId={profesorId}
        seccionPreseleccionada={seccionPreseleccionada}
      />
    </>
  );
};

export default QuickActionsFAB;
