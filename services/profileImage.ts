// Ficheiro: services/profileImage.ts
// Upload da foto de perfil para o Firebase Storage (mesmo projeto Firebase já
// usado para o login com Google/Drive em firebaseAuth.ts). Usamos autenticação
// anônima do Firebase apenas para satisfazer as regras de segurança do
// Storage (que exigem `request.auth != null`), já que o login do app é
// próprio (planilha) e não passa por Firebase Auth.
//
// Regras de Storage esperadas (ver storage.rules na raiz do repo):
//   match /perfil/{usuario}/{arquivo} {
//     allow read: if true;
//     allow write: if request.auth != null
//       && request.resource.size < 5 * 1024 * 1024
//       && request.resource.contentType.matches('image/.*');
//   }
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseAuth';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();

export const uploadProfileImage = async (usuario: string, file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('A imagem deve ter no máximo 5MB.');
  }

  const auth = getAuth(app);
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  const storage = getStorage(app);
  const extensao = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const caminho = `perfil/${slugify(usuario)}/${Date.now()}.${extensao}`;
  const storageRef = ref(storage, caminho);

  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
};
