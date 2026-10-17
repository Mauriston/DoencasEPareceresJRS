// Ficheiro: components/ui/Drawer.tsx
// Painel de formulário que se adapta à tela: barra lateral à direita no
// desktop (≥ md) e bottom sheet no mobile. Mesmo contrato do Dialog (título,
// ícone, corpo, rodapé de ações); fecha com Esc e ao tocar fora.
import React, { useEffect, useId, useRef } from 'react';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';

interface DrawerProps {
  title: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ title, icon, onClose, children, footer }) => {
  const isDesktop = useIsDesktop();
  const titleId = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    painel.current?.focus();
  }, []);
  useEscapeEmpilhado(onClose);

  return (
    <div className="fixed inset-0 z-drawer">
      <div className="absolute inset-0 bg-black/50 animate-backdrop-in" onMouseDown={onClose} aria-hidden="true" />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute bg-white flex flex-col overflow-hidden focus:outline-none shadow-2xl ${
          isDesktop
            ? 'right-0 top-0 h-full w-full max-w-[480px] border-l border-line animate-drawer-in'
            : 'left-0 right-0 bottom-0 rounded-t-2xl max-h-[92dvh] animate-sheet-up'
        }`}
      >
        {!isDesktop && <div className="pt-2.5 pb-1 flex justify-center shrink-0 bg-white" aria-hidden="true"><span className="w-10 h-1 rounded-full bg-line" /></div>}
        <div className="px-5 py-3 bg-white border-b border-line flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{icon}</span>}
            <h2 id={titleId} className="font-heading font-extrabold text-h2 text-navy truncate">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-ink-3 hover:text-navy hover:bg-thead transition-colors">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 text-sm text-ink">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
};
