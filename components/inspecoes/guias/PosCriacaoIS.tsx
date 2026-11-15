// Ficheiro: components/inspecoes/guias/PosCriacaoIS.tsx
// Fluxo logo depois de abrir uma IS (Inspecoes.tsx → aoCriada), um dialog por vez:
//  1. finalidade com exames mínimos (ou que a IA pode casar com o Anexo O): gera as guias de exames
//     (GerarGuiasDialog, automático, com "Gerando guias…" e "Tentar de novo");
//  2. Admin e Secretaria (inspecoes.enviarEmails): confirmação do e-mail de ABERTURA ao inspecionado (toda IS);
//  3. se gerou guias (Admin e Secretaria): "Enviar guias por e-mail?" (EnviarGuiasDialog).
// Ao terminar chama onFim (a página então segue com a pergunta do e-mail de agendamento, quando a IS nasceu agendada).
import React, { useEffect, useState } from 'react';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import type { MilitarRecord } from '../../../services/firestoreMilitares';
import { emailDoInspecionado } from '../../../services/emailResultadoIS';
import { casarFinalidadeAnexoO, precisaIdentificarFinalidade } from '../../../utils/guiasExamesIS';
// TEMPORÁRIO: trocar por '../../../utils/guiasExames' (pacote A) depois do merge.
import { finalidadeTemExamesMinimos } from '../../../services/guiasExamesRegras';
import type { DadosInspecionadoIS } from '../InspecaoForm';
import { GerarGuiasDialog } from './GerarGuiasDialog';
import { EnviarAberturaDialog } from './EnviarAberturaDialog';
import { EnviarGuiasDialog } from './EnviarGuiasDialog';

interface Props {
  is: InspecaoRecord;
  militar: MilitarRecord | undefined;
  dados: DadosInspecionadoIS;
  /** Admin e Secretaria: e-mails de abertura e das guias. */
  podeEmails: boolean;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
  onFim: () => void;
}

type Etapa = 'guias' | 'abertura' | 'enviarGuias';

/** A finalidade gera guias (nome do Anexo O) ou pode gerar (a IA decide). */
export const deveTentarGuias = (is: Pick<InspecaoRecord, 'finalidade' | 'grupoFinalidade'>): boolean => {
  const f = casarFinalidadeAnexoO(is.finalidade);
  return (!!f && finalidadeTemExamesMinimos(f)) || precisaIdentificarFinalidade(is.finalidade, is.grupoFinalidade);
};

export const PosCriacaoIS: React.FC<Props> = ({ is, militar, dados, podeEmails, onAviso, onFim }) => {
  const [etapa, setEtapa] = useState<Etapa | null>(() => (deveTentarGuias(is) ? 'guias' : podeEmails ? 'abertura' : null));
  const [gerou, setGerou] = useState(false);
  const [emailInformado, setEmailInformado] = useState('');
  const emailCadastrado = emailInformado || emailDoInspecionado(militar);
  const comExamesMinimos = (() => { const f = casarFinalidadeAnexoO(is.finalidade); return gerou || (!!f && finalidadeTemExamesMinimos(f)); })();

  // Nada a fazer (perfil sem e-mails e finalidade sem guias): termina já.
  useEffect(() => { if (etapa === null) onFim(); }, [etapa]); // eslint-disable-line react-hooks/exhaustive-deps

  const aposGuias = (gerado: boolean) => { setGerou(gerado); setEtapa(podeEmails ? 'abertura' : null); };
  const aposAbertura = () => setEtapa(gerou && podeEmails ? 'enviarGuias' : null);

  if (etapa === 'guias') {
    return (
      <GerarGuiasDialog
        is={is} militar={militar} dados={dados} automatico
        onClose={() => aposGuias(false)}
        onConcluido={r => {
          if (r.gerado) onAviso(`Guias de exames da IS ${is.is} geradas.`);
          else if (r.motivo && !precisaIdentificarFinalidade(is.finalidade, is.grupoFinalidade)) onAviso(r.motivo, 'error');
          aposGuias(r.gerado);
        }}
      />
    );
  }
  if (etapa === 'abertura') {
    return (
      <EnviarAberturaDialog
        inspecao={is} emailCadastrado={emailCadastrado} comExamesMinimos={comExamesMinimos}
        onClose={aposAbertura}
        onEnviado={(msg, para) => { setEmailInformado(para); onAviso(msg); aposAbertura(); }}
      />
    );
  }
  if (etapa === 'enviarGuias') {
    return (
      <EnviarGuiasDialog
        inspecao={is} emailCadastrado={emailCadastrado} perguntar
        onClose={() => setEtapa(null)}
        onEnviado={msg => { onAviso(msg); setEtapa(null); }}
      />
    );
  }
  return null;
};
