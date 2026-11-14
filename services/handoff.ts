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

import { consumirTokenDaUrl, HASH_KEY_HANDOFF as HASH_KEY } from '../utils/handoffUrl';

// A leitura do token na URL mora em utils/handoffUrl.ts (sem Firebase, usada pelo index.tsx).
export { consumirTokenDaUrl };

export const entrarComToken = (token: string) => signInWithCustomToken(auth, token);

/** Monta a URL do QR; com token, o celular entra já autenticado. */
export const montarUrlQr = async (): Promise<{ url: string; comLogin: boolean }> => {
  const base = urlDoApp();
  try {
    const json = await chamarServidor<{ token: string }>('/api/auth/handoff-token', {}, { timeoutMs: 15_000 });
    if (!json.token) throw new Error('falha');
    return { url: `${base}#${HASH_KEY}=${encodeURIComponent(json.token)}`, comLogin: true };
  } catch {
    return { url: base, comLogin: false };
  }
};
