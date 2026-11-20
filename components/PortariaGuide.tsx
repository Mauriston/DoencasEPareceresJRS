// Ficheiro: components/PortariaGuide.tsx
// Leitor da Portaria GM-MD nº 3.551/2021 (auditoria v3, §10 · PT1–PT8).
//
// - Uma <section id> por arquivo .md de content/portaria-3551-2021 (id do nome
//   do arquivo: 01-alienacao-mental → alienacao-mental); 00-preliminares tem as
//   âncoras capitulo-i, capitulo-ii e quadro-sinoptico; o Cap. IV vem do
//   99-disposicoes-finais, depois das 17 doenças (Capítulo III).
// - Âncoras compatíveis com o HashRouter: #/…/portaria?secao=cardiopatia-grave&item=4.2.
//   O índice acompanha a leitura (IntersectionObserver) e atualiza o parâmetro
//   com history.replaceState, para o link copiado abrir no mesmo ponto.
// - Desktop: índice em 3/12 colunas, fixo e com rolagem própria; texto em 9
//   colunas, limitado a ~68 caracteres. Celular: barra fixa com a seção atual,
//   anterior/próxima e o índice em sheet; texto sem card (margem de 16 px).
// - Busca no texto: destaca as ocorrências e navega "3 de 12".
// - Um único botão flutuante ("voltar ao topo"); o PDF fica no cabeçalho (⋮ no celular).
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, PageHeader } from './ui/Page';
import { Button, ButtonLink } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { MenuAcoes, type ItemMenu } from './ui/MenuAcoes';
import { Drawer } from './ui/Drawer';
import { StatusTag } from './ui/StatusTag';
import { MarkdownContent } from './MarkdownContent';
import { useBackToTop } from '../hooks/useBackToTop';
import { useStoragePdf } from '../hooks/useStoragePdf';
import { PORTARIA_PDF_PATH } from '../services/firebaseStorageNormas';
import { NavContext } from '../context/NavContext';
import { canAccessPage } from '../config/permissions';
import { doencaPath, pathForView, PUBLICO_DOENCAS, PUBLICO_PORTARIA } from '../config/routes';
import { getMainScroller } from '../utils/dom';
import { idItem, type OpcoesNorma } from '../utils/normaMarkdown';
import { CampoBusca, ContadorBusca, useBuscaNoTexto } from './normas/BuscaNoTexto';
import { DestaquesNorma } from './normas/DestaquesNorma';
import {
  DOENCAS_PORTARIA, PARTES_INICIAIS, PARTE_FINAL, doencaDoQuadro, idDaSecao, idTituloPortaria,
  portariaPathSecao, semTituloPrincipal, separarCabecalhoDou, type DoencaPortaria,
} from '../utils/portaria';

// ─── Conteúdo (estático, do bundle) ──────────────────────────────────────────

