// Ficheiro: services/destaquesNormas.ts
// Coleção "destaques_normas": formatação de trechos feita pelo Admin nas páginas de texto estático
// (Portaria, DGPM-406, Legislação). Leitura para usuários logados, escrita só do Admin (firestore.rules).
// Os .md em content/ não mudam: a marcação é aplicada sobre o texto renderizado (utils/destaquesTexto.ts).
import {
  addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, query, serverTimestamp, where, type Timestamp,
} from 'firebase/firestore';
import { app } from './firebaseAuth';
import type { AncoraTexto, TipoDestaque } from '../utils/destaquesTexto';

const db = getFirestore(app);
const COLECAO = 'destaques_normas';

export type PaginaNorma = 'portaria' | 'dgpm406' | 'legislacao';

export interface DestaqueNorma extends AncoraTexto {
  pagina: PaginaNorma;
  /** Documento dentro da página: 'portaria', o capítulo/anexo da DGPM-406 (c1, a10…) ou o id da norma. */
  doc: string;
  tipo: TipoDestaque;
  nota?: string;
  criadoPor: string;
  em?: Timestamp;
}
export type DestaqueRecord = DestaqueNorma & { id: string };

/** Todos os destaques de uma página (todos os documentos dela), em tempo real. */
export const observarDestaques = (pagina: PaginaNorma, onDados: (d: DestaqueRecord[]) => void) =>
  onSnapshot(
    query(collection(db, COLECAO), where('pagina', '==', pagina)),
    snap => onDados(snap.docs.map(d => ({ id: d.id, ...(d.data() as DestaqueNorma) }))),
    () => onDados([]), // sem login (páginas públicas) ou sem rede: só não mostra os destaques
  );

export const criarDestaque = (d: Omit<DestaqueNorma, 'em'>) =>
  addDoc(collection(db, COLECAO), { ...d, em: serverTimestamp() });

export const removerDestaque = (id: string) => deleteDoc(doc(db, COLECAO, id));
