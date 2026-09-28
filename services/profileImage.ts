// Ficheiro: services/profileImage.ts
// Upload da foto de perfil para o Firebase Storage (projeto jrs-app-web,
// dedicado a este app). O usuário já está autenticado via Firebase
// Authentication (login do próprio app, ver firebaseAuth.ts) quando usa esta
// função — não é necessário nenhum login adicional aqui.
//
// Regras de Storage esperadas (ver storage.rules na raiz do repo):
//   match /perfil/{usuario}/{arquivo} {
//     allow read: if true;
//     allow write: if request.auth != null
//       && request.resource.size < 5 * 1024 * 1024
//       && request.resource.contentType.matches('image/.*');
//   }
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseAuth';
import { slugify } from '../utils/slug';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const uploadProfileImage = async (usuario: string, file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('A imagem deve ter no máximo 5MB.');
  }

  const auth = getAuth(app);
  if (!auth.currentUser) {
    throw new Error('Sessão expirada. Faça login novamente antes de enviar a foto.');
  }

  const storage = getStorage(app);
  const extensao = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const caminho = `perfil/${slugify(usuario)}/${Date.now()}.${extensao}`;
  const storageRef = ref(storage, caminho);

  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
};
