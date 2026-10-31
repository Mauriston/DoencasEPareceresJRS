// Ficheiro: components/ui/Button.tsx
// Botão único do app (DS JRS/HNRe): navy é a ação primária, o contorno navy é
// a secundária, o contorno vinho é a destrutiva (sempre separada da primária)
// e o ghost serve para ações de baixa ênfase. Altura de 44px em toda parte —
// alvo de toque mínimo — e rótulo sempre escrito (o ícone só complementa).
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-white border border-navy hover:bg-navy-hover active:bg-navy-pressed',
  secondary: 'bg-white text-navy border border-navy hover:bg-thead',
  destructive: 'bg-white text-wine border border-wine hover:bg-wine/10',
  ghost: 'bg-transparent text-navy border border-transparent hover:bg-thead',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Nome do Material Symbol exibido antes do rótulo. */
  icon?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', icon, loading = false, fullWidth = false, className = '', children, disabled, type = 'button', ...rest
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''} ${VARIANTS[variant]} ${className}`}
    {...rest}
  >
    {loading ? (
      <span className="material-symbols-outlined text-[20px] animate-spin" aria-hidden="true">progress_activity</span>
    ) : icon ? (
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
    ) : null}
    {children}
  </button>
);
