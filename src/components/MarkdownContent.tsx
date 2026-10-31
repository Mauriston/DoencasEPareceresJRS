// Ficheiro: components/MarkdownContent.tsx
// Renderiza uma string em Markdown (GFM) como HTML estilizado (.md-content,
// definido em public/index.css). Usado pela Portaria e pelas páginas de
// capítulos/anexos da DGPM-406, cujo conteúdo vem de arquivos .md em content/.
import React, { useMemo } from 'react';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

interface MarkdownContentProps {
  markdown: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ markdown, className }) => {
  const html = useMemo(() => marked.parse(markdown) as string, [markdown]);
  return <div className={`md-content${className ? ` ${className}` : ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
