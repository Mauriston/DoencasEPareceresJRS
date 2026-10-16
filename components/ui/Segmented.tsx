// Ficheiro: components/ui/Segmented.tsx
// Controle segmentado: o ÚNICO padrão para alternar entre vistas da mesma
// página (Novo · Histórico, Capítulos · Anexos, Cards · Tabela, filtros de
// status). Antes havia três padrões de aba — abas verdes sobre faixa navy,
// chips e cards. Abas (Tabs) ficam só para seções da mesma entidade.
import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Material Symbol opcional antes do rótulo. */
  icon?: string;
  /** Contagem/indicador após o rótulo. */
  badge?: number;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel, fullWidth = false, className = '' }: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${fullWidth ? 'flex w-full' : 'inline-flex'} gap-1 p-1 rounded-lg bg-thead border border-line ${className}`}
    >
      {options.map(o => {
        const ativo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(o.value)}
            className={`${fullWidth ? 'flex-1' : ''} inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-md text-sm font-bold whitespace-nowrap transition-colors ${
              ativo ? 'bg-navy text-white' : 'text-ink-3 hover:bg-white hover:text-navy'
            }`}
          >
            {o.icon && <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{o.icon}</span>}
            {o.label}
            {o.badge !== undefined && o.badge > 0 && (
              <span className={`min-w-5 h-5 px-1 rounded-full text-xs font-bold flex items-center justify-center ${ativo ? 'bg-white text-navy' : 'bg-wine text-white'}`}>{o.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
