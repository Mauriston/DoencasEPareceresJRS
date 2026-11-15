// Ficheiro: utils/confirmacaoAgendamentoIS.ts
// Regras puras do dialog de confirmação do e-mail de agendamento (components/inspecoes/EnviarAgendamentoDialog):
// que modelo o servidor usa pelo grupo da finalidade, se é a variante de reagendamento e quem recebe cópia.
// Espelha o contrato do pacote B2 (POST /api/email/agendamento-is vale para TODOS os grupos; tipoEmailAgendamento
// em utils/emailAgendamentoIS.ts): Verificações e Términos → agendamentoIS; Benefícios → agendamentoBeneficios;
// demais → agendamentoGeral. Reagendamento: já houve e-mail para outra data/hora, ou o status é "Reagendada".
// Testes em utils/__tests__/confirmacaoAgendamentoIS.test.ts.
import { EMAILS_DIVISAO_PESSOAL_HNRE, copiasPorOM, type TipoEmail } from '../config/emails';

export type TipoEmailAgendamento = Extract<TipoEmail, 'agendamentoIS' | 'agendamentoGeral' | 'agendamentoBeneficios'>;

const semAcento = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Modelo do e-mail de agendamento pelo grupo da finalidade. */
export const tipoEmailAgendamentoDoGrupo = (grupoFinalidade: string | undefined): TipoEmailAgendamento => {
  const g = semAcento(grupoFinalidade || '');
  if (g === 'verificacoes e terminos') return 'agendamentoIS';
  if (g === 'beneficios') return 'agendamentoBeneficios';
  return 'agendamentoGeral';
};

/** Rótulo curto do modelo no dialog. */
export const ROTULO_MODELO_AGENDAMENTO: Record<TipoEmailAgendamento, string> = {
  agendamentoIS: 'Verificações e Términos',
  agendamentoBeneficios: 'Benefícios',
  agendamentoGeral: 'Geral',
};

export interface ISParaReagendamento {
  status?: string;
  dataEntrevista?: string;
  emailAgendamentoDataEntrevista?: string;
}

/** O e-mail sai na variante "reagendamento": já houve e-mail para outra data/hora, ou a IS está Reagendada. */
export const ehReagendamentoEmail = (is: ISParaReagendamento): boolean =>
  is.status === 'reagendada'
  || (!!is.emailAgendamentoDataEntrevista && !!is.dataEntrevista && is.emailAgendamentoDataEntrevista !== is.dataEntrevista);

/**
 * Cópias pela OM do inspecionado (texto do dialog; a Secretaria da JRS sempre recebe): HNRe → Divisão de
 * Pessoal; EAMPE. Benefícios não tem cópia pela OM.
 */
export const copiasPorOMDoAgendamento = (tipo: TipoEmailAgendamento, om: string | undefined): string[] =>
  tipo === 'agendamentoBeneficios' ? [] : copiasPorOM(om);

/** Texto das cópias pela OM no dialog ('' sem cópia): "Divisão de Pessoal do HNRe" ou os e-mails (EAMPE). */
export const rotuloCopiasPorOM = (tipo: TipoEmailAgendamento, om: string | undefined): string => {
  const copias = copiasPorOMDoAgendamento(tipo, om);
  if (!copias.length) return '';
  return copias.join() === EMAILS_DIVISAO_PESSOAL_HNRE.join() ? 'Divisão de Pessoal do HNRe' : copias.join(', ');
};
