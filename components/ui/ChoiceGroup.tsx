// Ficheiro: components/ui/ChoiceGroup.tsx
// Escolha única entre poucas opções (perito, situação, VDF sim/não) como grupo
// de rádio acessível com botões de 44px — o selecionado fica navy cheio.
import React, { useId } from 'react';
import { Avatar } from '../shell/UserMenu';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Avatar (foto ou inicial) mostrado dentro do botão, à esquerda do rótulo. */
  avatar?: { nome: string; imageProfile?: string };
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  options: ChoiceOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  required?: boolean;
  error?: string;
  className?: string;
  /** Rótulo só para leitor de tela (o grupo aparece só com os botões). */
  ocultarRotulo?: boolean;
  /** Botões sempre lado a lado, em colunas iguais, mesmo no celular. */
  emLinha?: boolean;
}

export function ChoiceGroup<T extends string>({ label, options, value, onChange, required, error, className = '', ocultarRotulo = false, emLinha = false }: ChoiceGroupProps<T>) {
  const id = useId();
  return (
    <div className={className}>
      <span id={`${id}-label`} className={ocultarRotulo ? 'sr-only' : 'block text-xs font-semibold text-ink-3 mb-1'}>
        {label}
        {required && <span className="text-wine ml-0.5" aria-hidden="true">*</span>}
      </span>
      <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-erro` : undefined} aria-invalid={error ? true : undefined} className={emLinha ? 'grid grid-flow-col auto-cols-fr gap-2' : 'flex flex-wrap gap-2'}>
        {options.map(o => {
          const ativo = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.value)}
              className={`${emLinha ? 'min-w-0 px-2' : 'flex-1 min-w-[120px] px-4'} min-h-[44px] rounded-lg border text-sm font-bold transition-colors ${o.avatar ? 'inline-flex items-center justify-center gap-2 ' : ''}${
                ativo ? 'bg-navy text-white border-navy' : `bg-white text-navy hover:bg-thead ${error ? 'border-wine' : 'border-line'}`
              }`}
            >
              {o.avatar && <Avatar nome={o.avatar.nome} imageProfile={o.avatar.imageProfile} size={28} tone="light" />}
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
