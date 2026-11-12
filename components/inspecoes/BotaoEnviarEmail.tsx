// Ficheiro: components/inspecoes/BotaoEnviarEmail.tsx
// Botão "Enviar Email" do cabeçalho de Inspeções de Saúde (imediatamente à esquerda de "Abrir IS"; Admin e
// Secretaria): menu suspenso com os e-mails da JRS e, à direita de cada item, quantos estão pendentes. O badge do
// botão soma as pendências de agendamento, faltas (HNRe) e NAC.
//  - E-mails de agendamento: IS de Verificações e Términos agendadas sem o e-mail daquela data (lista → envio individual).
//  - E-mail de faltas (HNRe): mantém a regra — desabilitado sem faltas pendentes.
//  - E-mail ao NAC: IS finalizadas de Verificações e Términos ainda não enviadas.
//  - IS agendadas do dia seguinte (só Admin): o envio manual do e-mail diário (sem contador).
import React, { useMemo, useState } from 'react';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { EmailFaltasDialog } from './EmailFaltasDialog';
import { EmailNacDialog } from './EmailNacDialog';
import { AgendamentosPendentesDialog } from './AgendamentosPendentesDialog';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { MilitarRecord } from '../../services/firestoreMilitares';
import { faltasPendentesHNRe } from '../../utils/emailFaltasHNRe';
import { pendentesNac } from '../../utils/emailNac';
import { agendamentoPendente } from '../../utils/emailAgendamentoIS';

export interface BotaoEnviarEmailProps {
  inspecoes: InspecaoRecord[];
  militares: MilitarRecord[];
  hoje: string;
  /** Mostra o item do e-mail das IS agendadas do dia seguinte (só Admin). */
  podeEmailAgenda: boolean;
  onEmailAgenda: () => void;
  /** Abre o envio do e-mail de agendamento da IS (mesmo fluxo do menu ⋮). */
  onEnviarAgendamento: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

type Aberto = 'agendamentos' | 'faltas' | 'nac' | null;

export const BotaoEnviarEmail: React.FC<BotaoEnviarEmailProps> = ({ inspecoes, militares, hoje, podeEmailAgenda, onEmailAgenda, onEnviarAgendamento, onAviso }) => {
  const [aberto, setAberto] = useState<Aberto>(null);
  const faltas = useMemo(() => {
    const omPorId = new Map<string, string>(militares.map(m => [m.id, m.om]));
    return faltasPendentesHNRe(inspecoes, id => omPorId.get(id));
  }, [inspecoes, militares]);
  const agendamentos = useMemo(
    () => inspecoes.filter(i => agendamentoPendente(i, hoje)).sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista)),
    [inspecoes, hoje],
  );
  const nac = useMemo(() => pendentesNac(inspecoes), [inspecoes]);
  const total = agendamentos.length + faltas.length + nac.length;

  const itens: ItemMenu[] = [
    { rotulo: 'E-mails de agendamento', icone: 'forward_to_inbox', contador: agendamentos.length, desabilitado: agendamentos.length === 0, onClick: () => setAberto('agendamentos') },
    { rotulo: 'E-mail de faltas (HNRe)', icone: 'unsubscribe', contador: faltas.length, desabilitado: faltas.length === 0, onClick: () => setAberto('faltas') },
    { rotulo: 'Enviar e-mail NAC', icone: 'assignment_turned_in', contador: nac.length, desabilitado: nac.length === 0, onClick: () => setAberto('nac') },
    ...(podeEmailAgenda ? [{ rotulo: 'IS agendadas do dia seguinte', icone: 'outgoing_mail', onClick: onEmailAgenda }] : []),
  ];

  const fechar = (msg?: string, tom?: 'success' | 'error') => { setAberto(null); if (msg) onAviso(msg, tom); };

  return (
    <>
      <MenuAcoes rotulo="Enviar Email" botao={{ texto: 'Enviar Email', icone: 'mail', badge: total }} itens={itens} />
      {aberto === 'agendamentos' && (
        <AgendamentosPendentesDialog pendentes={agendamentos} onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarAgendamento(is); }} />
      )}
      {aberto === 'faltas' && <EmailFaltasDialog pendentes={faltas} onClose={() => fechar()} onEnviado={fechar} />}
      {aberto === 'nac' && <EmailNacDialog pendentes={nac} onClose={() => fechar()} onEnviado={fechar} />}
    </>
  );
};
