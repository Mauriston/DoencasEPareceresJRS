// Ficheiro: components/inspecoes/BotaoEnviarEmail.tsx
// Botão "Enviar Email" do cabeçalho de Inspeções de Saúde (imediatamente à esquerda de "Abrir IS"; Admin e
// Secretaria): menu suspenso com os e-mails da JRS e, à direita de cada item, quantos estão pendentes. O badge do
// botão soma as pendências de agendamento, resultado, faltas (HNRe) e NAC.
//  - E-mails de agendamento: IS de Verificações e Términos agendadas sem o e-mail daquela data (lista → envio individual).
//  - E-mails de resultado: IS finalizadas de Verificações e Términos ou Benefícios sem o resultado enviado (lista → envio individual).
//  - E-mail de faltas (HNRe): mantém a regra — desabilitado sem faltas pendentes.
//  - E-mail ao NAC: IS finalizadas de Verificações e Términos ainda não enviadas.
//  - IS agendadas do dia seguinte (só Admin): o envio manual do e-mail diário (sem contador).
import React, { useMemo, useState } from 'react';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { EmailFaltasDialog } from './EmailFaltasDialog';
import { EmailNacDialog } from './EmailNacDialog';
import { EscolherISDialog } from './EscolherISDialog';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { MilitarRecord } from '../../services/firestoreMilitares';
import { faltasPendentesHNRe } from '../../utils/emailFaltasHNRe';
import { pendentesNac } from '../../utils/emailNac';
import { agendamentoPendente } from '../../utils/emailAgendamentoIS';
import { resultadoPendente } from '../../utils/emailResultadoIS';
import { dataBr, dataHoraBr } from '../../utils/inspecoes';

export interface BotaoEnviarEmailProps {
  inspecoes: InspecaoRecord[];
  militares: MilitarRecord[];
  hoje: string;
  /** Mostra o item do e-mail das IS agendadas do dia seguinte (só Admin). */
  podeEmailAgenda: boolean;
  onEmailAgenda: () => void;
  /** Abre o envio do e-mail de agendamento da IS. */
  onEnviarAgendamento: (is: InspecaoRecord) => void;
  /** Abre o envio do e-mail de resultado da IS. */
  onEnviarResultado: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

type Aberto = 'agendamentos' | 'resultados' | 'faltas' | 'nac' | null;

export const BotaoEnviarEmail: React.FC<BotaoEnviarEmailProps> = ({ inspecoes, militares, hoje, podeEmailAgenda, onEmailAgenda, onEnviarAgendamento, onEnviarResultado, onAviso }) => {
  const [aberto, setAberto] = useState<Aberto>(null);
  const faltas = useMemo(() => {
    const omPorId = new Map<string, string>(militares.map(m => [m.id, m.om]));
    return faltasPendentesHNRe(inspecoes, id => omPorId.get(id));
  }, [inspecoes, militares]);
  const agendamentos = useMemo(
    () => inspecoes.filter(i => agendamentoPendente(i, hoje)).sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista)),
    [inspecoes, hoje],
  );
  const resultados = useMemo(
    () => inspecoes.filter(resultadoPendente).sort((a, b) => String(a.dataLaudo || '').localeCompare(String(b.dataLaudo || '')) || a.is - b.is),
    [inspecoes],
  );
  const nac = useMemo(() => pendentesNac(inspecoes), [inspecoes]);
  const total = agendamentos.length + resultados.length + faltas.length + nac.length;

  const itens: ItemMenu[] = [
    { rotulo: 'E-mails de agendamento', icone: 'forward_to_inbox', contador: agendamentos.length, desabilitado: agendamentos.length === 0, onClick: () => setAberto('agendamentos') },
    { rotulo: 'E-mails de resultado', icone: 'mark_email_unread', contador: resultados.length, desabilitado: resultados.length === 0, onClick: () => setAberto('resultados') },
    { rotulo: 'E-mail de faltas (HNRe)', icone: 'unsubscribe', contador: faltas.length, desabilitado: faltas.length === 0, onClick: () => setAberto('faltas') },
    { rotulo: 'Enviar e-mail NAC', icone: 'assignment_turned_in', contador: nac.length, desabilitado: nac.length === 0, onClick: () => setAberto('nac') },
    ...(podeEmailAgenda ? [{ rotulo: 'IS agendadas do dia seguinte', icone: 'outgoing_mail', onClick: onEmailAgenda }] : []),
  ];

  const fechar = (msg?: string, tom?: 'success' | 'error') => { setAberto(null); if (msg) onAviso(msg, tom); };

  return (
    <>
      <MenuAcoes rotulo="Enviar Email" botao={{ texto: 'Enviar Email', icone: 'mail', badge: total }} itens={itens} />
      {aberto === 'agendamentos' && (
        <EscolherISDialog
          titulo="E-mails de agendamento pendentes" icone="forward_to_inbox" pendentes={agendamentos}
          descricao="IS de Verificações e Términos agendadas (hoje ou depois) cujo e-mail de agendamento ao inspecionado ainda não foi enviado. O e-mail é individual: escolha a IS."
          vazio="Nenhum e-mail de agendamento pendente." detalhe={i => dataHoraBr(i.dataEntrevista)}
          onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarAgendamento(is); }}
        />
      )}
      {aberto === 'resultados' && (
        <EscolherISDialog
          titulo="E-mails de resultado pendentes" icone="mark_email_unread" pendentes={resultados}
          descricao="IS finalizadas de Verificações e Términos ou de Benefícios cujo resultado ainda não foi enviado ao inspecionado. O e-mail é individual: escolha a IS."
          vazio="Nenhum e-mail de resultado pendente." detalhe={i => `laudo ${dataBr(i.dataLaudo) || '—'}`}
          onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarResultado(is); }}
        />
      )}
      {aberto === 'faltas' && <EmailFaltasDialog pendentes={faltas} onClose={() => fechar()} onEnviado={fechar} />}
      {aberto === 'nac' && <EmailNacDialog pendentes={nac} onClose={() => fechar()} onEnviado={fechar} />}
    </>
  );
};
