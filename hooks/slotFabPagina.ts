// Ficheiro: hooks/slotFabPagina.ts
// Ponte entre a barra inferior e o FAB da página. A barra (components/shell/BarraInferior.tsx) oferece um
// "acessório" ao lado da pílula (BottomNavigationAccessory, Animate UI): o FAB da página (components/ui/Fab.tsx)
// entra nele por portal, e assim a barra e o FAB formam UM grupo que se ajusta ao conteúdo e minimiza junto.
//  • `definirSlotFab(el)`   — a barra publica o elemento do acessório (ou null quando sai).
//  • `registrarFabPagina()` — cada FAB de página avisa que existe (a barra só abre o acessório quando há FAB).
//  • `useSlotFab()` / `useTemFabPagina()` — leitura reativa (useSyncExternalStore).
// Sem barra (desktop, carregando, teclado), o slot é null e o FAB cai no modo fixo de antes.
import { useSyncExternalStore } from 'react';

let slot: HTMLElement | null = null;
let fabs = 0;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach(f => f());
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

export const definirSlotFab = (el: HTMLElement | null) => {
  if (slot === el) return;
  slot = el;
  avisar();
};

export const registrarFabPagina = () => {
  fabs++;
  avisar();
  return () => { fabs--; avisar(); };
};

export const useSlotFab = (): HTMLElement | null => useSyncExternalStore(assinar, () => slot, () => null);
export const useTemFabPagina = (): boolean => useSyncExternalStore(assinar, () => fabs > 0, () => false);
