// Ficheiro: config/notificacoesEmails.ts
// Notificação de e-mail enviado: a cada e-mail que o servidor envia pela conta Google da JRS, os usuários ativos
// Admin e Secretaria recebem um aviso (push + histórico do menu do avatar) — menos quem enviou. O e-mail automático
// "IS AGENDADAS" (Cloud Scheduler, 18h) avisa a todos eles. Usado por server.ts (rotaGoogle e
// /api/agendador/agenda-is); substitui os avisos que o app pedia (notificacoesAcoes.ts, `peloServidor`).
// Os textos não trazem nome de inspecionado nem de candidato. Os e-mails de teste e os de impressão não avisam.

/** Perfis avisados de cada e-mail enviado. */
export const PERFIS_AVISO_EMAIL = ['admin', 'user_secretaria'] as const;

export type AlvoEmail = 'is' | 'concurso' | 'nenhum';

export interface AvisoEmail {
  titulo: string;
  /** {ator} = quem enviou; {is} = número da IS; {concurso} = nome do concurso; {qtd} = quantas IS; {data} = DD/MM/AAAA. */
  texto: string;
  alvo: AlvoEmail;
}

/** Por rota do servidor (o 1º argumento de rotaGoogle em server.ts). */
export const AVISOS_EMAIL: Record<string, AvisoEmail> = {
  'email-agendamento-is': { titulo: 'E-mail de agendamento', texto: '{ator} enviou o e-mail de agendamento da IS {is}', alvo: 'is' },
  'email-resultado-is': { titulo: 'E-mail de resultado', texto: '{ator} enviou o e-mail de resultado da IS {is}', alvo: 'is' },
  'email-resultado-beneficios': { titulo: 'Resultado de Benefícios', texto: '{ator} enviou o e-mail de resultado de Benefícios da IS {is}', alvo: 'is' },
  'email-abertura-is': { titulo: 'E-mail de abertura', texto: '{ator} enviou o e-mail de abertura da IS {is}', alvo: 'is' },
  'email-guias-is': { titulo: 'Guias de exames', texto: '{ator} enviou por e-mail as guias de exames da IS {is}', alvo: 'is' },
  'email-faltas-hnre': { titulo: 'E-mail de faltas', texto: '{ator} enviou o e-mail de faltas do HNRe ({qtd})', alvo: 'nenhum' },
  'email-nac': { titulo: 'E-mail NAC', texto: '{ator} enviou o e-mail ao NAC ({qtd})', alvo: 'nenhum' },
  'email-inaptos-concurso': { titulo: 'E-mail dos inaptos', texto: '{ator} enviou o e-mail dos inaptos do {concurso}', alvo: 'concurso' },
  'email-agenda-is': { titulo: 'E-mail das IS agendadas', texto: '{ator} enviou o e-mail das IS agendadas em {data}', alvo: 'nenhum' },
};

/** Aviso do envio automático das 18h. */
export const AVISO_EMAIL_AGENDA_AUTOMATICO: AvisoEmail = {
  titulo: 'E-mail das IS agendadas', texto: 'O e-mail das IS agendadas em {data} foi enviado automaticamente', alvo: 'nenhum',
};

/** "{qtd}": "1 IS" / "3 IS". */
export const quantidadeIS = (n: number): string => `${n} IS`;

/** Preenche o modelo. */
export const textoAvisoEmail = (modelo: string, v: { ator?: string; is?: string; concurso?: string; qtd?: string; data?: string }): string =>
  modelo.replace('{ator}', v.ator || 'Usuário').replace('{is}', v.is || '').replace('{concurso}', v.concurso || '').replace('{qtd}', v.qtd || '').replace('{data}', v.data || '');
