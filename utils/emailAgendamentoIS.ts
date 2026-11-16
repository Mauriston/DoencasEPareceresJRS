// Ficheiro: utils/emailAgendamentoIS.ts
// Regras puras dos e-mails de AGENDAMENTO de IS ao inspecionado (servidor/email/agendamentoIS.ts; testes em
// utils/__tests__/emailAgendamentoIS.test.ts). Valem para TODOS os grupos de finalidade; o modelo sai do grupo:
//  - Verificações e Términos → 'agendamentoIS' (orientações de VDF/Términos, RDM, laudos e recurso);
//  - Benefícios              → 'agendamentoBeneficios' (documentação do Anexo V e orientações do dia);
//  - demais grupos           → 'agendamentoGeral' (vocativo e uma frase com a data e a hora).
// Só com data de entrevista, e um envio por data/hora agendada; quando a IS já teve e-mail para outra data/hora
// (ou o status é "reagendada"), a variante é 'reagendamento' (mesmo modelo, texto "foi reagendada para…").
import { emailDispensado, type EmailsDispensados } from './emailsDispensados';
import type { TipoEmail } from '../config/emails';
import { inspecionadoSemNip } from './emailGuiasIS';

export type TipoEmailAgendamento = Extract<TipoEmail, 'agendamentoIS' | 'agendamentoGeral' | 'agendamentoBeneficios'>;
export type VarianteAgendamento = 'agendamento' | 'reagendamento';

const semAcento = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Tipo (modelo) do e-mail de agendamento pelo grupo da finalidade. */
export const tipoEmailAgendamento = (grupoFinalidade: string | undefined): TipoEmailAgendamento => {
  const g = semAcento(grupoFinalidade || '');
  if (g === 'verificacoes e terminos') return 'agendamentoIS';
  if (g === 'beneficios') return 'agendamentoBeneficios';
  return 'agendamentoGeral';
};

/**
 * INSPECIONADO sem o NIP: "CT (Md) 12.3456.78 MAURISTON RENAN MARTINS SILVA" → "CT (Md) MAURISTON RENAN MARTINS SILVA".
 * Aceita o NIP com ou sem pontos (8 dígitos). Mesma função de utils/emailGuiasIS.ts (reexportada com o nome antigo).
 */
export const nomeInspecionado = inspecionadoSemNip;

/** "AGENDAMENTO DE IS FIM {finalidade} - {inspecionado sem NIP}" (o mesmo no reagendamento). */
export const assuntoAgendamento = (finalidade: string | undefined, inspecionado: string | undefined): string =>
  `AGENDAMENTO DE IS FIM ${String(finalidade || '').trim()} - ${nomeInspecionado(inspecionado)}`;

/** Vocativo pelo sexo do cadastro: "Prezado" / "Prezada" / "Prezado(a)" (sem sexo cadastrado). */
export const vocativoPorSexo = (sexo: string | undefined | null): string => {
  const s = semAcento(String(sexo || ''));
  if (s === 'masculino' || s === 'm') return 'Prezado';
  if (s === 'feminino' || s === 'f') return 'Prezada';
  return 'Prezado(a)';
};

export interface ISParaAgendamento {
  emailsDispensados?: EmailsDispensados | null;
  grupoFinalidade?: string;
  dataEntrevista?: string;
  status?: string;
  emailAgendamentoDataEntrevista?: string;
  emailAgendamentoPara?: string;
}

/** A IS tem entrevista marcada (data e hora) e não está cancelada — qualquer grupo de finalidade. */
export const ehElegivelAgendamento = (is: ISParaAgendamento): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(is.dataEntrevista || '')) && is.status !== 'cancelada';

/** O e-mail desta data/hora já foi enviado. */
export const agendamentoJaEnviado = (is: ISParaAgendamento): boolean =>
  !!is.emailAgendamentoDataEntrevista && is.emailAgendamentoDataEntrevista === is.dataEntrevista;

/** Reagendamento: já houve e-mail de agendamento para outra data/hora, ou o status é "reagendada". */
export const varianteAgendamento = (is: ISParaAgendamento): VarianteAgendamento =>
  is.status === 'reagendada' || (!!is.emailAgendamentoDataEntrevista && is.emailAgendamentoDataEntrevista !== is.dataEntrevista)
    ? 'reagendamento' : 'agendamento';

/** "2026-11-13T13:40" → { data: "13/11/2026", hora: "13:40" }. */
export const dataHoraDoAgendamento = (dataEntrevista: string): { data: string; hora: string } => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(dataEntrevista || ''));
  return m ? { data: `${m[3]}/${m[2]}/${m[1]}`, hora: `${m[4]}:${m[5]}` } : { data: '', hora: '' };
};

/**
 * Pendente no menu "Enviar e-mail" (badge): IS elegível, agendada ou reagendada para hoje ou depois e sem o e-mail
 * desta data/hora (`hoje` = AAAA-MM-DD). Entrevistas já passadas não contam.
 */
export const agendamentoPendente = (is: ISParaAgendamento, hoje: string): boolean =>
  ehElegivelAgendamento(is) && !agendamentoJaEnviado(is) && (is.status === 'agendada' || is.status === 'reagendada')
  && String(is.dataEntrevista || '').slice(0, 10) >= hoje && !emailDispensado('agendamento', is);
