// Ficheiro: services/firestoreEscala.ts
// Escala de serviço do SPA (coleção "escalaSpa"): um documento por dia (id = AAAA-MM-DD) com a
// supervisão (24 h: escalado + retém) e os plantões de 12 h (dia e noite: dois médicos cada, com
// retém opcional). Enviada pelo Admin em CSV (utils/escalaCsv.ts); qualquer usuário autenticado lê.
import { getFirestore, collection, doc, onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';

const db = getFirestore(app);
const COL = 'escalaSpa';

export interface EscalaDia {
  /** AAAA-MM-DD (= id do documento). */
  data: string;
  supervisor?: string;
  retemSupervisao?: string;
  dia?: string[];
  retemDia?: string;
  noite?: string[];
  retemNoite?: string;
}

/** Dias de [inicio, fim] (AAAA-MM-DD), em ordem. */
export const observarEscalaPeriodo = (inicio: string, fim: string, onData: (dias: EscalaDia[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    query(collection(db, COL), where('data', '>=', inicio), where('data', '<=', fim), orderBy('data')),
    snap => onData(snap.docs.map(d => d.data() as EscalaDia)),
    err => onError?.(err),
  );

/** Próximos dias da escala a partir de `desde` (inclusive). */
export const observarEscalaAPartirDe = (desde: string, max: number, onData: (dias: EscalaDia[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    query(collection(db, COL), where('data', '>=', desde), orderBy('data'), limit(max)),
    snap => onData(snap.docs.map(d => d.data() as EscalaDia)),
    err => onError?.(err),
  );

/**
 * Grava os dias importados (só Admin — firestore.rules). Cada dia é mesclado: o CSV pode trazer só a
 * supervisão ou só os plantões de um dia sem apagar o resto. Lotes de até 400 gravações.
 */
export const gravarEscala = async (dias: EscalaDia[]): Promise<number> => {
  for (let i = 0; i < dias.length; i += 400) {
    const lote = writeBatch(db);
    dias.slice(i, i + 400).forEach(d => lote.set(doc(db, COL, d.data), { ...d, atualizadoEm: serverTimestamp() }, { merge: true }));
    await lote.commit();
  }
  return dias.length;
};
