// Ficheiro: components/ui/Grade.tsx
// Grade de 12 colunas do app (auditoria v3, 3a / L1–L5). Quatro padrões sobre as
// mesmas colunas, todos com UM gatilho só — a container query @split (largura
// ÚTIL ≥ 960 px, tailwind.config.js), não a largura da janela:
//   A · dados (12)           → sem componente: tabela/lista direto no Container size="data"
//   B · painel + apoio (8+4) → <GradePainel principal apoio />
//   C · grade de cards (3/12 por card = 4 colunas) → <GradeCards>
//   D · índice + conteúdo (4+8 ou 3+9) → <GradeIndice indice conteudo />
// Abaixo de @split tudo empilha numa coluna (GradeCards: 2 colunas em container médio,
// 1 no telefone). Espaçamentos: gap-6 entre regiões, gap-4 entre itens de uma região.
//
// Atenção: `@container` cria contenção de layout — elementos `position: fixed` DENTRO da
// grade passam a se posicionar em relação a ela. O MenuAcoes já usa portal; Dialog, Drawer
// e FABs devem ser renderizados fora da grade (no nível da página).
import React from 'react';

type Tag = 'div' | 'section' | 'ul' | 'ol';

interface GradeCardsProps {
  children: React.ReactNode;
  /** Colunas a partir de @split: 4 (padrão · card = 3/12) ou 3 (card = 4/12, para cards mais ricos). */
  colunas?: 3 | 4;
  /** Elemento da grade (ul/ol quando os cards são itens de lista — os filhos devem ser <li>). */
  as?: Tag;
  className?: string;
  'aria-label'?: string;
}

const COLUNAS_CARDS: Record<3 | 4, string> = {
  4: 'grid-cols-1 @lg:grid-cols-2 @split:grid-cols-4',
  3: 'grid-cols-1 @lg:grid-cols-2 @split:grid-cols-3',
};

/** Padrão C: grade de cards — 1 coluna no telefone, 2 em container médio (≥ 512 px), 4 (ou 3) em @split. */
export const GradeCards: React.FC<GradeCardsProps> = ({ children, colunas = 4, as: Comp = 'div', className = '', ...rest }) => (
  <div className="@container">
    <Comp className={`grid ${COLUNAS_CARDS[colunas]} gap-4 ${className}`} {...rest}>{children}</Comp>
  </div>
);

interface GradePainelProps {
  /** Coluna principal (8/12 em @split). */
  principal: React.ReactNode;
  /** Coluna de apoio (4/12 em @split). */
  apoio: React.ReactNode;
  /** No celular/empilhado, mostra o apoio antes do principal (padrão: depois). */
  apoioPrimeiro?: boolean;
  /** Rótulo acessível da coluna de apoio (vira <aside aria-label>). */
  rotuloApoio?: string;
  className?: string;
}

/** Padrão B: painel principal 8 + apoio 4 (Início, Concursos, Exames do candidato). */
export const GradePainel: React.FC<GradePainelProps> = ({ principal, apoio, apoioPrimeiro = false, rotuloApoio, className = '' }) => (
  <div className="@container">
    <div className={`grid grid-cols-1 @split:grid-cols-12 gap-6 items-start ${className}`}>
      <div className={`min-w-0 @split:col-span-8 ${apoioPrimeiro ? 'order-2 @split:order-none' : ''}`}>{principal}</div>
      <aside aria-label={rotuloApoio} className={`min-w-0 @split:col-span-4 ${apoioPrimeiro ? 'order-1 @split:order-none' : ''}`}>{apoio}</aside>
    </div>
  </div>
);

interface GradeIndiceProps {
  /** Filtro / índice / calendário (coluna estreita). */
  indice: React.ReactNode;
  /** Conteúdo (coluna larga). */
  conteudo: React.ReactNode;
  /** '4-8' (padrão · filtro/calendário) ou '3-9' (índice de documento). */
  proporcao?: '4-8' | '3-9';
  /** Índice fica fixo ao rolar (sticky) em @split. */
  indiceFixo?: boolean;
  /** Rótulo acessível do índice (vira <nav aria-label> quando informado; senão <div>). */
  rotuloIndice?: string;
  className?: string;
}

const PROPORCAO: Record<'4-8' | '3-9', [string, string]> = {
  '4-8': ['@split:col-span-4', '@split:col-span-8'],
  '3-9': ['@split:col-span-3', '@split:col-span-9'],
};

/** Padrão D: índice/filtro 4 + conteúdo 8 (ou 3 + 9). */
export const GradeIndice: React.FC<GradeIndiceProps> = ({ indice, conteudo, proporcao = '4-8', indiceFixo = false, rotuloIndice, className = '' }) => {
  const [colIndice, colConteudo] = PROPORCAO[proporcao];
  const IndiceTag = rotuloIndice ? 'nav' : 'div';
  return (
    <div className="@container">
      <div className={`grid grid-cols-1 @split:grid-cols-12 gap-6 items-start ${className}`}>
        <IndiceTag aria-label={rotuloIndice} className={`min-w-0 ${colIndice} ${indiceFixo ? '@split:sticky @split:top-4' : ''}`}>{indice}</IndiceTag>
        <div className={`min-w-0 ${colConteudo}`}>{conteudo}</div>
      </div>
    </div>
  );
};
