// Ficheiro: services/firestoreUsuarios.ts
// CRUD da coleção "usuarios" no Firestore (projeto jrs-app-web). Id do
// documento = UID do Firebase Authentication (ver firebaseAuth.ts).
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, collection } from 'firebase/firestore';
import { app } from './firebaseAuth';

const db = getFirestore(app);
const COLLECTION = 'usuarios';

export interface UsuarioDoc {
  usuario: string;
  postoGraduacao: string;
  cargo: string;
  nome: string;
  nip: string;
  crmPe: string;
  rqe: string;
  email: string;
  gmail: string;
  celular: string;
  perfil: 'admin' | 'user_medicos' | 'user_secretaria' | string;
  ativo: boolean;
  imageProfile: string;
  senhaTemporaria: boolean;
}

export type UsuarioRecord = UsuarioDoc & { id: string };

export const getUsuarioProfile = async (uid: string): Promise<UsuarioRecord | null> => {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as UsuarioDoc) };
};

export const listUsuarios = async (): Promise<UsuarioRecord[]> => {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as UsuarioDoc) }));
};

export const createUsuarioProfile = (uid: string, data: UsuarioDoc) =>
  setDoc(doc(db, COLLECTION, uid), data);

export const updateUsuarioProfile = (uid: string, patch: Partial<UsuarioDoc>) =>
  updateDoc(doc(db, COLLECTION, uid), patch as Record<string, unknown>);

// Réplica pública mínima (usuário + status ativo) para popular o menu
// suspenso de login, legível sem autenticação — ver firestore.rules.
const PUBLIC_COLLECTION = 'usuarios_publicos';

export interface UsuarioPublico {
  usuario: string;
  ativo: boolean;
}

export const listUsuariosPublicos = async (): Promise<UsuarioPublico[]> => {
  const snap = await getDocs(collection(db, PUBLIC_COLLECTION));
  return snap.docs.map(d => d.data() as UsuarioPublico);
};

export const setUsuarioPublico = (uid: string, data: UsuarioPublico) =>
  setDoc(doc(db, PUBLIC_COLLECTION, uid), data);
