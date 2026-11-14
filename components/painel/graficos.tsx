// Ficheiro: components/painel/graficos.tsx
// Gráficos do Painel em SVG próprio (sem biblioteca): linhas (série temporal com cruz de leitura e dica ao
// passar o mouse/tocar), colunas empilhadas e mapa de calor. Regras (skill dataviz): um eixo só, linhas de 2 px,
// colunas de no máximo 24 px com a ponta arredondada e a base reta, 2 px de folga entre segmentos, grade
// em hairline, legenda sempre que houver 2+ séries e uma tabela equivalente para leitores de tela. As cores
// vêm das classes do DS (navy e azul de apoio), então o tema escuro troca junto.
import React, { useId, useState } from 'react';
import type { PontoSerie } from '../../utils/painel';
import { fmtNum } from './partes';

export interface SerieGrafico {
  nome: string;
  /** Classe de traço (linhas) — ex.: 'stroke-navy'. */
  traco: string;
  /** Classe de preenchimento (pontos, colunas) — ex.: 'fill-navy'. */
  preenchimento: string;
  tracejada?: boolean;
}

/** Topo "redondo" do eixo e as marcas 0 · metade · topo. */
const escala = (max: number): number[] => {
  if (max <= 0) return [0, 1, 2];
  const bruto = max / 2;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= bruto) ?? bruto;
  const passoInteiro = Math.max(1, Math.ceil(passo));
  return [0, passoInteiro, passoInteiro * 2];
};

const W = 620;
const ESQ = 34;
const TOPO = 6;

/** Tabela equivalente (sr-only) — leitura do gráfico por leitores de tela. */
const TabelaOculta: React.FC<{ titulo: string; pontos: PontoSerie[]; series: { nome: string }[] }> = ({ titulo, pontos, series }) => (
  <table className="sr-only">
    <caption>{titulo}</caption>
    <thead><tr><th scope="col">Período</th>{series.map(s => <th key={s.nome} scope="col">{s.nome}</th>)}</tr></thead>
    <tbody>{pontos.map(p => <tr key={p.chave}><th scope="row">{p.rotulo}</th>{p.valores.map((v, k) => <td key={k}>{v}</td>)}</tr>)}</tbody>
  </table>
);

