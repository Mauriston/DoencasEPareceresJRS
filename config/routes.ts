// Ficheiro: config/routes.ts
// Mapa único entre as páginas do app (NavItem, usadas nas permissões por
// perfil e na navegação) e as rotas da URL. O app usa HashRouter porque é
// publicado no GitHub Pages (sem reescrita de rotas no servidor): as URLs são
// do tipo  …/DoencasEPareceresJRS/#/concursos/CPAEAM-2026.
//
// As permissões continuam sendo avaliadas por página (`canAccessPage`) no
// App.tsx — a rota só decide QUAL página abrir; o acesso negado continua
// sendo tratado pelo estado explícito de AccessDenied.
import { matchPath } from 'react-router-dom';
import type { NavItem } from '../types';

export interface RouteDef {
  view: NavItem;
  /** Padrão da rota (react-router); parâmetros opcionais carregam os subníveis. */
  path: string;
}

/** Rotas estáticas ANTES das dinâmicas que compartilham o prefixo (ex.: /concursos/indices vs /concursos/:id). */
export const ROUTES: RouteDef[] = [
  { view: 'home', path: '/' },
  { view: 'perfil', path: '/perfil' },
  { view: 'guide', path: '/beneficios/doencas/:doencaId?/:diagnosticoIdx?' },
  { view: 'portaria', path: '/beneficios/portaria' },
  { view: 'concursos', path: '/concursos/indices' },
  { view: 'exames', path: '/concursos/exames' },
  { view: 'concursosJRS', path: '/concursos/dia/:data' },
  { view: 'concursosJRS', path: '/concursos/:concursoId?' },
  { view: 'inspecoes', path: '/inspecoes' },
  { view: 'pareceres', path: '/pareceres' },
  { view: 'pericia-menor', path: '/pericia-menor/:aba?/:pessoa?' },
  { view: 'mensagens', path: '/mensagens' },
  { view: 'dgpm406', path: '/normas/dgpm-406' },
  { view: 'laws', path: '/normas/legislacao' },
  { view: 'casos', path: '/extras/casos' },
  { view: 'videos', path: '/extras/videos' },
  { view: 'infograficos', path: '/extras/infograficos' },
  { view: 'apresentacoes', path: '/extras/apresentacoes' },
  { view: 'roteiro', path: '/extras/roteiro' },
  { view: 'usuarios', path: '/usuarios' },
  { view: 'militares', path: '/inspecionados' },
  // Endereço antigo da página (antes "Militares"): continua abrindo a mesma tela.
  { view: 'militares', path: '/militares' },
];

// --- Aliases estáveis ----------------------------------------------------------
// Endereços curtos e fáceis de compartilhar que redirecionam (replace) para a rota canônica de ROUTES,
// preservando o que vier depois do prefixo (ex.: /doencas/<id>/0 → /beneficios/doencas/<id>/0).
// Não substituem nem quebram as rotas atuais: são só atalhos. Os subníveis seguem sendo tratados pela
// página de destino, e as permissões continuam avaliadas por página no App.tsx.
export interface AliasRota {
  /** Prefixo do alias (sem barra final). */
  de: string;
  /** Prefixo da rota canônica que o alias abre. */
  para: string;
}

export const ALIASES: AliasRota[] = [
  { de: '/doencas', para: '/beneficios/doencas' },
  { de: '/portaria', para: '/beneficios/portaria' },
  { de: '/exames', para: '/concursos/exames' },
  { de: '/indices', para: '/concursos/indices' },
  { de: '/dgpm-406', para: '/normas/dgpm-406' },
  { de: '/legislacao', para: '/normas/legislacao' },
  { de: '/estudo', para: '/extras/roteiro' },
  { de: '/casos', para: '/extras/casos' },
  { de: '/videos', para: '/extras/videos' },
  { de: '/infograficos', para: '/extras/infograficos' },
  { de: '/apresentacoes', para: '/extras/apresentacoes' },
];

/** Destino canônico de um alias (mantendo o sufixo), ou undefined quando o caminho não é um alias. */
export const destinoDoAlias = (pathname: string): string | undefined => {
  const limpo = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const alias = ALIASES.find(a => limpo === a.de || limpo.startsWith(`${a.de}/`));
  return alias ? alias.para + limpo.slice(alias.de.length) : undefined;
};

const BASE_PATHS: Record<NavItem, string> = {
  splash: '/',
  home: '/',
  perfil: '/perfil',
  guide: '/beneficios/doencas',
  portaria: '/beneficios/portaria',
  concursos: '/concursos/indices',
  exames: '/concursos/exames',
  concursosJRS: '/concursos',
  inspecoes: '/inspecoes',
  pareceres: '/pareceres',
  'pericia-menor': '/pericia-menor',
  mensagens: '/mensagens',
  dgpm406: '/normas/dgpm-406',
  'dgpm406-anexos': '/normas/dgpm-406',
  laws: '/normas/legislacao',
  casos: '/extras/casos',
  videos: '/extras/videos',
  infograficos: '/extras/infograficos',
  apresentacoes: '/extras/apresentacoes',
  roteiro: '/extras/roteiro',
  usuarios: '/usuarios',
  militares: '/inspecionados',
};

/** Rota base (sem subníveis) de uma página. */
export const pathForView = (view: NavItem): string => BASE_PATHS[view] ?? '/';

/** Página correspondente a um pathname; undefined quando a rota não existe. */
export const viewForPath = (pathname: string): NavItem | undefined =>
  ROUTES.find(r => matchPath({ path: r.path, end: true }, pathname))?.view;

// --- Rotas públicas (sem login) ---------------------------------------------
// Duas telas de conteúdo exclusivamente normativo — Doenças Previstas em Lei e
// a Portaria GM-MD nº 3.551/2021 — abertas sem autenticação para serem
// compartilhadas por link com peritos de outras OM. Ficam FORA de ROUTES: quem
// decide entre o app autenticado e o shell público é components/Raiz.tsx,
// antes de o App montar. Nenhuma das duas lê Firestore ou Storage — todo o
// conteúdo já vem estático no bundle (constants.ts e content/*.md).
export const PUBLICO_DOENCAS = '/publico/doencas';
export const PUBLICO_PORTARIA = '/publico/portaria';

const PADROES_PUBLICOS = [`${PUBLICO_DOENCAS}/:doencaId?/:diagnosticoIdx?`, PUBLICO_PORTARIA];

/** A URL é de uma das páginas públicas (não passa pela tela de login). */
export const ehRotaPublica = (pathname: string): boolean =>
  PADROES_PUBLICOS.some(path => matchPath({ path, end: true }, pathname) !== null);

// Subníveis com nome próprio
export const doencaPath = (doencaId: string, diagnosticoIdx?: number, base: string = BASE_PATHS.guide): string =>
  `${base}/${encodeURIComponent(doencaId)}${diagnosticoIdx === undefined ? '' : `/${diagnosticoIdx}`}`;
/** Tabela dos candidatos agendados de todos os concursos num dia (AAAA-MM-DD). */
export const concursosDiaPath = (dataISO: string): string => `/concursos/dia/${dataISO}`;
export const concursoPath = (concursoId: string): string => `/concursos/${encodeURIComponent(concursoId)}`;
export const periciaMenorPath = (aba: 'novo' | 'historico', pessoa?: string): string =>
  `/pericia-menor/${aba}${pessoa ? `/${encodeURIComponent(pessoa)}` : ''}`;
