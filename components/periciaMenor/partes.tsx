// Ficheiro: components/periciaMenor/partes.tsx
// Peças pequenas da Perícia Menor reaproveitadas na lista, no painel de detalhe e na Ficha do
// inspecionado (auditoria v3, seções 5 e 9): tag só com o tipo (Dispensa total · Restrições),
// contagem regressiva do término (vinho só para "termina hoje" — G1), CID com o código em destaque,
// abas sublinhadas (ouro = ativa — G2) e o saldo acumulado de 30 dias.
import React, { useEffect, useState } from 'react';
import { Highlight, HighlightItem } from '@animate-ui/react/primitives/effects/highlight';
import { StatusTag } from '../ui/StatusTag';
import { ROTULO_TIPO_PERICIA, type ContagemTermino, type TipoPericia } from '../../utils/periciaMenorResumo';
import { MAX_DIAS_ACUMULADOS } from '../../utils/periciaMenorRegras';

/** Tag do tipo: Dispensa total (navy contorno) ou Restrições (ouro). Sem "Vigente" (G1/PM9). */
export const TagTipoPericia: React.FC<{ tipo: TipoPericia }> = ({ tipo }) => {
  if (tipo === 'dispensa') return <StatusTag tone="navyOutline" dot={false} title="Dispensa de todas as atividades">{ROTULO_TIPO_PERICIA.dispensa}</StatusTag>;
  if (tipo === 'restricoes') return <StatusTag tone="attention">{ROTULO_TIPO_PERICIA.restricoes}</StatusTag>;
  return <span className="text-xs text-ink-4">{ROTULO_TIPO_PERICIA.nenhum}</span>;
};

/** Chip da especialidade médica (deduzida do CID pela IA). Sem especialidade: nada. */
export const TagEspecialidade: React.FC<{ especialidade?: string; className?: string }> = ({ especialidade, className = '' }) =>
  especialidade ? <StatusTag tone="muted" dot={false} title="Especialidade (pelo CID)" className={className}>{especialidade}</StatusTag> : null;

/** Cor da contagem: vinho só quando termina hoje (exige ação); navy enquanto vigente; ink-3 depois. */
export const classeContagem = (c: Pick<ContagemTermino, 'tom'>): string =>
  c.tom === 'hoje' ? 'text-wine' : c.tom === 'futuro' ? 'text-navy' : 'text-ink-3';

export const TextoContagem: React.FC<{ contagem: ContagemTermino; curto?: boolean; className?: string }> = ({ contagem, curto = false, className = '' }) => (
  <span className={`text-xs font-bold whitespace-nowrap tabular-nums ${classeContagem(contagem)} ${className}`}>{curto ? contagem.curto : contagem.texto}</span>
);

/** "M54.5 Dor lombar baixa" com o código em destaque. */
export const CidCodigo: React.FC<{ codigo: string; descricao: string; className?: string }> = ({ codigo, descricao, className = '' }) => (
  <span className={`break-words ${className}`}>
    {codigo && <strong className="font-bold text-navy tabular-nums">{codigo}</strong>}{codigo && descricao ? ' ' : ''}{descricao || (!codigo ? '—' : '')}
  </span>
);

export interface AbaSublinhada<T extends string> {
  id: T; rotulo: string; contagem?: number;
  /** Aba visível mas desabilitada (cinza, sem clique; as setas a pulam). `dica` vira o title. */
  desabilitada?: boolean; dica?: string;
  /** Contagem que exige atenção (ex.: "Atrasados"): pílula vinho quando > 0 e a aba não está ativa. */
  alerta?: boolean;
}

/**
 * Abas sublinhadas (auditoria v3, G2 — mockups 5b/5c/9b/9c): item de 48 px (ou 44 no sheet), 14/700, ouro de 3 px
 * sob a ativa; contagem em pílula (navy cheia na ativa, cinza nas demais). No celular as abas dividem a largura
 * em partes iguais, centradas (`distribuir` = 'celular', padrão); 'sempre' faz o mesmo em todas as larguras (sheet
 * e painel lateral); 'nunca' deixa cada aba do tamanho do texto, com rolagem lateral (Ficha, 4+ abas).
 * Setas ← → trocam a aba; `idBase` liga cada aba ao painel `${idBase}-painel`. `linha={false}` tira o filete
 * inferior quando quem envolve as abas já desenha a linha (cabeçalho de card com a vista ao lado — Inspeções, Concursos).
 * O filete ouro desliza entre as abas (Highlight do Animate UI, spring; sem animação com prefers-reduced-motion).
 * Padrão das páginas de lista do grupo Trabalho: situação = estas abas; vista = `Segmented`/ícones à parte.
 */
