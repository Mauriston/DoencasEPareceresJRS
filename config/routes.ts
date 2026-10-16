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
  { view: 'concursosJRS', path: '/concursos/:concursoId?' },
  { view: 'pareceres', path: '/pareceres' },
  { view: 'pericia-menor', path: '/pericia-menor/:aba?/:pessoa?' },
  { view: 'mensagens', path: '/mensagens' },
  { view: 'dgpm406', path: '/normas/dgpm-406' },
  { view: 'laws', path: '/normas/legislacao' },
  { view: 'templates', path: '/normas/templates' },
  { view: 'casos', path: '/extras/casos' },
  { view: 'videos', path: '/extras/videos' },
  { view: 'infograficos', path: '/extras/infograficos' },
  { view: 'roteiro', path: '/extras/roteiro' },
  { view: 'usuarios', path: '/usuarios' },
];

const BASE_PATHS: Record<NavItem, string> = {
  splash: '/',
  home: '/',
  perfil: '/perfil',
  guide: '/beneficios/doencas',
  portaria: '/beneficios/portaria',
  concursos: '/concursos/indices',
  exames: '/concursos/exames',
  concursosJRS: '/concursos',
  pareceres: '/pareceres',
  'pericia-menor': '/pericia-menor',
  mensagens: '/mensagens',
  dgpm406: '/normas/dgpm-406',
  'dgpm406-anexos': '/normas/dgpm-406',
  laws: '/normas/legislacao',
  templates: '/normas/templates',
  casos: '/extras/casos',
  videos: '/extras/videos',
  infograficos: '/extras/infograficos',
  roteiro: '/extras/roteiro',
  usuarios: '/usuarios',
};

/** Rota base (sem subníveis) de uma página. */
export const pathForView = (view: NavItem): string => BASE_PATHS[view] ?? '/';

/** Página correspondente a um pathname; undefined quando a rota não existe. */
export const viewForPath = (pathname: string): NavItem | undefined =>
  ROUTES.find(r => matchPath({ path: r.path, end: true }, pathname))?.view;

// Subníveis com nome próprio
export const doencaPath = (doencaId: string, diagnosticoIdx?: number): string =>
  `/beneficios/doencas/${encodeURIComponent(doencaId)}${diagnosticoIdx === undefined ? '' : `/${diagnosticoIdx}`}`;
export const concursoPath = (concursoId: string): string => `/concursos/${encodeURIComponent(concursoId)}`;
export const periciaMenorPath = (aba: 'novo' | 'historico', pessoa?: string): string =>
  `/pericia-menor/${aba}${pessoa ? `/${encodeURIComponent(pessoa)}` : ''}`;