const Dica: React.FC<{ x: number; titulo: string; linhas: { nome: string; valor: number; classe: string }[] }> = ({ x, titulo, linhas }) => (
  <div
    className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-white shadow-lg px-3 py-2 text-xs text-ink whitespace-nowrap"
    style={{ left: `${(x / W) * 100}%`, transform: `translateX(${x > W * 0.7 ? '-105%' : '8px'})` }}
  >
    <p className="font-bold text-navy mb-0.5">{titulo}</p>
    {linhas.map(l => (
      <p key={l.nome} className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-sm ${l.classe}`} aria-hidden="true" />
        {l.nome}: <strong className="tabular-nums">{fmtNum(l.valor)}</strong>
      </p>
    ))}
  </div>
);

const classeBg = (preenchimento: string) => preenchimento.replace('fill-', 'bg-');

interface GraficoLinhasProps {
  titulo: string;
  pontos: PontoSerie[];
  series: SerieGrafico[];
  altura?: number;
  /** Mostra o rótulo do eixo X a cada N pontos (o último sempre aparece). */
  cadaRotulo?: number;
  /** Índices [de, até] do período selecionado: faixa de fundo sutil. */
  destaque?: [number, number];
}

export const GraficoLinhas: React.FC<GraficoLinhasProps> = ({ titulo, pontos, series, altura = 180, cadaRotulo = 2, destaque }) => {
  const [hover, setHover] = useState<number | null>(null);
  const base = altura - 18;
  const max = Math.max(0, ...pontos.flatMap(p => p.valores));
  const ticks = escala(max);
  const topoEscala = ticks[2];
  const n = pontos.length;
  const passo = n > 1 ? (W - ESQ - 6) / (n - 1) : 0;
  const x = (i: number) => ESQ + i * passo;
  const y = (v: number) => base - (v / topoEscala) * (base - TOPO);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${altura}`} className="w-full h-auto block font-sans" role="img" aria-label={titulo} onMouseLeave={() => setHover(null)}>
        {destaque && n > 1 && (
          <rect x={x(destaque[0]) - passo / 2} y={TOPO - 4} width={Math.max(passo, x(destaque[1]) - x(destaque[0]) + passo)} height={base - TOPO + 4} className="fill-thead" rx={4} />
        )}
        {ticks.map(t => (
          <g key={t}>
            <line x1={ESQ} x2={W} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={ESQ - 6} y={y(t) + 4} textAnchor="end" fontSize={10} className="fill-ink-3 tabular-nums">{fmtNum(t)}</text>
          </g>
        ))}
        {series.map((s, k) => (
          <polyline
            key={s.nome}
            fill="none"
            className={s.traco}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.tracejada ? '5 4' : undefined}
            points={pontos.map((p, i) => `${x(i)},${y(p.valores[k] ?? 0)}`).join(' ')}
          />
        ))}
        {/* Pontos finais (r 4 com anel da superfície) */}
        {n > 0 && series.map((s, k) => (
          <circle key={s.nome} cx={x(n - 1)} cy={y(pontos[n - 1].valores[k] ?? 0)} r={4} className={`${s.preenchimento} stroke-white`} strokeWidth={2} />
        ))}
        {pontos.map((p, i) => ((i % cadaRotulo === 0 && i < n - 1 - Math.floor(cadaRotulo / 2)) || i === n - 1) && (
          <text key={p.chave} x={x(i)} y={altura - 3} textAnchor={i === n - 1 ? 'end' : 'middle'} fontSize={10} className="fill-ink-3">{p.rotulo}</text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={TOPO} y2={base} className="stroke-ink-4" strokeWidth={1} />
            {series.map((s, k) => <circle key={s.nome} cx={x(hover)} cy={y(pontos[hover].valores[k] ?? 0)} r={4} className={`${s.preenchimento} stroke-white`} strokeWidth={2} />)}
          </g>
        )}
        {/* Faixas de leitura (alvo maior que a marca) */}
        {pontos.map((p, i) => (
          <rect key={p.chave} x={x(i) - passo / 2} y={0} width={Math.max(passo, 8)} height={base} fill="transparent"
            onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <Dica x={x(hover)} titulo={pontos[hover].rotulo} linhas={series.map((s, k) => ({ nome: s.nome, valor: pontos[hover].valores[k] ?? 0, classe: classeBg(s.preenchimento) }))} />
      )}
      <TabelaOculta titulo={titulo} pontos={pontos} series={series} />
    </div>
  );
};

/** Coluna com o topo arredondado (4 px) e a base reta. */
const caminhoColuna = (x: number, y: number, w: number, h: number, r: number): string => {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
};

interface GraficoColunasProps {
  titulo: string;
  pontos: PontoSerie[];
  /** Séries empilhadas de baixo para cima. */
  series: SerieGrafico[];
  altura?: number;
  destaque?: [number, number];
}

export const GraficoColunasEmpilhadas: React.FC<GraficoColunasProps> = ({ titulo, pontos, series, altura = 180, destaque }) => {
  const [hover, setHover] = useState<number | null>(null);
  const base = altura - 18;
  const totais = pontos.map(p => p.valores.reduce((a, b) => a + b, 0));
  const ticks = escala(Math.max(0, ...totais));
  const topoEscala = ticks[2];
  const n = pontos.length;
  const banda = (W - ESQ) / Math.max(n, 1);
  const larg = Math.min(24, banda * 0.6);
  const cx = (i: number) => ESQ + banda * i + banda / 2;
  const alturaDe = (v: number) => (v / topoEscala) * (base - TOPO);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${altura}`} className="w-full h-auto block font-sans" role="img" aria-label={titulo} onMouseLeave={() => setHover(null)}>
        {destaque && (
          <rect x={ESQ + banda * destaque[0]} y={TOPO - 4} width={banda * (destaque[1] - destaque[0] + 1)} height={base - TOPO + 4} className="fill-thead" rx={4} />
        )}
        {ticks.map(t => (
          <g key={t}>
            <line x1={ESQ} x2={W} y1={base - alturaDe(t)} y2={base - alturaDe(t)} className="stroke-line" strokeWidth={1} />
            <text x={ESQ - 6} y={base - alturaDe(t) + 4} textAnchor="end" fontSize={10} className="fill-ink-3 tabular-nums">{fmtNum(t)}</text>
          </g>
        ))}
        {pontos.map((p, i) => {
          let acumulado = 0;
          const ultimoComValor = p.valores.reduce((u, v, k) => (v > 0 ? k : u), -1);
          return (
            <g key={p.chave} opacity={hover === null || hover === i ? 1 : 0.55}>
              {p.valores.map((v, k) => {
                if (v <= 0) return null;
                const h = alturaDe(v);
                const yTopo = base - alturaDe(acumulado) - h;
                acumulado += v;
                // 2 px de folga da superfície entre segmentos (tirados do segmento de cima).
                const hVisivel = Math.max(1, h - (k > 0 && acumulado - v > 0 ? 2 : 0));
                return k === ultimoComValor
                  ? <path key={k} d={caminhoColuna(cx(i) - larg / 2, yTopo, larg, hVisivel, 4)} className={series[k].preenchimento} />
                  : <rect key={k} x={cx(i) - larg / 2} y={yTopo} width={larg} height={hVisivel} className={series[k].preenchimento} />;
              })}
            </g>
          );
        })}
        {pontos.map((p, i) => (
          <text key={p.chave} x={cx(i)} y={altura - 3} textAnchor="middle" fontSize={10} className="fill-ink-3">{p.rotulo}</text>
        ))}
        {pontos.map((p, i) => (
          <rect key={p.chave} x={ESQ + banda * i} y={0} width={banda} height={base} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <Dica x={cx(hover)} titulo={pontos[hover].rotulo} linhas={series.map((s, k) => ({ nome: s.nome, valor: pontos[hover].valores[k] ?? 0, classe: classeBg(s.preenchimento) }))} />
      )}
      <TabelaOculta titulo={titulo} pontos={pontos} series={series} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mapa de calor (usuário × tipo de ação) — sequencial em um só tom (azul de apoio)
// ---------------------------------------------------------------------------

const DEGRAUS = ['bg-thead text-ink-4', 'bg-blue-100 text-navy', 'bg-blue-200 text-navy', 'bg-blue-300 text-navy', 'bg-blue-400 text-white', 'bg-blue-600 text-white'];

interface MapaCalorProps {
  titulo: string;
  linhas: { chave: string; rotulo: string; valores: number[] }[];
  colunas: string[];
}

export const MapaCalor: React.FC<MapaCalorProps> = ({ titulo, linhas, colunas }) => {
  const id = useId();
  const max = Math.max(1, ...linhas.flatMap(l => l.valores));
  const degrau = (v: number) => (v <= 0 ? 0 : Math.min(5, 1 + Math.floor((v / max) * 4.999)));
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-xs border-separate border-spacing-[2px]" aria-describedby={id}>
        <caption id={id} className="sr-only">{titulo}</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left font-semibold text-ink-3 px-1">Usuário</th>
            {colunas.map(c => <th key={c} scope="col" className="font-semibold text-ink-3 px-1 text-center">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.chave}>
              <th scope="row" className="text-left font-semibold text-ink px-1 whitespace-nowrap max-w-[9rem] truncate" title={l.rotulo}>{l.rotulo}</th>
              {l.valores.map((v, k) => (
                <td key={k} className={`h-8 min-w-[3rem] rounded text-center font-bold tabular-nums ${DEGRAUS[degrau(v)]}`} title={`${l.rotulo} · ${colunas[k]}: ${v}`}>
                  {v > 0 ? fmtNum(v) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
