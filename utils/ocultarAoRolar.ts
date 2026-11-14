// Ficheiro: utils/ocultarAoRolar.ts
// Regra pura da barra inferior do celular (auditoria v3, 4e) — usada por hooks/useOcultarAoRolar.ts.

export const LIMIAR_SENTIDO_PX = 8;
export const LIMIAR_TOPO_PX = 56;
export interface EstadoRolagem {
  /** Último scrollTop considerado. */
  ultimoY: number;
  /** Deslocamento acumulado no sentido atual (positivo = para baixo). */
  acumulado: number;
}

export interface MedidasRolagem {
  y: number;
  alturaVisivel: number;
  alturaTotal: number;
}

/**
 * Decide a visibilidade a partir de uma nova posição de rolagem (pura, testável).
 * Devolve o novo estado e `visivel` (true/false) ou null quando nada muda.
 */
export const decidirVisibilidade = (
  estado: EstadoRolagem,
  { y, alturaVisivel, alturaTotal }: MedidasRolagem,
): { estado: EstadoRolagem; visivel: boolean | null } => {
  // Página curta: a barra fica sempre visível.
  if (alturaTotal <= alturaVisivel + 1) return { estado: { ultimoY: y, acumulado: 0 }, visivel: true };
  if (y < LIMIAR_TOPO_PX) return { estado: { ultimoY: y, acumulado: 0 }, visivel: true };
  // Fim da página (com folga de 2 px para arredondamentos).
  if (y + alturaVisivel >= alturaTotal - 2) return { estado: { ultimoY: y, acumulado: 0 }, visivel: true };
  const delta = y - estado.ultimoY;
  if (delta === 0) return { estado, visivel: null };
  // Mudou de sentido: recomeça a acumular.
  const mesmoSentido = (delta > 0) === (estado.acumulado > 0) || estado.acumulado === 0;
  const acumulado = mesmoSentido ? estado.acumulado + delta : delta;
  if (acumulado >= LIMIAR_SENTIDO_PX) return { estado: { ultimoY: y, acumulado: 0 }, visivel: false };
  if (acumulado <= -LIMIAR_SENTIDO_PX) return { estado: { ultimoY: y, acumulado: 0 }, visivel: true };
  return { estado: { ultimoY: y, acumulado }, visivel: null };
};

