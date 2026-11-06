// Ficheiro: components/ui/LinkPdf.tsx
// Link para um PDF arquivado (ex.: atestado no Storage). No desktop, abre num modal em
// tela cheia (PdfFullscreenModal) em vez de outra guia; no celular, segue o link (o
// visualizador de PDF do aparelho). Ctrl/Cmd/Shift-clique e o botão do meio mantêm a nova guia.
import React, { useState } from 'react';
import { PdfFullscreenModal } from '../PdfFullscreenModal';
import { useIsDesktop } from '../../hooks/useIsDesktop';

interface Props extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target'> {
  url: string;
  /** Título no topo do modal. */
  tituloPdf: string;
}

export const LinkPdf: React.FC<Props> = ({ url, tituloPdf, onClick, children, ...resto }) => {
  const isDesktop = useIsDesktop();
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <a
        {...resto}
        href={url} target="_blank" rel="noopener noreferrer"
        onClick={e => {
          onClick?.(e);
          if (!isDesktop || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          setAberto(true);
        }}
      >
        {children}
      </a>
      {aberto && <PdfFullscreenModal title={tituloPdf} url={url} onClose={() => setAberto(false)} />}
    </>
  );
};
