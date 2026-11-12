// Ficheiro: components/inspecoes/EscolherISDialog.tsx
// Lista de IS com e-mail individual pendente (menu "Enviar Email" de Inspeções): agendamento (IS de Verificações e
// Términos agendadas, de hoje em diante) e resultado (IS finalizadas de Verificações e Términos ou Benefícios).
// "Enviar" em cada linha abre o diálogo de envio daquela IS (EnviarAgendamentoDialog / EnviarResultadoDialog).
import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';

interface Props {
  titulo: string;
  icone: string;
  descricao: string;
  vazio: string;
  pendentes: InspecaoRecord[];
  /** Segunda linha de cada IS (ex.: data da entrevista ou do laudo). */
  detalhe: (is: InspecaoRecord) => string;
  onEscolher: (is: InspecaoRecord) => void;
  onClose: () => void;
}

export const EscolherISDialog: React.FC<Props> = ({ titulo, icone, descricao, vazio, pendentes, detalhe, onEscolher, onClose }) => (
  <Dialog title={titulo} icon={icone} size="md" onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-ink-3">{descricao}</p>
      {pendentes.length === 0 ? (
        <p className="text-sm text-ink-3">{vazio}</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto rounded-xl border border-line divide-y divide-line">
          {pendentes.map(i => (
            <li key={i.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink break-words">{i.inspecionado}</span>
                <span className="block text-xs text-ink-3">IS {i.is} · {detalhe(i)} · {i.finalidade}</span>
              </span>
              <Button variant="secondary" icon="send" onClick={() => onEscolher(i)}>Enviar</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </Dialog>
);
