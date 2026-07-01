import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getPinEstado, setPin as apiSetPin, confirmarAsistencia } from '@/lib/asistenciaPin';

const soloDigitos = (v) => (v || '').replace(/\D/g, '').slice(0, 4);

/**
 * Confirmación segura de asistencia con PIN de 4 dígitos.
 *
 * Props:
 *  - open / onOpenChange
 *  - payload: { scope:'clase', claseId, estados } | { scope:'curso', cursoId, fecha, estados }
 *  - resumen: nodo opcional con el resumen de la lista (conteos)
 *  - onConfirmed: callback al confirmar OK
 */
const AsistenciaConfirmDialog = ({ open, onOpenChange, payload, resumen, onConfirmed }) => {
  const [pin, setPinValue] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: estado, isLoading } = useQuery({
    queryKey: ['asistencia', 'pin-estado'],
    enabled: open,
    staleTime: 60_000,
    queryFn: getPinEstado,
  });
  const tienePin = !!estado?.tienePin;
  const modoCrear = !isLoading && !tienePin;

  // Limpiar al abrir/cerrar.
  useEffect(() => {
    if (!open) {
      setPinValue('');
      setPin2('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const errorLegible = (err) => {
    const code = err?.response?.error || '';
    if (code === 'pin_incorrecto') return 'PIN incorrecto. Intentá de nuevo.';
    if (code === 'sin_pin') return 'Todavía no tenés PIN. Creá uno para confirmar.';
    if (code === 'sin_permiso' || code === 'no_es_tu_clase') return 'No tenés permiso para confirmar esta lista.';
    if (code === 'fecha_invalida' || code === 'scope_invalido') return 'Datos de la lista inválidos.';
    return 'No se pudo confirmar la asistencia.';
  };

  const handleConfirm = async () => {
    setError('');
    if (pin.length !== 4) return setError('Ingresá tu PIN de 4 dígitos.');
    if (modoCrear && pin !== pin2) return setError('Los dos PIN no coinciden.');

    setSubmitting(true);
    try {
      if (modoCrear) await apiSetPin(pin);
      const res = await confirmarAsistencia(payload, pin);
      toast.success(`Asistencia confirmada (${res?.count ?? ''} alumnos)`);
      onConfirmed?.();
      onOpenChange(false);
    } catch (err) {
      setError(errorLegible(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {modoCrear ? 'Creá tu PIN de asistencia' : 'Confirmá con tu PIN'}
          </DialogTitle>
          <DialogDescription>
            {modoCrear
              ? 'Definí un PIN de 4 dígitos. Te lo va a pedir cada vez que confirmes una lista, como firma de seguridad.'
              : 'Ingresá tu PIN de 4 dígitos para firmar y guardar esta asistencia.'}
          </DialogDescription>
        </DialogHeader>

        {resumen ? <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">{resumen}</div> : null}

        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              {modoCrear && <p className="text-xs font-medium text-muted-foreground">Nuevo PIN</p>}
              <InputOTP maxLength={4} value={pin} onChange={(v) => setPinValue(soloDigitos(v))} inputMode="numeric" containerClassName="justify-center">
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {modoCrear && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Repetí el PIN</p>
                <InputOTP maxLength={4} value={pin2} onChange={(v) => setPin2(soloDigitos(v))} inputMode="numeric" containerClassName="justify-center">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}

            {error && <p className="text-center text-sm text-destructive">{error}</p>}
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Tu PIN se guarda cifrado; queda registrado quién confirmó y cuándo.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || isLoading || pin.length !== 4}>
            {submitting ? 'Confirmando…' : modoCrear ? 'Crear PIN y confirmar' : 'Confirmar asistencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AsistenciaConfirmDialog;
