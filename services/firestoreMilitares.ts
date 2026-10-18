// Ficheiro: services/firestoreMilitares.ts
// Cadastro de militares da ativa e servidores civis (coleção "militares",
// migrada da aba "Militares" da planilha). Id do documento = NIP só com
// dígitos. Leitura: qualquer usuário autenticado; escrita: só Admin (ver
// firestore.rules).
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
  /** Carreira: já foi para a Reserva da Marinha de 1ª Classe (RM1). */
  rm1?: boolean;
  /** Carreira: reformado por idade-limite ou invalidez (Refº). */
  refo?: boolean;
  /** Só HNRe: setor onde serve, "Nome (HNRe-00.0)". */
  servico_label?: string;
  /** Só oficiais médicos do HNRe: */
  nomeGuerra?: string;
  especialidade?: string;
  emailPessoal?: string;
  /** Celular e data de nascimento (AAAA-MM-DD) agora são campos do cadastro, não da seção "+ informações". */
  celular?: string;
  dataNascimento?: string;
  cpf?: string;
  identidadeMilitar?: string;
  crm?: string;
  rqe?: string;
  fotoUrl?: string;
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

/** Atualiza vários cadastros de uma vez (ex.: promoção em lote). Lotes de até 400 gravações. */
export const atualizarMilitaresEmLote = async (itens: { id: string; patch: Partial<MilitarDoc> }[]): Promise<void> => {
  for (let i = 0; i < itens.length; i += 400) {
    const lote = writeBatch(db);
    itens.slice(i, i + 400).forEach(({ id, patch }) =>
      lote.update(doc(db, COL, id), { ...patch, atualizadoEm: serverTimestamp() } as Record<string, unknown>));
    await lote.commit();
  }
};
