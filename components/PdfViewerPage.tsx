// Ficheiro: components/PdfViewerPage.tsx
// Página genérica para exibir um documento do Google Drive (PDF, na maioria
// dos casos) num Viewer embutido (iframe), sem precisar abrir outra aba ou
// o app do Drive. Usa a mesma URL de preview do Drive em todas as telas que
// hoje abririam o link diretamente.
import React from 'react';
import { Header } from './Header';

interface PdfViewerPageProps {
  title: string;
  subtitle?: string;
  embedUrl: string;
  onBack: () => void;
  /** Card fixo à esquerda no desktop (ex.: menu de navegação entre capítulos). */
  sidebar?: React.ReactNode;
}

export const PdfViewerPage: React.FC<PdfViewerPageProps> = ({ title, subtitle, embedUrl, onBack, sidebar }) => (
  <div className="flex flex-col h-full bg-[#F3F5F7]">
    <Header title={title} onBack={onBack} />
    {subtitle && (
      <p className="px-4 pt-3 text-xs md:text-sm text-gray-500 text-center truncate">{subtitle}</p>
    )}
    <div className={`flex-1 min-h-0 p-2 md:p-4 w-full ${sidebar ? 'md:grid md:grid-cols-[260px_1fr] md:gap-4' : 'flex'}`}>
      {sidebar && <div className="hidden md:block overflow-y-auto">{sidebar}</div>}
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full rounded-xl border border-gray-200/60 bg-white shadow-sm"
        allow="autoplay"
      />
    </div>
  </div>
);
