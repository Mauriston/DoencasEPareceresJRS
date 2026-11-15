// Ficheiro: components/inspecoes/BotaoEnviarEmail.tsx
// Botão "Enviar e-mail" do cabeçalho de Inspeções de Saúde (imediatamente à esquerda de "Abrir IS"; Admin e
// Secretaria): menu suspenso com os e-mails da JRS e, à direita de cada item, quantos estão pendentes. O badge do
// botão soma as pendências de agendamento, resultado, resultado de Benefícios, faltas (HNRe) e NAC.
//  - E-mails de agendamento: IS (todos os grupos) agendadas ou reagendadas, de hoje em diante, sem o e-mail daquela
//    data (lista → dialog de confirmação, que diz se é agendamento ou reagendamento).
//  - E-mails de resultado: IS finalizadas de Verificações e Términos sem o resultado enviado (lista → envio individual).
//  - Resultado (Benefícios): IS de Benefícios finalizadas (TIS assinado) sem o e-mail de resultado de Benefícios
//    (lista → dialog com o modelo sugerido pela IA).
//  - E-mail de faltas (HNRe): mantém a regra — desabilitado sem faltas pendentes.
//  - E-mail ao NAC: IS finalizadas de Verificações e Términos ainda não enviadas.
//  - IS agendadas do dia seguinte (só Admin): o envio manual do e-mail diário (sem contador).
// useEmailsIS devolve os mesmos itens e diálogos para entrarem em outro menu (o ⋮ do cabeçalho de Inspeções —
// auditoria v3, 3b/M1); BotaoEnviarEmail é o botão "Enviar e-mail" com esses itens.
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
import { resultadoBeneficiosPendente } from '../../utils/resultadoBeneficiosIS';
import { ehReagendamentoEmail } from '../../utils/confirmacaoAgendamentoIS';
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
  /** Abre o envio do e-mail de resultado de Benefícios. */
  onEnviarResultadoBeneficios: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

type Aberto = 'agendamentos' | 'resultados' | 'beneficios' | 'faltas' | 'nac' | null;

/** Itens de e-mail (com contadores), o total de pendências e os diálogos que eles abrem (renderize `dialogos`). */
export const useEmailsIS = ({ inspecoes, militares, hoje, podeEmailAgenda, onEmailAgenda, onEnviarAgendamento, onEnviarResultado, onEnviarResultadoBeneficios, onAviso }: BotaoEnviarEmailProps): { itens: ItemMenu[]; total: number; dialogos: React.ReactNode } => {
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
  const beneficios = useMemo(
    () => inspecoes.filter(resultadoBeneficiosPendente).sort((a, b) => String(a.dataLaudo || '').localeCompare(String(b.dataLaudo || '')) || a.is - b.is),
    [inspecoes],
  );
  const nac = useMemo(() => pendentesNac(inspecoes), [inspecoes]);
  const total = agendamentos.length + resultados.length + beneficios.length + faltas.length + nac.length;

  const itens: ItemMenu[] = [
    { rotulo: 'E-mails de agendamento', icone: 'forward_to_inbox', contador: agendamentos.length, desabilitado: agendamentos.length === 0, onClick: () => setAberto('agendamentos') },
    { rotulo: 'E-mails de resultado', icone: 'mark_email_unread', contador: resultados.length, desabilitado: resultados.length === 0, onClick: () => setAberto('resultados') },
    { rotulo: 'Resultado (Benefícios)', icone: 'mark_email_unread', contador: beneficios.length, desabilitado: beneficios.length === 0, onClick: () => setAberto('beneficios') },
    { rotulo: 'E-mail de faltas (HNRe)', icone: 'unsubscribe', contador: faltas.length, desabilitado: faltas.length === 0, onClick: () => setAberto('faltas') },
    { rotulo: 'Enviar e-mail NAC', icone: 'assignment_turned_in', contador: nac.length, desabilitado: nac.length === 0, onClick: () => setAberto('nac') },
    ...(podeEmailAgenda ? [{ rotulo: 'IS agendadas do dia seguinte', icone: 'outgoing_mail', onClick: onEmailAgenda }] : []),
  ];

  const fechar = (msg?: string, tom?: 'success' | 'error') => { setAberto(null); if (msg) onAviso(msg, tom); };

  const dialogos = (
    <>
      {aberto === 'agendamentos' && (
        <EscolherISDialog
          titulo="E-mails de agendamento pendentes" icone="forward_to_inbox" pendentes={agendamentos}
          descricao="IS agendadas ou reagendadas (hoje ou depois) sem o e-mail daquela data ao inspecionado. Escolha a IS para conferir e enviar."
          vazio="Nenhum e-mail de agendamento pendente." detalhe={i => `${dataHoraBr(i.dataEntrevista)}${ehReagendamentoEmail(i) ? ' · reagendamento' : ''}`}
          onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarAgendamento(is); }}
        />
      )}
      {aberto === 'resultados' && (
        <EscolherISDialog
          titulo="E-mails de resultado pendentes" icone="mark_email_unread" pendentes={resultados}
          descricao="IS finalizadas de Verificações e Términos cujo resultado ainda não foi enviado ao inspecionado. O e-mail é individual: escolha a IS."
          vazio="Nenhum e-mail de resultado pendente." detalhe={i => `laudo ${dataBr(i.dataLaudo) || '—'}`}
          onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarResultado(is); }}
        />
      )}
      {aberto === 'beneficios' && (
        <EscolherISDialog
          titulo="Resultados de Benefícios pendentes" icone="mark_email_unread" pendentes={beneficios}
          descricao="IS de Benefícios finalizadas cujo resultado ainda não foi enviado ao inspecionado. Escolha a IS: a IA sugere o modelo e você confere antes de enviar."
          vazio="Nenhum resultado de Benefícios pendente." detalhe={i => `TIS ${i.tis || '—'}`}
          onClose={() => fechar()} onEscolher={is => { fechar(); onEnviarResultadoBeneficios(is); }}
        />
      )}
      {aberto === 'faltas' && <EmailFaltasDialog pendentes={faltas} onClose={() => fechar()} onEnviado={fechar} />}
      {aberto === 'nac' && <EmailNacDialog pendentes={nac} onClose={() => fechar()} onEnviado={fechar} />}
    </>
  );
  return { itens, total, dialogos };
};

export const BotaoEnviarEmail: React.FC<BotaoEnviarEmailProps> = props => {
  const { itens, total, dialogos } = useEmailsIS(props);
  return (
    <>
      <MenuAcoes rotulo="Enviar e-mail" botao={{ texto: 'Enviar e-mail', icone: 'mail', badge: total }} itens={itens} />
      {dialogos}
    </>
  );
};
