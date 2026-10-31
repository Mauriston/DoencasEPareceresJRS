// Ficheiro: components/StoragePdfButtons.tsx
// Botões de download de PDF: botão secundário rotulado no desktop e botão
// flutuante rotulado no mobile, que acompanha a rolagem. Usados nas páginas renderizadas
// de capítulos/anexos da DGPM-406 e da Portaria.
import React from 'react';

interface StoragePdfButtonProps {
  busy: boolean;
  onClick: () => void;
}

// Classes de tamanho literais (o Tailwind não detecta classes montadas em runtime).
const icon = (busy: boolean, sizeClass: string) => (
  <span className={`material-symbols-outlined ${sizeClass} ${busy ? 'animate-spin' : ''}`}>
    {busy ? 'progress_activity' : 'download'}
  </span>
);

/** Botão rotulado no desktop (esconde no mobile). */
export const StoragePdfIconButton: React.FC<StoragePdfButtonProps> = ({ busy, onClick }) => (
  <button
    type="button"
    disabled={busy}
    onClick={onClick}
    title="Baixar em PDF"
    className="hidden md:inline-flex min-h-[44px] px-4 gap-2 rounded-lg text-sm font-bold text-navy bg-white border border-navy hover:bg-thead transition-colors items-center justify-center disabled:opacity-50"
  >
    {icon(busy, 'text-[20px]')}
    Baixar PDF
  </button>
);

/** Botão flutuante no mobile (esconde no desktop). `bottomClass` ajusta a altura. */
export const StoragePdfFab: React.FC<StoragePdfButtonProps & { bottomClass?: string }> = ({ busy, onClick, bottomClass = 'bottom-6' }) => (
  <button
    type="button"
    disabled={busy}
    onClick={onClick}
    title="Baixar em PDF"
    className={`md:hidden fixed ${bottomClass} right-4 z-sticky min-h-[44px] pl-3 pr-4 gap-2 rounded-full bg-navy text-white text-sm font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center disabled:opacity-60`}
  >
    {icon(busy, 'text-[22px]')}
    Baixar PDF
  </button>
);
