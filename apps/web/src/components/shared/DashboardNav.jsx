import React from 'react';

/**
 * Navegación de panel reusable: sidebar en desktop (lg+), barra horizontal
 * scrolleable en mobile. Maneja estado (value/onChange), no rutas, así que
 * migrar un dashboard de tabs → sidebar es de bajo riesgo. Los iconos se pasan
 * como componentes (pensado para Phosphor duotone, coherente con la landing).
 *
 *   items = [{ value, label, icon, badge? }]
 */
const DashboardNav = ({ items, value, onChange }) => (
  <>
    {/* Desktop: sidebar */}
    <aside className="hidden w-52 shrink-0 lg:block">
      <nav className="sticky top-20 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = value === it.value;
          return (
            <button
              key={it.value}
              type="button"
              onClick={() => onChange(it.value)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {Icon && <Icon weight="duotone" className="h-5 w-5 shrink-0" />}
              <span className="flex-1 text-left">{it.label}</span>
              {it.badge ? (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">{it.badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>

    {/* Mobile: barra horizontal */}
    <div className="-mx-4 mb-5 overflow-x-auto border-b sm:-mx-6 lg:hidden">
      <div className="flex w-max gap-1 px-4 sm:px-6">
        {items.map((it) => {
          const Icon = it.icon;
          const active = value === it.value;
          return (
            <button
              key={it.value}
              type="button"
              onClick={() => onChange(it.value)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {Icon && <Icon weight="duotone" className="h-4 w-4" />}
              {it.label}
              {it.badge ? (
                <span className="ml-0.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{it.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  </>
);

export default DashboardNav;
