// Ficheiro: utils/registroEmailsIS.ts
// Contrato do histórico de e-mails enviados de uma IS (seção "E-mails enviados" no detalhe da IS).
// O servidor grava um documento por envio em inspecoes/{isId}/emails/{autoId} (Admin SDK —
// servidor/email/registroEmailsIS.ts); o app só lê (firestore.rules: lê quem acessa as IS).
// Sem conteúdo do e-mail: só tipo, assunto, destinatários, quando e quem enviou. O conteúdo (HTML/texto) fica em
// emails_enviados/{conteudoId} (utils/emailsEnviados.ts), que só a equipe lê.
import type { TipoEmail } from '../config/emails';

export interface RegistroEmailIS {
  tipo: TipoEmail;
  /** Assunto como saiu. */
  assunto: string;
  para: string[];
  cc: string[];
  /** Variante do modelo, quando houver (ex.: 'reagendamento', 'nao_enquadramento'). */
  variante?: string;
  /** ms desde a época (Date.now() do servidor no envio). */
  enviadoEmMs: number;
  enviadoPor: { uid: string; usuario: string; nome?: string };
  /** Envio com conteúdo gravado: emails_enviados/{conteudoId} (ausente nos registros antigos). */
  conteudoId?: string;
}

export const ROTULO_TIPO_EMAIL_IS: Partial<Record<TipoEmail, string>> = {
  resultadoIS: 'Resultado da IS',
  agendamentoIS: 'Agendamento (Verificações e Términos)',
  agendamentoGeral: 'Agendamento',
  agendamentoBeneficios: 'Agendamento (Benefícios)',
  aberturaIS: 'Abertura da IS',
  guiasInspecionado: 'Guias dos exames ao inspecionado',
  guiasSecretaria: 'Guias dos exames à SEC-JRS',
  resultadoBeneficios: 'Resultado (Benefícios)',
  faltasHNRe: 'Comunicação de falta (HNRe)',
  nac: 'Comunicação ao NAC',
  agendaIS: 'IS agendadas do dia (interno)',
};
