// Ficheiro: components/home/Pendencias.tsx
// Card "Pendências · por atraso" da Início (auditoria v3, 2a): uma lista só, ordenada pelo atraso, no lugar dos
// blocos "Precisa de atenção", "Pareceres não concluídos" e "Perícias Menores Vigentes" (H1). Cada linha traz o
// prazo com uma barra de progresso (vinho = além do prazo · ouro = termina hoje · navy = no prazo), a tag e abre o
// documento (PDF, quando existe) ou o registro/lista correspondente. Os itens chegam prontos e ordenados da Home.
import React from 'react';
import { Link } from 'react-router-dom';
import { Secao } from './Secao';
import { LinkPdf } from '../ui/LinkPdf';
import { StatusTag, type StatusTone } from '../ui/StatusTag';

export interface Pendencia {
  id: string;
  icone: string;
  titulo: string;
  detalhe: string;
  prazo?: { texto: string; pct: number; tom: 'atraso' | 'hoje' | 'prazo' };
  tag: { rotulo: string; tom: StatusTone };
  /** Rota interna (sem PDF). */
  to: string;
  /** PDF arquivado: abre o documento (atestados num modal em tela cheia no desktop, com `tituloPdf`). */
  pdf?: string;
  tituloPdf?: string;
}

const COR_PRAZO = { atraso: 'bg-wine', hoje: 'bg-gold', prazo: 'bg-navy' } as const;

const Linha: React.FC<{ p: Pendencia }> = ({ p }) => {
  const corpo = (
    <>
      <span className="w-9 h-9 rounded-lg bg-thead flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">{p.icone}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-navy truncate">{p.titulo}</span>
        <span className="block text-xs text-ink-3 truncate">{p.detalhe}{p.prazo ? <span className="sm:hidden"> · {p.prazo.texto}</span> : null}</span>
      </span>
      {p.prazo && (
        <span className="hidden sm:flex w-36 shrink-0 flex-col gap-1">
          <span className="text-xs font-semibold text-ink-3 tabular-nums">{p.prazo.texto}</span>
          <span className="block h-1.5 rounded-full bg-thead overflow-hidden" aria-hidden="true">
            <span className={`block h-full rounded-full ${COR_PRAZO[p.prazo.tom]}`} style={{ width: `${Math.max(4, Math.min(100, p.prazo.pct))}%` }} />
          </span>
        </span>
      )}
      <StatusTag tone={p.tag.tom} className="shrink-0">{p.tag.rotulo}</StatusTag>
      <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">{p.pdf ? 'open_in_new' : 'chevron_right'}</span>
    </>
  );
  const classe = 'flex items-center gap-3 px-4 py-2.5 min-h-[56px] border-t border-line hover:bg-thead transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold';
  if (p.pdf && p.tituloPdf) return <LinkPdf url={p.pdf} tituloPdf={p.tituloPdf} className={classe}>{corpo}</LinkPdf>;
  if (p.pdf) return <a href={p.pdf} target="_blank" rel="noopener noreferrer" className={classe}>{corpo}</a>;
  return <Link to={p.to} className={classe}>{corpo}</Link>;
};

interface Props {
  itens: Pendencia[];
  /** Linhas mostradas; o resto vira "+N" no rodapé. */
  max?: number;
  /** Fontes da lista, na linha de apoio do título (ex.: "Pareceres · IS · Perícias menores"). */
  fontes: string;
}

export const Pendencias: React.FC<Props> = ({ itens, max = 8, fontes }) => (
  <Secao
    id="home-pendencias"
    titulo={<span>Pendências <span className="font-semibold text-ink-3">· por atraso</span></span>}
    acao={<span className="hidden sm:inline text-xs text-ink-3">{fontes}</span>}
  >
    {itens.length === 0 ? (
      <p className="px-4 pb-6 pt-2 text-sm text-ink-3">Nada pendente para você agora.</p>
    ) : (
      <>
        <ul>{itens.slice(0, max).map(p => <li key={p.id}><Linha p={p} /></li>)}</ul>
        {itens.length > max && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line">+{itens.length - max} pendência{itens.length - max !== 1 ? 's' : ''} nas listas.</p>}
      </>
    )}
  </Secao>
);
