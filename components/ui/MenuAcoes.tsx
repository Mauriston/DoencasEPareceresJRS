// Ficheiro: components/ui/MenuAcoes.tsx
// Botão de três pontinhos verticais que abre um menu de ações (ex.: linha de
// tabela). Posição fixa calculada a partir do botão, para não ser cortado por
// containers com overflow. Fecha com Esc, clique fora, rolagem ou ao escolher.
import React, { useEffect, useRef, useState } from 'react';

export interface ItemMenu {
  rotulo: string;
  icone: string;
  onClick: () => void;
  perigo?: boolean;
}

export const MenuAcoes: React.FC<{ rotulo: string; itens: ItemMenu[] }> = ({ rotulo, itens }) => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const fechar = () => { setPos(null); botao.current?.focus(); };

  useEffect(() => {
    if (!pos) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const fora = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node) && !botao.current?.contains(e.target as Node)) setPos(null); };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); fechar(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els: HTMLElement[] = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        const i = els.indexOf(document.activeElement as HTMLElement);
        els[(i + (e.key === 'ArrowDown' ? 1 : els.length - 1)) % els.length]?.focus();
      }
    };
    const soltar = () => setPos(null);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla, true);
    window.addEventListener('scroll', soltar, true);
    window.addEventListener('resize', soltar);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla, true);
      window.removeEventListener('scroll', soltar, true);
      window.removeEventListener('resize', soltar);
    };
  }, [pos]);

  const alternar = () => {
    if (pos) { setPos(null); return; }
    const r = botao.current!.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  return (
    <>
      <button
        ref={botao} type="button" onClick={alternar} aria-label={rotulo} aria-haspopup="menu" aria-expanded={!!pos}
        className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      >
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">more_vert</span>
      </button>
      {pos && (
        <div ref={menu} role="menu" aria-label={rotulo} style={{ position: 'fixed', top: pos.top, right: pos.right }} className="z-[150] min-w-[180px] bg-white border border-line rounded-lg shadow-xl py-1">
          {itens.map(i => (
            <button
              key={i.rotulo} type="button" role="menuitem"
              onClick={() => { setPos(null); i.onClick(); }}
              className={`w-full min-h-[44px] px-4 flex items-center gap-3 text-sm font-semibold text-left hover:bg-thead focus:bg-thead focus:outline-none ${i.perigo ? 'text-wine' : 'text-ink'}`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{i.icone}</span>
              {i.rotulo}
            </button>
          ))}
        </div>
      )}
    </>
  );
};
