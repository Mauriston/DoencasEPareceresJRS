// Ficheiro: services/handoff.ts
// Passagem de login do desktop para o celular via QR code. O desktop (já
// logado) pede ao backend (server.ts, /api/auth/handoff-token) um custom
// token do próprio usuário e o coloca no FRAGMENTO (#) da URL do QR — o
// fragmento nunca é enviado a servidores/logs. No celular, o app o troca por
// uma sessão (signInWithCustomToken) e remove o fragmento da barra de
// endereço. Se o backend não estiver disponível, o QR leva só a URL do app
// (o usuário faz login normalmente).
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebaseAuth';
import { chamarServidor } from './apiClient';
import { urlDoApp } from '../utils/pwa';

const HASH_KEY = 'h';

/** Lê (e remove da barra de endereço) um token de handoff presente na URL. */
export const consumirTokenDaUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = params.get(HASH_KEY);
  if (!token) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return token;
};

export const entrarComToken = (token: string) => signInWithCustomToken(auth, token);

/** Parâmetro de busca com a rota que o app abre depois do login (ex.: ?abrir=/inspecoes/123/entrevista). */
const PARAM_ABRIR = 'abrir';

/** Só destinos internos conhecidos: hoje, as telas de Inspeções (`/inspecoes/{isId}[/{acao}]`). */
export const destinoAbrirValido = (destino: string | null | undefined): destino is string =>
  typeof destino === 'string' && /^\/inspecoes\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?$/.test(destino);

/**
 * Lê (e remove da barra de endereço) o destino `?abrir=` e o põe no hash, para o HashRouter abrir
 * direto nessa tela. Sem sessão, o Login aparece por cima e, depois de entrar, o app continua na
 * rota (o App não volta à Home no login). Chamar DEPOIS de consumirTokenDaUrl (que limpa o hash).
 */
export const aplicarDestinoDaUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has(PARAM_ABRIR)) return null;
  const destino = params.get(PARAM_ABRIR);
  params.delete(PARAM_ABRIR);
  const resto = params.toString();
  const valido = destinoAbrirValido(destino);
  const hash = valido ? `#${destino}` : window.location.hash;
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${resto ? `?${resto}` : ''}${hash}`);
  return valido ? destino : null;
};

/**
 * Monta a URL do QR; com token, o celular entra já autenticado. Com `destino` (rota interna aceita
 * por destinoAbrirValido), o app abre nessa tela depois do login.
 */
export const montarUrlQr = async (destino?: string): Promise<{ url: string; comLogin: boolean }> => {
  const abrir = destinoAbrirValido(destino) ? `?${PARAM_ABRIR}=${encodeURIComponent(destino)}` : '';
  const base = `${urlDoApp()}${abrir}`;
  try {
    const json = await chamarServidor<{ token: string }>('/api/auth/handoff-token', {}, { timeoutMs: 15_000 });
    if (!json.token) throw new Error('falha');
    return { url: `${base}#${HASH_KEY}=${encodeURIComponent(json.token)}`, comLogin: true };
  } catch {
    return { url: base, comLogin: false };
  }
};
