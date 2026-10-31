// Ficheiro: services/firestorePermissions.ts
// Persistência compartilhada (Firestore) da matriz de permissões de
// páginas/funcionalidades, editada em Usuários (Admin). Antes vivia só em
// localStorage — por isso uma alteração feita num navegador nunca chegava
// aos outros dispositivos/usuários. Aqui há um único documento
// (config/permissoes) com leitura em tempo real (onSnapshot), consumido
// por um cache em memória em config/permissions.ts.
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { app } from './firebaseAuth';

const db = getFirestore(app);
const PERMISSOES_REF = doc(db, 'config', 'permissoes');

export interface PermissoesArmazenadas {
  pages: Record<string, Partial<Record<string, boolean>>>;
  features: Record<string, Partial<Record<string, boolean>>>;
}

/** Observa o documento de permissões em tempo real; chama `callback(null)` se o documento ainda não existir ou a leitura falhar (ex.: usuário deslogado). */
export const observarPermissoes = (callback: (dados: PermissoesArmazenadas | null) => void): (() => void) => {
  return onSnapshot(
    PERMISSOES_REF,
    snap => callback(snap.exists() ? (snap.data() as PermissoesArmazenadas) : null),
    () => callback(null)
  );
};

export const salvarPermissoesRemoto = (dados: PermissoesArmazenadas): Promise<void> => setDoc(PERMISSOES_REF, dados);
