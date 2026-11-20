// Ficheiro: components/DGPM406Guide.tsx
// Leitor da DGPM-406 (9ª Rev) com o mesmo índice da Portaria (components/PortariaGuide.tsx,
// auditoria v3 §10): desktop com índice em 3/12 colunas, fixo e com rolagem própria, texto
// em 9 colunas (~68 caracteres); celular com barra fixa (item atual, anterior/próximo) e o
// índice em drawer. Diferença: aqui o índice TROCA o documento exibido — um capítulo ou
// anexo por vez. Ao abrir a página, sempre o Capítulo 1 (nenhuma seleção é restaurada).
// Busca no texto (como na Portaria): destaca no documento aberto e mostra, no índice,
// quantas ocorrências há em cada capítulo/anexo.
// O PDF integral fica num botão fixo, sempre visível, que abre numa nova aba.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Drawer } from './ui/Drawer';
import { MarkdownContent } from './MarkdownContent';
import { CampoBusca, ContadorBusca, useBuscaNoTexto } from './normas/BuscaNoTexto';
import { acharOcorrencias } from '../utils/normaMarkdown';
import { useStoragePdf } from '../hooks/useStoragePdf';
import { getMainScroller } from '../utils/dom';
import { anexoPdfPath, getStoragePdfUrl, NORMA_COMPLETA_PDF_PATH } from '../services/firebaseStorageNormas';

interface Chapter {
  id: string;
  chapter: string;
  title: string;
  link: string;
  mdKey?: string;
}

interface Anexo {
  id: string;
  anexo: string;
  title: string;
  link: string;
  mdKey?: string;
}

