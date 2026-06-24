import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNotificaciones } from '@/hooks/useNotificaciones.js';
import { getNotifMeta, formatNotifFecha } from '@/lib/notifIcons.js';
import { cn } from '@/lib/utils';

/**
 * Campana en el Header. Muestra badge con count de no leídas + popover
 * con últimas 10. Click en una notif → marca leída + navega al
 * link_destino.
 */
const NotificationsBell = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markRead, markAllRead } = useNotificaciones(currentUser?.id);

  const ultimas = items.slice(0, 10);

  const handleClickNotif = (n) => {
    if (!n.leida) markRead.mutate(n.id);
    setOpen(false);
    if (n.link_destino) navigate(n.link_destino);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificaciones"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-mono font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-7 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {ultimas.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tenés notificaciones</p>
            </div>
          ) : (
            <ul className="divide-y">
              {ultimas.map((n) => {
                const meta = getNotifMeta(n.tipo);
                const Icon = meta.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClickNotif(n)}
                      className={cn(
                        'w-full text-left p-3 hover:bg-muted/40 transition-colors flex gap-3',
                        !n.leida && 'bg-primary/5',
                      )}
                    >
                      <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0', meta.bg)}>
                        <Icon className={cn('h-4 w-4', meta.color)} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">
                          {n.titulo}
                        </p>
                        {n.cuerpo && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.cuerpo}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                          {formatNotifFecha(n.created)}
                        </p>
                      </div>
                      {!n.leida && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" aria-label="No leída" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {items.length > 10 && (
          <div className="p-2 border-t">
            <Button asChild variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={() => setOpen(false)}>
              <Link to="/notificaciones">
                Ver todas ({items.length})
              </Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
