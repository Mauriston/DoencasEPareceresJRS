// Ficheiro: services/firestoreExtras.ts
// Páginas Vídeos e Infográficos (antes lidas da planilha via Apps Script).
//  - "videos": vídeos do YouTube. O Admin informa só a URL; o título vem do oEmbed do
//    YouTube e a thumbnail é a do próprio YouTube (i.ytimg.com).
//  - "infograficos": título + imagem enviada ao Storage em infograficos/{id}.{ext}.
// Leitura: usuário autenticado; escrita: Admin (ver firestore.rules e storage.rules).
import {
  getFirestore, collection, doc, onSnapshot, deleteDoc, setDoc, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseAuth';

const db = getFirestore(app);
const COL_VIDEOS = 'videos';
const COL_INFOGRAFICOS = 'infograficos';

export interface VideoRecord {
  id: string;
  youtubeId: string;
  titulo: string;
  thumbnailUrl: string;
  criadoPor?: string;
  criadoEm?: Timestamp;
}

export interface InfograficoRecord {
  id: string;
  titulo: string;
  /** Caminho da imagem no Storage (infograficos/{id}.{ext}). */
  imagePath: string;
  /** URL de download da imagem. */
  imageUrl: string;
  criadoPor?: string;
  criadoEm?: Timestamp;
}

const porCriacao = (a: { criadoEm?: Timestamp }, b: { criadoEm?: Timestamp }) =>
  (a.criadoEm?.toMillis?.() ?? 0) - (b.criadoEm?.toMillis?.() ?? 0);

// ---------------------------------------------------------------------------
// Vídeos
// ---------------------------------------------------------------------------

/** Id do vídeo a partir de uma URL do YouTube (watch, youtu.be, shorts, embed, live) ou do próprio id. */
export const extrairYoutubeId = (texto: string): string | null => {
  const t = texto.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = t.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

export const thumbnailYoutube = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

/** Título e thumbnail pelo oEmbed público do YouTube (aceita CORS, não exige chave). */
export const buscarDadosYoutube = async (youtubeId: string): Promise<{ titulo: string; thumbnailUrl: string }> => {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(resp.status === 401 || resp.status === 403 ? 'Este vídeo não permite incorporação ou é privado.' : 'Vídeo não encontrado no YouTube.');
  const json = await resp.json();
  return { titulo: String(json.title || '').trim(), thumbnailUrl: json.thumbnail_url || thumbnailYoutube(youtubeId) };
};

export const observarVideos = (onData: (lista: VideoRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    collection(db, COL_VIDEOS),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<VideoRecord, 'id'>) })).sort(porCriacao)),
    err => onError?.(err),
  );

/** Cria o vídeo com id = id do YouTube (impede duplicar o mesmo vídeo). */
export const criarVideo = async (dados: { youtubeId: string; titulo: string; thumbnailUrl: string; criadoPor: string }): Promise<void> => {
  await setDoc(doc(db, COL_VIDEOS, dados.youtubeId), { ...dados, criadoEm: serverTimestamp() });
};

export const apagarVideo = (id: string) => deleteDoc(doc(db, COL_VIDEOS, id));

// ---------------------------------------------------------------------------
// Infográficos
// ---------------------------------------------------------------------------

export const LIMITE_INFOGRAFICO_MB = 10;

export const observarInfograficos = (onData: (lista: InfograficoRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    collection(db, COL_INFOGRAFICOS),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InfograficoRecord, 'id'>) })).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))),
    err => onError?.(err),
  );

/** Envia a imagem ao Storage (infograficos/{id}.{ext}) e cria o documento. */
export const criarInfografico = async (titulo: string, arquivo: File, criadoPor: string): Promise<void> => {
  const novo = doc(collection(db, COL_INFOGRAFICOS));
  const ext = (arquivo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const imagePath = `infograficos/${novo.id}.${ext}`;
  const arq = ref(getStorage(app), imagePath);
  await uploadBytes(arq, arquivo, { contentType: arquivo.type || 'image/jpeg' });
  const imageUrl = await getDownloadURL(arq);
  await setDoc(novo, { titulo: titulo.trim(), imagePath, imageUrl, criadoPor, criadoEm: serverTimestamp() });
};

export const apagarInfografico = async (item: InfograficoRecord): Promise<void> => {
  await deleteDoc(doc(db, COL_INFOGRAFICOS, item.id));
  if (item.imagePath) await deleteObject(ref(getStorage(app), item.imagePath)).catch(() => { /* imagem já removida */ });
};
