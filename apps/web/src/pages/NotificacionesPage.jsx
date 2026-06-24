import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNotificaciones } from '@/hooks/useNotificaciones.js';
import { getNotifMeta, formatNotifFecha } from '@/lib/notifIcons.js';
import { cn } from '@/lib/utils';
import pb from '@/lib/pocketbaseClient';

const NotificacionesPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('no_leidas');

  const { items, unreadCount, isLoading, markRead, markAllRead } = useNotificaciones(currentUser?.id);

  const noLeidas = items.filter((n) => !n.leida);
  const leidas = items.filter((n) => n.leida);

  const remove = useMutation({
    mutationFn: async (id) => pb.collection('notificaciones').delete(id, { $autoCancel: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif', 'user', currentUser?.id] }),
  });

  const handleClick = (n) => {
    if (!n.leida) markRead.mutate(n.id);
    if (n.link_destino) navigate(n.link_destino);
  };

  const renderLista = (lista) => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      );
    }
    if (lista.length === 0) {
      return (
        <EmptyState
          icon={Bell}
          title={tab === 'no_leidas' ? 'Estás al día' : 'Sin notificaciones leídas'}
          description={tab === 'no_leidas' ? 'No tenés notificaciones nuevas.' : 'Cuando marques notificaciones como leídas, aparecerán acá.'}
        />
      );
    }
    return (
      <Card>
        <CardContent className="p-0 divide-y">
          {lista.map((n) => {
            const meta = getNotifMeta(n.tipo);
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-3 p-4 transition-colors',
                  !n.leida && 'bg-primary/5',
                  'hover:bg-muted/40',
                )}
              >
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className="flex items-start gap-3 flex-1 min-w-0 text-left"
                >
                  <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0', meta.bg)}>
                    <Icon className={cn('h-4 w-4', meta.color)} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.titulo}</p>
                    {n.cuerpo && <p className="text-xs text-muted-foreground mt-0.5">{n.cuerpo}</p>}
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-muted-foreground">
                      <span>{formatNotifFecha(n.created)}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1 font-mono">{n.tipo.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(n.id)}
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Helmet><title>Notificaciones | PrePa</title></Helmet>
      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3 text-muted-foreground">
              <Link to={-1}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás
              </Link>
            </Button>
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Notificaciones</h1>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="no_leidas">
                No leídas
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 text-[10px] font-mono h-5 px-1.5">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="leidas">Leídas ({leidas.length})</TabsTrigger>
              <TabsTrigger value="todas">Todas ({items.length})</TabsTrigger>
            </TabsList>
            <div className="pt-4">
              <TabsContent value="no_leidas">{renderLista(noLeidas)}</TabsContent>
              <TabsContent value="leidas">{renderLista(leidas)}</TabsContent>
              <TabsContent value="todas">{renderLista(items)}</TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default NotificacionesPage;
