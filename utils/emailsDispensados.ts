// Ficheiro: utils/emailsDispensados.ts
// "Limpar" dos modais de e-mails pendentes (menu "Enviar e-mails" de Inspeções; só Admin): tira a IS da lista de
// pendências daquele tipo de e-mail sem enviá-lo. Fica gravado na IS em emailsDispensados.{tipo} = chave:
//  - agendamento e faltas valem para a data/hora da entrevista dispensada (um reagendamento ou uma nova falta
//    voltam a ficar pendentes);
//  - resultado, resultado de Benefícios e NAC acontecem uma vez por IS (chave "sim").

export type TipoEmailPendente = 'agendamento' | 'resultado' | 'beneficios' | 'faltas' | 'nac';

export type EmailsDispensados = Partial<Record<TipoEmailPendente, string>>;

export interface ISComDispensa {
  dataEntrevista?: string;
  emailsDispensados?: EmailsDispensados | null;
}

/** Chave gravada ao dispensar o e-mail `tipo` da IS. */
export const chaveDispensa = (tipo: TipoEmailPendente, is: ISComDispensa): string =>
  tipo === 'agendamento' || tipo === 'faltas' ? String(is.dataEntrevista || '') : 'sim';

/** O e-mail `tipo` desta IS foi tirado da lista de pendências (e a dispensa ainda vale). */
export const emailDispensado = (tipo: TipoEmailPendente, is: ISComDispensa): boolean => {
  const v = is.emailsDispensados?.[tipo];
  return !!v && v === chaveDispensa(tipo, is);
};
