// Ficheiro: services/chat.ts
// Chat entre usuários (Firestore + Storage). Independente das mensagens das IS (services/mensagensIS.ts).
//   conversas/{a_b}                 participantes, ultimaMensagem, atualizadaEm, naoLidas{uid: n}
//   conversas/{a_b}/mensagens/{id}  autor, texto, em, anexo?{nome, caminho, url, tipo, mime, tamanho, enviadoEm},
//                                   anexoRemovido?{motivo, tipo, em}, lidaPor[uid]
//   presenca/{uid}                  ultimaAtividade (heartbeat a cada ~60 s; utils/chat.ts → estaOnline)
//   config/chat                     perfis{perfil: {enviar, receber, anexos}} (Administração › Chat)
//   Storage conversas/{a_b}/{ts}_{nome}
// As regras (firestore.rules/storage.rules) aplicam participantes, permissões por perfil, tipo e tamanho.
// O push ao destinatário sai pelo servidor (/api/chat/notificar → enviarPush); offline, a mensagem fica
// guardada e o push avisa. A limpeza dos anexos com 7 dias roda no agendador (servidor/chat/retencaoAnexos.ts).
import {
  getFirestore, collection, doc, onSnapshot, query, where, orderBy, limit, writeBatch, setDoc, updateDoc,
  deleteDoc, serverTimestamp, increment, arrayUnion, deleteField, Timestamp, getDoc,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseAuth';
import { chamarServidor } from './apiClient';
import {
  idConversa, nomeArquivoSeguro, participantesDe, tipoAnexo, tipoMensagem, validarAnexo, previaMensagem,
  type MatrizChat, type TipoAnexo, type TipoMensagem, TEXTO_MAX,
} from '../utils/chat';

const db = getFirestore(app);

export interface AnexoChat { nome: string; caminho: string; url: string; tipo: TipoAnexo; mime: string; tamanho: number; enviadoEm: Timestamp | null }
export interface MensagemChat {
  id: string;
  autor: string;
  texto: string;
  em: Date | null;
  anexo?: AnexoChat | null;
  anexoRemovido?: { motivo: 'expirado' | 'moderacao'; tipo: TipoAnexo; em?: Timestamp } | null;
  lidaPor: string[];
  /** Ainda não confirmada pelo servidor (escrita local). */
  pendente?: boolean;
}
export interface ConversaChat {
  id: string;
  participantes: string[];
  naoLidas: Record<string, number>;
  ultimaMensagem: { autor: string; tipo: TipoMensagem; previa: string; emMs: number } | null;
  atualizadaEmMs: number;
}

const ms = (t: any): number => (t?.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : 0);

// ---- Permissões (config/chat) ----
export const observarConfigChat = (cb: (m: MatrizChat | null) => void): (() => void) =>
  onSnapshot(doc(db, 'config', 'chat'), s => cb(s.exists() ? ((s.data().perfis || {}) as MatrizChat) : null), () => cb(null));
export const salvarConfigChat = (perfis: MatrizChat): Promise<void> =>
  setDoc(doc(db, 'config', 'chat'), { perfis, alteradoEm: serverTimestamp() });

// ---- Conversas ----
export const observarConversas = (uid: string, cb: (l: ConversaChat[]) => void, onErro?: (e: Error) => void): (() => void) =>
  onSnapshot(
    query(collection(db, 'conversas'), where('participantes', 'array-contains', uid)),
    snap => cb(snap.docs.map(d => {
      const x = d.data();
      const u = x.ultimaMensagem;
      return {
        id: d.id,
        participantes: x.participantes || participantesDe(d.id),
        naoLidas: x.naoLidas || {},
        ultimaMensagem: u ? { autor: u.autor, tipo: u.tipo || 'texto', previa: u.previa || '', emMs: ms(u.em) || ms(x.atualizadaEm) } : null,
        atualizadaEmMs: ms(x.atualizadaEm),
      };
    }).sort((a, b) => b.atualizadaEmMs - a.atualizadaEmMs)),
    e => onErro?.(e),
  );

export const observarMensagens = (conversaId: string, cb: (l: MensagemChat[]) => void, onErro?: (e: Error) => void, max = 200): (() => void) =>
  onSnapshot(
    query(collection(db, 'conversas', conversaId, 'mensagens'), orderBy('em', 'desc'), limit(max)),
    { includeMetadataChanges: true },
    snap => cb(snap.docs.map(d => {
      const x = d.data({ serverTimestamps: 'estimate' });
      return {
        id: d.id, autor: x.autor, texto: x.texto || '', em: x.em?.toDate?.() || null, anexo: x.anexo || null,
        anexoRemovido: x.anexoRemovido || null, lidaPor: x.lidaPor || [], pendente: d.metadata.hasPendingWrites,
      };
    }).reverse()),
    e => onErro?.(e),
  );

/** Envia texto e/ou um anexo. Não depende de o destinatário estar online: fica gravado e o servidor manda o push. */
export const enviarMensagem = async (remetente: string, destinatario: string, texto: string, arquivo?: File | null): Promise<void> => {
  const conversaId = idConversa(remetente, destinatario);
  const t = texto.trim().slice(0, TEXTO_MAX);
  if (!t && !arquivo) return;
  const msgRef = doc(collection(db, 'conversas', conversaId, 'mensagens'));
  let anexo: Omit<AnexoChat, 'enviadoEm'> & { enviadoEm: any } | null = null;
  if (arquivo) {
    const erro = validarAnexo(arquivo);
    if (erro) throw new Error(erro);
    // A conversa precisa existir antes do upload (storage.rules lê os participantes pelo id).
    await garantirConversa(conversaId);
    const caminho = `conversas/${conversaId}/${msgRef.id}_${nomeArquivoSeguro(arquivo.name)}`;
    const r = ref(getStorage(app), caminho);
    await uploadBytes(r, arquivo, { contentType: arquivo.type });
    anexo = { nome: arquivo.name.slice(0, 120), caminho, url: await getDownloadURL(r), tipo: tipoAnexo(arquivo.type)!, mime: arquivo.type, tamanho: arquivo.size, enviadoEm: serverTimestamp() };
  }
  const tipo = tipoMensagem(anexo?.tipo);
  const batch = writeBatch(db);
  batch.set(doc(db, 'conversas', conversaId), {
    participantes: participantesDe(conversaId),
    ultimaMensagem: { autor: remetente, tipo, previa: previaMensagem(t, tipo), em: serverTimestamp() },
    atualizadaEm: serverTimestamp(),
    naoLidas: { [destinatario]: increment(1), [remetente]: 0 },
  }, { merge: true });
  batch.set(msgRef, { autor: remetente, texto: t, em: serverTimestamp(), lidaPor: [remetente], ...(anexo ? { anexo } : {}) });
  await batch.commit();
  // Push ao destinatário (o servidor confere autor, participantes e permissões). Falha aqui não desfaz o envio.
  chamarServidor('/api/chat/notificar', { conversaId, mensagemId: msgRef.id }, { timeoutMs: 20_000 }).catch(() => {});
};

const garantirConversa = async (conversaId: string) => {
  const r = doc(db, 'conversas', conversaId);
  if ((await getDoc(r)).exists()) return;
  await setDoc(r, { participantes: participantesDe(conversaId), naoLidas: {}, ultimaMensagem: null, atualizadaEm: serverTimestamp() }, { merge: true });
};

/** Abriu a conversa: zera as não lidas e marca as mensagens do outro como lidas (recibo de leitura). */
export const marcarComoLidas = async (conversaId: string, uid: string, mensagens: MensagemChat[], naoLidas: number): Promise<void> => {
  const pendentes = mensagens.filter(m => m.autor !== uid && !m.pendente && !m.lidaPor.includes(uid));
  if (!pendentes.length && !naoLidas) return;
  const batch = writeBatch(db);
  pendentes.slice(-400).forEach(m => batch.update(doc(db, 'conversas', conversaId, 'mensagens', m.id), { lidaPor: arrayUnion(uid) }));
  if (naoLidas) batch.update(doc(db, 'conversas', conversaId), { [`naoLidas.${uid}`]: 0 });
  await batch.commit();
};

// ---- Moderação (Admin) ----
export const apagarMensagem = async (conversaId: string, m: MensagemChat): Promise<void> => {
  if (m.anexo?.caminho) await deleteObject(ref(getStorage(app), m.anexo.caminho)).catch(() => { /* já removido */ });
  await deleteDoc(doc(db, 'conversas', conversaId, 'mensagens', m.id));
};
export const apagarAnexo = async (conversaId: string, m: MensagemChat): Promise<void> => {
  if (!m.anexo) return;
  await deleteObject(ref(getStorage(app), m.anexo.caminho)).catch(() => { /* já removido */ });
  await updateDoc(doc(db, 'conversas', conversaId, 'mensagens', m.id), {
    anexo: deleteField(), anexoRemovido: { motivo: 'moderacao', tipo: m.anexo.tipo, em: serverTimestamp() },
  });
};

// ---- Presença (heartbeat) ----
export const registrarAtividade = (uid: string): Promise<void> =>
  setDoc(doc(db, 'presenca', uid), { ultimaAtividade: serverTimestamp() });
export const observarPresenca = (cb: (p: Record<string, number>) => void): (() => void) =>
  onSnapshot(collection(db, 'presenca'), snap => {
    const r: Record<string, number> = {};
    snap.docs.forEach(d => { r[d.id] = ms(d.data({ serverTimestamps: 'estimate' }).ultimaAtividade); });
    cb(r);
  }, () => cb({}));
