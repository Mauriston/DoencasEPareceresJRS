// Ficheiro: servidor/email/registroEmailsIS.ts
// Base comum (servidor) dos registros de envio:
//  - registrarEmailIS: um documento por envio em inspecoes/{isId}/emails/{autoId} (contrato em
//    utils/registroEmailsIS.ts), lido pela seção "E-mails enviados" do detalhe da IS;
//  - registrarUsoServidor: contagem agregada no uso_diario/{AAAA-MM-DD} para a seção "Uso do app" do Painel
//    (emailsPorTipo.{tipo} e guiasGeradas). Só contagens, nunca conteúdo;
//  - institucionaisSecretaria: e-mails institucionais (@marinha.mil.br) dos user_secretaria ativos (CC dinâmico).
// Tudo "best effort" nos registros: uma falha aqui nunca derruba um envio que já saiu.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { TipoEmail } from '../../config/emails';
import type { RegistroEmailIS } from '../../utils/registroEmailsIS';
import { ehInstitucional } from '../../utils/emailAgendaIS';

/** AAAA-MM-DD de hoje em Recife (id do documento de uso_diario). */
export const hojeRecife = (agora: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);

/** Nome de usuário (login) e nome completo de quem disparou; vazio no envio automático. */
export const quemEnviou = async (db: Firestore, uid: string | null): Promise<RegistroEmailIS['enviadoPor']> => {
  if (!uid || uid === 'agendador') return { uid: uid || 'automatico', usuario: 'Automático' };
  const u = (await db.collection('usuarios').doc(uid).get()).data() as { usuario?: string; nome?: string } | undefined;
  return { uid, usuario: String(u?.usuario || '').trim() || 'Usuário', ...(u?.nome ? { nome: String(u.nome).trim() } : {}) };
};

/** Grava o envio no histórico da IS e conta no uso do app. Nunca lança. */
export const registrarEmailIS = async (
  db: Firestore, isId: string, uid: string | null,
  envio: { tipo: TipoEmail; assunto: string; para: string[]; cc?: string[]; variante?: string },
): Promise<void> => {
  try {
    const registro: RegistroEmailIS = {
      tipo: envio.tipo, assunto: envio.assunto, para: envio.para, cc: envio.cc ?? [],
      ...(envio.variante ? { variante: envio.variante } : {}),
      enviadoEmMs: Date.now(), enviadoPor: await quemEnviou(db, uid),
    };
    await db.collection('inspecoes').doc(String(isId)).collection('emails').add(registro);
  } catch { /* best effort */ }
  await registrarUsoServidor(db, uid, { email: envio.tipo });
};

/**
 * Contagem no uso_diario do dia (seção "Uso do app" do Painel): `email` → emailsPorTipo.{tipo} +1 (e a ação
 * email_enviar do usuário, quando há usuário); `guias` → guiasGeradas +1 (e documento_gerar do usuário). Nunca lança.
 */
export const registrarUsoServidor = async (db: Firestore, uid: string | null, o: { email?: TipoEmail; guias?: boolean }): Promise<void> => {
  try {
    const dados: Record<string, unknown> = {};
    const humano = uid && uid !== 'agendador' ? uid : '';
    if (o.email) {
      dados.emailsPorTipo = { [o.email]: FieldValue.increment(1) };
      if (humano) dados.acoesPorUsuario = { [humano]: { email_enviar: FieldValue.increment(1) } };
    }
    if (o.guias) {
      dados.guiasGeradas = FieldValue.increment(1);
      if (humano) dados.acoesPorUsuario = { [humano]: { documento_gerar: FieldValue.increment(1) } };
    }
    if (Object.keys(dados).length) await db.collection('uso_diario').doc(hojeRecife()).set(dados, { merge: true });
  } catch { /* best effort */ }
};

/** E-mails institucionais dos user_secretaria ativos (para CC). `uids` limita aos escolhidos. */
export const institucionaisSecretaria = async (db: Firestore, uids?: string[]): Promise<{ uid: string; usuario: string; nome: string; email: string }[]> => {
  const snap = await db.collection('usuarios').where('perfil', '==', 'user_secretaria').get();
  return snap.docs
    .map(d => ({ uid: d.id, ...(d.data() as { usuario?: string; nome?: string; email?: string; ativo?: boolean }) }))
    .filter(u => u.ativo !== false && ehInstitucional(String(u.email || '')) && (!uids || uids.includes(u.uid)))
    .map(u => ({ uid: u.uid, usuario: String(u.usuario || ''), nome: String(u.nome || ''), email: String(u.email).trim().toLowerCase() }));
};
