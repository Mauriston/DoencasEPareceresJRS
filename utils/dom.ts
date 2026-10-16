// Ficheiro: utils/dom.ts

/** Primeiro ancestral que realmente rola na vertical (ou null → a própria janela). */
export const getScrollParent = (el: HTMLElement | null): HTMLElement | null => {
  let atual = el?.parentElement ?? null;
  while (atual) {
    if (/(auto|scroll)/.test(getComputedStyle(atual).overflowY)) return atual;
    atual = atual.parentElement;
  }
  return null;
};
