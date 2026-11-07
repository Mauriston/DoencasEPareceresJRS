// Ficheiro: services/arquivosStorage.ts
// Arquivos do Firebase Storage (PDFs, fotos de perfil, infográficos) entregues pelo servidor do app.
// Motivo: em algumas redes (ex.: Firefox nos PCs da Marinha) o endereço firebasestorage.googleapis.com
// é bloqueado ou interceptado, e os PDFs e as fotos não abrem; o servidor do app (Cloud Run) é
// acessível. Então, para uma URL do Storage, o app pede os bytes a POST /api/arquivos/baixar (com o
// login) e mostra um endereço blob: local. Se o repasse falhar, cai para a URL original.
// URLs que não são do Storage (Drive, imagens externas, data:) passam direto.
import { useEffect, useState } from 'react';
import { baixarDoServidor } from './apiClient';

/** Caminho do objeto no bucket a partir da URL de download do Storage; null se não for do Storage. */
export const caminhoDoStorage = (url: string | undefined | null): string | null => {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.hostname === 'firebasestorage.googleapis.com') {
    const m = /^\/v0\/b\/[^/]+\/o\/(.+)$/.exec(u.pathname);
    return m ? decodeURIComponent(m[1]) : null;
  }
  if (u.hostname === 'storage.googleapis.com') {
    const m = /^\/[^/]+\/(.+)$/.exec(u.pathname);
    return m ? decodeURIComponent(m[1]) : null;
  }
  return null;
};

// Cache da sessão (URL original → blob:), para não baixar de novo a mesma foto em cada avatar.
const cache = new Map<string, Promise<string>>();

/** URL que o navegador consegue abrir: blob: (via servidor) para arquivos do Storage; a própria URL nos demais. */
export const urlExibivel = (url: string): Promise<string> => {
  const caminho = caminhoDoStorage(url);
  if (!caminho) return Promise.resolve(url);
  let p = cache.get(url);
  if (!p) {
    p = baixarDoServidor('/api/arquivos/baixar', { caminho }, { timeoutMs: 60_000 })
      .then(blob => URL.createObjectURL(blob))
      .catch(() => { cache.delete(url); return url; }); // repasse indisponível: tenta direto
    cache.set(url, p);
  }
  return p;
};

/** Hook: URL exibível de um arquivo (ver urlExibivel). Enquanto carrega, devolve '' (e `carregando`). */
export const useUrlArquivo = (url: string | undefined | null): { src: string; carregando: boolean } => {
  const direto = !url || !caminhoDoStorage(url);
  const [src, setSrc] = useState(direto ? (url || '') : '');
  useEffect(() => {
    if (!url) { setSrc(''); return; }
    if (!caminhoDoStorage(url)) { setSrc(url); return; }
    let vivo = true;
    setSrc('');
    urlExibivel(url).then(s => { if (vivo) setSrc(s); });
    return () => { vivo = false; };
  }, [url]);
  return { src, carregando: !!url && !direto && !src };
};
