// Ficheiro: components/inspecoes/BotaoEmailFaltas.tsx
// Botão do cabeçalho de Inspeções de Saúde (à esquerda do botão do e-mail das IS agendadas; só Admin e
// Secretaria): e-mail de faltas dos inspecionados do HNRe. Badge com a quantidade de faltas ainda não comunicadas;
// sem pendências, fica desabilitado. O clique abre a lista de seleção (EmailFaltasDialog).
import React, { useMemo, useState } from 'react';
import { IconButton } from '../ui/IconButton';
import { EmailFaltasDialog } from './EmailFaltasDialog';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { MilitarRecord } from '../../services/firestoreMilitares';
import { faltasPendentesHNRe } from '../../utils/emailFaltasHNRe';

export interface BotaoEmailFaltasProps {
  inspecoes: InspecaoRecord[];
  militares: MilitarRecord[];
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const BotaoEmailFaltas: React.FC<BotaoEmailFaltasProps> = ({ inspecoes, militares, onAviso }) => {
  const [aberto, setAberto] = useState(false);
  const pendentes = useMemo(() => {
    const omPorId = new Map<string, string>(militares.map(m => [m.id, m.om]));
    return faltasPendentesHNRe(inspecoes, id => omPorId.get(id));
  }, [inspecoes, militares]);

  return (
    <>
      <IconButton
        variant="secondary" icon="unsubscribe" label="E-mail de faltas (HNRe)" badge={pendentes.length}
        disabled={pendentes.length === 0} onClick={() => setAberto(true)}
      />
      {aberto && (
        <EmailFaltasDialog
          pendentes={pendentes}
          onClose={() => setAberto(false)}
          onEnviado={(msg, tom) => { setAberto(false); onAviso(msg, tom); }}
        />
      )}
    </>
  );
};
