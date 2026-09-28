// Ficheiro: components/MarkdownDocPage.tsx
// Página genérica para exibir um documento (capítulo/anexo da DGPM-406, etc.)
// renderizado a partir de Markdown, com botão de voltar próprio (não altera a
// navegação global — quem usa controla a própria view interna de "detalhe").
import React from 'react';
import { Header } from './Header';
import { MarkdownContent } from './MarkdownContent';

interface MarkdownDocPageProps {
  title: string;
  subtitle?: string;
  markdown: string;
  onBack: () => void;
  /** Card fixo à esquerda no desktop (ex.: menu de navegação entre capítulos). */
  sidebar?: React.ReactNode;
}

export const MarkdownDocPage: React.FC<MarkdownDocPageProps> = ({ title, subtitle, markdown, onBack, sidebar }) => (
  <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
    <Header title={title} onBack={onBack} />
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl md:max-w-5xl mx-auto w-full flex-1">
      <div className={sidebar ? 'md:grid md:grid-cols-[260px_1fr] md:gap-6 md:items-start' : ''}>
        {sidebar && (
          <div className="hidden md:block sticky top-[104px]">
            {sidebar}
          </div>
        )}
        <div>
          {subtitle && (
            <div className="text-center bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm mb-4">
              <p className="text-xs md:text-sm text-gray-500 font-body">{subtitle}</p>
            </div>
          )}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm">
            <MarkdownContent markdown={markdown} />
          </div>
        </div>
      </div>
    </div>
  </div>
);
