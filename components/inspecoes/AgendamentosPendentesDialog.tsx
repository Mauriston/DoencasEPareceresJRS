// Ficheiro: components/inspecoes/AgendamentosPendentesDialog.tsx
// Lista das IS de Verificações e Términos agendadas (hoje ou depois) cujo e-mail de agendamento ainda não saiu
// (utils/emailAgendamentoIS.ts: agendamentoPendente). O e-mail é individual (vai ao inspecionado): "Enviar" em cada
// linha abre o diálogo de envio daquela IS (EnviarAgendamentoDialog), o mesmo do menu ⋮.
import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { dataHoraBr } from '../../utils/inspecoes';

interface Props {
  pendentes: InspecaoRecord[];
  onEscolher: (is: InspecaoRecord) => void;
  onClose: () => void;
}

export const AgendamentosPendentesDialog: React.FC<Props> = ({ pendentes, onEscolher, onClose }) => (
  <Dialog title="E-mails de agendamento pendentes" icon="forward_to_inbox" size="md" onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-ink-3">IS de Verificações e Términos agendadas cujo e-mail de agendamento ao inspecionado ainda não foi enviado. O e-mail é individual: escolha a IS.</p>
      {pendentes.length === 0 ? (
        <p className="text-sm text-ink-3">Nenhum e-mail de agendamento pendente.</p>
      ) : (
        <ul className="max-h-80 overflow-y-auto rounded-xl border border-line divide-y divide-line">
          {pendentes.map(i => (
            <li key={i.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink break-words">{i.inspecionado}</span>
                <span className="block text-xs text-ink-3">IS {i.is} · {dataHoraBr(i.dataEntrevista)} · {i.finalidade}</span>
              </span>
              <Button variant="secondary" icon="send" onClick={() => onEscolher(i)}>Enviar</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </Dialog>
);
