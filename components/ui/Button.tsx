// Ficheiro: components/ui/Button.tsx
// Botão único do app (DS JRS/HNRe): navy é a ação primária (uma por região), o
// contorno navy é a secundária, o contorno vinho é a destrutiva (sempre separada
// da primária, à esquerda) e o ghost serve para ações de baixa ênfase. Rótulo
// sempre escrito (o ícone só complementa).
//
// Tamanhos (auditoria v3, B3/G4): md = 40 px (padrão no desktop) · sm = 32 px
// (dentro de tabelas e cards). Em telas de toque (@media pointer: coarse) a regra
// global do styles/app.css sobe qualquer botão para 44 px — não fixar 44 aqui.
// Sem active:scale; foco = anel ouro.
//
// ButtonLink: as mesmas variantes e tamanhos, mas renderiza um <Link> do
// react-router (navegação interna, `to`) ou um <a> (link externo, `href`).
import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'md' | 'sm';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-white border border-navy hover:bg-navy-hover active:bg-navy-pressed',
  secondary: 'bg-white text-navy border border-navy hover:bg-thead',
  destructive: 'bg-white text-wine border border-wine hover:bg-wine/10',
  ghost: 'bg-transparent text-navy border border-transparent hover:bg-thead',
};

const SIZES: Record<ButtonSize, { box: string; icon: string }> = {
  md: { box: 'h-10 min-h-10 px-4 gap-2 text-sm', icon: 'text-[20px]' },
  sm: { box: 'h-8 min-h-8 px-3 gap-1.5 text-sm', icon: 'text-[18px]' },
};

const BASE =
  'inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-lg font-bold transition-colors ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ' +
  'disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:cursor-not-allowed';

/** Classes de um botão do DS — para os raros casos em que o elemento não pode ser <Button>/<ButtonLink> (ex.: <label> de input file). */
export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', fullWidth = false) =>
  `${BASE} ${SIZES[size].box} ${fullWidth ? 'w-full' : ''} ${VARIANTS[variant]}`;

const Conteudo: React.FC<{ icon?: string; loading?: boolean; size: ButtonSize; children?: React.ReactNode }> = ({ icon, loading, size, children }) => (
  <>
    {loading ? (
      <span className={`material-symbols-outlined ${SIZES[size].icon} animate-spin`} aria-hidden="true">progress_activity</span>
    ) : icon ? (
      <span className={`material-symbols-outlined ${SIZES[size].icon}`} aria-hidden="true">{icon}</span>
    ) : null}
    {children}
  </>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** md = 40 px (padrão) · sm = 32 px (tabelas e cards). Toque: 44 px automático. */
  size?: ButtonSize;
  /** Nome do Material Symbol exibido antes do rótulo. */
  icon?: string;
  /** Mostra o spinner no lugar do ícone, desabilita e marca aria-busy. */
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary', size = 'md', icon, loading = false, fullWidth = false, className = '', children, disabled, type = 'button', ...rest
}: ButtonProps & Record<string, any>, ref: React.ForwardedRef<HTMLButtonElement>) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`${buttonClass(variant, size, fullWidth)} ${className}`}
    {...rest}
  >
    <Conteudo icon={icon} loading={loading} size={size}>{children}</Conteudo>
  </button>
));
Button.displayName = 'Button';

interface ButtonLinkBase {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/** Navegação interna (react-router): `to`. */
type ButtonLinkInterno = ButtonLinkBase & Omit<LinkProps, 'className' | 'children'> & { href?: never };
/** Link externo ou arquivo: `href` (abre em nova aba quando começa com http/https, salvo `target` explícito). */
type ButtonLinkExterno = ButtonLinkBase & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & { href: string; to?: never };

export type ButtonLinkProps = ButtonLinkInterno | ButtonLinkExterno;

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>((props, ref) => {
  const { variant = 'primary', size = 'md', icon, fullWidth = false, className = '', children, ...rest } = props;
  const classes = `${buttonClass(variant, size, fullWidth)} ${className}`;
  const conteudo = <Conteudo icon={icon} size={size}>{children}</Conteudo>;
  if ('href' in rest && typeof rest.href === 'string') {
    const { href, target, rel, ...a } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    const externo = /^https?:\/\//i.test(href ?? '');
    return (
      <a ref={ref} href={href} target={target ?? (externo ? '_blank' : undefined)} rel={rel ?? (externo ? 'noopener noreferrer' : undefined)} className={classes} {...a}>
        {conteudo}
      </a>
    );
  }
  return <Link ref={ref} className={classes} {...(rest as LinkProps)}>{conteudo}</Link>;
});
ButtonLink.displayName = 'ButtonLink';