// Texto-fonte dos capítulos/anexos (extraído da DGPM-406, 9ª Rev). Só os
// itens com arquivo .md correspondente ganham um "mdKey" e abrem a página
// renderizada; os demais continuam apontando para o PDF no Drive.
const chapterModules = import.meta.glob('../content/dgpm-406/capitulo-*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const anexoModules = import.meta.glob('../content/dgpm-406/anexos/anexo-*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const getModule = (modules: Record<string, string>, fileName: string): string | undefined => {
  const key = Object.keys(modules).find(k => k.endsWith(`/${fileName}`));
  return key ? modules[key] : undefined;
};

const toSentenceCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const CHAPTERS: Chapter[] = [
  { id: 'c1', chapter: 'Capítulo 1', title: 'ESTRUTURA DO SUBSISTEMA MÉDICO-PERICIAL DA MB', link: 'https://drive.google.com/open?id=1nVX3dkkGHHyWDwVhPdVjw7DWItD0y1sy', mdKey: 'capitulo-01.md' },
  { id: 'c2', chapter: 'Capítulo 2', title: 'PROCESSOS DAS INSPEÇÕES DE SAÚDE NA MB', link: 'https://drive.google.com/open?id=1L7TLBKFsRGaRI-rpaMEVvwg9bV_Y2A58', mdKey: 'capitulo-02.md' },
  { id: 'c3', chapter: 'Capítulo 3', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INGRESSAR NO SERVIÇO ATIVO NA MARIINHA', link: 'https://drive.google.com/open?id=1FielRLlQ7rmcjtaVJafdGF2x1SN90DE3', mdKey: 'capitulo-03.md' },
  { id: 'c4', chapter: 'Capítulo 4', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PÓS-ADMISSIONAIS', link: 'https://drive.google.com/open?id=1lblyFP5bbCKdQyXuO1--JCz1VmlJOG38', mdKey: 'capitulo-04.md' },
  { id: 'c5', chapter: 'Capítulo 5', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PARA ATIVIDADES ESPECIAIS', link: 'https://drive.google.com/open?id=1NlCZR1I24epU0-nucN4zHd2fUmO7SOFn', mdKey: 'capitulo-05.md' },
  { id: 'c6', chapter: 'Capítulo 6', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PÓS-ADMISSIONAIS', link: 'https://drive.google.com/open?id=1Lus5R4-UjHGZ8Ff5sylgfl8cN6qQpeo5', mdKey: 'capitulo-06.md' },
  { id: 'c7', chapter: 'Capítulo 7', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA IS DE JUSTIÇA E DISCIPLINA', link: 'https://drive.google.com/file/d/1fWgkRno35s4AzhA9BJqw_3eHXePYF2YC/view?usp=drivesdk', mdKey: 'capitulo-07.md' },
  { id: 'c8', chapter: 'Capítulo 8', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA EXCLUSÃO DO SERVIÇO ATIVO DA MARINHA', link: 'https://drive.google.com/open?id=1ozUl0F2YNU_SEVkzDI8Dl-CeIn_gN6XC', mdKey: 'capitulo-08.md' },
  { id: 'c9', chapter: 'Capítulo 9', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE PARA CONCESSÃO DE BENEFÍCIOS NA MB', link: 'https://drive.google.com/open?id=1JlzkalbaF4R7zrjt8qk9XvFu_jp4BMhL', mdKey: 'capitulo-09.md' },
  { id: 'c10', chapter: 'Capítulo 10', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE DE SERVIDORES CIVIS DA MB', link: 'https://drive.google.com/open?id=1LusI_DszPSwjbLPIJqTJkh1E9hP4RtxQ', mdKey: 'capitulo-10.md' },
  { id: 'c11', chapter: 'Capítulo 11', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA O SERVIÇO MILITAR TEMPORÁRIO', link: 'https://drive.google.com/open?id=1jFWJMETC-w6L8t7ylJyQgBVVQDfKDJNV', mdKey: 'capitulo-11.md' },
  { id: 'c12', chapter: 'Capítulo 12', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA INSPEÇÕES DE SAÚDE EM GRAU DE REVISÃO E RECURSOS', link: 'https://drive.google.com/file/d/1G5_BSDseclb32cu4T3ZaUVyFnmH5Rf9E/view?usp=drive_link', mdKey: 'capitulo-12.md' },
  { id: 'c13', chapter: 'Capítulo 13', title: 'PROCEDIMENTOS MÉDICO-PERICIAIS PARA COMPROVAÇÃO DE NEXO CAUSAL LABORATIVO', link: 'https://drive.google.com/open?id=1K17M2dVRqpRVpRrqbSaYHvX0Gt31jxdN', mdKey: 'capitulo-13.md' },
  { id: 'c14', chapter: 'Capítulo 14', title: 'PRONTUÁRIO MÉDICO INDIVIDUAL E GUIA SANITÁRIA', link: 'https://drive.google.com/open?id=121eIh1v3YPehkFJktqr70sDI0mSrw6Qs', mdKey: 'capitulo-14.md' },
  { id: 'c15', chapter: 'Capítulo 15', title: 'ESTRUTURA E ROTINA DE FUNCIONAMENTO DO DEPARTAMENTO DE AUDITORIA MÉDICO-PERICIAL', link: 'https://drive.google.com/open?id=1sUi1tvbGMtQkWAcqJc9wXz7n8koZLizM', mdKey: 'capitulo-15.md' },
  { id: 'c16', chapter: 'Capítulo 16', title: 'REVISÃO DE REFORMA POR INCAPACIDADE DEFINITIVA PARA O SAM OU INVALIDEZ', link: 'https://drive.google.com/open?id=1sUi1tvbGMtQkWAcqJc9wXz7n8koZLizM', mdKey: 'capitulo-16.md' },
  { id: 'c17', chapter: 'Capítulo 17', title: 'EXAME TOXICOLÓGICO', link: 'https://drive.google.com/open?id=1CL-hNZs5mhJlfqhJWe4Sq3YJwQPtnE2p', mdKey: 'capitulo-17.md' },
  { id: 'c18', chapter: 'Capítulo 18', title: 'INSPEÇÃO DE SAÚDE DE VERIFICAÇÃO DE DEFICIÊNCIA FUNCIONAL E DETÉRMINO DE INCAPACIDADE NO SERVIÇO DE PRATICAGEM', link: 'https://drive.google.com/open?id=1_CJ9YqoixMsXp7Hjm25EyISFPitHBLaS', mdKey: 'capitulo-18.md' },
];

const ANEXOS: Anexo[] = [
  { id: 'a1', anexo: 'ANEXO A', title: 'Estrutura básica do SMP', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a2', anexo: 'ANEXO D', title: 'Pedido de parecer DS-2', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a3', anexo: 'ANEXO E', title: 'Atestado de Origem', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a4', anexo: 'ANEXO E', title: 'EXAME DE SANIDADE', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a5', anexo: 'ANEXO G', title: 'Guia de atendimento médico para perícia menor', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a6', anexo: 'ANEXO I', title: 'Papeleta de dispensa', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a7', anexo: 'ANEXO J', title: 'TCLE para realização de exame toxicológico', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a8', anexo: 'ANEXO K', title: 'Perícia menor para gestantes saudáveis', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a9', anexo: 'ANEXO M', title: 'Tramitação de documentos e conclusões médico periciais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a10', anexo: 'ANEXO N', title: 'Padrões psicofísicos admissionais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC', mdKey: 'anexo-n.md' },
  { id: 'a11', anexo: 'ANEXO O', title: 'Exames mínimos', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC', mdKey: 'anexo-o.md' },
  { id: 'a12', anexo: 'ANEXO P', title: 'Padrões psicofísicos pós-admissionais', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a13', anexo: 'ANEXO R', title: 'Modelos da processualística do ISO', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a14', anexo: 'ANEXO T', title: 'Reconhecimento de recurso', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a15', anexo: 'ANEXO U', title: 'Doenças previstas em lei', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC', mdKey: 'anexo-u.md' },
  { id: 'a16', anexo: 'ANEXO V', title: 'Documentação médica pertinente às doenças previstas em lei', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC', mdKey: 'anexo-v.md' },
  { id: 'a17', anexo: 'ANEXO W', title: 'Folha de anamnese dirigida', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a18', anexo: 'ANEXO Y', title: 'Cientificação resultado ingresso', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
  { id: 'a19', anexo: 'ANEXO AB', title: 'Índices mínimos e condições incapacitantes para o serviço de praticagem', link: 'https://drive.google.com/open?id=1p4mBsX_-8wwGY5flgS6SoVbw_mymqdeC' },
];

// ─── Índice ──────────────────────────────────────────────────────────────────

interface ItemDoc { id: string; rotulo: string; titulo: string; numero?: string; markdown?: string; codigoAnexo?: string }

const ITENS_CAPITULOS: ItemDoc[] = CHAPTERS.map(c => ({
  id: c.id,
  rotulo: c.chapter,
  titulo: toSentenceCase(c.title),
  numero: c.chapter.match(/^Capítulo (\d+)$/)?.[1],
  markdown: c.mdKey ? getModule(chapterModules, c.mdKey) : undefined,
}));
const ITENS_ANEXOS: ItemDoc[] = ANEXOS.map(a => ({
  id: a.id,
  rotulo: a.anexo.replace(/^ANEXO\b/, 'Anexo'),
  titulo: a.title.charAt(0).toUpperCase() + a.title.slice(1),
  numero: a.anexo.replace(/^ANEXO\s+/i, ''),
  markdown: a.mdKey ? getModule(anexoModules, a.mdKey) : undefined,
  codigoAnexo: a.anexo.replace(/^ANEXO\s+/i, ''),
}));
const ORDEM: ItemDoc[] = [...ITENS_CAPITULOS, ...ITENS_ANEXOS];
const itemDe = (id: string) => ORDEM.find(i => i.id === id) ?? ORDEM[0];
const INICIAL = 'c1';

const ItemIndice: React.FC<{ item: ItemDoc; ativo: boolean; onIr: (id: string) => void; ocorrencias?: number }> = ({ item, ativo, onIr, ocorrencias }) => (
  <li>
    <button
      type="button"
      onClick={() => onIr(item.id)}
      aria-current={ativo ? 'page' : undefined}
      className={`w-full text-left grid ${ocorrencias !== undefined ? 'grid-cols-[28px_minmax(0,1fr)_auto]' : 'grid-cols-[28px_minmax(0,1fr)]'} gap-1.5 items-baseline px-2.5 py-1.5 min-h-9 rounded-md text-sm transition-colors ${
        ativo ? 'bg-thead text-navy font-bold shadow-[inset_3px_0_0_#FAB932]' : 'text-ink hover:bg-paper'
      }`}
    >
      <span className="text-xs text-ink-3 tabular-nums">{item.numero}</span>
      <span>{item.titulo}</span>
      {ocorrencias !== undefined && (
        <span className={`text-xs tabular-nums px-1.5 rounded-full ${ocorrencias ? 'bg-gold/20 text-navy font-bold' : 'text-ink-4'}`}>
          {ocorrencias}<span className="sr-only"> ocorrências</span>
        </span>
      )}
    </button>
  </li>
);

const ListaIndice: React.FC<{ ativo: string; onIr: (id: string) => void; contagens?: Record<string, number> | null }> = ({ ativo, onIr, contagens }) => (
  <nav aria-label="Índice da DGPM-406" className="flex flex-col gap-1">
    <p className="text-xs font-bold tracking-label uppercase text-ink-3 px-2.5 pt-1">Capítulos · {ITENS_CAPITULOS.length}</p>
    <ul className="flex flex-col">
      {ITENS_CAPITULOS.map(i => <ItemIndice key={i.id} item={i} ativo={ativo === i.id} onIr={onIr} ocorrencias={contagens ? contagens[i.id] ?? 0 : undefined} />)}
    </ul>
    <p className="text-xs font-bold tracking-label uppercase text-ink-3 px-2.5 pt-2 mt-1 border-t border-line">Anexos · {ITENS_ANEXOS.length}</p>
    <ul className="flex flex-col">
      {ITENS_ANEXOS.map(i => <ItemIndice key={i.id} item={i} ativo={ativo === i.id} onIr={onIr} ocorrencias={contagens ? contagens[i.id] ?? 0 : undefined} />)}
    </ul>
  </nav>
);

// ─── Página ──────────────────────────────────────────────────────────────────

export const DGPM406Guide: React.FC = () => {
  // Sempre começa no Capítulo 1: estado local, sem ler URL nem armazenamento.
  const [ativo, setAtivo] = useState<string>(INICIAL);
  const [indiceAberto, setIndiceAberto] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [termo, setTermo] = useState('');
  const [buscaMobile, setBuscaMobile] = useState(false);
  const conteudo = useRef<HTMLDivElement>(null);
  const { open: openPdf, busy: baixandoPdf, modalElement } = useStoragePdf();

  // URL do PDF integral (Storage, exige login) obtida de antemão: o botão fixo é um
  // <a target="_blank"> de verdade, sem pop-up bloqueado.
  useEffect(() => {
    let vivo = true;
    getStoragePdfUrl(NORMA_COMPLETA_PDF_PATH).then(u => { if (vivo) setPdfUrl(u); }).catch(() => { /* sem PDF */ });
    return () => { vivo = false; };
  }, []);

  const item = itemDe(ativo);
  // Reaplica os destaques quando o documento exibido muda.
  const busca = useBuscaNoTexto(conteudo, termo, item.id);
  const contagens = useMemo(() => {
    if (termo.trim().length < 2) return null;
    return Object.fromEntries(ORDEM.map(i => [i.id, i.markdown ? acharOcorrencias(i.markdown, termo).length : 0])) as Record<string, number>;
  }, [termo]);
  const posicao = ORDEM.indexOf(item);
  const anterior = posicao > 0 ? ORDEM[posicao - 1] : null;
  const proximo = posicao < ORDEM.length - 1 ? ORDEM[posicao + 1] : null;

  const irPara = (id: string) => {
    setIndiceAberto(false);
    setAtivo(id);
    const scroller = getMainScroller();
    if (scroller) scroller.scrollTo({ top: 0 });
    else window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex flex-col flex-1 relative">
      <Container size="data" className="pt-6 md:py-8 pb-24 md:pb-24">
        <PageHeader title="DGPM-406" description="Normas Reguladoras para Inspeções de Saúde na Marinha · 9ª Revisão · capítulos e anexos" />

        {/* Celular: barra fixa com o item atual, anterior/próximo e o índice em drawer. */}
        <div className="md:hidden sticky top-0 z-sticky -mx-4 px-3 py-2 bg-white border-b border-line">
          {buscaMobile ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <CampoBusca valor={termo} onChange={setTermo} placeholder="Buscar no texto" autoFocus onEnter={s => (s ? busca.anterior() : busca.proxima())} />
                </div>
                <ContadorBusca {...busca} termo={termo} />
                <IconButton icon="close" label="Fechar a busca" variant="secondary" className="!w-9 !h-9 border-line" onClick={() => { setBuscaMobile(false); setTermo(''); }} />
              </div>
              {contagens && (
                <button type="button" onClick={() => setIndiceAberto(true)} className="text-xs text-navy font-bold underline self-start min-h-9">
                  Ver ocorrências por capítulo/anexo ({Object.values(contagens).reduce((a: number, b: number) => a + b, 0)})
                </button>
              )}
            </div>
          ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIndiceAberto(true)}
              aria-haspopup="dialog"
              className="flex-1 min-w-0 h-10 flex items-center gap-2 pl-3 pr-1.5 rounded-full border border-line text-left"
            >
              <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">toc</span>
              <span className="flex-1 min-w-0 truncate text-sm font-bold text-navy">{item.rotulo} · {item.titulo}</span>
              <span className="material-symbols-outlined text-[22px] text-ink-3 shrink-0" aria-hidden="true">expand_more</span>
            </button>
            <IconButton icon="chevron_left" label={anterior ? `Anterior: ${anterior.rotulo}` : 'Anterior'} variant="secondary" className="!w-10 !h-10 !rounded-full border-line" disabled={!anterior} onClick={() => anterior && irPara(anterior.id)} />
            <IconButton icon="chevron_right" label={proximo ? `Próximo: ${proximo.rotulo}` : 'Próximo'} variant="secondary" className="!w-10 !h-10 !rounded-full border-line" disabled={!proximo} onClick={() => proximo && irPara(proximo.id)} />
            <IconButton icon="search" label="Buscar no texto" variant="secondary" className="!w-10 !h-10 !rounded-full border-line" onClick={() => setBuscaMobile(true)} />
          </div>
          )}
        </div>

        <div className="md:grid md:grid-cols-12 md:gap-6 md:items-start">
          {/* Desktop: índice fixo, com rolagem própria. */}
          <aside className="hidden md:block md:col-span-3 sticky top-4 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain bg-white border border-line rounded-xl p-3">
            <div className="flex flex-col gap-1.5 mb-2">
              <CampoBusca valor={termo} onChange={setTermo} placeholder="Buscar no texto" onEnter={s => (s ? busca.anterior() : busca.proxima())} />
              <ContadorBusca {...busca} termo={termo} />
            </div>
            <ListaIndice ativo={item.id} onIr={irPara} contagens={contagens} />
          </aside>

          {/* Texto: 9 colunas, ~68 caracteres. No celular, sem card (16 px de margem). */}
          <div ref={conteudo} className="md:col-span-9 -mx-4 px-4 py-5 bg-white md:mx-0 md:px-9 md:py-7 md:border md:border-line md:rounded-xl min-w-0">
            <div className="max-w-[68ch]">
              <p className="text-sm font-semibold text-ink-3 mb-2">
                {item.codigoAnexo ? `Anexos · ${posicao - ITENS_CAPITULOS.length + 1} de ${ITENS_ANEXOS.length}` : `Capítulos · ${posicao + 1} de ${ITENS_CAPITULOS.length}`}
              </p>
              {item.markdown ? (
                <MarkdownContent key={item.id} markdown={item.markdown} />
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <h2 className="text-h1 font-extrabold text-navy leading-tight">{item.rotulo} — {item.titulo}</h2>
                  <p className="text-sm text-ink-3">O texto deste anexo ainda não está disponível na página. Abra o PDF do anexo.</p>
                  {item.codigoAnexo && (
                    <Button variant="secondary" icon="picture_as_pdf" loading={baixandoPdf} onClick={() => openPdf(anexoPdfPath(item.codigoAnexo!), `${item.rotulo} — ${item.titulo}`)}>
                      PDF do {item.rotulo}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

      {indiceAberto && (
        <Drawer title="Índice" icon="toc" onClose={() => setIndiceAberto(false)}>
          <ListaIndice ativo={item.id} onIr={irPara} contagens={contagens} />
        </Drawer>
      )}
      {modalElement}

      {/* Único botão flutuante: a DGPM-406 integral em PDF, numa nova aba. */}
      <a
        href={pdfUrl ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!pdfUrl}
        onClick={e => { if (!pdfUrl) { e.preventDefault(); alert('O PDF da DGPM-406 ainda não está disponível.'); } }}
        className={`fixed right-4 z-sticky inline-flex items-center gap-2 h-12 px-4 rounded-full bg-navy text-white text-sm font-bold shadow-lg transition-colors hover:bg-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${pdfUrl ? '' : 'opacity-70'}`}
        style={{ bottom: 'var(--fab-bottom, calc(1.5rem + env(safe-area-inset-bottom)))' }}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">picture_as_pdf</span>
        <span>DGPM-406 completa</span>
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
        <span className="sr-only">(abre em nova aba)</span>
      </a>
    </div>
  );
};
