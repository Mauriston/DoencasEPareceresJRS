// Ficheiro: services/firestoreMilitares.ts
// Cadastro de militares da ativa e servidores civis (coleção "militares",
// migrada da aba "Militares" da planilha). Id do documento = NIP só com
// dígitos. Leitura: qualquer usuário autenticado; escrita: só Admin (ver
// firestore.rules).
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';

const db = getFirestore(app);
const COL = 'militares';

export interface MilitarDoc {
  om: string;
  temporario: boolean;
  /** Posto/graduação/quadro, ex.: "CT (Md)", "1SG-EF". */
  pgq: string;
  nip: string;
  nome: string;
  /** `${pgq} ${nip} ${nome}` */
  inspecionado: string;
  email: string;
  ativo: boolean;
}
export type MilitarRecord = MilitarDoc & { id: string };

export const idDoNip = (nip: string): string => nip.replace(/\D/g, '');

export const observarMilitares = (
  onData: (lista: MilitarRecord[]) => void,
  onError?: (e: Error) => void,
) => onSnapshot(
  collection(db, COL),
  snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as MilitarDoc) })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))),
  err => onError?.(err),
);

export const criarMilitar = async (dados: MilitarDoc): Promise<string> => {
  const id = idDoNip(dados.nip);
  if (id.length !== 8) throw new Error('NIP inválido.');
  const ref = doc(db, COL, id);
  if ((await getDoc(ref)).exists()) throw new Error('Já existe um militar cadastrado com este NIP.');
  await setDoc(ref, { ...dados, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
  return id;
};

/** Apaga o cadastro (definitivo). Para só tirar o acesso, prefira inativar. */
export const apagarMilitar = (id: string) => deleteDoc(doc(db, COL, id));

export const atualizarMilitar = (id: string, patch: Partial<MilitarDoc>) =>
  updateDoc(doc(db, COL, id), { ...patch, atualizadoEm: serverTimestamp() } as Record<string, unknown>);
