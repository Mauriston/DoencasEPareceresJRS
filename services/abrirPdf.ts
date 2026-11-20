// Ficheiro: services/abrirPdf.ts
// Ponto ÚNICO para "abrir PDF": todo PDF do app (Storage, Drive, gerados) abre em NOVA ABA do navegador,
// no visualizador nativo (no celular, o do aparelho) — nunca num modal/iframe do app.
// - A aba é aberta já no clique (window.open síncrono) para não cair no bloqueador de pop-ups; quando a URL
//   resolve, a aba navega para ela. Sem aba (bloqueada), cai para um <a target=_blank> clicado.
// - Prefere URL https real: URL de download do Storage com token (getDownloadURL); blob: só se não houver
//   outra (Safari no celular lida mal com blob:).
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { app } from './firebaseAuth';
import { caminhoDoStorage, urlExibivel } from './arquivosStorage';

const idDrive = (url: string): string | null =>
  url.match(/^https:\/\/drive\.google\.com\/(?:uc\?(?:[^#]*&)?id=|file\/d\/|open\?(?:[^#]*&)?id=)([\w-]+)/)?.[1] ?? null;

/** URL https que o visualizador nativo abre: Drive → /view; Storage sem token → getDownloadURL; demais, a própria. */
export const urlParaNovaAba = async (url: string): Promise<string> => {
  const id = idDrive(url);
  if (id) return `https://drive.google.com/file/d/${id}/view`;
  const caminho = caminhoDoStorage(url);
  if (!caminho) return url;
  if (/[?&]token=/.test(url)) return url;
  try { return await getDownloadURL(ref(getStorage(app), caminho)); }
  catch { return urlExibivel(url); } // sem permissão de leitura direta: blob via servidor
};

const abrirPorLink = (url: string) => {
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); a.remove();
};

/**
 * Abre um PDF em nova aba. `fonte` pode ser a URL ou uma função/promessa que a resolve (chame no clique).
 * Rejeita (e fecha a aba vazia) se a URL não resolver.
 */
export const abrirPdf = async (fonte: string | Promise<string> | (() => Promise<string>)): Promise<void> => {
  const aba = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  try {
    const bruta = typeof fonte === 'function' ? await fonte() : await fonte;
    if (!bruta) throw new Error('PDF indisponível.');
    const url = await urlParaNovaAba(bruta);
    if (aba && !aba.closed) { try { aba.opener = null; } catch { /* ignora */ } aba.location.href = url; }
    else abrirPorLink(url);
  } catch (e) {
    aba?.close();
    throw e;
  }
};
