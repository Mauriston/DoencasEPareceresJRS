// Ficheiro: services/acessoRapido.ts
// Acesso rápido da Início no Firestore (coleção "acessoRapido", um documento por usuário — id = uid): a escolha
// do card e a contagem de acessos às páginas por dia (últimos 28 dias). Acompanha o usuário em qualquer aparelho.
// Regras puras (renovação quinzenal, páginas fora do card) em utils/acessoRapido.ts.
import { getFirestore, doc, onSnapshot, setDoc, increment, serverTimestamp, deleteField } from 'firebase/firestore';
import { app } from './firebaseAuth';
import type { NavItem } from '../types';
import { FORA_DO_RAPIDO, type AcessosPorDia, type EscolhaRapido } from '../utils/acessoRapido';

const db = getFirestore(app);
const ref = (uid: string) => doc(db, 'acessoRapido', uid);

export interface DocAcessoRapido { escolha: EscolhaRapido | null; acessos: AcessosPorDia }

export const observarAcessoRapido = (uid: string, onData: (d: DocAcessoRapido) => void, onError?: (e: Error) => void) =>
  onSnapshot(ref(uid), snap => {
    const d = snap.data() as Partial<DocAcessoRapido> | undefined;
    onData({ escolha: d?.escolha && Array.isArray(d.escolha.ids) ? d.escolha : null, acessos: d?.acessos ?? {} });
  }, err => onError?.(err));

/** +1 acesso à página no dia (uma gravação por navegação, com incremento atômico). */
export const registrarAcessoPagina = (uid: string, pagina: NavItem, dia: string): Promise<void> => {
  if (FORA_DO_RAPIDO.includes(pagina)) return Promise.resolve();
  return setDoc(ref(uid), { acessos: { [dia]: { [pagina]: increment(1) } }, atualizadoEm: serverTimestamp() }, { merge: true });
};

export const salvarEscolhaRapido = (uid: string, escolha: EscolhaRapido): Promise<void> =>
  setDoc(ref(uid), { escolha, atualizadoEm: serverTimestamp() }, { merge: true });

/** Apaga os dias fora da janela de 28 dias. */
export const podarAcessos = (uid: string, diasAntigos: string[]): Promise<void> => {
  if (!diasAntigos.length) return Promise.resolve();
  return setDoc(ref(uid), { acessos: Object.fromEntries(diasAntigos.map(d => [d, deleteField()])) }, { merge: true });
};
