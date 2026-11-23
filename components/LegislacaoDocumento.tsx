// Ficheiro: components/LegislacaoDocumento.tsx
// Texto de uma norma da página Legislação (?doc=<id>), no padrão da DGPM-406 e da
// Portaria (auditoria v3, §10): índice fixo em 3/12 colunas no desktop (Drawer no
// celular) + texto em 9 colunas, na largura total do card. O PDF original abre numa nova aba
// pelo botão "Download" do cabeçalho (<a target="_blank" rel="noopener">).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button, ButtonLink } from './ui/Button';
import { Drawer } from './ui/Drawer';
import { MarkdownContent } from './MarkdownContent';
import { DestaquesNorma } from './normas/DestaquesNorma';
import { useBreadcrumbs } from '../context/BreadcrumbContext';
import { getStoragePdfUrl } from '../services/firebaseStorageNormas';
import { itensDoIndice, titulosDoMarkdown, type TituloIndice } from '../utils/legislacao';
import type { LegislacaoDoc } from '../services/firestoreLegislacao';

interface LegislacaoDocumentoProps {
  law: LegislacaoDoc;
  markdown: string;
  /** Mantido por compatibilidade: o Voltar saiu do cabeçalho (a trilha da topbar já volta). */
  onVoltar?: () => void;
}

const ListaIndice: React.FC<{ itens: TituloIndice[]; ativo: string | null; onIr: (id: string) => void }> = ({ itens, ativo, onIr }) => (
  <nav aria-label="Índice">
    <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-ink-3">Índice</p>
    <ul className="flex flex-col gap-0.5">
      {itens.map(t => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onIr(t.id)}
            aria-current={ativo === t.id ? 'location' : undefined}
            className={`w-full text-left rounded-lg py-1.5 pr-2 text-sm leading-snug transition-colors hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${t.nivel > 2 ? 'pl-5' : 'pl-2'} ${ativo === t.id ? 'bg-thead font-bold text-navy' : 'text-ink'}`}
          >
            {t.texto}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);

export const LegislacaoDocumento: React.FC<LegislacaoDocumentoProps> = ({ law, markdown }) => {
  useBreadcrumbs([{ label: law.legislacao }]);
  const titulos = useMemo(() => titulosDoMarkdown(markdown), [markdown]);
  const indice = useMemo(() => itensDoIndice(titulos), [titulos]);
  const texto = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [indiceAberto, setIndiceAberto] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfIndisponivel, setPdfIndisponivel] = useState(!law.pdfPath);

  // URL do PDF (Storage, exige login) obtida de antemão: o botão é um <a target="_blank"> de verdade.
  useEffect(() => {
    if (!law.pdfPath) return;
    let vivo = true;
    getStoragePdfUrl(law.pdfPath)
      .then(u => { if (vivo) { setPdfUrl(u); setPdfIndisponivel(!u); } })
      .catch(() => { if (vivo) setPdfIndisponivel(true); });
    return () => { vivo = false; };
  }, [law.pdfPath]);

  // Os ids dos títulos (mesma ordem de titulosDoMarkdown) entram no HTML renderizado.
  // Reaplicados antes de cada rolagem: uma nova renderização pode recriar o HTML do texto sem eles.
  const aplicarIds = React.useCallback(() => {
    const els = texto.current?.querySelectorAll<HTMLElement>('h2, h3, h4, h5, h6');
    els?.forEach((el, i) => { if (titulos[i]) el.id = titulos[i].id; });
  }, [titulos]);
  useEffect(aplicarIds, [markdown, aplicarIds]);

  // A rolagem espera o Drawer (celular) fechar: ao fechar, ele devolve o foco ao botão "Índice" e a página
  // voltaria ao topo. Por isso o destino fica pendente e a rolagem roda no efeito, depois do fechamento.
  const [destino, setDestino] = useState<{ id: string } | null>(null);
  const irPara = (id: string) => {
    setIndiceAberto(false);
    setAtivo(id);
    setDestino({ id });
  };
  useEffect(() => {
    if (!destino || indiceAberto) return;
    const quadro = requestAnimationFrame(() => {
      aplicarIds();
      document.getElementById(destino.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(quadro);
  }, [destino, indiceAberto, aplicarIds]);

  const download = pdfUrl ? (
    <ButtonLink href={pdfUrl} target="_blank" rel="noopener noreferrer" variant="primary" icon="download">
      Download<span className="sr-only"> (abre o PDF em nova aba)</span>
    </ButtonLink>
  ) : (
    <Button variant="primary" icon="download" disabled loading={!pdfIndisponivel} title={pdfIndisponivel ? 'PDF indisponível' : undefined}>
      Download
    </Button>
  );

  return (
    <div className="flex flex-col flex-1">
      <Container size="data" className="pt-4 md:pt-8 pb-10">
        <PageHeader
          title={law.legislacao}
          description={law.titulo}
          descricaoNoCelular
          actions={download}
        />

        {indice.length > 0 && (
          <div className="md:hidden sticky top-0 z-sticky -mx-4 px-3 py-2 bg-white border-b border-line">
            <button
              type="button"
              onClick={() => setIndiceAberto(true)}
              aria-haspopup="dialog"
              className="w-full h-10 flex items-center gap-2 pl-3 pr-1.5 rounded-full border border-line text-left"
            >
              <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">toc</span>
              <span className="flex-1 min-w-0 truncate text-sm font-bold text-navy">
                {indice.find(t => t.id === ativo)?.texto ?? 'Índice'}
              </span>
              <span className="material-symbols-outlined text-[22px] text-ink-3 shrink-0" aria-hidden="true">expand_more</span>
            </button>
          </div>
        )}

        <div className="md:grid md:grid-cols-12 md:gap-6 md:items-start">
          {indice.length > 0 && (
            <aside className="hidden md:block md:col-span-3 sticky top-4 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain bg-white border border-line rounded-xl p-3">
              <ListaIndice itens={indice} ativo={ativo} onIr={irPara} />
            </aside>
          )}
          <div
            ref={texto}
            className={`${indice.length > 0 ? 'md:col-span-9' : 'md:col-span-12'} -mx-4 px-4 py-5 bg-white md:mx-0 md:px-9 md:py-7 md:border md:border-line md:rounded-xl min-w-0`}
          >
            <DestaquesNorma pagina="legislacao" doc={law.id} raiz={texto} className="mb-4" />
            <div className="[&_h2]:scroll-mt-20 [&_h3]:scroll-mt-20 [&_h4]:scroll-mt-20">
              <MarkdownContent markdown={markdown} className="!max-w-none" />
            </div>
          </div>
        </div>
      </Container>

      {indiceAberto && (
        <Drawer title="Índice" icon="toc" onClose={() => setIndiceAberto(false)}>
          <ListaIndice itens={indice} ativo={ativo} onIr={irPara} />
        </Drawer>
      )}
    </div>
  );
};
