// Ficheiro: services/firestoreExtras.ts
// Páginas Vídeos, Infográficos e Apresentações (as duas primeiras antes lidas da planilha).
//  - "videos": vídeos do YouTube. O Admin informa só a URL; o título vem do oEmbed do
//    YouTube e a thumbnail é a do próprio YouTube (i.ytimg.com).
//  - "infograficos": título + imagem enviada ao Storage em infograficos/{id}.{ext}.
//  - "apresentacoes": apresentações de slides (Google Slides, Canva, GitHub Pages). O Admin informa só
//    a URL; o título e a capa vêm do backend (/api/admin/preview-apresentacao), que lê o HTML público.
//  - "visualizacoesExtras": quem abriu cada vídeo/infográfico/apresentação (um doc por pessoa e item, com o
//    número de vezes). Cada usuário grava só as próprias visualizações; só o Admin lê.
// Leitura: usuário autenticado; escrita: Admin (ver firestore.rules e storage.rules).
import {
  getFirestore, collection, doc, onSnapshot, deleteDoc, setDoc, serverTimestamp, increment, query, where, getDocs, type Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app, auth } from './firebaseAuth';
import { apiUrl } from '../utils/apiBase';

const db = getFirestore(app);
const COL_VIDEOS = 'videos';
const COL_INFOGRAFICOS = 'infograficos';
const COL_APRESENTACOES = 'apresentacoes';
const COL_VISUALIZACOES = 'visualizacoesExtras';

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

export const apagarVideo = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COL_VIDEOS, id));
  await apagarVisualizacoes('video', id);
};

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
  await apagarVisualizacoes('infografico', item.id);
  if (item.imagePath) await deleteObject(ref(getStorage(app), item.imagePath)).catch(() => { /* imagem já removida */ });
};

// ---------------------------------------------------------------------------
// Apresentações
// ---------------------------------------------------------------------------

export type PlataformaApresentacao = 'google' | 'canva' | 'github';

export interface ApresentacaoRecord {
  id: string;
  /** URL aberta ao tocar no card (Google Slides já em /present). */
  url: string;
  plataforma: PlataformaApresentacao;
  titulo: string;
  thumbnailUrl: string;
  criadoPor?: string;
  criadoEm?: Timestamp;
}

/**
 * Valida a URL e a deixa pronta para abrir em modo de apresentação. Google Slides:
 * /d/{id}/edit|view|preview|embed... → /d/{id}/present (link publicado /d/e/... fica como está).
 */
export const normalizarUrlApresentacao = (texto: string): { url: string; plataforma: PlataformaApresentacao; googleId?: string } | null => {
  let u: URL;
  try { u = new URL(texto.trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.hostname === 'docs.google.com') {
    const pub = u.pathname.match(/^\/presentation\/d\/e\/([\w-]+)/);
    if (pub) return { url: u.toString(), plataforma: 'google' };
    const m = u.pathname.match(/^\/presentation(?:\/u\/\d+)?\/d\/([\w-]{20,})/);
    if (!m) return null;
    return { url: `https://docs.google.com/presentation/d/${m[1]}/present`, plataforma: 'google', googleId: m[1] };
  }
  if (u.hostname === 'canva.com' || u.hostname === 'www.canva.com') {
    if (!u.pathname.startsWith('/design/')) return null;
    return { url: u.toString(), plataforma: 'canva' };
  }
  if (/^[a-z0-9-]+\.github\.io$/i.test(u.hostname)) return { url: u.toString(), plataforma: 'github' };
  return null;
};

/** Captura da página (capa) por serviço público de screenshot, quando a URL não traz og:image. */
export const screenshotDaUrl = (url: string) => `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=720`;

/**
 * Título e capa da apresentação. O backend lê og:title/og:image; no Google Slides a capa é a
 * miniatura do Drive (estável, exige compartilhamento público) e, sem og:image, cai no screenshot.
 * Se o backend estiver indisponível, devolve a capa possível e título vazio (o Admin digita).
 */
export const buscarDadosApresentacao = async (
  n: { url: string; plataforma: PlataformaApresentacao; googleId?: string },
): Promise<{ titulo: string; thumbnailUrl: string; aviso?: string }> => {
  const capaPadrao = n.googleId ? `https://drive.google.com/thumbnail?id=${n.googleId}&sz=w1280` : screenshotDaUrl(n.url);
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  let json: any = {};
  try {
    const resp = await fetch(apiUrl('/api/admin/preview-apresentacao'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ url: n.url }),
    });
    json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) return { titulo: '', thumbnailUrl: capaPadrao, aviso: json.error || 'Não foi possível ler o título; digite-o.' };
  } catch {
    return { titulo: '', thumbnailUrl: capaPadrao, aviso: 'Não foi possível ler o título; digite-o.' };
  }
  return { titulo: String(json.titulo || ''), thumbnailUrl: n.googleId ? capaPadrao : (json.imagem || capaPadrao) };
};

