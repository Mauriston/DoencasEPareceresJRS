// Ficheiro: services/firebaseStorageNormas.ts
// URL de download dos PDFs das normas salvos no Firebase Storage, enviados
// pelos scripts scripts/upload-dgpm406-*.ts:
//   dgpm406/capitulos/capitulo-NN.pdf
//   dgpm406/anexos/anexo-<letra>.pdf
//   dgpm406/portaria-gm-md-3551-2021.pdf
//   dgpm406/dgpm-406-9rev.pdf (norma na íntegra)
// Retorna null quando o arquivo ainda não está no Storage.
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseAuth';

const cache = new Map<string, string | null>();

export const getStoragePdfUrl = async (caminho: string): Promise<string | null> => {
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

export const capituloPdfPath = (numero: number) => `dgpm406/capitulos/capitulo-${String(numero).padStart(2, '0')}.pdf`;
export const anexoPdfPath = (codigo: string) => `dgpm406/anexos/anexo-${codigo.toLowerCase()}.pdf`;
export const PORTARIA_PDF_PATH = 'dgpm406/portaria-gm-md-3551-2021.pdf';
export const NORMA_COMPLETA_PDF_PATH = 'dgpm406/dgpm-406-9rev.pdf';
