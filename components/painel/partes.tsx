// Ficheiro: components/painel/partes.tsx
// Peças do Painel: KPI com variação contra o período anterior, cabeçalho de seção, lista classificada em
// barras, barra segmentada (concursos), legenda, estados de carga e exportação CSV. Cores só dos tokens:
// séries em navy e azul de apoio; verde/vinho/ouro só quando a cor é estado.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../ui/Button';
import type { Variacao } from '../../utils/painel';

// ---------------------------------------------------------------------------
// Formatação (pt-BR, algarismos tabulares nas colunas)
// ---------------------------------------------------------------------------

export const fmtNum = (n: number | null | undefined): string => (n == null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
export const fmtPct = (n: number | null | undefined): string => (n == null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
export const fmtDias = (n: number | null | undefined): string => (n == null ? '—' : `${Math.round(n)} ${Math.round(n) === 1 ? 'dia' : 'dias'}`);

/** "agora", "há 12 min", "hoje 11:20", "ontem", "12/10". */
export const fmtQuando = (ms: number | null, agora = Date.now()): string => {
  if (ms == null) return '—';
  const min = Math.floor((agora - ms) / 60_000);
  if (min < 2) return 'agora';
  if (min < 60) return `há ${min} min`;
  const d = new Date(ms);
  const hoje = new Date(agora);
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(d, hoje)) return `hoje ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const ontem = new Date(agora - 86_400_000);
  if (mesmoDia(d, ontem)) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// ---------------------------------------------------------------------------
// KPI com variação
// ---------------------------------------------------------------------------

const TOM_DELTA: Record<Variacao['tom'], string> = { bom: 'text-green-700', ruim: 'text-wine', neutro: 'text-ink-3' };
const ICONE_DELTA: Record<Variacao['direcao'], string> = { sobe: 'arrow_upward', desce: 'arrow_downward', igual: 'remove' };
const LEITURA_DELTA: Record<Variacao['direcao'], string> = { sobe: 'aumento de', desce: 'queda de', igual: 'estável,' };

interface KpiDeltaProps {
  label: string;
  value: string;
  variacao?: Variacao | null;
  /** "vs. out" — aparece como dica quando não há outra. */
  vs?: string;
  hint?: string;
  /** Lista que abre ao tocar no número. */
  to?: string;
  /** Some no celular (o celular mostra 4 KPIs em 2 × 2). */
  soDesktop?: boolean;
}

export const KpiDelta: React.FC<KpiDeltaProps> = ({ label, value, variacao, vs, hint, to, soDesktop }) => {
  const corpo = (
    <>
      <span className="text-xs font-semibold text-ink-3 truncate">{label}</span>
      <span className="flex items-baseline gap-2 flex-wrap">
        <span className="text-kpi font-extrabold text-navy">{value}</span>
        {variacao && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${TOM_DELTA[variacao.tom]}`}>
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{ICONE_DELTA[variacao.direcao]}</span>
            <span aria-hidden="true">{variacao.direcao === 'igual' ? '' : variacao.texto}</span>
            <span className="sr-only">{`${LEITURA_DELTA[variacao.direcao]} ${variacao.direcao === 'igual' ? '' : variacao.texto} ${vs ?? ''}`}</span>
          </span>
        )}
      </span>
      {(hint || (variacao && vs)) && <span className="text-xs text-ink-3 truncate">{hint ?? vs}</span>}
    </>
  );
  const base = `min-w-0 flex flex-col gap-1 rounded-xl border border-line bg-white px-4 py-3.5 ${soDesktop ? 'hidden @split:flex' : ''}`;
  return to ? (
    <Link to={to} className={`${base} hover:border-navy transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}>{corpo}</Link>
  ) : <div className={base}>{corpo}</div>;
};

/** Linha de KPIs: 2 × 2 no celular, 5 colunas na grade larga. */
export const LinhaKpis: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="@container">
    <div className="grid grid-cols-2 @split:grid-cols-5 gap-3">{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Cabeçalho de seção
// ---------------------------------------------------------------------------

interface CabecalhoSecaoProps {
  id: string;
  icone: string;
  titulo: string;
  subtitulo: string;
  /** Recorte atual ("JRS + MPI · todos os peritos"). */
  recorte?: string;
  /** Alternância de recorte (Segmented) ou selo (ex.: "só Admin"). */
  extra?: React.ReactNode;
  abrir?: { rotulo: string; to: string };
}

export const CabecalhoSecao: React.FC<CabecalhoSecaoProps> = ({ id, icone, titulo, subtitulo, recorte, extra, abrir }) => (
  <div className="flex flex-col @split:flex-row @split:items-end @split:justify-between gap-3 pt-2 border-t border-line">
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-10 h-10 rounded-lg bg-thead flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{icone}</span>
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 id={`${id}-titulo`} className="text-h2 font-extrabold text-navy">{titulo}</h2>
          {recorte && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-thead text-xs font-bold text-ink-3">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">visibility</span>{recorte}
            </span>
          )}
        </div>
        <p className="text-sm text-ink-3">{subtitulo}</p>
      </div>
    </div>
    <div className="flex items-center gap-3 flex-wrap">
      {extra}
      {abrir && <ButtonLink to={abrir.to} variant="ghost" size="sm" icon="open_in_new">{abrir.rotulo}</ButtonLink>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Bloco (card com título) e estados
// ---------------------------------------------------------------------------

export const Bloco: React.FC<{ titulo: string; descricao?: string; acoes?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ titulo, descricao, acoes, className = '', children }) => (
  <section className={`min-w-0 bg-white border border-line rounded-xl p-4 flex flex-col gap-3 ${className}`} aria-label={titulo}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-h3 font-bold text-navy">{titulo}</h3>
        {descricao && <p className="text-xs text-ink-3 mt-0.5">{descricao}</p>}
      </div>
      {acoes}
    </div>
    {children}
  </section>
);

export const SemDados: React.FC<{ texto?: string }> = ({ texto = 'Sem registros no período.' }) => (
  <p className="text-sm text-ink-3 py-6 text-center">{texto}</p>
);

export const Carregando: React.FC = () => (
  <div className="flex items-center justify-center py-16" role="status" aria-label="Carregando os dados">
    <div className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
  </div>
);

export const ErroSecao: React.FC<{ texto: string }> = ({ texto }) => (
  <p className="text-sm text-wine bg-wine-50 border border-wine-100 rounded-lg px-4 py-3" role="alert">{texto}</p>
);

// ---------------------------------------------------------------------------
// Legenda
// ---------------------------------------------------------------------------

export interface ItemLegenda { nome: string; classe: string; forma?: 'linha' | 'tracejada' | 'bloco' }

export const Legenda: React.FC<{ itens: ItemLegenda[] }> = ({ itens }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink" aria-label="Legenda">
    {itens.map(i => (
      <li key={i.nome} className="inline-flex items-center gap-1.5">
        {i.forma === 'bloco'
          ? <span className={`w-2.5 h-2.5 rounded-sm ${i.classe}`} aria-hidden="true" />
          : i.forma === 'tracejada'
            ? <span className="w-4 h-[3px] flex gap-[2px]" aria-hidden="true"><span className={`flex-1 rounded-sm ${i.classe}`} /><span className={`flex-1 rounded-sm ${i.classe}`} /></span>
            : <span className={`w-4 h-[3px] rounded-sm ${i.classe}`} aria-hidden="true" />}
        {i.nome}
      </li>
    ))}
  </ul>
);

// ---------------------------------------------------------------------------
// Lista classificada em barras (ranking)
// ---------------------------------------------------------------------------

export interface ItemBarra { chave: string; rotulo: string; valor: number; alerta?: boolean; to?: string; detalhe?: string }

interface ListaBarrasProps {
  itens: ItemBarra[];
  /** Quantos mostrar antes do "Ver todas". */
  limite?: number;
  /** Numera as linhas (lista classificada do celular). */
  numerada?: boolean;
  rotuloVerTodas?: string;
}

export const ListaBarras: React.FC<ListaBarrasProps> = ({ itens, limite = 6, numerada = false, rotuloVerTodas = 'Ver todas' }) => {
  const [todas, setTodas] = useState(false);
  if (!itens.length) return <SemDados />;
  const max = Math.max(...itens.map(i => i.valor), 1);
  const visiveis = todas ? itens : itens.slice(0, limite);
  return (
    <div className="flex flex-col gap-1">
      <ol className="flex flex-col">
        {visiveis.map((i, k) => {
          const linha = (
            <>
              <span className="min-w-0 truncate text-ink" title={i.rotulo}>
                {numerada && <span className="text-ink-3 tabular-nums mr-2">{k + 1}</span>}
                {i.rotulo}
                {i.detalhe && <span className="block text-xs text-ink-3 truncate">{i.detalhe}</span>}
              </span>
              <span className="h-2.5 rounded-full bg-thead overflow-hidden" aria-hidden="true">
                <span className={`block h-full rounded-full ${i.alerta ? 'bg-wine' : 'bg-navy'}`} style={{ width: `${Math.max(2, (i.valor / max) * 100)}%` }} />
              </span>
              <span className="text-right font-bold text-navy tabular-nums">{fmtNum(i.valor)}</span>
            </>
          );
          const classe = 'grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_3rem] gap-2.5 items-center text-sm py-1.5 px-1 -mx-1 rounded';
          return (
            <li key={i.chave}>
              {i.to
                ? <Link to={i.to} className={`${classe} hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}>{linha}</Link>
                : <div className={classe}>{linha}</div>}
            </li>
          );
        })}
      </ol>
      {itens.length > limite && (
        <button type="button" onClick={() => setTodas(t => !t)} className="self-start text-xs font-bold text-blue-600 underline underline-offset-2 py-1">
          {todas ? 'Mostrar menos' : `${rotuloVerTodas} (${itens.length})`}
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Barra segmentada (andamento de concurso)
// ---------------------------------------------------------------------------

export interface ParteBarra { nome: string; valor: number; classe: string }

export const BarraSegmentada: React.FC<{ partes: ParteBarra[]; total: number; rotulo: string }> = ({ partes, total, rotulo }) => {
  const descricao = partes.map(p => `${p.nome}: ${fmtNum(p.valor)}`).join(', ');
  return (
    <span role="img" aria-label={`${rotulo} — ${descricao}`} className="flex h-3 rounded-full overflow-hidden bg-thead gap-[2px]">
      {partes.filter(p => p.valor > 0).map(p => (
        <span key={p.nome} className={p.classe} style={{ width: `${(p.valor / Math.max(total, 1)) * 100}%` }} title={`${p.nome}: ${fmtNum(p.valor)}`} />
      ))}
    </span>
  );
};

// ---------------------------------------------------------------------------
// CSV (só contagens e logins — nunca dados de inspecionado)
// ---------------------------------------------------------------------------

export const baixarCsv = (nome: string, cabecalho: string[], linhas: (string | number)[][]) => {
  const esc = (v: string | number) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const texto = '﻿' + [cabecalho, ...linhas].map(l => l.map(esc).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Botão de texto discreto do cabeçalho de um bloco ("exportar CSV", "ver todas"). */
export const AcaoTexto: React.FC<{ onClick: () => void; children: React.ReactNode; icone?: string }> = ({ onClick, children, icone }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 underline underline-offset-2 py-1 hover:text-navy">
    {icone && <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icone}</span>}{children}
  </button>
);
