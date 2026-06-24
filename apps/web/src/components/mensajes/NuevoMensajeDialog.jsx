import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useMessenger } from '@/hooks/useMessenger.js';
import { filtroDestinatariosPermitidos } from '@/lib/permisosMensajeria.js';
import pb from '@/lib/pocketbaseClient';

const NuevoMensajeDialog = ({ open, onOpenChange, onCreated }) => {
  const { currentUser, rolActivo, rolesEffective } = useAuth();
  const rolActor = rolActivo || rolesEffective?.[0] || 'estudiante';
  const { startThread } = useMessenger(currentUser?.id);

  const [busqueda, setBusqueda] = useState('');
  const [destId, setDestId] = useState('');
  const [contenido, setContenido] = useState('');

  useEffect(() => {
    if (!open) {
      setBusqueda('');
      setDestId('');
      setContenido('');
    }
  }, [open]);

  const { data: candidatos = [], isLoading } = useQuery({
    queryKey: ['messenger', 'candidatos', rolActor],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const filtroBase = filtroDestinatariosPermitidos(rolActor);
      if (!filtroBase) return [];
      const r = await pb.collection('users').getList(1, 100, {
        filter: `(${filtroBase}) && id != "${currentUser.id}"`,
        sort: 'name',
        fields: 'id,name,email,rol,roles,foto',
        $autoCancel: false,
      });
      return r.items;
    },
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return candidatos;
    return candidatos.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
  }, [candidatos, busqueda]);

  const enviar = async () => {
    if (!destId || !contenido.trim()) return;
    try {
      const t = await startThread.mutateAsync({ destinatarioId: destId, primerMensaje: contenido.trim() });
      toast.success('Mensaje enviado');
      onCreated?.(t);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo enviar el mensaje');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nuevo mensaje</DialogTitle>
          <DialogDescription>
            Tu rol "{rolActor}" puede iniciar conversaciones con usuarios permitidos por el sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar destinatario..."
              className="pl-9"
            />
          </div>

          <ScrollArea className="flex-1 border rounded-lg max-h-48">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">Cargando...</div>
            ) : filtrados.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {candidatos.length === 0
                  ? 'No tenés destinatarios disponibles desde tu rol actual.'
                  : 'Ningún destinatario coincide con la búsqueda.'}
              </div>
            ) : (
              <ul className="divide-y">
                {filtrados.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setDestId(c.id)}
                      className={`w-full text-left p-2.5 hover:bg-muted/40 transition-colors flex items-center gap-2 ${destId === c.id ? 'bg-primary/10' : ''}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {(c.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name || c.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{c.rol || c.roles?.[0]}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>

          <div className="space-y-1.5">
            <Label htmlFor="msg">Mensaje</Label>
            <Textarea
              id="msg"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Escribí tu mensaje..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviar} disabled={!destId || !contenido.trim() || startThread.isPending}>
            {startThread.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NuevoMensajeDialog;
