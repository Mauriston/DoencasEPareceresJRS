// Ficheiro: components/PdfFullscreenModal.tsx
// Modal em tela cheia (desktop) para visualizar um PDF já hospedado (ex.:
// Firebase Storage) num iframe, com botões de abrir em nova aba e fechar.
// Renderizado no <body> (portal) para cobrir a tela mesmo aberto de dentro de
// um Drawer; o Esc fecha só ele (pilha de camadas).
import React from 'react';
import { createPortal } from 'react-dom';
import { useEscapeEmpilhado } from '../hooks/useEscapeEmpilhado';
import { useUrlArquivo } from '../services/arquivosStorage';

interface PdfFullscreenModalProps {
  title: string;
  url: string;
  onClose: () => void;
}

export const PdfFullscreenModal: React.FC<PdfFullscreenModalProps> = ({ title, url, onClose }) => {
  useEscapeEmpilhado(onClose);
  // PDF do Storage via servidor do app (redes que bloqueiam o Storage, ex.: Firefox nos PCs da Marinha).
  const { src, carregando } = useUrlArquivo(url);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-dialog bg-black/70 flex flex-col animate-fade-in">
      <div className="p-3 bg-navy text-white flex items-center justify-between shrink-0">
        <h3 className="font-heading font-bold text-sm text-white truncate">{title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={src || url}
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
      {carregando
        ? <div role="status" className="flex-1 w-full bg-white flex items-center justify-center gap-2 text-sm font-bold text-navy"><span className="w-5 h-5 border-2 border-navy/20 border-t-navy rounded-full animate-spin" aria-hidden="true" />Abrindo o documento…</div>
        : <iframe src={src} title={title} className="flex-1 w-full bg-white" />}
    </div>,
    document.body,
  );
};
