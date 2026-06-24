import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const RegistrarPagoDialog = ({ open, onOpenChange, pago }) => {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm({
    values: {
      metodo: pago?.metodo || 'transferencia',
      fecha_pago: pago?.fecha_pago ? pago.fecha_pago.slice(0, 10) : new Date().toISOString().slice(0, 10),
      comprobante_url: pago?.comprobante_url || '',
      notas_internas: pago?.notas_internas || '',
    },
  });

  const save = useMutation({
    mutationFn: async (values) => {
      if (!pago) throw new Error('Sin pago seleccionado');
      return pb.collection('pagos').update(pago.id, {
        estado: 'pagado',
        metodo: values.metodo,
        fecha_pago: new Date(values.fecha_pago + 'T12:00:00.000Z').toISOString(),
        comprobante_url: values.comprobante_url || '',
        notas_internas: values.notas_internas || '',
        registrado_por: pb.authStore.model?.id,
      }, { $autoCancel: false });
    },
    onSuccess: () => {
      toast.success('Pago registrado');
      qc.invalidateQueries({ queryKey: ['adm'] });
      qc.invalidateQueries({ queryKey: ['administrativo'] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => {
      console.error(e);
      toast.error('No se pudo registrar el pago');
    },
  });

  const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {pago && (
              <>
                <strong>{pago.concepto}</strong> {pago.periodo && `· ${pago.periodo}`}
                <br />
                Monto: <span className="font-mono font-bold">{formatCLP(pago.monto)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(save.mutate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fecha_pago">Fecha de pago</Label>
              <Input id="fecha_pago" type="date" {...register('fecha_pago')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodo">Método</Label>
              <Select value={watch('metodo')} onValueChange={(v) => setValue('metodo', v)}>
                <SelectTrigger id="metodo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="webpay">Webpay</SelectItem>
                  <SelectItem value="khipu">Khipu</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comprobante_url">Comprobante (URL)</Label>
            <Input id="comprobante_url" type="url" placeholder="https://..." {...register('comprobante_url')} />
            <p className="text-xs text-muted-foreground">Link al pdf/imagen del comprobante (Drive, Dropbox, etc.)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas_internas">Notas internas</Label>
            <Textarea id="notas_internas" rows={2} {...register('notas_internas')} placeholder="Observaciones para el equipo" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Marcar como pagado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrarPagoDialog;
