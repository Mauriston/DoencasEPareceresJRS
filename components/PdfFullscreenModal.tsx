// Ficheiro: components/PdfFullscreenModal.tsx
// Modal em tela cheia (desktop) para visualizar um PDF já hospedado (ex.:
// Firebase Storage) num iframe, com botões de abrir em nova aba e fechar.
// Renderizado no <body> (portal) para cobrir a tela mesmo aberto de dentro de
// um Drawer; o Esc fecha só ele (pilha de camadas).
import React from 'react';
import { createPortal } from 'react-dom';
import { useEscapeEmpilhado } from '../hooks/useEscapeEmpilhado';

interface PdfFullscreenModalProps {
  title: string;
  url: string;
  onClose: () => void;
}

export const PdfFullscreenModal: React.FC<PdfFullscreenModalProps> = ({ title, url, onClose }) => {
  useEscapeEmpilhado(onClose);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-dialog bg-black/70 flex flex-col animate-fade-in">
      <div className="p-3 bg-navy text-white flex items-center justify-between shrink-0">
        <h3 className="font-heading font-bold text-sm text-white truncate">{title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir em nova aba"
            aria-label="Abrir em nova aba"
            className="w-11 h-11 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">open_in_new</span>
          </a>
          <button type="button" onClick={onClose} title="Fechar" aria-label="Fechar" autoFocus className="w-11 h-11 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>
      </div>
      <iframe src={url} title={title} className="flex-1 w-full bg-white" />
    </div>,
    document.body,
  );
};
