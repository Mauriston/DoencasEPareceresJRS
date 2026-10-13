// Ficheiro: services/firebaseStorageDgpm406.ts
// URL de download dos PDFs dos capítulos da DGPM-406 salvos no Firebase
// Storage (dgpm406/capitulos/capitulo-NN.pdf), enviados por
// scripts/upload-dgpm406-capitulos-storage.ts. Retorna null quando o capítulo
// ainda não tem PDF no Storage.
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseAuth';

const cache = new Map<string, string | null>();

export const getCapituloPdfUrl = async (numero: number): Promise<string | null> => {
  const caminho = `dgpm406/capitulos/capitulo-${String(numero).padStart(2, '0')}.pdf`;
  if (cache.has(caminho)) return cache.get(caminho)!;
  try {
    const url = await getDownloadURL(ref(getStorage(app), caminho));
    cache.set(caminho, url);
    return url;
  } catch (e: any) {
    if (e?.code === 'storage/object-not-found') {
      cache.set(caminho, null);
      return null;
    }
    throw e;
  }
};
