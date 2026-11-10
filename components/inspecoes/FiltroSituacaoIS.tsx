// Ficheiro: components/inspecoes/FiltroSituacaoIS.tsx
// Filtro de situação da visão Tabela das Inspeções de Saúde: dropdown com caixas de seleção (Abertas,
// Em andamento, Finalizadas) e a opção "Todas", que marca/desmarca todas. O botão resume a seleção
// ("Em andamento", "2 situações", "Todas"). Contadores ao lado de cada opção.
import React from 'react';
import { FiltroPopover } from './FiltroPopover';
import { SITUACOES_IS, type SituacaoIS } from '../../utils/inspecoes';

export const resumoSituacoes = (sel: SituacaoIS[]): string => {
  if (sel.length === 0) return 'Nenhuma';
  if (sel.length === SITUACOES_IS.length) return 'Todas';
  if (sel.length === 1) return SITUACOES_IS.find(s => s.id === sel[0])?.plural ?? '';
  return `${sel.length} situações`;
};

const Opcao: React.FC<{ rotulo: string; marcado: boolean; misto?: boolean; contador?: number; forte?: boolean; onChange: () => void }> = ({ rotulo, marcado, misto, contador, forte, onChange }) => (
  <label className="flex items-center gap-3 min-h-[44px] px-3 cursor-pointer hover:bg-thead">
    <input
      type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={marcado} onChange={onChange}
      ref={el => { if (el) el.indeterminate = !!misto; }}
    />
    <span className={`flex-1 text-sm ${forte ? 'font-bold text-navy' : 'font-semibold text-ink'}`}>{rotulo}</span>
    {contador !== undefined && <span className="text-xs font-bold text-ink-3 bg-thead border border-line rounded-full px-2 py-0.5">{contador}</span>}
  </label>
);

export const FiltroSituacaoIS: React.FC<{
  value: SituacaoIS[];
  onChange: (v: SituacaoIS[]) => void;
  contadores?: Partial<Record<SituacaoIS, number>>;
  className?: string;
}> = ({ value, onChange, contadores, className }) => {
  const todas = value.length === SITUACOES_IS.length;
  const alternar = (id: SituacaoIS) => onChange(value.includes(id) ? value.filter(v => v !== id) : SITUACOES_IS.map(s => s.id).filter(s => s === id || value.includes(s)));
  return (
    <FiltroPopover nome="Situação" icone="filter_list" resumo={resumoSituacoes(value)} className={className}>
      {() => (
        <fieldset>
          <legend className="sr-only">Situação da IS</legend>
          <Opcao rotulo="Todas" forte marcado={todas} misto={!todas && value.length > 0} onChange={() => onChange(todas ? [] : SITUACOES_IS.map(s => s.id))} />
          <div className="border-t border-line my-1" aria-hidden="true" />
          {SITUACOES_IS.map(s => (
            <Opcao key={s.id} rotulo={s.plural} marcado={value.includes(s.id)} contador={contadores?.[s.id]} onChange={() => alternar(s.id)} />
          ))}
        </fieldset>
      )}
    </FiltroPopover>
  );
};
