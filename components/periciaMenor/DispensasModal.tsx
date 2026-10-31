// Ficheiro: components/periciaMenor/DispensasModal.tsx
// Lista de dispensas da Perícia Menor com caixas de seleção (uma ou mais). "TODAS AS ATIVIDADES"
// é exclusiva: marcada, desabilita as demais; e só pode ser marcada com nenhuma outra escolhida.
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

export const TODAS_ATIVIDADES = 'TODAS AS ATIVIDADES';

/** Dispensas possíveis numa Perícia Menor (lista fixa). */
export const DISPENSAS = [
  TODAS_ATIVIDADES,
  'Carregar peso',
  'Dirigir ou manobrar veículos Automotores',
  'Embarque',
  'Esforços físicos intensos e extenuantes',
  'Formatura',
  'Manobras Operativas',
  'Marchas',
  'Serviço Armado',
  'Serviço Noturno',
  'Serviços em locais elevados',
  'Subir e descer escadas repetidamente',
  'TAF/TFM',
  'TAF/TFM (Exceto caminhadas)',
  'TAF/TFM (Exceto natação)',
  'TAF/TFM(Exceto Caminhadas e Natação)',
];

interface Props {
  inicial: string[];
  onConfirmar: (dispensas: string[]) => void;
  onCancelar: () => void;
}

export const DispensasModal: React.FC<Props> = ({ inicial, onConfirmar, onCancelar }) => {
  const [marcadas, setMarcadas] = useState<string[]>(inicial);

  const alternar = (d: string) => setMarcadas(atual => {
    if (d === TODAS_ATIVIDADES) return atual.includes(d) ? [] : [d];
    const resto = atual.filter(x => x !== TODAS_ATIVIDADES);
    return resto.includes(d) ? resto.filter(x => x !== d) : [...resto, d];
  });

  return (
    <Dialog
      title="Dispensas"
      icon="checklist"
      size="md"
      onClose={onCancelar}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
          <Button icon="check" onClick={() => onConfirmar(marcadas)}>Confirmar{marcadas.length > 0 ? ` (${marcadas.length})` : ''}</Button>
        </>
      )}
    >
      <div role="group" aria-label="Dispensas" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DISPENSAS.map(d => {
          const selecionada = marcadas.includes(d);
          const desabilitada = d === TODAS_ATIVIDADES ? marcadas.length > 0 && !selecionada : marcadas.includes(TODAS_ATIVIDADES);
          return (
            <label
              key={d}
              className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg border text-sm ${selecionada ? 'border-navy bg-thead font-semibold text-navy' : 'border-line text-ink'} ${desabilitada ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-thead'}`}
            >
              <input type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={selecionada} disabled={desabilitada} onChange={() => alternar(d)} />
              <span className="break-words min-w-0">{d}</span>
            </label>
          );
        })}
      </div>
    </Dialog>
  );
};
