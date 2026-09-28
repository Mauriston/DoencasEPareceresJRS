// Ficheiro: services/firebaseAuth.ts
// Autenticação do app JRS/HNRe via Firebase Authentication (e-mail/senha),
// projeto dedicado jrs-app-web. Como o login do app é por "usuário" (ex.:
// "CT MAURISTON"), e não por e-mail, cada usuário recebe um e-mail sintético
// interno (nunca usado para enviar e-mails de verdade) derivado do usuário.
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { slugify } from '../utils/slug';
import type { UsuarioDoc } from './firestoreUsuarios';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const EMAIL_DOMAIN = 'jrs-hnre.internal';

export const usuarioToEmail = (usuario: string): string => `${slugify(usuario)}@${EMAIL_DOMAIN}`;

export const onAuthChange = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);

export const loginUsuario = (usuario: string, senha: string) =>
  signInWithEmailAndPassword(auth, usuarioToEmail(usuario), senha);

export const logoutUsuario = () => signOut(auth);

export const trocarSenha = async (usuario: string, senhaAtual: string, novaSenha: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const credential = EmailAuthProvider.credential(usuarioToEmail(usuario), senhaAtual);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, novaSenha);
};

/**
 * Cria a conta (Firebase Auth) e o perfil (Firestore) de um usuário, sem
 * afetar uma sessão já logada (a do Admin criando outro usuário, ou nenhuma,
 * no autocadastro). `createUserWithEmailAndPassword` loga automaticamente
 * como o usuário recém-criado na instância em que é chamado — por isso
 * usamos uma instância secundária e temporária do Firebase App, descartada
 * em seguida. O perfil é gravado usando essa MESMA instância (autenticada
 * como o novo usuário), para já existir no Firestore antes de qualquer
 * tentativa de login "de verdade" no app principal.
 */
export const criarContaEUsuario = async (
  usuario: string,
  senhaInicial: string,
  perfil: Omit<UsuarioDoc, 'usuario'>
): Promise<string> => {
  const secondaryApp = initializeApp(firebaseConfig, `create-user-${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, usuarioToEmail(usuario), senhaInicial);
    const secondaryDb = getFirestore(secondaryApp);
    await setDoc(doc(secondaryDb, 'usuarios', cred.user.uid), { usuario, ...perfil });
    return cred.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Usuário ou senha incorretos.',
  'auth/wrong-password': 'Usuário ou senha incorretos.',
  'auth/user-not-found': 'Usuário ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/user-disabled': 'Usuário desativado. Fale com o administrador.',
  'auth/email-already-in-use': 'Já existe um usuário com esse nome de login.',
  'auth/weak-password': 'A senha deve ter no mínimo 6 caracteres.',
  'auth/requires-recent-login': 'Sessão expirada. Faça login novamente e tente de novo.',
};

export const mapAuthErrorMessage = (code: string | undefined, fallback: string): string =>
  (code && AUTH_ERROR_MESSAGES[code]) || fallback;
