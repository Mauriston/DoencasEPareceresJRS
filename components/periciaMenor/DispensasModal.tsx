// Ficheiro: components/periciaMenor/DispensasModal.tsx
// Lista de dispensas da Perícia Menor com caixas de seleção (uma ou mais). "TODAS AS ATIVIDADES"
// é exclusiva: marcada, desabilita as demais; e só pode ser marcada com nenhuma outra escolhida.
import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

export const TODAS_ATIVIDADES = 'TODAS AS ATIVIDADES';

interface Props {
  opcoes: string[] | null;
  inicial: string[];
  onConfirmar: (dispensas: string[]) => void;
  onCancelar: () => void;
}

export const DispensasModal: React.FC<Props> = ({ opcoes, inicial, onConfirmar, onCancelar }) => {
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
      {opcoes === null ? (
        <p className="py-6 text-center text-sm text-ink-3" role="status">Carregando dispensas…</p>
      ) : opcoes.length === 0 ? (
        <p role="alert" className="py-6 text-center text-sm font-semibold text-wine">Não foi possível carregar a lista de dispensas.</p>
      ) : (
        <div role="group" aria-label="Dispensas" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {opcoes.map(d => {
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
      )}
    </Dialog>
  );
};
