// Ficheiro: components/ui/PericiaStatusTags.tsx
// Estados de uma Perícia Menor com o rótulo por extenso (antes: pílulas de
// uma letra — "V", "C", "R" —, ilegíveis e dependentes só da cor).
import React from 'react';
import { StatusTag } from './StatusTag';
import { statusPericia, type PericiaMenorDoc } from '@/services/firestorePericiasMenores';

interface RegistroPericia {
  vigente: boolean;
  concluido: boolean;
  vdf?: boolean;
  dispensas: string;
}

export const isAfastamentoLts = (r: Pick<RegistroPericia, 'dispensas'>) =>
  r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES');

export const isRestricaoPericia = (r: Pick<RegistroPericia, 'dispensas'>) =>
  r.dispensas.trim() !== '' && !isAfastamentoLts(r);

/** Estados de uma perícia gravada no Firestore (status derivado da data de término). */
export const registroPericia = (p: Pick<PericiaMenorDoc, 'dataTermino' | 'dispensas' | 'vdf'>, hoje?: string): RegistroPericia => {
  const vigente = statusPericia(p, hoje) === 'vigente';
  return { vigente, concluido: !vigente, vdf: p.vdf, dispensas: (p.dispensas ?? []).join(', ') };
};

export const PericiaStatusTags: React.FC<{ registro: RegistroPericia; mostrarVdf?: boolean }> = ({ registro, mostrarVdf = false }) => (
  <div className="flex gap-1.5 flex-wrap">
    {registro.vigente && <StatusTag tone="danger">Vigente</StatusTag>}
    {registro.concluido && !registro.vigente && <StatusTag tone="success">Concluída</StatusTag>}
    {mostrarVdf && registro.vdf && <StatusTag tone="navyOutline" dot={false} title="Verificação de Deficiência Funcional">VDF</StatusTag>}
    {isAfastamentoLts(registro) && <StatusTag tone="danger" title="Licença para Tratamento de Saúde">LTS</StatusTag>}
    {isRestricaoPericia(registro) && <StatusTag tone="attention">Restrições</StatusTag>}
  </div>
);
