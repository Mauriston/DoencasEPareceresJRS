// Ficheiro: services/firebaseStorageConcursos.ts
// Os PDFs dos concursos agora ficam no Google Drive (ver services/driveConcursos.ts). Este módulo só
// mantém a limpeza dos PDFs ANTIGOS, que continuam no Firebase Storage (concursos/{concursoId}/...).
import { getAuth } from 'firebase/auth';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { app } from './firebaseAuth';

/** Apaga um PDF do Storage a partir da URL de download (best-effort). */
export const removerPdfDoStorage = async (url: string): Promise<void> => {
  if (!getAuth(app).currentUser) return;
  try {
    await deleteObject(ref(getStorage(app), url));
  } catch {
    // silencioso
  }
};
