// Ficheiro: components/home/Secao.tsx
// Moldura padrão dos cards da Início: superfície do Card do DS (borda line, raio 14, sem sombra), título h2 com
// o tamanho h3 (16/700 — a Início tem só o h1 "Início" acima), ações à direita (ButtonLink/Button size="sm") e o
// conteúdo de borda a borda (listas com divisórias). Também é a moldura do CardFaltasHNRe (prop `Secao`).
// `embutido`: sem a moldura (borda/fundo), para juntar duas seções num só card (ex.: calendário + agenda no
// celular) — quem embute desenha a moldura e as divisórias.
import React from 'react';
import { Link } from 'react-router-dom';

export interface SecaoProps {
  id: string;
  titulo: React.ReactNode;
  /** Contador ao lado do título (cápsula vinho: só para pendências que exigem ação). */
  badge?: number;
  badgeRotulo?: string;
  acao?: React.ReactNode;
  /** O título leva à página correspondente. */
  link?: string;
  className?: string;
  /** Sem moldura própria: a seção vai dentro de um card que agrupa outras. */
  embutido?: boolean;
  children: React.ReactNode;
}

export const Secao: React.FC<SecaoProps> = ({ id, titulo, badge, badgeRotulo = 'pendentes', acao, link, className = '', embutido = false, children }) => (
  <section aria-labelledby={id} className={`${embutido ? '' : 'bg-white border border-line rounded-xl overflow-clip'} ${className}`}>
    <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 min-h-[52px]">
      <h2 id={id} className="text-h3 font-bold text-navy flex items-center gap-2 min-w-0">
        {link ? (
          <Link to={link} className="inline-flex items-center gap-1 hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
            {titulo}
            <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">chevron_right</span>
          </Link>
        ) : titulo}
        {!!badge && <span className="min-w-[24px] h-6 px-2 rounded-full bg-wine text-white text-xs font-bold leading-6 text-center tabular-nums" aria-label={`${badge} ${badgeRotulo}`}>{badge}</span>}
      </h2>
      {acao && <div className="flex items-center gap-1 shrink-0">{acao}</div>}
    </div>
    {children}
  </section>
);
