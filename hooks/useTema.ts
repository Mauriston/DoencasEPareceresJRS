// Ficheiro: hooks/useTema.ts
// Tema da interface (auditoria v3, 4f): Sistema (padrão, segue prefers-color-scheme) ·
// Claro · Escuro, e no escuro a variante (Marinho noturno · Grafite neutro · Plantão OLED).
// Fica em localStorage ('jrs-tema') para pintar a primeira tela sem piscar — o script
// inline do index.html aplica <html data-theme data-variante> antes do React montar — e,
// quando possível, no perfil do usuário (usuarios/{uid}.aparencia) para seguir entre
// aparelhos. Só a interface muda: PDFs, e-mails e minutas não.
import { useSyncExternalStore } from 'react';

export type ModoTema = 'sistema' | 'claro' | 'escuro';
export type VarianteEscuro = 'marinho' | 'grafite' | 'oled';
export interface PreferenciaTema { modo: ModoTema; variante: VarianteEscuro }

export const CHAVE_TEMA = 'jrs-tema';
const PADRAO: PreferenciaTema = { modo: 'sistema', variante: 'marinho' };

/** Cor da barra de status (meta theme-color) por tema efetivo — a mesma lógica do index.html. */
export const COR_BARRA: Record<'light' | VarianteEscuro, string> = {
  light: '#050F41', marinho: '#070C2A', grafite: '#111216', oled: '#000000',
};

const MODOS: ModoTema[] = ['sistema', 'claro', 'escuro'];
const VARIANTES: VarianteEscuro[] = ['marinho', 'grafite', 'oled'];

export const normalizarTema = (v: unknown): PreferenciaTema => {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<PreferenciaTema>;
  return {
    modo: MODOS.includes(o.modo as ModoTema) ? (o.modo as ModoTema) : PADRAO.modo,
    variante: VARIANTES.includes(o.variante as VarianteEscuro) ? (o.variante as VarianteEscuro) : PADRAO.variante,
  };
};

const ler = (): PreferenciaTema => {
  try { return normalizarTema(JSON.parse(localStorage.getItem(CHAVE_TEMA) || 'null')); } catch { return PADRAO; }
};

const mqEscuro = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

export const temaEfetivo = (p: PreferenciaTema): 'light' | 'dark' =>
  p.modo === 'escuro' || (p.modo === 'sistema' && !!mqEscuro()?.matches) ? 'dark' : 'light';

/** Aplica o tema no <html> e nas metas theme-color. */
export const aplicarTema = (p: PreferenciaTema) => {
  if (typeof document === 'undefined') return;
  const efetivo = temaEfetivo(p);
  const raiz = document.documentElement;
  raiz.setAttribute('data-theme', efetivo);
  raiz.setAttribute('data-variante', p.variante);
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach(m => {
    // "Sistema": cada meta segue a sua media; tema forçado: as duas mostram a cor escolhida.
    if (p.modo === 'sistema') m.content = m.media.includes('dark') ? COR_BARRA[p.variante] : COR_BARRA.light;
    else m.content = efetivo === 'dark' ? COR_BARRA[p.variante] : COR_BARRA.light;
  });
};

let atual: PreferenciaTema = typeof window !== 'undefined' ? ler() : PADRAO;
let versao = 0; // muda quando o sistema troca claro/escuro (afeta o efetivo no modo Sistema)
const ouvintes = new Set<() => void>();
const avisar = () => { versao++; ouvintes.forEach(f => f()); };

if (typeof window !== 'undefined') {
  aplicarTema(atual);
  mqEscuro()?.addEventListener?.('change', () => { if (atual.modo === 'sistema') { aplicarTema(atual); avisar(); } });
  window.addEventListener('storage', e => { if (e.key === CHAVE_TEMA) { atual = ler(); aplicarTema(atual); avisar(); } });
}

/** Grava a preferência (localStorage + <html>). O callback opcional persiste no perfil. */
export const definirTema = (p: Partial<PreferenciaTema>) => {
  atual = normalizarTema({ ...atual, ...p });
  try { localStorage.setItem(CHAVE_TEMA, JSON.stringify(atual)); } catch { /* modo privado */ }
  aplicarTema(atual);
  avisar();
  return atual;
};

/** Ao logar: adota a preferência salva no perfil se este aparelho ainda não tem uma. */
export const adotarTemaDoPerfil = (doPerfil: unknown) => {
  if (!doPerfil) return;
  let temLocal = false;
  try { temLocal = !!localStorage.getItem(CHAVE_TEMA); } catch { /* */ }
  if (!temLocal) definirTema(normalizarTema(doPerfil));
};

const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };
const instantaneo = () => `${atual.modo}|${atual.variante}|${versao}`;

export const useTema = () => {
  useSyncExternalStore(assinar, instantaneo, instantaneo);
  const efetivo = temaEfetivo(atual);
  return {
    ...atual,
    efetivo,
    definir: definirTema,
    /** Atalho lua/sol: alterna Claro ↔ Escuro (sai do modo Sistema). */
    alternar: () => definirTema({ modo: efetivo === 'dark' ? 'claro' : 'escuro' }),
  };
};
