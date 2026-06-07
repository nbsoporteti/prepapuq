import React from 'react';
import { User, Trash2, Mail, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const EnrolledStudentsList = ({ asignaciones, onRemove, courseSelected }) => {
  if (!courseSelected) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
        <User className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground font-medium">Selecciona un curso para ver los matriculados.</p>
      </div>
    );
  }

  if (asignaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
        <User className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground font-medium">No hay estudiantes matriculados en este curso.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {asignaciones.map((item) => {
        // Extract student data from the expanded relation
        const student = item.expand?.user_id;
        const name = student?.name || 'Usuario sin nombre';
        const email = student?.email || 'Sin correo';
        const rut = student?.rut || 'RUT: N/A';

        return (
          <Card key={item.id} className="relative group overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-foreground">{name}</p>
                <div className="flex flex-col text-xs text-muted-foreground mt-1 space-y-1">
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{email}</span>
                  </span>
                  <span className="flex items-center gap-1.5 truncate">
                    <Hash className="h-3 w-3 shrink-0" />
                    <span className="truncate">{rut}</span>
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-[0.98] shrink-0"
                onClick={() => onRemove(item.id)}
                title="Remover estudiante"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EnrolledStudentsList;