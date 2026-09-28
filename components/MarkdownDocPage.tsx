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
}

export const MarkdownDocPage: React.FC<MarkdownDocPageProps> = ({ title, subtitle, markdown, onBack }) => (
  <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
    <Header title={title} onBack={onBack} />
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto w-full flex-1">
      {subtitle && (
        <div className="text-center bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm mb-4">
          <p className="text-xs text-gray-500 font-body">{subtitle}</p>
        </div>
      )}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
        <MarkdownContent markdown={markdown} />
      </div>
    </div>
  </div>
);
