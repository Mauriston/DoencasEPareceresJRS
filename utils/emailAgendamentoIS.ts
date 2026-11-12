// Ficheiro: utils/emailAgendamentoIS.ts
// Regras puras do e-mail "AGENDAMENTO DE INSPEÇÃO DE SAÚDE" (servidor/email/agendamentoIS.ts; testes em
// utils/__tests__/emailAgendamentoIS.test.ts): SÓ as finalidades do grupo Verificações e Términos (VDF,
// Término de Incapacidade e de Restrições; decisão do Presidente da JRS), só com data de entrevista, e um envio por data/hora agendada (reagendada, pode enviar de novo).

export const ASSUNTO_AGENDAMENTO_IS = 'AGENDAMENTO DE INSPEÇÃO DE SAÚDE';

export type ModeloAgendamento = 'verificacoes';

const semAcento = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Só o grupo "Verificações e Términos" tem e-mail de agendamento; qualquer outro (inclusive Benefícios) → null. */
export const modeloDoGrupo = (grupoFinalidade: string | undefined): ModeloAgendamento | null =>
  semAcento(grupoFinalidade || '') === 'verificacoes e terminos' ? 'verificacoes' : null;

export interface ISParaAgendamento {
  grupoFinalidade?: string;
  dataEntrevista?: string;
  status?: string;
  emailAgendamentoDataEntrevista?: string;
  emailAgendamentoPara?: string;
}

/** A IS é do grupo Verificações e Términos e tem entrevista marcada (não cancelada). */
export const ehElegivelAgendamento = (is: ISParaAgendamento): boolean =>
  !!modeloDoGrupo(is.grupoFinalidade) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(is.dataEntrevista || '')) && is.status !== 'cancelada';

/** O e-mail desta data/hora já foi enviado. */
export const agendamentoJaEnviado = (is: ISParaAgendamento): boolean =>
  !!is.emailAgendamentoDataEntrevista && is.emailAgendamentoDataEntrevista === is.dataEntrevista;

/** "2026-11-13T13:40" → { data: "13/11/2026", hora: "13:40" }. */
export const dataHoraDoAgendamento = (dataEntrevista: string): { data: string; hora: string } => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(dataEntrevista || ''));
  return m ? { data: `${m[3]}/${m[2]}/${m[1]}`, hora: `${m[4]}:${m[5]}` } : { data: '', hora: '' };
};

/**
 * Pendente no menu "Enviar Email" (badge): IS elegível, agendada ou reagendada para hoje ou depois e sem o e-mail
 * desta data/hora (`hoje` = AAAA-MM-DD). Entrevistas já passadas não contam.
 */
export const agendamentoPendente = (is: ISParaAgendamento, hoje: string): boolean =>
  ehElegivelAgendamento(is) && !agendamentoJaEnviado(is) && (is.status === 'agendada' || is.status === 'reagendada')
  && String(is.dataEntrevista || '').slice(0, 10) >= hoje;
