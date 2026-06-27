import React, { useCallback, useState } from 'react';
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

const INITIAL = {
  open: false,
  title: '¿Estás seguro?',
  description: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  destructive: false,
  action: null,
};

/**
 * Confirmación reusable basada en AlertDialog, en vez de window.confirm
 * (más claro, accesible y difícil de clickear sin querer).
 *
 *   const { confirm, dialog } = useConfirm();
 *   <Button onClick={() => confirm({
 *     title: 'Eliminar', description: '...', destructive: true,
 *     action: () => borrar(id),
 *   })}>Eliminar</Button>
 *   ...
 *   {dialog}   // renderizalo una vez en el componente
 */
export function useConfirm() {
  const [state, setState] = useState(INITIAL);

  const confirm = useCallback((opts) => {
    setState({ ...INITIAL, ...opts, open: true });
  }, []);

  const onConfirm = () => {
    if (typeof state.action === 'function') state.action();
    // Radix cierra el diálogo solo al confirmar.
  };

  const dialog = (
    <AlertDialog open={state.open} onOpenChange={(open) => setState((s) => ({ ...s, open }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{state.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(state.destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
          >
            {state.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}

export default useConfirm;
