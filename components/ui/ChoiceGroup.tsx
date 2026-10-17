// Ficheiro: components/ui/ChoiceGroup.tsx
// Escolha única entre poucas opções (perito, situação, VDF sim/não) como grupo
// de rádio acessível com botões de 44px — o selecionado fica navy cheio.
import React, { useId } from 'react';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  options: ChoiceOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  required?: boolean;
  error?: string;
  className?: string;
}

export function ChoiceGroup<T extends string>({ label, options, value, onChange, required, error, className = '' }: ChoiceGroupProps<T>) {
  const id = useId();
  return (
    <div className={className}>
      <span id={`${id}-label`} className="block text-xs font-semibold text-ink-3 mb-1">
        {label}
        {required && <span className="text-wine ml-0.5" aria-hidden="true">*</span>}
      </span>
      <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-erro` : undefined} aria-invalid={error ? true : undefined} className="flex flex-wrap gap-2">
        {options.map(o => {
          const ativo = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.value)}
              className={`flex-1 min-w-[120px] min-h-[44px] px-4 rounded-lg border text-sm font-bold transition-colors ${
                ativo ? 'bg-navy text-white border-navy' : `bg-white text-navy hover:bg-thead ${error ? 'border-wine' : 'border-line'}`
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-xs font-semibold text-wine flex items-start gap-1">
          <span className="material-symbols-outlined text-[16px] leading-none mt-px" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
