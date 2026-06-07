import React, { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command.jsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const StudentSearchCombobox = ({ value, onChange, enrolledStudentIds = [] }) => {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const result = await pb.collection('users').getList(1, 50, {
        filter: 'rol="estudiante"',
        sort: 'name',
        $autoCancel: false,
      });

      setStudents(result.items || []);
    } catch (error) {
      console.error('[StudentSearchCombobox] Fetch error encountered:', error);

      if (error.status === 403 || error.status === 400) {
        const msg = 'No tienes permiso para ver estudiantes';
        setErrorMsg(msg);
        toast.error(msg);
      } else {
        const msg = 'Error de conexión al cargar la lista de estudiantes.';
        setErrorMsg(msg);
        toast.error(msg);
      }
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open, fetchStudents]);

  const selectedStudent = students.find((student) => student.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-foreground bg-background h-auto min-h-10 py-2"
        >
          <div className="flex flex-col items-start text-left truncate mr-2">
            {selectedStudent ? (
              <>
                <span className="font-medium truncate w-full">
                  {selectedStudent.name || 'Sin nombre'}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {selectedStudent.rut || selectedStudent.email}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Buscar y seleccionar estudiante...</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <div
                role="button"
                tabIndex={0}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onChange('');
                  }
                }}
                aria-label="Limpiar selección"
              >
                <X className="h-4 w-4 opacity-50 hover:opacity-100" />
              </div>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command 
          className="w-full max-h-[300px]"
          filter={(value, search) => {
            if (value.includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Buscar por nombre, correo o RUT..." />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando estudiantes...
              </div>
            )}
            
            {!loading && errorMsg && (
              <div className="flex flex-col items-center justify-center p-6 text-sm text-destructive text-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!loading && !errorMsg && (
              <>
                <CommandEmpty>No hay estudiantes disponibles</CommandEmpty>
                <CommandGroup>
                  {students.map((student) => {
                    const searchValue = `${student.name || ''} ${student.email || ''} ${student.rut || ''} ${student.id}`.toLowerCase();
                    const isEnrolled = enrolledStudentIds.includes(student.id);
                    
                    return (
                      <CommandItem
                        key={student.id}
                        value={searchValue}
                        disabled={isEnrolled}
                        onSelect={() => {
                          if (isEnrolled) {
                            toast.error('Este estudiante ya está matriculado en este curso');
                            return;
                          }
                          onChange(student.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-start gap-3 py-3",
                          isEnrolled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 mt-1",
                            value === student.id ? "opacity-100 text-primary" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium text-foreground truncate">
                            {student.name || 'Sin nombre'}
                          </span>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="truncate">{student.email}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate text-nowrap">RUT: {student.rut || 'N/A'}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                            ID: {student.id}
                          </span>
                        </div>
                        {isEnrolled && (
                          <span className="ml-auto text-[10px] font-medium bg-muted text-muted-foreground px-2 py-1 rounded-md shrink-0 mt-1">
                            Ya matriculado
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default StudentSearchCombobox;