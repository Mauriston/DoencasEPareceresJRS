// Ficheiro: utils/emailResultadoIS.ts
// Regra pura do e-mail "RESULTADO DE INSPEÇÃO DE SAÚDE" ao inspecionado (servidor/email/resultadoIS.ts; menu
// "Enviar Email" de Inspeções): só IS em situação "Finalizada" (não cancelada), das finalidades dos grupos
// Verificações e Términos e Benefícios, com laudo, ainda sem o e-mail (envio único).

const semAcento = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const GRUPOS_EMAIL_RESULTADO = ['verificacoes e terminos', 'beneficios'];

export interface ISParaResultado {
  situacao?: string;
  status?: string;
  grupoFinalidade?: string;
  laudo?: string;
  emailResultadoPara?: string;
}

/** IS finalizada (não cancelada) de Verificações e Términos ou Benefícios. */
export const elegivelResultado = (is: ISParaResultado): boolean =>
  (is.situacao === 'finalizada' || is.status === 'tis_assinado') && is.status !== 'cancelada'
  && GRUPOS_EMAIL_RESULTADO.includes(semAcento(is.grupoFinalidade || ''));

/** Pendente no menu "Enviar Email": elegível, com laudo e sem o e-mail enviado. */
export const resultadoPendente = (is: ISParaResultado): boolean =>
  elegivelResultado(is) && !!String(is.laudo || '').trim() && !is.emailResultadoPara;
