// Ficheiro: components/ui/LinkPdf.tsx
// Link para um PDF arquivado (ex.: atestado no Storage). Abre SEMPRE em nova aba, no visualizador de PDF
// do navegador/aparelho (services/abrirPdf: URL https real do Storage). Ctrl/Cmd/Shift-clique e o botão
// do meio seguem o link nativo.
import React from 'react';
import { abrirPdf } from '../../services/abrirPdf';

interface Props extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target'> {
  url: string;
  /** Rótulo do PDF (acessibilidade). */
  tituloPdf: string;
}

export const LinkPdf: React.FC<Props> = ({ url, tituloPdf, onClick, children, ...resto }) => (
  <a
    title={tituloPdf}
    {...resto}
    href={url} target="_blank" rel="noopener noreferrer"
    onClick={e => {
      onClick?.(e);
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      abrirPdf(url).catch(() => { /* aba fechada */ });
    }}
  >
    {children}
  </a>
);