const portariaModules = import.meta.glob('../content/portaria-3551-2021/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const arquivos = Object.keys(portariaModules).sort().map(caminho => ({ id: idDaSecao(caminho), markdown: portariaModules[caminho] }));
const mdDe = (id: string) => arquivos.find(a => a.id === id)?.markdown ?? '';

const { cabecalho: DOU, resto: MD_PRELIMINARES } = separarCabecalhoDou(mdDe('preliminares'));
const MD_FINAL = mdDe(PARTE_FINAL.id);
const MD_DOENCAS: Record<string, string> = Object.fromEntries(DOENCAS_PORTARIA.map(d => [d.secao, semTituloPrincipal(mdDe(d.secao))]));

const OPCOES_DOENCA: Record<string, OpcoesNorma> = Object.fromEntries(
  DOENCAS_PORTARIA.map(d => [d.secao, { prefixo: d.secao, deslocarTitulos: 1 }]),
);
const OPCOES_FINAL: OpcoesNorma = { prefixo: PARTE_FINAL.id, caixaDeFrase: true, idTitulo: idTituloPortaria };

/** Todas as âncoras do índice, na ordem do documento. */
const ANCORAS: string[] = [...PARTES_INICIAIS.map(p => p.id), ...DOENCAS_PORTARIA.map(d => d.secao), PARTE_FINAL.id];
const rotuloDe = (id: string): string =>
  DOENCAS_PORTARIA.find(d => d.secao === id)?.nome
  ?? [...PARTES_INICIAIS, PARTE_FINAL].find(p => p.id === id)?.rotulo
  ?? 'Portaria';
const doencaDe = (id: string | null): { doenca: DoencaPortaria; n: number } | null => {
  const i = DOENCAS_PORTARIA.findIndex(d => d.secao === id);
  return i < 0 ? null : { doenca: DOENCAS_PORTARIA[i], n: i + 1 };
};
/** Seção (<section>) que contém a âncora: as partes iniciais moram em "preliminares". */
const secaoDaAncora = (id: string) => (PARTES_INICIAIS.some(p => p.id === id) ? 'preliminares' : id);

// Topbar (56 px, fora do scroller) não cobre o conteúdo; a barra fixa do celular sim.
const LINHA_ATIVA = 80;

const descricaoDou = [
  'Normas para avaliação pericial das doenças especificadas em lei',
  DOU.publicadoEm && `DOU ${DOU.publicadoEm}${DOU.edicao ? `, ed. ${DOU.edicao}` : ''}${DOU.secao ? `, seção ${DOU.secao}` : ''}${DOU.pagina ? `, p. ${DOU.pagina}` : ''}`,
  DOU.orgao,
  'em vigor desde 01/10/2021',
].filter(Boolean).join(' · ');


const ItemIndice: React.FC<{ id: string; ativo: boolean; onIr: (id: string) => void; numero?: number; children: React.ReactNode; className?: string }> = ({ id, ativo, onIr, numero, children, className = '' }) => (
  <li>
    <button
      type="button"
      onClick={() => onIr(id)}
      aria-current={ativo ? 'location' : undefined}
      className={`w-full text-left grid ${numero ? 'grid-cols-[24px_minmax(0,1fr)]' : 'grid-cols-1'} gap-1.5 items-baseline px-2.5 py-1.5 min-h-9 rounded-md text-sm transition-colors ${
        ativo ? 'bg-thead text-navy font-bold shadow-[inset_3px_0_0_#FAB932]' : 'text-ink hover:bg-paper'
      } ${className}`}
    >
      {numero && <span className="text-xs text-ink-3 tabular-nums">{numero}</span>}
      <span>{children}</span>
    </button>
  </li>
);

const ListaIndice: React.FC<{ ativo: string | null; onIr: (id: string) => void; filtro?: string }> = ({ ativo, onIr, filtro = '' }) => {
  const f = filtro.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const doencas = DOENCAS_PORTARIA.map((d, i) => ({ d, n: i + 1 }))
    .filter(({ d }) => !f || d.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(f));
  return (
    <nav aria-label="Índice da Portaria" className="flex flex-col gap-1">
      {!f && (
        <>
          <p className="text-xs font-bold tracking-label uppercase text-ink-3 px-2.5 pt-1">Partes</p>
          <ul className="flex flex-col">
            {PARTES_INICIAIS.map(p => <ItemIndice key={p.id} id={p.id} ativo={ativo === p.id} onIr={onIr}>{p.rotulo}</ItemIndice>)}
          </ul>
        </>
      )}
      <p className={`text-xs font-bold tracking-label uppercase text-ink-3 px-2.5 pt-2 ${f ? '' : 'mt-1 border-t border-line'}`}>Cap. III · Doenças previstas em lei · 17</p>
      <ul className="flex flex-col">
        {doencas.map(({ d, n }) => <ItemIndice key={d.secao} id={d.secao} numero={n} ativo={ativo === d.secao} onIr={onIr}>{d.nome}</ItemIndice>)}
        {!doencas.length && <li className="px-2.5 py-2 text-sm text-ink-3">Nenhuma doença com esse nome.</li>}
      </ul>
      {!f && (
        <ul className="flex flex-col mt-1 pt-1 border-t border-line">
          <ItemIndice id={PARTE_FINAL.id} ativo={ativo === PARTE_FINAL.id} onIr={onIr}>{PARTE_FINAL.rotulo}</ItemIndice>
        </ul>
      )}
    </nav>
  );
};

const CabecalhoDoenca: React.FC<{
  doenca: DoencaPortaria; n: number; onCopiar: () => void; copiado: boolean; criteriosPath?: string;
}> = ({ doenca, n, onCopiar, copiado, criteriosPath }) => (
  <header className="flex flex-col gap-2 pb-3 mb-5 border-b border-line">
    <p className="text-sm font-semibold text-ink-3">Capítulo III · Doença {n} de {DOENCAS_PORTARIA.length}</p>
    <div className="flex items-start justify-between gap-3">
      <h2 id={`${doenca.secao}-titulo`} className="text-h1 font-extrabold text-navy leading-tight">{doenca.nome}</h2>
      <div className="hidden md:flex gap-1 shrink-0">
        <Button variant="ghost" icon={copiado ? 'done' : 'link'} onClick={onCopiar}>{copiado ? 'Link copiado' : 'Copiar link'}</Button>
        {criteriosPath && <ButtonLink to={criteriosPath} variant="secondary" icon="medical_information">Critérios em Doenças de Lei</ButtonLink>}
      </div>
    </div>
    <div className="flex flex-wrap gap-1.5">
      <StatusTag tone={doenca.estatuto ? 'navyOutline' : 'muted'} dot={false}>Estatuto dos Militares: {doenca.estatuto ? 'sim' : 'não'}</StatusTag>
      <StatusTag tone={doenca.ir ? 'navyOutline' : 'muted'} dot={false}>Isenção de IR: {doenca.ir ? 'sim' : 'não'}</StatusTag>
    </div>
  </header>
);

// ─── Página ──────────────────────────────────────────────────────────────────

interface PortariaGuideProps {
  /**
   * Versão pública (sem login): esconde o download do PDF, que vem do Firebase
   * Storage e exige usuário autenticado (ver storage.rules). O texto integral
   * da Portaria continua na tela — vem dos .md do próprio bundle.
   */
  publico?: boolean;
}

export const PortariaGuide: React.FC<PortariaGuideProps> = ({ publico = false }) => {
  const { visivel: showScrollTop, irAoTopo } = useBackToTop(400);
  const { open: openPdf, busy: baixandoPdf } = useStoragePdf();
  const baixar = () => openPdf(PORTARIA_PDF_PATH, 'Portaria GM-MD nº 3.551/2021');
  const nav = useContext(NavContext);
  const podeVerCriterios = publico || canAccessPage('guide', nav?.authUser?.perfil);
  const basePath = publico ? PUBLICO_PORTARIA : pathForView('portaria');
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const conteudo = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [indiceAberto, setIndiceAberto] = useState(false);
  const [filtroDoenca, setFiltroDoenca] = useState('');
  const [termo, setTermo] = useState('');
  const [buscaMobile, setBuscaMobile] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const travaSpy = useRef(0);
  const ativoRef = useRef<string | null>(null);
  const busca = useBuscaNoTexto(conteudo, termo);

  // Quadro sinóptico: nomes das doenças viram links para a seção.
  const opcoesPreliminares = useMemo<OpcoesNorma>(() => ({
    prefixo: 'preliminares',
    caixaDeFrase: true,
    idTitulo: idTituloPortaria,
    tabelaSimNao: true,
    linkTabela: texto => {
      const d = doencaDoQuadro(texto);
      return d ? { href: `#${portariaPathSecao(basePath, d.secao)}`, secao: d.secao } : undefined;
    },
  }), [basePath]);

  const criteriosDe = (d: DoencaPortaria) =>
    podeVerCriterios && d.doencaId ? doencaPath(d.doencaId, undefined, publico ? PUBLICO_DOENCAS : undefined) : undefined;

  /** Grava ?secao= (e &item=) na URL sem nova entrada no histórico nem re-render do roteador. */
  const gravarUrl = useCallback((secao: string | null, item?: string) => {
    try {
      window.history.replaceState(window.history.state, '', `#${portariaPathSecao(pathname, secao ?? undefined, item)}`);
    } catch { /* ambiente sem history */ }
  }, [pathname]);

  const irPara = useCallback((id: string, opcoes: { item?: string; suave?: boolean } = {}) => {
    const secao = secaoDaAncora(id);
    const el = (opcoes.item && document.getElementById(idItem(secao, opcoes.item))) || document.getElementById(id);
    if (!el) return;
    travaSpy.current = Date.now() + 900;
    ativoRef.current = id;
    setAtivo(id);
    setAlvo(opcoes.item && el.id !== id ? el.id : null);
    gravarUrl(id, opcoes.item);
    el.scrollIntoView({ block: 'start', behavior: opcoes.suave === false ? 'auto' : 'smooth' });
  }, [gravarUrl]);

  // Entrada por link (?secao=…&item=…): depois do "começa no topo" do shell.
  const secaoParam = searchParams.get('secao');
  const itemParam = searchParams.get('item') ?? undefined;
  useEffect(() => {
    if (!secaoParam) return;
    let raf = 0;
    const t = setTimeout(() => { raf = requestAnimationFrame(() => irPara(secaoParam, { item: itemParam, suave: false })); }, 0);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [secaoParam, itemParam, irPara]);

  // Item destacado ao chegar por link.
  useEffect(() => {
    if (!alvo) return;
    const el = document.getElementById(alvo);
    el?.classList.add('md-alvo');
    return () => el?.classList.remove('md-alvo');
  }, [alvo]);

  // Scrollspy: uma linha de 1 px logo abaixo do topo do scroller; a cada âncora que a
  // cruza, a ativa é a última cujo topo já passou dela.
  useEffect(() => {
    const scroller = getMainScroller();
    const els = ANCORAS.map(id => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    let io: IntersectionObserver | null = null;
    const recalcular = () => {
      if (Date.now() < travaSpy.current) return;
      const topo = scroller ? scroller.getBoundingClientRect().top : 0;
      let atual: string | null = null;
      for (const el of els) {
        if (el.getBoundingClientRect().top - topo <= LINHA_ATIVA + 1) atual = el.id;
        else break;
      }
      if (ativoRef.current === atual) return;
      ativoRef.current = atual;
      setAtivo(atual);
      gravarUrl(atual);
    };
    const montar = () => {
      io?.disconnect();
      const h = scroller?.clientHeight ?? window.innerHeight;
      io = new IntersectionObserver(recalcular, {
        root: scroller,
        rootMargin: `-${LINHA_ATIVA}px 0px -${Math.max(0, h - LINHA_ATIVA - 1)}px 0px`,
        threshold: 0,
      });
      els.forEach(el => io!.observe(el));
    };
    montar();
    window.addEventListener('resize', montar);
    return () => { io?.disconnect(); window.removeEventListener('resize', montar); };
  }, [gravarUrl]);

  const copiarLink = async (id: string | null) => {
    const url = `${window.location.href.split('#')[0]}#${portariaPathSecao(basePath, id ?? undefined)}`;
    try { await navigator.clipboard.writeText(url); setCopiado(id ?? ''); setTimeout(() => setCopiado(null), 2000); } catch { /* sem clipboard */ }
  };

  // Links internos do texto (nomes do quadro sinóptico): navegação sem trocar de rota.
  const aoClicarNoTexto = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-secao]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    irPara(a.dataset.secao!);
  };

  const posicao = ativo ? ANCORAS.indexOf(ativo) : -1;
  const ativoDoenca = doencaDe(ativo);
  const anterior = posicao > 0 ? ANCORAS[posicao - 1] : null;
  const proxima = posicao < ANCORAS.length - 1 ? ANCORAS[posicao + 1] : null;
  const irIndice = (id: string) => { setIndiceAberto(false); setFiltroDoenca(''); irPara(id); };

  const itensMenu: ItemMenu[] = [
    { rotulo: copiado !== null ? 'Link copiado' : 'Copiar link desta seção', icone: copiado !== null ? 'done' : 'link', onClick: () => { void copiarLink(ativo); } },
    ...(ativoDoenca && criteriosDe(ativoDoenca.doenca)
      ? [{ rotulo: 'Critérios em Doenças de Lei', icone: 'medical_information', onClick: () => navigate(criteriosDe(ativoDoenca.doenca)!) }]
      : []),
    ...(!publico ? [{ rotulo: 'Baixar o PDF original', icone: 'picture_as_pdf', onClick: baixar }] : []),
  ];

  return (
    <div className="flex flex-col flex-1 relative">
      <Container size="data" className="pt-6 md:py-8 pb-24 md:pb-10">
        <PageHeader
          title="Portaria GM-MD nº 3.551/2021"
          description={descricaoDou}
          actions={(
            <>
              {!publico && <Button variant="secondary" icon="picture_as_pdf" loading={baixandoPdf} onClick={baixar} className="hidden md:inline-flex">PDF original</Button>}
              <div className="md:hidden"><MenuAcoes rotulo="Mais ações da Portaria" itens={itensMenu} /></div>
            </>
          )}
        />

        {/* Celular: barra fixa com a seção atual, anterior/próxima e a busca no texto. */}
        <div className="md:hidden sticky top-0 z-sticky -mx-4 px-3 py-2 bg-white border-b border-line">
          {buscaMobile ? (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <CampoBusca valor={termo} onChange={setTermo} placeholder="Buscar no texto" autoFocus onEnter={s => (s ? busca.anterior() : busca.proxima())} />
              </div>
              <ContadorBusca {...busca} termo={termo} />
              <IconButton icon="close" label="Fechar a busca" variant="secondary" className="!w-9 !h-9 border-line" onClick={() => { setBuscaMobile(false); setTermo(''); }} />
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
                <span className="flex-1 min-w-0 truncate text-sm font-bold text-navy">{ativo ? rotuloDe(ativo) : 'Índice'}</span>
                {ativoDoenca && <span className="text-xs text-ink-3 tabular-nums shrink-0">{ativoDoenca.n}/{DOENCAS_PORTARIA.length}</span>}
                <span className="material-symbols-outlined text-[22px] text-ink-3 shrink-0" aria-hidden="true">expand_more</span>
              </button>
              <IconButton icon="chevron_left" label={anterior ? `Anterior: ${rotuloDe(anterior)}` : 'Anterior'} variant="secondary" className="!w-10 !h-10 !rounded-full border-line" disabled={!anterior} onClick={() => anterior && irPara(anterior)} />
              <IconButton icon="chevron_right" label={proxima ? `Próxima: ${rotuloDe(proxima)}` : 'Próxima'} variant="secondary" className="!w-10 !h-10 !rounded-full border-line" disabled={!proxima} onClick={() => irPara(proxima ?? ANCORAS[0])} />
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
            <ListaIndice ativo={ativo} onIr={id => irPara(id)} />
          </aside>

          {/* Texto: 9 colunas, ~68 caracteres. No celular, sem card (16 px de margem). */}
          <div
            ref={conteudo}
            onClick={aoClicarNoTexto}
            className="md:col-span-9 -mx-4 px-4 py-5 bg-white md:mx-0 md:px-9 md:py-7 md:border md:border-line md:rounded-xl min-w-0"
          >
            <DestaquesNorma pagina="portaria" doc="portaria" raiz={conteudo} className="mb-5" />
            <div className="max-w-[68ch] portaria-texto">
              <section id="preliminares" aria-label="Portaria e Anexo">
                <MarkdownContent markdown={MD_PRELIMINARES} estruturado={opcoesPreliminares} />
              </section>

              <div id="capitulo-iii" className="portaria-capitulo mt-10 mb-6 pt-6 border-t border-line">
                <h2 className="text-h2 font-bold text-navy">Capítulo III</h2>
                <p className="text-sm text-ink-3 mt-1">Doenças especificadas em lei — as 17, na ordem do quadro sinóptico.</p>
              </div>

              {DOENCAS_PORTARIA.map((d, i) => (
                <section key={d.secao} id={d.secao} aria-labelledby={`${d.secao}-titulo`} className="portaria-doenca">
                  <CabecalhoDoenca
                    doenca={d}
                    n={i + 1}
                    copiado={copiado === d.secao}
                    onCopiar={() => { void copiarLink(d.secao); }}
                    criteriosPath={criteriosDe(d)}
                  />
                  <MarkdownContent markdown={MD_DOENCAS[d.secao]} estruturado={OPCOES_DOENCA[d.secao]} />
                </section>
              ))}

              <section id={PARTE_FINAL.id} aria-label="Capítulo IV · Disposições finais" className="portaria-doenca">
                <MarkdownContent markdown={MD_FINAL} estruturado={OPCOES_FINAL} />
              </section>
            </div>
          </div>
        </div>
      </Container>

      {indiceAberto && (
        <Drawer title="Índice" icon="toc" onClose={() => { setIndiceAberto(false); setFiltroDoenca(''); }}>
          <div className="flex flex-col gap-3">
            <CampoBusca valor={filtroDoenca} onChange={setFiltroDoenca} placeholder="Filtrar doença" />
            <ListaIndice ativo={ativo} onIr={irIndice} filtro={filtroDoenca} />
          </div>
        </Drawer>
      )}

      {/* Único botão flutuante: voltar ao topo (acima da barra inferior e da área segura). */}
      {showScrollTop && (
        <IconButton
          icon="arrow_upward"
          label="Voltar ao topo"
          onClick={irAoTopo}
          className="!fixed right-4 z-sticky !rounded-full shadow-lg"
          style={{ bottom: 'var(--fab-bottom, calc(1.5rem + env(safe-area-inset-bottom)))' }}
        />
      )}
    </div>
  );
};