export function AbasSublinhadas<T extends string>({ abas, ativa, onChange, rotulo, idBase, className = '', altura = 'md', distribuir = 'celular', linha = true }: {
  abas: AbaSublinhada<T>[]; ativa: T; onChange: (id: T) => void; rotulo: string; idBase: string; className?: string;
  altura?: 'md' | 'sm'; distribuir?: 'celular' | 'sempre' | 'nunca'; linha?: boolean;
}) {
  const aoTecla = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const ativas = abas.filter(a => !a.desabilitada);
    if (!ativas.length) return;
    const i = ativas.findIndex(a => a.id === ativa);
    const prox = ativas[(i + passo + ativas.length) % ativas.length];
    onChange(prox.id);
    requestAnimationFrame(() => document.getElementById(`${idBase}-aba-${prox.id}`)?.focus());
  };
  // Layout dividido: o contêiner do Highlight leva o flex; o botão, o alinhamento interno.
  const ocupa = distribuir === 'sempre' ? 'flex-1' : distribuir === 'celular' ? 'flex-1 md:flex-none' : 'flex-none';
  const largura = distribuir === 'sempre' ? 'justify-center px-3' : distribuir === 'celular' ? 'justify-center px-2 md:px-3 md:justify-start' : 'px-3';
  const valida = abas.some(a => a.id === ativa && !a.desabilitada);
  return (
    <div role="tablist" aria-label={rotulo} onKeyDown={aoTecla} className={`flex gap-1 overflow-x-auto ${linha ? 'border-b border-line' : ''} ${className}`}>
      <Highlight controlledItems value={valida ? ativa : null} className="inset-x-0 bottom-0 h-[3px] bg-gold">
      {abas.map(a => {
        const sel = a.id === ativa && !a.desabilitada;
        const cor = a.desabilitada ? 'text-ink-4 cursor-not-allowed' : sel ? 'text-navy' : 'text-ink-3 hover:text-navy';
        return (
          <HighlightItem key={a.id} value={a.id} disabled={a.desabilitada} className={`${ocupa} shrink-0 flex -mb-px`}>
          <button
            type="button" role="tab" id={`${idBase}-aba-${a.id}`} aria-selected={sel} aria-controls={`${idBase}-painel`} tabIndex={sel ? 0 : -1}
            aria-disabled={a.desabilitada || undefined} title={a.dica}
            onClick={() => { if (!a.desabilitada) onChange(a.id); }}
            className={`${largura} ${altura === 'sm' ? 'h-11' : 'h-12'} w-full inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${cor}`}
          >
            {a.rotulo}
            {a.contagem !== undefined && (
              <span className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-bold inline-flex items-center justify-center tabular-nums ${sel ? 'bg-navy text-white' : a.alerta && a.contagem > 0 ? 'bg-wine text-white' : 'bg-thead text-ink-3'}`}>{a.contagem}</span>
            )}
          </button>
          </HighlightItem>
        );
      })}
      </Highlight>
    </div>
  );
}

/** Barra simples (navy) com o número escrito acima. */
export const BarraDias: React.FC<{ atual: number; total: number; rotulo: React.ReactNode; className?: string }> = ({ atual, total, rotulo, className = '' }) => {
  const pct = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0;
  return (
    <div className={className}>
      <div className="h-2 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={atual}>
        <div className="h-full rounded-full bg-navy transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-ink-3 mt-1.5 tabular-nums">{rotulo}</p>
    </div>
  );
};

/** "Saldo: 18 de 30 dias" (limite de 30 dias acumulados, utils/periciaMenorRegras.ts → saldoAcumulado). */
export const SaldoAcumulado: React.FC<{ usados: number; restante: number; className?: string }> = ({ usados, restante, className = '' }) => (
  <div className={className}>
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm font-bold text-navy tabular-nums">Saldo: {restante} de {MAX_DIAS_ACUMULADOS} dias</span>
      <span className={`text-xs tabular-nums ${restante === 0 ? 'font-bold text-wine' : 'text-ink-3'}`}>{usados} usado{usados !== 1 ? 's' : ''}</span>
    </div>
    <BarraDias atual={Math.min(usados, MAX_DIAS_ACUMULADOS)} total={MAX_DIAS_ACUMULADOS} rotulo="Perícias vigentes ou concluídas há até 10 dias contam no limite de 30." className="mt-1.5" />
  </div>
);

/** `true` a partir da largura informada (ex.: 1280 = mestre-detalhe lado a lado). */
export const useLarguraMinima = (px: number): boolean => {
  const consulta = `(min-width: ${px}px)`;
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches);
  useEffect(() => {
    const mql = window.matchMedia(consulta);
    const h = () => setOk(mql.matches);
    h();
    mql.addEventListener('change', h);
    return () => mql.removeEventListener('change', h);
  }, [consulta]);
  return ok;
};