export const observarApresentacoes = (onData: (lista: ApresentacaoRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    collection(db, COL_APRESENTACOES),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ApresentacaoRecord, 'id'>) })).sort(porCriacao)),
    err => onError?.(err),
  );

export const criarApresentacao = async (dados: Omit<ApresentacaoRecord, 'id' | 'criadoEm'>): Promise<void> => {
  await setDoc(doc(collection(db, COL_APRESENTACOES)), { ...dados, titulo: dados.titulo.trim(), criadoEm: serverTimestamp() });
};

export const apagarApresentacao = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COL_APRESENTACOES, id));
  await apagarVisualizacoes('apresentacao', id);
};

// ---------------------------------------------------------------------------
// Visualizações (registradas ao abrir o card; exibidas só ao Admin)
// ---------------------------------------------------------------------------

export type TipoExtra = 'video' | 'infografico' | 'apresentacao';

export interface VisualizacaoExtra {
  id: string;
  tipo: TipoExtra;
  itemId: string;
  uid: string;
  nome: string;
  vezes: number;
  ultimaEm?: Timestamp;
}

/** Soma uma visualização do usuário no item (doc {tipo}__{itemId}__{uid}). */
export const registrarVisualizacao = (tipo: TipoExtra, itemId: string, usuario: { uid: string; nome: string }) =>
  setDoc(doc(db, COL_VISUALIZACOES, `${tipo}__${itemId}__${usuario.uid}`), {
    tipo, itemId, uid: usuario.uid, nome: usuario.nome, vezes: increment(1), ultimaEm: serverTimestamp(),
  }, { merge: true });

/** Visualizações de todos os itens do tipo, agrupadas por item (mais recentes primeiro). Só o Admin pode ler. */
export const observarVisualizacoes = (tipo: TipoExtra, onData: (porItem: Record<string, VisualizacaoExtra[]>) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    query(collection(db, COL_VISUALIZACOES), where('tipo', '==', tipo)),
    snap => {
      const porItem: Record<string, VisualizacaoExtra[]> = {};
      snap.docs.forEach(d => {
        const v = { id: d.id, ...(d.data() as Omit<VisualizacaoExtra, 'id'>) };
        (porItem[v.itemId] ??= []).push(v);
      });
      Object.values(porItem).forEach(l => l.sort((a, b) => (b.ultimaEm?.toMillis?.() ?? 0) - (a.ultimaEm?.toMillis?.() ?? 0)));
      onData(porItem);
    },
    err => onError?.(err),
  );

/** Apaga as visualizações de um item removido (Admin). */
const apagarVisualizacoes = async (tipo: TipoExtra, itemId: string): Promise<void> => {
  const snap = await getDocs(query(collection(db, COL_VISUALIZACOES), where('tipo', '==', tipo), where('itemId', '==', itemId)));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
};
