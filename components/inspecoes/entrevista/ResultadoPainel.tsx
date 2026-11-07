// Ficheiro: components/inspecoes/entrevista/ResultadoPainel.tsx
// Moldura do resultado da entrevista: Dialog largo (xl) no computador e TELA CHEIA no celular
// (a anamnese e a transcrição são longas; o bottom sheet arrastável atrapalharia a leitura).
// Abre num portal no <body>: é aberto de dentro do Drawer da IS, que se move com transform.
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '../../ui/Dialog';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { useEscapeEmpilhado } from '../../../hooks/useEscapeEmpilhado';

interface Props {
  title: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const TelaCheia: React.FC<Props> = ({ title, icon, onClose, children, footer }) => {
  const titleId = useId();
  const painel = useRef<HTMLDivElement>(null);
  useEffect(() => { painel.current?.focus(); }, []);
  useEscapeEmpilhado(onClose);
  return (
    <div
      ref={painel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-dialog bg-white flex flex-col focus:outline-none animate-fade-in"
    >
      <div className="px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-navy text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="material-symbols-outlined text-[20px] text-gold shrink-0" aria-hidden="true">{icon}</span>}
          <h2 id={titleId} className="font-heading font-bold text-base text-white truncate">{title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
      </div>
      <div className="p-4 overflow-y-auto flex-1 text-sm text-ink">{children}</div>
      {footer && <div className="px-4 py-3 border-t border-line flex flex-col-reverse gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </div>
  );
};

export const ResultadoPainel: React.FC<Props> = props => {
  const isDesktop = useIsDesktop();
  return createPortal(
    isDesktop
      ? <Dialog title={props.title} icon={props.icon} onClose={props.onClose} size="xl" footer={props.footer}>{props.children}</Dialog>
      : <TelaCheia {...props} />,
    document.body,
  );
};
