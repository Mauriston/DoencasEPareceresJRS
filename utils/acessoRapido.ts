// Ficheiro: utils/acessoRapido.ts
// Card "Acesso rápido" da Início: até 6 páginas, editáveis pelo usuário (guardadas neste aparelho) e renovadas
// toda SEMANA (segunda-feira) pelas páginas mais acessadas nos últimos 28 dias — só para quem tem acesso a mais
// de 6 páginas (com 6 ou menos, todas cabem no card). A página Inspeções de Saúde nunca entra no card (tem
// atalhos próprios na Início). Os acessos são contados por dia, também neste aparelho (localStorage).
import type { NavItem } from '../types';
import { inicioDaSemana, somarDias } from './inspecoes';

export const MAX_RAPIDO = 6;
/** Páginas que nunca entram no Acesso rápido. */
export const FORA_DO_RAPIDO: NavItem[] = ['home', 'inspecoes'];
export const JANELA_ACESSOS_DIAS = 28;

/** Escolha guardada: as páginas e a semana (segunda-feira, AAAA-MM-DD) em que foram definidas. */
export interface EscolhaRapido { ids: NavItem[]; semana: string }
/** Acessos por dia: { "2026-11-12": { pareceres: 3, guide: 1 } }. */
export type AcessosPorDia = Record<string, Partial<Record<NavItem, number>>>;

export const chaveEscolha = (uid: string) => `jrs_acesso_rapido_${uid}`;
export const chaveAcessos = (uid: string) => `jrs_acessos_paginas_${uid}`;

/** Lê a escolha guardada; o formato antigo (só a lista) vale como de uma semana passada. */
export const lerEscolha = (texto: string | null): EscolhaRapido | null => {
  if (!texto) return null;
  try {
    const v = JSON.parse(texto);
    if (Array.isArray(v)) return { ids: v, semana: '' };
    if (v && Array.isArray(v.ids)) return { ids: v.ids, semana: String(v.semana || '') };
  } catch { /* ignora */ }
  return null;
};

/** Soma um acesso à página no dia e descarta os dias fora da janela. */
export const somarAcesso = (acessos: AcessosPorDia, pagina: NavItem, hoje: string): AcessosPorDia => {
  if (FORA_DO_RAPIDO.includes(pagina)) return acessos;
  const limite = somarDias(hoje, -(JANELA_ACESSOS_DIAS - 1));
  const novo: AcessosPorDia = {};
  Object.entries(acessos).forEach(([dia, c]) => { if (dia >= limite) novo[dia] = c; });
  const dia = { ...(novo[hoje] ?? {}) };
  dia[pagina] = (dia[pagina] ?? 0) + 1;
  novo[hoje] = dia;
  return novo;
};

/** Total de acessos de cada página na janela de 28 dias até hoje. */
export const contarAcessos = (acessos: AcessosPorDia, hoje: string): Partial<Record<NavItem, number>> => {
  const limite = somarDias(hoje, -(JANELA_ACESSOS_DIAS - 1));
  const total: Partial<Record<NavItem, number>> = {};
  Object.entries(acessos).forEach(([dia, c]) => {
    if (dia < limite || dia > hoje) return;
    Object.entries(c).forEach(([id, n]) => { total[id as NavItem] = (total[id as NavItem] ?? 0) + (n ?? 0); });
  });
  return total;
};

interface Entrada {
  salvo: EscolhaRapido | null;
  /** Páginas que o perfil acessa, na ordem do menu. */
  disponiveis: NavItem[];
  contagem: Partial<Record<NavItem, number>>;
  hoje: string;
  padrao: NavItem[];
}

/**
 * Páginas do card. Com mais de 6 páginas disponíveis e acessos registrados, a escolha é renovada uma vez por
 * semana pelas mais acessadas (completada pela escolha anterior); devolve `salvar` quando a escolha mudou e
 * deve ser guardada. Fora disso, vale a escolha do usuário ou o padrão do perfil.
 */
export const resolverAcessoRapido = ({ salvo, disponiveis, contagem, hoje, padrao }: Entrada): { ids: NavItem[]; salvar?: EscolhaRapido } => {
  const ok = disponiveis.filter(id => !FORA_DO_RAPIDO.includes(id));
  const limpar = (ids: NavItem[]) => ids.filter((id, i, a) => ok.includes(id) && a.indexOf(id) === i).slice(0, MAX_RAPIDO);
  const semana = inicioDaSemana(hoje);
  if (ok.length > MAX_RAPIDO && (!salvo || salvo.semana !== semana)) {
    const ranking = ok.filter(id => (contagem[id] ?? 0) > 0)
      .sort((a, b) => (contagem[b] ?? 0) - (contagem[a] ?? 0) || ok.indexOf(a) - ok.indexOf(b));
    if (ranking.length) {
      const ids = limpar([...ranking, ...(salvo?.ids ?? []), ...padrao, ...ok]);
      return { ids, salvar: { ids, semana } };
    }
  }
  if (salvo) return { ids: limpar(salvo.ids) };
  return { ids: limpar([...padrao, ...ok]) };
};
