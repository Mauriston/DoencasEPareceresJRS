// Ficheiro: services/firebaseStorageConcursos.ts
// Upload dos arquivos do menu Concursos para o Firebase Storage (projeto
// jrs-app-web): o PDF original da mensagem administrativa (cópia de
// auditoria, antes salva numa subpasta do Drive) e o PDF do Termo de
// Cientificação de Recurso (gerado pelo Apps Script standalone mínimo, ver
// CodeConcursos.gs, e enviado ao app já em base64).
//
// Regras de Storage esperadas (ver storage.rules na raiz do repo):
//   match /concursos/{concursoId}/{arquivo=**} {
//     allow read, write: if request.auth != null && ...
//   }
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseAuth';

const MAX_TERMO_SIZE_BYTES = 10 * 1024 * 1024;

const exigirSessao = () => {
  const auth = getAuth(app);
  if (!auth.currentUser) throw new Error('Sessão expirada. Faça login novamente.');
};

export const uploadMensagemPdf = async (concursoId: string, file: File): Promise<string> => {
  exigirSessao();
  const storage = getStorage(app);
  const caminho = `concursos/${concursoId}/mensagens/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, caminho);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/pdf' });
  return getDownloadURL(storageRef);
};

export const uploadTermoRecursoPdf = async (concursoId: string, candidatoId: string, pdfBase64: string): Promise<string> => {
  exigirSessao();

  const tamanhoAproximado = Math.ceil((pdfBase64.length * 3) / 4);
  if (tamanhoAproximado > MAX_TERMO_SIZE_BYTES) {
    throw new Error('O PDF do Termo de Recurso gerado é maior que o permitido.');
  }

  const storage = getStorage(app);
  const caminho = `concursos/${concursoId}/termos/${candidatoId}.pdf`;
  const storageRef = ref(storage, caminho);
  await uploadString(storageRef, pdfBase64, 'base64', { contentType: 'application/pdf' });
  return getDownloadURL(storageRef);
};
