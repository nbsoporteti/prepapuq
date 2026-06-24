import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * Diálogo de confirmación reutilizable. Wrap de shadcn AlertDialog.
 *
 * Props:
 *  - open / onOpenChange
 *  - title, description
 *  - confirmLabel (default "Confirmar")
 *  - cancelLabel (default "Cancelar")
 *  - destructive: bool (estiliza el botón en rojo)
 *  - onConfirm: handler (async OK)
 *  - isLoading: bool (deshabilita y muestra "...")
 */
const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  isLoading = false,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(destructive && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground')}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
