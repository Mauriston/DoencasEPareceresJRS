// Ficheiro: components/shell/TituloPagina.tsx
// Título da página na topbar do celular (auditoria v3, M9/4b). No celular a topbar mostra
// "‹" (pai) + o título da página como <h1>; o PageHeader esconde o próprio <h1> abaixo de md
// para o título não ser dito duas vezes. No desktop (≥ md) nada muda: a topbar mostra a trilha
// e o <h1> é o do PageHeader. Como o h1 que sobra fica com display:none, só um h1 por página
// chega aos leitores de tela em cada largura.
//
// Uso (PageHeader):
//   const naTopbar = useTituloPagina(title);
//   <h1 className={`${naTopbar ? 'hidden md:block' : ''} text-h1 …`}>{title}</h1>
// Fora do shell (sem provider, ex.: páginas públicas), useTituloPagina devolve false e o
// PageHeader mantém o h1 visível.
import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';

interface Registro { id: string; titulo: string }

interface TituloPaginaContextType {
  /** Título registrado mais recente (null = nenhum PageHeader montado). */
  titulo: string | null;
  registrar: (id: string, titulo: string) => void;
  remover: (id: string) => void;
}

const TituloPaginaContext = createContext<TituloPaginaContextType | null>(null);

export const TituloPaginaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pilha: um detalhe aberto sobre a lista (dois PageHeaders) mostra o mais recente.
  const [pilha, setPilha] = useState<Registro[]>([]);
  // Funções estáveis (setState funcional): o efeito de quem registra não re-roda a cada troca.
  const registrar = useCallback((id: string, titulo: string) => setPilha(p => {
    const i = p.findIndex(r => r.id === id);
    if (i >= 0) { if (p[i].titulo === titulo) return p; const n = [...p]; n[i] = { id, titulo }; return n; }
    return [...p, { id, titulo }];
  }), []);
  const remover = useCallback((id: string) => setPilha(p => (p.some(r => r.id === id) ? p.filter(r => r.id !== id) : p)), []);
  const titulo = pilha.length ? pilha[pilha.length - 1].titulo : null;
  const value = useMemo<TituloPaginaContextType>(() => ({ titulo, registrar, remover }), [titulo, registrar, remover]);
  return <TituloPaginaContext.Provider value={value}>{children}</TituloPaginaContext.Provider>;
};

/** Título que a topbar deve mostrar no celular (null = usar o rótulo da trilha). */
export const useTituloNaTopbar = (): string | null => useContext(TituloPaginaContext)?.titulo ?? null;

/**
 * A página declara o próprio título para a topbar do celular. Devolve true quando o shell
 * está mostrando esse título como <h1> (o chamador deve então esconder o seu h1 abaixo de md).
 * `null`/vazio não registra nada.
 */
export const useTituloPagina = (titulo: string | null | undefined): boolean => {
  const ctx = useContext(TituloPaginaContext);
  const id = useId();
  const registrar = ctx?.registrar;
  const remover = ctx?.remover;
  useEffect(() => {
    if (!registrar || !remover || !titulo) return;
    registrar(id, titulo);
    return () => remover(id);
  }, [id, titulo, registrar, remover]);
  return !!ctx && !!titulo;
};
