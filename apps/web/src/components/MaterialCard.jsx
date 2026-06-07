import React from 'react';
import { FileText, Link as LinkIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MaterialCard = ({ material, onDelete, isAdmin }) => {
  const isPdf = material.tipo === 'PDF';
  const Icon = isPdf ? FileText : LinkIcon;

  return (
    <div className="flex items-center justify-between p-4 border rounded-xl bg-card hover:bg-accent/50 transition-colors duration-200">
      <div className="flex items-center gap-4 overflow-hidden">
        <div className={`p-3 flex-shrink-0 rounded-lg ${isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 pr-4">
          <h4 className="font-medium text-foreground truncate" title={material.titulo}>
            {material.titulo}
          </h4>
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-1 block">
            {material.tipo}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant={isAdmin ? "outline" : "default"} size="sm" className="font-medium" asChild>
          <a href={material.enlace} target="_blank" rel="noopener noreferrer">
            Acceder
          </a>
        </Button>
        {isAdmin && onDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(material.id)} 
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Eliminar material"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MaterialCard;