// Ficheiro: components/MarkdownDocPage.tsx
// Página genérica para exibir um documento (capítulo/anexo da DGPM-406, etc.)
// renderizado a partir de Markdown. O nível "documento" é uma rota da página que
// o usa (ex.: ?doc=capitulo-c4) e aparece na trilha de navegação da topbar.
import React from 'react';
import { MarkdownContent } from './MarkdownContent';
import { Container, PageHeader } from './ui/Page';
import { useBreadcrumbs } from '../context/BreadcrumbContext';

interface MarkdownDocPageProps {
  title: string;
  subtitle?: string;
  markdown: string;
  /** Card fixo à esquerda no desktop (ex.: menu de navegação entre capítulos). */
  sidebar?: React.ReactNode;
  /** Ações no canto superior direito do título (ex.: botão de download do PDF). */
  actions?: React.ReactNode;
}

export const MarkdownDocPage: React.FC<MarkdownDocPageProps> = ({ title, subtitle, markdown, sidebar, actions }) => {
  useBreadcrumbs([{ label: title }]);
  return (
    <div className="flex flex-col flex-1 animate-fade-in py-6 md:py-8 pb-10">
      <Container size={sidebar ? 'data' : 'reading'}>
        <PageHeader title={title} description={subtitle} actions={actions} />
        <div className={sidebar ? 'md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-6 md:items-start' : ''}>
          {sidebar && (
            <div className="hidden md:block sticky top-6">
              {sidebar}
            </div>
          )}
          {/* Coluna de leitura: ~70 caracteres por linha. */}
          <div className="bg-white p-6 md:p-8 rounded-xl border border-line max-w-reading w-full">
            <MarkdownContent markdown={markdown} />
          </div>
        </div>
      </Container>
    </div>
  );
};
