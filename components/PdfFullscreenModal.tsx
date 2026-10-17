// Ficheiro: components/PdfFullscreenModal.tsx
// Modal em tela cheia (desktop) para visualizar um PDF já hospedado (ex.:
// Firebase Storage) num iframe, com botões de abrir em nova aba e fechar.
import React, { useEffect } from 'react';

interface PdfFullscreenModalProps {
  title: string;
  url: string;
  onClose: () => void;
}

export const PdfFullscreenModal: React.FC<PdfFullscreenModalProps> = ({ title, url, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-dialog bg-black/70 flex flex-col animate-fade-in">
      <div className="p-3 bg-navy text-white flex items-center justify-between shrink-0">
        <h3 className="font-heading font-bold text-sm truncate">{title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir em nova aba"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center"
          >
            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
          </a>
          <button onClick={onClose} title="Fechar" className="p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>
      <iframe src={url} title={title} className="flex-1 w-full bg-white" />
    </div>
  );
};
