// Ficheiro: components/ui/Card.tsx
// Card do DS (auditoria v3, O1): superfície branca, borda line, raio 14, padding 20,
// sem sombra. Título opcional h3 16/700 (text-h3) com ações à direita. No tema escuro
// a superfície vira --surface automaticamente (bg-white → surface).
import React from 'react';

export type CardPadding = 'none' | 'sm' | 'md';

const PADDING: Record<CardPadding, string> = {
  none: 'overflow-clip',
  sm: 'p-4',
  md: 'p-5',
};

interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** 'md' = 20 px (padrão) · 'sm' = 16 px · 'none' = sem padding (lista/tabela de borda a borda). */
  padding?: CardPadding;
  /** @deprecated use padding="none". */
  flush?: boolean;
  /** Título do card (h3 16/700). */
  title?: React.ReactNode;
  /** Nível do título quando o card é uma seção da página (padrão h3). */
  titleAs?: 'h2' | 'h3';
  /** Ações à direita do título (Button size="sm", IconButton, MenuAcoes size="sm"). */
  actions?: React.ReactNode;
  /** Elemento raiz: section (com título, vira região rotulada), article, li ou div. */
  as?: 'div' | 'section' | 'article' | 'li';
}

export const Card: React.FC<CardProps> = ({
  padding, flush = false, title, titleAs = 'h3', actions, as: Comp = 'div', className = '', children, ...rest
}) => {
  const pad: CardPadding = padding ?? (flush ? 'none' : 'md');
  const tituloId = React.useId();
  const Titulo = titleAs;
  const temCabecalho = title !== undefined || actions !== undefined;
  const cabecalho = temCabecalho && (
    <div className={`flex items-start justify-between gap-3 ${pad === 'none' ? 'px-5 pt-4 pb-3' : 'mb-4'}`}>
      {title !== undefined ? (
        <Titulo id={tituloId} className={`${titleAs === 'h2' ? 'text-h2' : 'text-h3'} font-bold text-navy min-w-0`}>{title}</Titulo>
      ) : <span />}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
  return (
    <Comp
      aria-labelledby={Comp === 'section' && title !== undefined ? tituloId : undefined}
      className={`bg-white border border-line rounded-xl ${PADDING[pad]} ${className}`}
      {...rest}
    >
      {cabecalho}
      {children}
    </Comp>
  );
};
