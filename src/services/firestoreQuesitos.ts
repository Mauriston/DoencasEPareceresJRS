// Ficheiro: services/firestoreQuesitos.ts
// Modelos de quesitos por especialidade para o Pedido de Parecer (coleção
// "quesitosParecer", id = slug da especialidade). Leitura: usuário autenticado;
// escrita: só Admin (ver firestore.rules).
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { normalizarTexto, timestampISO } from '@/utils/dados';

const db = getFirestore(app);
const COL = 'quesitosParecer';

export interface QuesitosEspecialidade {
  id: string;
  /** Nome em maiúsculas, como aparece no pedido (ex.: "PSIQUIATRIA"). */
  especialidade: string;
  quesitos: string[];
}

export const idDaEspecialidade = (nome: string): string =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const observarQuesitos = (onData: (lista: QuesitosEspecialidade[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    collection(db, COL),
    snap => onData(snap.docs
      .map(d => ({ id: d.id, especialidade: String(d.data().especialidade || ''), quesitos: (d.data().quesitos as string[]) || [] }))
      .sort((a, b) => a.especialidade.localeCompare(b.especialidade, 'pt-BR'))),
    err => onError?.(err),
  );

export const salvarQuesitos = (id: string, especialidade: string, quesitos: string[]) =>
  setDoc(doc(db, COL, id), { especialidade: normalizarTexto(especialidade).toUpperCase(), quesitos: quesitos.map(q => normalizarTexto(q)).filter(Boolean), atualizadoEm: timestampISO() });

export const apagarQuesitos = (id: string) => deleteDoc(doc(db, COL, id));
