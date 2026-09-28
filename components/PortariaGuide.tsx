// Ficheiro: components/PortariaGuide.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Header } from './Header';
import { MarkdownContent } from './MarkdownContent';
import { ArrowUp } from 'lucide-react';

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

export const PortariaGuide: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

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
    <div className="flex flex-col h-full bg-[#F3F5F7] relative">
      <Header title="Portaria na Integra" />

      <div className="p-4 md:p-6 space-y-4 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full flex-1">
        <div className="text-center bg-white p-5 md:p-6 rounded-2xl border border-gray-200/60 shadow-sm">
          <h2 className="text-sm md:text-base font-heading font-bold text-[#050F41]">PORTARIA GM-MD Nº 3.551, DE 26 DE AGOSTO DE 2021</h2>
          <p className="text-xs md:text-sm text-gray-500 font-body mt-1">Diretrizes e Normas Técnicas Periciais Oficiais das Forças Armadas.</p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/60 shadow-sm">
          <MarkdownContent markdown={markdown} />
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 bg-[#050F41] text-white shadow-2xl rounded-full p-4 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-slate-700"
          title="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};
