// Ficheiro: components/ui/FilterChip.tsx
// Filtro liga/desliga (aria-pressed) — ex.: "Somente HNRe", "Minhas solicitações". É um
// controle de filtro, não uma ação: nunca usa a variante primária do Button (a regra é
// uma ação primária por tela). Ativo = contorno e texto navy, fundo de cabeçalho e
// marca de seleção.
import React from 'react';

interface FilterChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  ativo: boolean;
  icon?: string;
  onAlternar: () => void;
  children: React.ReactNode;
}

export const FilterChip: React.FC<FilterChipProps> = ({ ativo, icon, onAlternar, children, className = '', ...rest }) => (
  <button
    type="button"
    aria-pressed={ativo}
    onClick={onAlternar}
    className={`inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-lg border text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
      ativo ? 'bg-thead border-navy text-navy' : 'bg-white border-line text-ink-3 hover:border-navy hover:text-navy'
    } ${className}`}
    {...rest}
  >
    {icon && <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{ativo ? 'check' : icon}</span>}
    {children}
  </button>
);
