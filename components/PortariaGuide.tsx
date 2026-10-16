// Ficheiro: components/PortariaGuide.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Header } from './Header';
import { MarkdownContent } from './MarkdownContent';
import { ArrowUp } from './ui/icons';
import { StoragePdfIconButton, StoragePdfFab } from './StoragePdfButtons';
import { useStoragePdf } from '../hooks/useStoragePdf';
import { PORTARIA_PDF_PATH } from '../services/firebaseStorageNormas';

// Carrega todos os .md da Portaria 3.551/2021 e concatena na ordem dos
// arquivos (00-preliminares, 01-alienacao-mental, ..., 17-fibrose-cistica),
// que é a ordem das doenças previstas em lei extraída do documento original.
const portariaModules = import.meta.glob('../content/portaria-3551-2021/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const portariaMarkdown = Object.keys(portariaModules)
  .sort()
  .map(key => portariaModules[key])
  .join('\n\n---\n\n');

interface PortariaGuideProps {
  onBack?: () => void;
}

export const PortariaGuide: React.FC<PortariaGuideProps> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { open: openPdf, busy: baixandoPdf, modalElement } = useStoragePdf();
  const baixar = () => openPdf(PORTARIA_PDF_PATH, 'Portaria GM-MD nº 3.551/2021');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) setShowScrollTop(true);
      else setShowScrollTop(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const markdown = useMemo(() => portariaMarkdown, []);

  return (
    <div className="flex flex-col h-full bg-canvas relative">
      <Header title="Portaria na Integra" onBack={onBack} />

      <div className="p-4 md:p-6 space-y-4 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full flex-1">
        <div className="relative text-center bg-white p-5 md:p-6 rounded-2xl border border-gray-200/60 shadow-sm">
          <h2 className="text-base font-heading font-bold text-navy md:px-10">PORTARIA GM-MD Nº 3.551, DE 26 DE AGOSTO DE 2021</h2>
          <p className="text-sm text-gray-500 font-body mt-1 md:px-10">Diretrizes e Normas Técnicas Periciais Oficiais das Forças Armadas.</p>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            <StoragePdfIconButton busy={baixandoPdf} onClick={baixar} />
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm">
          <MarkdownContent markdown={markdown} />
        </div>
      </div>

      {/* Mobile: botão flutuante de download, acima do "voltar ao topo". */}
      <StoragePdfFab busy={baixandoPdf} onClick={baixar} bottomClass="bottom-40" />
      {modalElement}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 bg-navy text-white shadow-2xl rounded-full p-4 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-slate-700"
          title="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};
