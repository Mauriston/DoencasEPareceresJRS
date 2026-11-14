// Ficheiro: services/configEmails.ts
// Configuração dos e-mails automáticos (documento config/emails; contrato em config/emails.ts): leitura em
// tempo real e gravação pela Administração › E-mails automáticos. Regras: leitura para autenticados, gravação
// só do Admin (firestore.rules, match /config/{docId}). O servidor lê o documento a cada envio
// (servidor/email/comum.ts) e só lê os campos do contrato — os metadados abaixo (alteracoes, testesEnviados)
// são só para a tela mostrar "quem alterou e quando" de cada item.
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { registrarAcaoSensivel } from './auditoriaAcoes';
import { mesclarConfigEmails, type ConfigEmails } from '../config/emails';

const db = getFirestore(app);
const REF = doc(db, 'config', 'emails');

/** Item da lista de e-mails: um TipoEmail, 'geral' (Responder para e assinaturas) ou 'testes' (destinatários dos testes). */
export type ItemConfigEmail = string;

export interface MarcaAlteracao { por: string; em: Date | null }

export interface MetaConfigEmails {
  /** Última gravação do documento inteiro. */
  geral: MarcaAlteracao | null;
  /** Por item: última alteração salva. */
  alteracoes: Record<ItemConfigEmail, MarcaAlteracao>;
  /** Por tipo de e-mail: último teste enviado. */
  testesEnviados: Record<string, MarcaAlteracao>;
}

const marca = (v: unknown): MarcaAlteracao | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as { por?: unknown; em?: unknown };
  return { por: String(o.por || ''), em: o.em instanceof Timestamp ? o.em.toDate() : null };
};
const mapaMarcas = (v: unknown): Record<string, MarcaAlteracao> => {
  const r: Record<string, MarcaAlteracao> = {};
  if (v && typeof v === 'object') Object.entries(v as Record<string, unknown>).forEach(([k, x]) => { const m = marca(x); if (m) r[k] = m; });
  return r;
};

/** Configuração efetiva (documento salvo mesclado aos padrões). */
export const observarConfigEmails = (onData: (config: ConfigEmails, meta: MetaConfigEmails) => void, onError?: (e: Error) => void) =>
  onSnapshot(REF, snap => {
    const dados = snap.exists() ? snap.data() : undefined;
    const meta: MetaConfigEmails = {
      geral: dados?.atualizadoEm ? { por: String(dados.atualizadoPor || ''), em: dados.atualizadoEm instanceof Timestamp ? dados.atualizadoEm.toDate() : null } : null,
      alteracoes: mapaMarcas(dados?.alteracoes),
      testesEnviados: mapaMarcas(dados?.testesEnviados),
    };
    onData(mesclarConfigEmails(dados), meta);
  }, err => onError?.(err));

/**
 * Grava a configuração completa (todas as listas), com quem e quando — no documento e, por item alterado,
 * em `alteracoes.{item}`. `resumo` vai para o Registro de alterações (auditoria_acoes).
 */
export const salvarConfigEmails = async (config: ConfigEmails, usuario: string, itensAlterados: ItemConfigEmail[] = [], resumo: string[] = []): Promise<void> => {
  const alteracoes = Object.fromEntries(itensAlterados.map(i => [i, { por: usuario || '', em: serverTimestamp() }]));
  await setDoc(REF, { ...config, atualizadoEm: serverTimestamp(), atualizadoPor: usuario || '', ...(itensAlterados.length ? { alteracoes } : {}) }, { merge: true });
  void registrarAcaoSensivel('config.alterar', 'emails', resumo);
};

/** Marca o envio de um e-mail de teste (best effort). */
export const marcarTesteEnviado = async (tipo: string, usuario: string): Promise<void> => {
  try { await setDoc(REF, { testesEnviados: { [tipo]: { por: usuario || '', em: serverTimestamp() } } }, { merge: true }); } catch { /* best effort */ }
};
