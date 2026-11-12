// Ficheiro: components/ui/MenuAcoes.tsx
// Botão de três pontinhos verticais que abre um menu de ações (ex.: linha de
// tabela) — ou, com `botao`, um botão secundário com ícone, texto, seta e badge (menu suspenso de cabeçalho). Posição fixa calculada a partir do botão, para não ser cortado por
// containers com overflow. Fecha com Esc, clique fora, rolagem ou ao escolher.
import React, { useEffect, useRef, useState } from 'react';

export interface ItemMenu {
  rotulo: string;
  icone: string;
  onClick: () => void;
  perigo?: boolean;
  /** Item visível mas inativo (aria-disabled: continua focável e anunciado, o clique não faz nada). */
  desabilitado?: boolean;
  /** Linha menor abaixo do rótulo (ex.: por que o item está desabilitado). */
  dica?: string;
  /** Contador à direita (ex.: pendências); 0 também aparece. */
  contador?: number;
}

/** Gatilho em forma de botão com texto (em vez dos três pontinhos). */
export interface BotaoMenu { texto: string; icone: string; badge?: number; /** Botão primário (navy cheio); padrão: secundário. */ primario?: boolean }

export const MenuAcoes: React.FC<{ rotulo: string; itens: ItemMenu[]; botao?: BotaoMenu }> = ({ rotulo, itens, botao: gatilho }) => {
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
      {gatilho ? (
        <button
          ref={botao} type="button" onClick={alternar} aria-haspopup="menu" aria-expanded={!!pos}
          aria-label={gatilho.badge ? `${rotulo} (${gatilho.badge} pendente${gatilho.badge > 1 ? 's' : ''})` : rotulo}
          className={`relative inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold border border-navy transition-colors ${gatilho.primario ? 'bg-navy text-white hover:bg-navy-hover' : 'bg-white text-navy hover:bg-thead'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold`}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{gatilho.icone}</span>
          {gatilho.texto}
          <span className="material-symbols-outlined text-[20px] -mr-1" aria-hidden="true">{pos ? 'expand_less' : 'expand_more'}</span>
          {!!gatilho.badge && (
            <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-wine text-white text-xs font-bold leading-5 text-center ring-2 ring-white">
              {gatilho.badge > 99 ? '99+' : gatilho.badge}
            </span>
          )}
        </button>
      ) : (
        <button
          ref={botao} type="button" onClick={alternar} aria-label={rotulo} aria-haspopup="menu" aria-expanded={!!pos}
          className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">more_vert</span>
        </button>
      )}
      {pos && (
        <div ref={menu} role="menu" aria-label={rotulo} style={{ position: 'fixed', top: pos.top, right: pos.right }} className="z-dialog min-w-[220px] bg-white border border-line rounded-lg shadow-xl py-1">
          {itens.map(i => (
            <button
              key={i.rotulo} type="button" role="menuitem" aria-disabled={i.desabilitado || undefined}
              onClick={() => { if (i.desabilitado) return; setPos(null); i.onClick(); }}
              className={`w-full min-h-[44px] px-4 py-1.5 flex items-center gap-3 text-sm font-semibold text-left focus:outline-none ${i.desabilitado ? 'text-ink-4 cursor-not-allowed focus:bg-thead' : `hover:bg-thead focus:bg-thead ${i.perigo ? 'text-wine' : 'text-ink'}`}`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{i.icone}</span>
              <span className="flex flex-col min-w-0 flex-1">
                {i.rotulo}
                {i.dica && <span className="text-xs font-normal text-ink-3 max-w-[16rem] truncate" title={i.dica}>{i.dica}</span>}
              </span>
              {i.contador !== undefined && (
                <span className={`ml-4 min-w-[1.5rem] text-right tabular-nums font-bold ${i.desabilitado ? 'text-ink-4' : i.contador > 0 ? 'text-wine' : 'text-ink-3'}`} aria-label={`${i.contador} pendente${i.contador !== 1 ? 's' : ''}`}>{i.contador}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
};
