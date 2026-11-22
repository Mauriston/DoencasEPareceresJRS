// Ficheiro: services/mensagensIS.ts
// Mensagens tramitadas registradas a partir da minuta de uma IS concluída ("Minutar MSG" › "Ver minuta e registrar
// mensagem tramitada", Ficha do inspecionado). Coleção "mensagensIS" (um doc por mensagem, id UUID): liga à IS
// (isId/is) e ao inspecionado (inspecionadoId = NIP só dígitos, para o histórico da aba Mensagens); os campos da
// minuta ficam em texto e não mudam depois. Regras em firestore.rules; o servidor apaga junto com a IS.
import { getFirestore, collection, doc, query, where, onSnapshot, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { novoId } from '../utils/dados';
import { registrarEventoInspecionado } from './eventosInspecionado';
import type { CamposMsgIS } from '../utils/mensagensIS';

const db = getFirestore(app);
const COL = 'mensagensIS';

export interface MensagemISDoc extends CamposMsgIS {
  isId: string;
  is: number;
  inspecionadoId: string;
  finalidade: string;
  registradoPor: { uid: string; usuario: string };
  registradoEm: Timestamp | null;
}
export type MensagemISRecord = MensagemISDoc & { id: string };

/** Mensagens do inspecionado, da mais recente para a mais antiga (histórico da aba Mensagens). */
export const observarMensagensDoInspecionado = (inspecionadoId: string, onData: (lista: MensagemISRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    query(collection(db, COL), where('inspecionadoId', '==', inspecionadoId)),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as MensagemISDoc) }))
      .sort((a, b) => (b.registradoEm?.toMillis?.() ?? Date.now()) - (a.registradoEm?.toMillis?.() ?? Date.now()))),
    err => onError?.(err),
  );

/** Registra a mensagem tramitada (em nome de quem registra, com a hora do servidor). Devolve o id. */
export const registrarMensagemIS = async (
  is: { id: string; is: number; inspecionadoId: string; finalidade: string }, campos: CamposMsgIS, quem: { uid: string; usuario: string },
): Promise<string> => {
  const id = novoId();
  await setDoc(doc(db, COL, id), {
    isId: is.id, is: is.is, inspecionadoId: is.inspecionadoId, finalidade: is.finalidade || '',
    de: campos.de, para: campos.para, info: campos.info, assunto: campos.assunto, texto: campos.texto,
    registradoPor: { uid: quem.uid, usuario: quem.usuario }, registradoEm: serverTimestamp(),
  });
  registrarEventoInspecionado(is.inspecionadoId, 'is.mensagem', `IS ${is.id}`);
  return id;
};

/** Ids das IS que já têm mensagem de resultado registrada (pendência "IS finalizada sem minuta MSG" da Início). */
export const observarIdsISComMensagem = (onData: (ids: Set<string>) => void, onError?: (e: Error) => void) =>
  onSnapshot(collection(db, COL), snap => onData(new Set(snap.docs.map(d => String(d.data().isId || '')).filter(Boolean))), err => onError?.(err));
