// Ficheiro: utils/handoffUrl.ts
// Leitura do token de handoff (login por QR code) no fragmento da URL — separada de services/handoff.ts
// para o index.tsx não importar o Firebase: as páginas públicas (#/publico/…) abrem sem iniciá-lo.
export const HASH_KEY_HANDOFF = 'h';

/** Lê (e remove da barra de endereço) um token de handoff presente na URL. */
export const consumirTokenDaUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = params.get(HASH_KEY_HANDOFF);
  if (!token) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return token;
};
