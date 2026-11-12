// Ficheiro: components/inspecoes/FiltroSituacaoIS.tsx
// Filtro de situação da visão Tabela das Inspeções de Saúde: dropdown com caixas de seleção (Abertas,
// Em andamento, Finalizadas) e a opção "Todas", que marca/desmarca todas. O botão resume a seleção
// ("Em andamento", "2 situações", "Todas"). Contadores ao lado de cada opção.
import React from 'react';
import { FiltroCaixas } from './FiltroCaixas';
import { SITUACOES_IS, type SituacaoIS } from '../../utils/inspecoes';

export const FiltroSituacaoIS: React.FC<{
  value: SituacaoIS[];
  onChange: (v: SituacaoIS[]) => void;
  contadores?: Partial<Record<SituacaoIS, number>>;
  className?: string;
}> = ({ value, onChange, contadores, className }) => (
  <FiltroCaixas
    nome="Situação" icone="filter_list" opcoes={SITUACOES_IS.map(s => ({ id: s.id, rotulo: s.plural }))}
    value={value} onChange={onChange} contadores={contadores} resumoVarios={n => `${n} situações`} className={className}
  />
);
