// Ficheiro: servidor/email/registroEmailsIS.ts
// Base comum (servidor) dos registros de envio:
//  - registrarEmailIS: o envio com o CONTEÚDO (HTML e texto como saíram; sem anexos) uma vez em
//    emails_enviados/{id} (+ conteudo/corpo — contrato em utils/emailsEnviados.ts; lido pela aba Emails da Ficha,
//    só pela equipe) e um documento por IS em inspecoes/{isId}/emails/{autoId} com o conteudoId (contrato em
//    utils/registroEmailsIS.ts), lido pela seção "E-mails enviados" do detalhe da IS. E-mails em lote (NAC,
//    faltas, agenda do dia): um só conteúdo, ligado a todas as IS e NIPs do lote;
//  - registrarEmailEnviado: só o emails_enviados (envios ligados a um NIP sem histórico de IS — ex.: pedido de
//    impressão do parecer);
//  - registrarUsoServidor: contagem agregada no uso_diario/{AAAA-MM-DD} para a seção "Uso do app" do Painel
//    (emailsPorTipo.{tipo} e guiasGeradas). Só contagens, nunca conteúdo;
//  - institucionaisSecretaria: e-mails institucionais (@marinha.mil.br) dos user_secretaria ativos (CC dinâmico).
// Tudo "best effort" nos registros: uma falha aqui nunca derruba um envio que já saiu.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { TipoEmail } from '../../config/emails';
import type { RegistroEmailIS } from '../../utils/registroEmailsIS';
import {
  COL_EMAILS_ENVIADOS, DOC_CORPO, SUB_CONTEUDO, nipsValidos, prepararCorpoParaRegistro,
  type EmailEnviado, type TipoEmailEnviado,
} from '../../utils/emailsEnviados';
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

/** O que o envio registra: metadados e, quando houver, o corpo como saiu (html/texto) e o nome do anexo. */
export interface EnvioRegistrado {
  tipo: TipoEmailEnviado; assunto: string; para: string[]; cc?: string[]; variante?: string;
  html?: string; texto?: string; anexo?: string;
}

/**
 * Grava o envio em emails_enviados/{id} (metadados + conteudo/corpo) e devolve o id ('' na falha). Nunca lança.
 * `enviadoPor` já resolvido evita reler o usuário quando o chamador o tem.
 */
export const registrarEmailEnviado = async (
  db: Firestore, uid: string | null, envio: EnvioRegistrado,
  vinculos: { nips: unknown[]; isIds?: string[] }, enviadoPor?: RegistroEmailIS['enviadoPor'],
): Promise<string> => {
  try {
    const corpo = prepararCorpoParaRegistro(envio.html, envio.texto);
    const temConteudo = !!(corpo.html || corpo.texto);
    const doc: EmailEnviado = {
      tipo: envio.tipo, assunto: envio.assunto, para: envio.para, cc: envio.cc ?? [],
      ...(envio.variante ? { variante: envio.variante } : {}),
      ...(envio.anexo ? { anexo: envio.anexo } : {}),
      nips: nipsValidos(vinculos.nips), isIds: [...new Set((vinculos.isIds ?? []).map(String))],
      temConteudo, enviadoEmMs: Date.now(), enviadoPor: enviadoPor ?? await quemEnviou(db, uid),
    };
    const ref = db.collection(COL_EMAILS_ENVIADOS).doc();
    const lote = db.batch();
    lote.set(ref, doc);
    if (temConteudo) lote.set(ref.collection(SUB_CONTEUDO).doc(DOC_CORPO), corpo);
    await lote.commit();
    return ref.id;
  } catch {
    return '';
  }
};

/**
 * Grava o envio no histórico de cada IS (com o conteúdo uma vez só em emails_enviados) e conta no uso do app
 * (uma vez por IS; `contarUso: false` quando o chamador já conta o envio — ex.: agenda do dia). Nunca lança.
 */
export const registrarEmailIS = async (
  db: Firestore, isIdOuIds: string | string[], uid: string | null,
  envio: EnvioRegistrado & { tipo: TipoEmail }, opcoes: { contarUso?: boolean } = {},
): Promise<void> => {
  const isIds = [...new Set((Array.isArray(isIdOuIds) ? isIdOuIds : [isIdOuIds]).map(String).filter(Boolean))];
  try {
    const enviadoPor = await quemEnviou(db, uid);
    // NIPs dos inspecionados das IS (para a aba Emails da Ficha).
    const docs = isIds.length ? await db.getAll(...isIds.map(id => db.collection('inspecoes').doc(id))) : [];
    const nips = docs.map(d => (d.data() as { inspecionadoId?: string } | undefined)?.inspecionadoId);
    const conteudoId = await registrarEmailEnviado(db, uid, envio, { nips, isIds }, enviadoPor);
    const registro: RegistroEmailIS = {
      tipo: envio.tipo, assunto: envio.assunto, para: envio.para, cc: envio.cc ?? [],
      ...(envio.variante ? { variante: envio.variante } : {}),
      enviadoEmMs: Date.now(), enviadoPor, ...(conteudoId ? { conteudoId } : {}),
    };
    await Promise.all(isIds.map(isId => db.collection('inspecoes').doc(isId).collection('emails').add(registro)));
  } catch { /* best effort */ }
  if (opcoes.contarUso !== false) await Promise.all(isIds.map(() => registrarUsoServidor(db, uid, { email: envio.tipo })));
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
