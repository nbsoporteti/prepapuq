import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';

const JustificationModal = ({ isOpen, onClose, asistenciaRecord, studentId, onSuccess }) => {
  const [razon, setRazon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!razon.trim()) {
      toast.error('Por favor, ingresa el motivo de la inasistencia.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create justification record
      await pb.collection('justifications').create({
        fecha: asistenciaRecord.fecha,
        razon: razon,
        estado: 'Pendiente',
        user_id: studentId,
        asistencia_id: asistenciaRecord.id
      }, { $autoCancel: false });

      toast.success('Justificación enviada correctamente. Pendiente de revisión.');
      setRazon('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting justification:', error);
      toast.error('Error al enviar la justificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formattedDate = asistenciaRecord?.fecha 
    ? new Date(asistenciaRecord.fecha).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Justificar Inasistencia</DialogTitle>
          <DialogDescription>
            Envía el motivo de la inasistencia para el día <span className="font-semibold text-foreground">{formattedDate}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="razon">Motivo / Razón</Label>
            <Textarea
              id="razon"
              placeholder="Explica brevemente el motivo de la inasistencia (ej. Motivos de salud, cita médica, etc.)"
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              className="min-h-[100px] resize-none text-foreground"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Justificación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JustificationModal;