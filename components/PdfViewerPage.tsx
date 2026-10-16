// Ficheiro: components/PdfViewerPage.tsx
// Página genérica para exibir um documento do Google Drive (PDF, na maioria
// dos casos) num Viewer embutido (iframe), sem precisar abrir outra aba ou
// o app do Drive. O nível "documento" é uma rota (?doc=…) da página que o usa.
import React from 'react';
import { Container, PageHeader } from './ui/Page';
import { useBreadcrumbs } from '../context/BreadcrumbContext';

interface PdfViewerPageProps {
  title: string;
  subtitle?: string;
  embedUrl: string;
  /** Card fixo à esquerda no desktop (ex.: menu de navegação entre capítulos). */
  sidebar?: React.ReactNode;
}

export const PdfViewerPage: React.FC<PdfViewerPageProps> = ({ title, subtitle, embedUrl, sidebar }) => {
  useBreadcrumbs([{ label: title }]);
  return (
    <div className="flex flex-col flex-1 animate-fade-in py-6 md:py-8 pb-6">
      <Container size="data" className="flex flex-col flex-1">
        <PageHeader title={title} description={subtitle} />
        <div className={`flex-1 min-h-[480px] h-[calc(100dvh-13rem)] ${sidebar ? 'md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-4' : 'flex'}`}>
          {sidebar && <div className="hidden md:block overflow-y-auto">{sidebar}</div>}
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full rounded-xl border border-line bg-white"
            allow="autoplay"
          />
        </div>
      </Container>
    </div>
  );
};
