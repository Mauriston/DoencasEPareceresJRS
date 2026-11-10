// Ficheiro: components/ui/AcoesRodape.tsx
// Ações do rodapé de um Drawer/bottom sheet, adaptadas à tela:
//  • desktop (≥ md): os Buttons do DS lado a lado, na ordem dada (como os rodapés de sempre);
//  • mobile (< md): um FAB flutuante no canto inferior direito (Material 3). Com 1 ação, FAB
//    "extended" (ícone + texto); com 2+, FAB menu: o botão `add` vira `close` e abre uma pilha
//    de pílulas (ícone + texto), alinhadas à direita acima dele. Fecha ao tocar fora, ao
//    escolher uma ação ou com Esc.
// "Fechar"/"Cancelar" que só fecham o sheet não entram aqui (no mobile o sheet fecha no X ou
// arrastando). O corpo rolável do sheet deve ter `data-sheet-corpo` (o Drawer já tem) para
// ganhar folga embaixo e o FAB não cobrir o fim do conteúdo — ver styles/app.css.
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';
import { Button } from './Button';

export interface AcaoRodape {
  id: string;
  rotulo: string;
  /** Material Symbol. */
  icone: string;
  onClick: () => void;
  variante?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
}

interface Props {
  acoes: AcaoRodape[];
  /** Classes extras do contêiner da barra de botões (desktop). */
  className?: string;
}

/** Submete um <form> pelo id — para ações de rodapé que salvam um formulário (valida como o submit nativo). */
export const submeterFormulario = (formId: string) => {
  const form = document.getElementById(formId);
  if (form instanceof HTMLFormElement) form.requestSubmit();
};

const COR_FAB: Record<NonNullable<AcaoRodape['variante']>, string> = {
  primary: 'bg-navy text-white border border-navy hover:bg-navy-hover active:bg-navy-pressed',
  secondary: 'bg-white text-navy border border-navy hover:bg-thead',
  destructive: 'bg-white text-wine border border-wine hover:bg-wine-50',
};

const FOCO = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';
// Canto inferior direito, acima da área segura (barra de gestos do iPhone).
const POSICAO = 'fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10';

const Icone: React.FC<{ acao: AcaoRodape }> = ({ acao }) => (
  <span className={`material-symbols-outlined text-[24px] shrink-0 ${acao.loading ? 'animate-spin' : ''}`} aria-hidden="true">
    {acao.loading ? 'progress_activity' : acao.icone}
  </span>
);

const FabMenu: React.FC<{ acoes: AcaoRodape[] }> = ({ acoes }) => {
  const [aberto, setAberto] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) fab.current?.focus();
  }, []);
  useEscapeEmpilhado(() => fechar(), aberto);

  // Ao abrir, o foco vai para o primeiro item disponível.
  useEffect(() => {
    if (!aberto) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [aberto]);

  const navegar = (e: React.KeyboardEvent) => {
    const itens: HTMLButtonElement[] = menu.current ? Array.from(menu.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')) : [];
    if (!itens.length) return;
    const i = itens.indexOf(document.activeElement as HTMLButtonElement);
    const ir = (n: number) => { e.preventDefault(); itens[(n + itens.length) % itens.length].focus(); };
    if (e.key === 'ArrowDown') ir(i + 1);
    else if (e.key === 'ArrowUp') ir(i - 1);
    else if (e.key === 'Home') ir(0);
    else if (e.key === 'End') ir(itens.length - 1);
    else if (e.key === 'Tab') fechar(false);
  };

  const escolher = (a: AcaoRodape) => {
    fechar();
    a.onClick();
  };

  return (
    <>
      {/* Toque fora fecha só o menu (não o sheet). */}
      {aberto && <div className="fixed inset-0 z-10 bg-black/10 animate-backdrop-in" onClick={() => fechar()} aria-hidden="true" />}
      <div data-acoes-fab="" className={`${POSICAO} flex flex-col items-end gap-3`}>
        {aberto && (
          <div ref={menu} id={menuId} role="menu" aria-label="Ações" onKeyDown={navegar} className="flex flex-col items-end gap-2">
            {acoes.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                disabled={a.disabled || a.loading}
                aria-busy={a.loading || undefined}
                onClick={() => escolher(a)}
                style={{ animationDelay: `${(acoes.length - 1 - i) * 30}ms` }}
                className={`fab-item-in inline-flex items-center gap-2 h-14 max-w-[calc(100vw-2rem)] pl-4 pr-5 rounded-full shadow-lg text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${FOCO} ${COR_FAB[a.variante ?? 'primary']}`}
              >
                <Icone acao={a} />
                <span className="truncate">{a.rotulo}</span>
              </button>
            ))}
          </div>
        )}
        <button
          ref={fab}
          type="button"
          aria-label={aberto ? 'Fechar ações' : 'Ações'}
          aria-haspopup="menu"
          aria-expanded={aberto}
          aria-controls={aberto ? menuId : undefined}
          onClick={() => (aberto ? fechar() : setAberto(true))}
          className={`inline-flex items-center justify-center w-14 h-14 shadow-lg bg-navy text-white border border-navy hover:bg-navy-hover active:bg-navy-pressed transition-[border-radius,background-color] duration-200 ${aberto ? 'rounded-full' : 'rounded-2xl'} ${FOCO}`}
        >
          <span className={`material-symbols-outlined text-[26px] transition-transform duration-200 ${aberto ? 'rotate-90' : ''}`} aria-hidden="true">
            {aberto ? 'close' : 'add'}
          </span>
        </button>
      </div>
    </>
  );
};

export const AcoesRodape: React.FC<Props> = ({ acoes, className = '' }) => {
  const isDesktop = useIsDesktop();
  if (!acoes.length) return null;

  if (isDesktop) {
    const botoes = acoes.map(a => (
      <Button key={a.id} variant={a.variante ?? 'primary'} icon={a.icone} onClick={a.onClick} disabled={a.disabled} loading={a.loading}>
        {a.rotulo}
      </Button>
    ));
    // Sem className, os botões entram direto no flex do rodapé (alinhados aos vizinhos, ex.: "Cancelar").
    return className ? <div className={`flex flex-row flex-wrap items-center justify-end gap-2 ${className}`}>{botoes}</div> : <>{botoes}</>;
  }

  if (acoes.length === 1) {
    const a = acoes[0];
    return (
      <div data-acoes-fab="" className={POSICAO}>
        <button
          type="button"
          onClick={a.onClick}
          disabled={a.disabled || a.loading}
          aria-busy={a.loading || undefined}
          className={`inline-flex items-center gap-2 h-14 max-w-[calc(100vw-2rem)] pl-4 pr-5 rounded-2xl shadow-lg text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${FOCO} ${COR_FAB[a.variante ?? 'primary']}`}
        >
          <Icone acao={a} />
          <span className="truncate">{a.rotulo}</span>
        </button>
      </div>
    );
  }

  return <FabMenu acoes={acoes} />;
};
