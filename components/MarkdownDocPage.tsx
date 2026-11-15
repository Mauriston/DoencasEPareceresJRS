// Ficheiro: components/MarkdownDocPage.tsx
// Página genérica para exibir um documento (capítulo/anexo da DGPM-406, etc.)
// renderizado a partir de Markdown. O nível "documento" é uma rota da página que
// o usa (ex.: ?doc=capitulo-c4) e aparece na trilha de navegação da topbar.
import React from 'react';
import { MarkdownContent } from './MarkdownContent';
import { Container, PageHeader } from './ui/Page';
import { useBreadcrumbs } from '../context/BreadcrumbContext';
import type { OpcoesNorma } from '../utils/normaMarkdown';

interface MarkdownDocPageProps {
  title: string;
  subtitle?: string;
  markdown: string;
  /** Card fixo à esquerda no desktop (ex.: menu de navegação entre capítulos). */
  sidebar?: React.ReactNode;
  /** Ações no canto superior direito do título (ex.: botão de download do PDF). */
  actions?: React.ReactNode;
  /** Opt-in do renderizador de texto normativo (ver MarkdownContent). Padrão: marked puro. */
  estruturado?: boolean | OpcoesNorma;
}

export const MarkdownDocPage: React.FC<MarkdownDocPageProps> = ({ title, subtitle, markdown, sidebar, actions, estruturado }) => {
  useBreadcrumbs([{ label: title }]);
  return (
    <div className="flex flex-col flex-1 py-6 md:py-8 pt-4 md:pt-8 pb-10">
      <Container size={sidebar ? 'data' : 'reading'}>
        <PageHeader title={title} description={subtitle} actions={actions} />
        {/* Padrão D da grade (auditoria v3, L1/L3): índice 3 + texto 9 a partir de @split
            (largura ÚTIL ≥ 960 px, não a da janela). Abaixo disso o índice some e o texto
            ocupa a coluna. Mesmas classes do GradeIndice, com o índice oculto quando empilha. */}
        <div className={sidebar ? '@container' : ''}>
          <div className={sidebar ? 'grid grid-cols-1 @split:grid-cols-12 gap-6 items-start' : ''}>
            {sidebar && (
              <div className="hidden @split:block @split:col-span-3 @split:sticky @split:top-4 min-w-0">
                {sidebar}
              </div>
            )}
            {/* Coluna de leitura: ~70 caracteres por linha. No celular, sem card em
                volta do texto (auditoria v3, PT7: 16 px do container + 24 px do card
                somavam 40 px de margem de cada lado). */}
            <div className={`md:bg-white md:p-8 md:rounded-xl md:border md:border-line max-w-reading w-full min-w-0 ${sidebar ? '@split:col-span-9' : ''}`}>
              <MarkdownContent markdown={markdown} estruturado={estruturado} />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};
