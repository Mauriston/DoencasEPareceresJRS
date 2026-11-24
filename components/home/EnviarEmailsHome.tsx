// Ficheiro: components/home/EnviarEmailsHome.tsx
// Início (Admin e Secretaria — função inspecoes.enviarEmails): menu "Enviar emails" com os e-mails da JRS e a pendência de
// cada lista (antes no cabeçalho de Inspeções de Saúde). Reúne o menu (useEmailsIS) e os diálogos de envio de agendamento,
// resultado e resultado de Benefícios. ?email=<tipo> (itens de e-mail do card "Pendências") abre o modal do tipo.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MenuAcoes } from '../ui/MenuAcoes';
import { SheetOpcoes } from '../ui/SheetOpcoes';
import { useEmailsIS } from '../inspecoes/BotaoEnviarEmail';
import { EnviarAgendamentoDialog } from '../inspecoes/EnviarAgendamentoDialog';
import { EnviarResultadoDialog } from '../inspecoes/EnviarResultadoDialog';
import { EnviarResultadoBeneficiosDialog } from '../inspecoes/emails/EnviarResultadoBeneficiosDialog';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { TipoEmailPendente } from '../../utils/emailsDispensados';
import type { MilitarRecord } from '../../services/firestoreMilitares';
import { emailDoInspecionado } from '../../services/emailResultadoIS';
import { ehTipoEmailPendente } from '../../utils/pendenciasEmailIS';
import { ehElegivelAgendamento, agendamentoJaEnviado } from '../../utils/emailAgendamentoIS';

interface Props {
  inspecoes: InspecaoRecord[];
  militares: MilitarRecord[];
  hoje: string;
  /** Admin: "Limpar" nos modais. */
  podeLimpar: boolean;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
  /** Celular: sem o botão ▾ — as opções abrem num bottom sheet acionado pelo FAB da Início. */
  sheet?: { aberto: boolean; onFechar: () => void };
  /** Ficha do inspecionado: só os e-mails individuais, sem itens desabilitados; sem pendência, o botão fica desabilitado. */
  tipos?: TipoEmailPendente[];
  somentePendentes?: boolean;
}

export const EnviarEmailsHome: React.FC<Props> = ({ inspecoes, militares, hoje, podeLimpar, onAviso, sheet, tipos, somentePendentes }) => {
  const [params, setParams] = useSearchParams();
  const [agendando, setAgendando] = useState<InspecaoRecord | null>(null);
  const [enviandoResultado, setEnviandoResultado] = useState<InspecaoRecord | null>(null);
  const [enviandoBeneficios, setEnviandoBeneficios] = useState<InspecaoRecord | null>(null);
  const emails = useEmailsIS({
    inspecoes, militares, hoje, podeLimpar,
    onEnviarAgendamento: setAgendando, onEnviarResultado: setEnviandoResultado, onEnviarResultadoBeneficios: setEnviandoBeneficios, onAviso, tipos, somentePendentes,
  });
  const militarDe = (is: InspecaoRecord) => militares.find(m => m.id === is.inspecionadoId);

  // ?email=tipo: espera as IS (e, nas faltas do HNRe, os inspecionados, que dão a OM) para o modal abrir com a lista.
  const emailParam = params.get('email');
  useEffect(() => {
    if (!emailParam) return;
    if (ehTipoEmailPendente(emailParam)) {
      if (!inspecoes.length || (emailParam === 'faltas' && !militares.length)) return;
      emails.abrir(emailParam);
    }
    const resto = new URLSearchParams(params); resto.delete('email'); setParams(resto, { replace: true });
  }, [emailParam, inspecoes.length, militares.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {sheet ? (sheet.aberto && <SheetOpcoes titulo="Enviar emails" icone="mail" itens={emails.itens} onClose={sheet.onFechar} />) : <MenuAcoes rotulo="Enviar emails" botao={{ texto: 'Enviar emails', icone: 'mail', badge: emails.total, desabilitado: !!somentePendentes && emails.itens.length === 0 }} itens={emails.itens} classeGatilho="w-full sm:w-auto" />}
      {emails.dialogos}
      {agendando && ehElegivelAgendamento(agendando) && !agendamentoJaEnviado(agendando) && (
        <EnviarAgendamentoDialog
          inspecao={agendando} origem="menu" om={militarDe(agendando)?.om}
          emailCadastrado={emailDoInspecionado(militarDe(agendando))}
          onClose={() => setAgendando(null)} onEnviado={(msg, tom) => { setAgendando(null); onAviso(msg, tom); }}
        />
      )}
      {enviandoResultado && (
        <EnviarResultadoDialog
          inspecao={enviandoResultado} emailCadastrado={emailDoInspecionado(militarDe(enviandoResultado))}
          onClose={() => setEnviandoResultado(null)} onEnviado={(msg, tom) => { setEnviandoResultado(null); onAviso(msg, tom); }}
        />
      )}
      {enviandoBeneficios && (
        <EnviarResultadoBeneficiosDialog
          inspecao={inspecoes.find(i => i.id === enviandoBeneficios.id) ?? enviandoBeneficios} militar={militarDe(enviandoBeneficios)}
          emailCadastrado={emailDoInspecionado(militarDe(enviandoBeneficios))}
          onClose={() => setEnviandoBeneficios(null)} onEnviado={(msg, tom) => { setEnviandoBeneficios(null); onAviso(msg, tom); }}
        />
      )}
    </>
  );
};
