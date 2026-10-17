// Ficheiro: components/ui/Dialog.tsx
// Diálogo único do app: faixa navy com título (ícone em ouro, que é o único uso
// de ouro sobre navy), corpo e rodapé de ações. Fecha com Esc e ao tocar fora
// (salvo `travado`). Erros de validação NÃO abrem diálogo — vão inline no campo;
// avisos vão em Toast; sucesso vira página de resultado.
import React, { useEffect, useId, useRef } from 'react';
import { Button } from './Button';
import { useEscapeEmpilhado } from '../../hooks/useEscapeEmpilhado';

interface DialogProps {
  title: string;
  /** Material Symbol da faixa de título. */
  icon?: string;
  onClose: () => void;
  /** Impede fechar por Esc/fora/botão (ex.: etapa obrigatória). */
  travado?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const LARGURA = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export const Dialog: React.FC<DialogProps> = ({ title, icon, onClose, travado = false, size = 'sm', children, footer }) => {
  const titleId = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    painel.current?.focus();
  }, []);
  useEscapeEmpilhado(onClose, !travado);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onMouseDown={e => { if (e.target === e.currentTarget && !travado) onClose(); }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white rounded-xl shadow-2xl border border-line w-full ${LARGURA[size]} max-h-[90vh] flex flex-col overflow-hidden focus:outline-none`}
      >
        <div className="px-4 py-3 bg-navy text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="material-symbols-outlined text-[20px] text-gold shrink-0" aria-hidden="true">{icon}</span>}
            <h2 id={titleId} className="font-heading font-bold text-sm text-white truncate">{title}</h2>
          </div>
          {!travado && (
            <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
            </button>
          )}
        </div>
        <div className="p-5 overflow-y-auto flex-1 text-sm text-ink">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva: o botão de confirmação fica contornado em vinho. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive = false, onConfirm, onCancel }) => (
  <Dialog
    title={title}
    icon={destructive ? 'warning' : 'help'}
    onClose={onCancel}
    footer={(
      <>
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </>
    )}
  >
    <p className="leading-relaxed">{message}</p>
  </Dialog>
);
