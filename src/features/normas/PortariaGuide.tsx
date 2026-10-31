// Ficheiro: components/PortariaGuide.tsx
import React, { useMemo } from 'react';
import { Container, PageHeader } from '@/components/ui/Page';
import { useBackToTop } from '@/hooks/useBackToTop';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ArrowUp } from '@/components/ui/icons';
import { StoragePdfIconButton, StoragePdfFab } from '@/components/StoragePdfButtons';
import { useStoragePdf } from '@/hooks/useStoragePdf';
import { PORTARIA_PDF_PATH } from '@/services/firebaseStorageNormas';

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
  /**
   * Versão pública (sem login): esconde o download do PDF, que vem do Firebase
   * Storage e exige usuário autenticado (ver storage.rules). O texto integral
   * da Portaria continua na tela — vem dos .md do próprio bundle.
   */
  publico?: boolean;
}

export const PortariaGuide: React.FC<PortariaGuideProps> = ({ publico = false }) => {
  const { visivel: showScrollTop, irAoTopo } = useBackToTop(250);
  const { open: openPdf, busy: baixandoPdf, modalElement } = useStoragePdf();
  const baixar = () => openPdf(PORTARIA_PDF_PATH, 'Portaria GM-MD nº 3.551/2021');

  const markdown = useMemo(() => portariaMarkdown, []);

  return (
    <div className="flex flex-col flex-1 relative">
      <Container size="reading" className="py-6 md:py-8 pb-10">
        <PageHeader
          title="Portaria GM-MD nº 3.551/2021"
          description="Diretrizes e Normas Técnicas Periciais Oficiais das Forças Armadas, de 26 de agosto de 2021."
          actions={publico ? undefined : <StoragePdfIconButton busy={baixandoPdf} onClick={baixar} />}
        />
        <div className="bg-white p-6 md:p-8 rounded-xl border border-line">
          <MarkdownContent markdown={markdown} />
        </div>
      </Container>

      {/* Mobile: botão flutuante de download, acima do "voltar ao topo". */}
      {!publico && <StoragePdfFab busy={baixandoPdf} onClick={baixar} bottomClass="bottom-[5.5rem]" />}
      {modalElement}

      {showScrollTop && (
        <button
          type="button"
          onClick={irAoTopo}
          className="fixed bottom-6 right-4 bg-navy text-white shadow-lg rounded-full min-h-[44px] pl-3 pr-4 gap-2 hover:bg-navy-hover active:scale-95 transition-all z-50 flex items-center justify-center text-sm font-bold"
        >
          <ArrowUp size={20} />
          Topo
        </button>
      )}
    </div>
  );
};
