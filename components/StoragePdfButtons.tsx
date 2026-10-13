// Ficheiro: components/StoragePdfButtons.tsx
// Botões de download de PDF: ícone discreto no desktop e botão flutuante
// (FAB) no mobile, que acompanha a rolagem. Usados nas páginas renderizadas
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

/** Ícone no desktop (esconde no mobile). */
export const StoragePdfIconButton: React.FC<StoragePdfButtonProps> = ({ busy, onClick }) => (
  <button
    type="button"
    disabled={busy}
    onClick={onClick}
    title="Baixar em PDF"
    className="hidden md:flex p-2 rounded-lg text-gray-500 hover:text-[#050F41] hover:bg-gray-100 transition-colors items-center justify-center disabled:opacity-50"
  >
    {icon(busy, 'text-[22px]')}
  </button>
);

/** Botão flutuante no mobile (esconde no desktop). `bottomClass` ajusta a altura. */
export const StoragePdfFab: React.FC<StoragePdfButtonProps & { bottomClass?: string }> = ({ busy, onClick, bottomClass = 'bottom-6' }) => (
  <button
    type="button"
    disabled={busy}
    onClick={onClick}
    title="Baixar em PDF"
    className={`md:hidden fixed ${bottomClass} right-4 z-40 w-14 h-14 rounded-full bg-[#079551] text-white shadow-lg active:scale-95 transition-transform flex items-center justify-center disabled:opacity-60`}
  >
    {icon(busy, 'text-[26px]')}
  </button>
);
