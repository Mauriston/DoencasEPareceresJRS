// Ficheiro: servidor/email/comum.ts
// Base comum dos e-mails da JRS no servidor:
//  - lerConfigEmails: config/emails do Firestore mesclado aos padrões (config/emails.ts);
//  - assinaturaDe: assinatura dinâmica — 1ª assinatura = quem disparou o e-mail ("Por ordem de:" + nome
//    completo, posto/graduação e cargo sem "JRS/HNRe", do cadastro em usuarios), salvo quando quem disparou
//    é o Admin ou o envio é automático (sem usuário): aí só a assinatura do Presidente;
//  - juntarEmails: une listas sem repetir (e sem repetir em CC/CCO quem já está antes).
// Placeholders da assinatura nos templates:
//   {{#mostrar_signatario}} … {{signatario_nome}} {{signatario_posto}} {{signatario_cargo}} … {{/mostrar_signatario}}
//   {{presidente_nome}} {{presidente_posto}}
import type { Firestore } from 'firebase-admin/firestore';
import { CONFIG_EMAILS_PADRAO, cargoSemJrs, mesclarConfigEmails, normalizarLista, type ConfigEmails, type TipoEmail, type DestinatariosEmail } from '../../config/emails';

export const lerConfigEmails = async (db: Firestore): Promise<ConfigEmails> => {
  const snap = await db.collection('config').doc('emails').get();
  return mesclarConfigEmails(snap.exists ? snap.data() : undefined);
};

export const destinatariosFixos = async (db: Firestore, tipo: TipoEmail): Promise<DestinatariosEmail & { responderPara: string; config: ConfigEmails }> => {
  const config = await lerConfigEmails(db);
  return { ...config.destinatarios[tipo], responderPara: config.responderPara, config };
};

export interface DadosAssinatura extends Record<string, string | boolean> {
  mostrar_signatario: boolean;
  signatario_nome: string;
  signatario_posto: string;
  signatario_cargo: string;
  presidente_nome: string;
  presidente_posto: string;
}

/** Só a assinatura do Presidente (Admin, envio automático e testes). */
export const assinaturaSemSignatario = (config: ConfigEmails = CONFIG_EMAILS_PADRAO): DadosAssinatura => ({
  mostrar_signatario: false, signatario_nome: '', signatario_posto: '', signatario_cargo: '',
  presidente_nome: config.assinatura.presidenteNome, presidente_posto: config.assinatura.presidentePosto,
});

/** Monta a assinatura a partir do usuário que disparou (uid) — null/'agendador' = envio automático. */
export const assinaturaDe = async (db: Firestore, uid: string | null, config?: ConfigEmails): Promise<DadosAssinatura> => {
  const cfg = config ?? await lerConfigEmails(db);
  const vazio = assinaturaSemSignatario(cfg);
  if (!uid || uid === 'agendador') return vazio;
  const u = (await db.collection('usuarios').doc(uid).get()).data() as { perfil?: string; nome?: string; postoGraduacao?: string; cargo?: string } | undefined;
  if (!u || u.perfil === 'admin' || !String(u.nome || '').trim()) return vazio;
  return {
    mostrar_signatario: true,
    signatario_nome: String(u.nome).trim(),
    signatario_posto: String(u.postoGraduacao || '').trim(),
    signatario_cargo: cargoSemJrs(u.cargo || ''),
    presidente_nome: vazio.presidente_nome,
    presidente_posto: vazio.presidente_posto,
  };
};

/** Texto simples da assinatura (versão text/plain dos e-mails). */
export const assinaturaTexto = (a: DadosAssinatura, fecho = 'Respeitosamente,'): string => [
  fecho, '',
  ...(a.mostrar_signatario ? ['Por ordem de:', a.signatario_nome, a.signatario_posto, a.signatario_cargo, ''] : []),
  a.presidente_nome, a.presidente_posto, 'Presidente',
].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');

/** Une listas de e-mails (normalizadas) sem repetir; `excluir` tira os que já estão em outra lista. */
export const juntarEmails = (listas: (string | string[] | undefined | null)[], excluir: string[] = []): string[] => {
  const fora = new Set(excluir.map(e => e.toLowerCase()));
  return normalizarLista(listas.flatMap(l => (Array.isArray(l) ? l : l ? [l] : []))).filter(e => !fora.has(e));
};
