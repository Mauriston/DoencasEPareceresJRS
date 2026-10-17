// Ficheiro: services/militarFoto.ts
// Foto (avatar) do cadastro de militares no Firebase Storage
// (militares/{nip}/foto-<timestamp>.jpg; regra em storage.rules). A imagem é
// recortada ao centro em quadrado e reduzida a 512 px antes do envio.
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseAuth';

const LADO = 512;
const MAX_BYTES = 10 * 1024 * 1024;

/** Valida e converte qualquer imagem em JPEG quadrado de 512 px. */
export const prepararFoto = async (arquivo: Blob): Promise<Blob> => {
  if (!arquivo.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem válido.');
  if (arquivo.size > MAX_BYTES) throw new Error('A imagem deve ter no máximo 10MB.');
  const bmp = await createImageBitmap(arquivo);
  const lado = Math.min(bmp.width, bmp.height);
  const dest = Math.min(LADO, lado);
  const canvas = document.createElement('canvas');
  canvas.width = dest; canvas.height = dest;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, dest, dest);
  bmp.close?.();
  return new Promise((ok, falha) => canvas.toBlob(b => (b ? ok(b) : falha(new Error('Não foi possível processar a imagem.'))), 'image/jpeg', 0.85));
};

export const enviarFotoMilitar = async (idNip: string, foto: Blob): Promise<string> => {
  const r = ref(getStorage(app), `militares/${idNip}/foto-${Date.now()}.jpg`);
  await uploadBytes(r, foto, { contentType: 'image/jpeg' });
  return getDownloadURL(r);
};
