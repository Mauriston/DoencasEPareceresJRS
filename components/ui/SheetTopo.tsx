// Ficheiro: components/ui/SheetTopo.tsx
// Sheet do topo: painel horizontal, largura total, que desce do topo da tela sobre um fundo escurecido.
// Para consultas rápidas ligadas ao cabeçalho da página (ex.: dados cadastrais do inspecionado ao tocar
// no nome, na Ficha). Mesmo contrato do Drawer (título, ícone, corpo, rodapé opcional); modal; fecha com
// Esc (pilha de camadas), ao tocar fora e no X. Renderizado no <body> (portal) para não ficar preso a
// contêineres com contenção de layout (@container).
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';

interface SheetTopoProps {
  title: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Conteúdo extra logo após o título (ex.: chip de status). */
  tituloExtra?: React.ReactNode;
}

export const SheetTopo: React.FC<SheetTopoProps> = ({ title, icon, onClose, children, footer, tituloExtra }) => {
  const titleId = useId();
  const painel = useRef<HTMLDivElement>(null);
  useEscapeEmpilhado(onClose);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    painel.current?.focus();
    return () => { anterior?.focus?.(); };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-drawer">
      <div className="absolute inset-0 bg-black/50 animate-backdrop-in" onMouseDown={onClose} aria-hidden="true" />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute left-0 right-0 top-0 max-h-[85dvh] bg-white border-b border-line rounded-b-2xl shadow-2xl flex flex-col overflow-hidden origin-top animate-menu-in focus:outline-none pt-[env(safe-area-inset-top)]"
      >
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 xl:px-8 py-3 border-b border-line flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{icon}</span>}
            <h2 id={titleId} className="font-heading font-extrabold text-h2 text-navy truncate min-w-0">{title}</h2>
            {tituloExtra && <div className="shrink-0 flex items-center">{tituloExtra}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-10 h-10 -mr-2 flex items-center justify-center rounded-lg text-ink-3 hover:text-navy hover:bg-thead transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 xl:px-8 py-4 text-sm text-ink">{children}</div>
        </div>
        {footer && (
          <div className="border-t border-line shrink-0">
            <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 xl:px-8 py-3 flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-2">{footer}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
