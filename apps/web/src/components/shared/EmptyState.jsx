import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Empty state reusable para listas vacías, errores no críticos, "aún no hay nada
 * acá" en general. Sigue la convención de shadcn de Card sin fondo.
 *
 * Props:
 *  - icon: LucideIcon o componente que acepta className
 *  - title: string corto
 *  - description: string o ReactNode
 *  - action: { label, onClick, href, variant? } | ReactNode
 *  - className: extra classes
 */
const EmptyState = ({ icon: Icon, title, description, action, className }) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-10 sm:p-12 border rounded-xl bg-card shadow-sm',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-foreground text-balance">{title}</h3>
      )}
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {React.isValidElement(action) ? (
            action
          ) : action.href ? (
            <Button asChild variant={action.variant || 'default'}>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button onClick={action.onClick} variant={action.variant || 'default'}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
