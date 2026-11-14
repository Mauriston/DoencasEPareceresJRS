// Ficheiro: components/periciaMenor/partes.tsx
// Peças pequenas da Perícia Menor reaproveitadas na lista, no painel de detalhe e na Ficha do
// inspecionado (auditoria v3, seções 5 e 9): tag só com o tipo (Dispensa total · Restrições),
// contagem regressiva do término (vinho só para "termina hoje" — G1), CID com o código em destaque,
// abas sublinhadas (ouro = ativa — G2) e o saldo acumulado de 30 dias.
import React, { useEffect, useState } from 'react';
import { StatusTag } from '../ui/StatusTag';
import { ROTULO_TIPO_PERICIA, type ContagemTermino, type TipoPericia } from '../../utils/periciaMenorResumo';
import { MAX_DIAS_ACUMULADOS } from '../../utils/periciaMenorRegras';

/** Tag do tipo: Dispensa total (navy contorno) ou Restrições (ouro). Sem "Vigente" (G1/PM9). */
export const TagTipoPericia: React.FC<{ tipo: TipoPericia }> = ({ tipo }) => {
  if (tipo === 'dispensa') return <StatusTag tone="navyOutline" dot={false} title="Dispensa de todas as atividades">{ROTULO_TIPO_PERICIA.dispensa}</StatusTag>;
  if (tipo === 'restricoes') return <StatusTag tone="attention">{ROTULO_TIPO_PERICIA.restricoes}</StatusTag>;
  return <span className="text-xs text-ink-4">{ROTULO_TIPO_PERICIA.nenhum}</span>;
};

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

export interface AbaSublinhada<T extends string> { id: T; rotulo: string; contagem?: number }

/** Abas sublinhadas (ouro = ativa), com setas ← → entre elas. `idBase` liga cada aba ao painel `${idBase}-painel`. */
export function AbasSublinhadas<T extends string>({ abas, ativa, onChange, rotulo, idBase, className = '' }: {
  abas: AbaSublinhada<T>[]; ativa: T; onChange: (id: T) => void; rotulo: string; idBase: string; className?: string;
}) {
  const aoTecla = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = abas.findIndex(a => a.id === ativa);
    const prox = abas[(i + passo + abas.length) % abas.length];
    onChange(prox.id);
    requestAnimationFrame(() => document.getElementById(`${idBase}-aba-${prox.id}`)?.focus());
  };
  return (
    <div role="tablist" aria-label={rotulo} onKeyDown={aoTecla} className={`flex gap-5 overflow-x-auto border-b border-line ${className}`}>
      {abas.map(a => {
        const sel = a.id === ativa;
        return (
          <button
            key={a.id} type="button" role="tab" id={`${idBase}-aba-${a.id}`} aria-selected={sel} aria-controls={`${idBase}-painel`} tabIndex={sel ? 0 : -1}
            onClick={() => onChange(a.id)}
            className={`shrink-0 inline-flex items-center gap-1.5 min-h-10 text-sm font-bold border-b-2 -mb-px transition-colors ${sel ? 'border-gold text-navy' : 'border-transparent text-ink-3 hover:text-navy'}`}
          >
            {a.rotulo}
            {a.contagem !== undefined && <span className="min-w-5 h-5 px-1.5 rounded-full bg-thead text-ink-3 text-xs inline-flex items-center justify-center tabular-nums">{a.contagem}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Barra simples (navy) com o número escrito acima. */
export const BarraDias: React.FC<{ atual: number; total: number; rotulo: React.ReactNode; className?: string }> = ({ atual, total, rotulo, className = '' }) => {
  const pct = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0;
  return (
    <div className={className}>
      <div className="h-2 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={atual}>
        <div className="h-full rounded-full bg-navy transition-all duration-500" style={{ width: `${pct}%` }} />
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
