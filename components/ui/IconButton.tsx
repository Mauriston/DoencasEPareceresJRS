// Ficheiro: components/ui/IconButton.tsx
// Botão só com ícone (44×44, alvo de toque mínimo). O rótulo vai em aria-label e
// title, já que não há texto visível.
import React from 'react';

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Material Symbol. */
  icon: string;
  /** Rótulo acessível (aria-label e title). */
  label: string;
  variant?: 'primary' | 'secondary' | 'overlay';
  /** Contador no canto (cápsula wine, ex.: pendências); 0 ou ausente = sem badge. Entra no rótulo acessível. */
  badge?: number;
}

const VARIANTS = {
  primary: 'bg-navy text-white border border-navy hover:bg-navy-hover',
  secondary: 'bg-white text-navy border border-navy hover:bg-thead',
  overlay: 'bg-black/55 text-white border border-transparent hover:bg-black/75',
};

export const IconButton: React.FC<IconButtonProps> = ({ icon, label, variant = 'primary', badge, className = '', type = 'button', ...rest }) => {
  const rotulo = badge ? `${label} (${badge} pendente${badge > 1 ? 's' : ''})` : label;
  return (
    <button
      type={type}
      aria-label={rotulo}
      title={rotulo}
      className={`relative inline-flex items-center justify-center w-11 h-11 rounded-lg shrink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{icon}</span>
      {!!badge && (
        <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-wine text-white text-xs font-bold leading-5 text-center ring-2 ring-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};
