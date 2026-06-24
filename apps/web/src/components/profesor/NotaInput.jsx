import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Input controlado para una nota chilena 1.0-7.0 con atajos:
 *  - Acepta "," como separador decimal (lo convierte a ".")
 *  - Tab/Enter pasa al siguiente input (handled by parent via onSubmit)
 *  - Validación visual: rojo si fuera de rango
 *
 * Props:
 *  - value: string (controlado por el parent)
 *  - onChange: (newValue) => void
 *  - onCommit?: () => void  — llamado al perder foco o al hacer Enter
 */
const NotaInput = ({ value, onChange, onCommit, autoFocus, className, ...rest }) => {
  const num = parseFloat(String(value || '').replace(',', '.'));
  const valida = value === '' || (!isNaN(num) && num >= 1 && num <= 7);

  const handleChange = (e) => {
    let v = e.target.value.replace(',', '.');
    // Permitir vacío
    if (v === '') return onChange('');
    // Acepta solo dígitos y un único punto
    if (!/^\d{0,1}(\.\d{0,2})?$/.test(v)) return;
    onChange(v);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit?.();
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
      autoFocus={autoFocus}
      maxLength={4}
      className={cn(
        'h-9 text-center font-mono font-semibold tabular-nums',
        !valida && 'border-destructive ring-destructive',
        className,
      )}
      {...rest}
    />
  );
};

export default NotaInput;
