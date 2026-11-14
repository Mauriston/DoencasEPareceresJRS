// Ficheiro: components/MarkdownContent.tsx
// Renderiza uma string em Markdown (GFM) como HTML estilizado (.md-content,
// definido em styles/app.css). Usado pela Portaria e pelas páginas de
// capítulos/anexos da DGPM-406, cujo conteúdo vem de arquivos .md em content/.
//
// `estruturado` (opt-in) liga o renderizador de texto normativo de
// utils/normaMarkdown.ts: parágrafos numerados com o número em coluna e id por
// item, alíneas sem bolinha, quadro "Conceito", títulos com id e tabelas em
// contêiner com rolagem. Sem a prop, o HTML é o do marked padrão (como antes).
import React, { useMemo } from 'react';
import { marked } from 'marked';
import { renderizarNorma, type OpcoesNorma } from '../utils/normaMarkdown';

marked.setOptions({ gfm: true, breaks: false });

interface MarkdownContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'dangerouslySetInnerHTML' | 'children'> {
  markdown: string;
  className?: string;
  /** Renderizador de texto normativo (true = opções padrão). As opções devem ser estáveis (useMemo/constante). */
  estruturado?: boolean | OpcoesNorma;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ markdown, className, estruturado, ...rest }) => {
  const html = useMemo(
    () => (estruturado ? renderizarNorma(markdown, estruturado === true ? {} : estruturado) : (marked.parse(markdown) as string)),
    [markdown, estruturado],
  );
  return (
    <div
      {...rest}
      className={`md-content${estruturado ? ' md-norma' : ''}${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
