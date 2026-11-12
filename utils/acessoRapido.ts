// Ficheiro: utils/acessoRapido.ts
// Card "Acesso rápido" da Início: até 6 páginas, editáveis pelo usuário e renovadas a cada QUINZENA (de 14 em 14
// dias, sempre numa segunda-feira) pelas páginas mais acessadas nos últimos 28 dias — só para quem tem acesso a
// mais de 6 páginas (com 6 ou menos, todas cabem no card). A página Inspeções de Saúde nunca entra no card (tem
// atalhos próprios na Início). Escolha e acessos ficam no Firestore, por usuário (services/acessoRapido.ts).
import type { NavItem } from '../types';
import { inicioDaSemana, somarDias } from './inspecoes';

export const MAX_RAPIDO = 6;
/** Páginas que nunca entram no Acesso rápido. */
export const FORA_DO_RAPIDO: NavItem[] = ['home', 'inspecoes'];
export const JANELA_ACESSOS_DIAS = 28;

/** Escolha guardada: as páginas e a quinzena (segunda-feira de início, AAAA-MM-DD) em que foram definidas. */
export interface EscolhaRapido { ids: NavItem[]; semana: string }
/** Acessos por dia: { "2026-11-12": { pareceres: 3, guide: 1 } }. */
export type AcessosPorDia = Record<string, Partial<Record<NavItem, number>>>;

/** Escolha antiga, guardada só no aparelho (antes do Firestore): migrada na primeira vez. */
export const chaveEscolhaLocal = (uid: string) => `jrs_acesso_rapido_${uid}`;

/** Segunda-feira de referência das quinzenas (05/01/2026); toda quinzena começa 14·n dias depois. */
const BASE_QUINZENA = '2026-01-05';
const diasDesde = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
/** Segunda-feira em que começa a quinzena de `hoje`. */
export const inicioDaQuinzena = (hoje: string): string => {
  const seg = inicioDaSemana(hoje);
  const semanas = Math.floor(diasDesde(BASE_QUINZENA, seg) / 7);
  return ((semanas % 2) + 2) % 2 === 0 ? seg : somarDias(seg, -7);
};

/** Dias guardados fora da janela de 28 dias (a apagar). */
export const diasForaDaJanela = (acessos: AcessosPorDia, hoje: string): string[] => {
  const limite = somarDias(hoje, -(JANELA_ACESSOS_DIAS - 1));
  return Object.keys(acessos).filter(d => d < limite);
};

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
 * quinzena pelas mais acessadas (completada pela escolha anterior); devolve `salvar` quando a escolha mudou e
 * deve ser guardada. Fora disso, vale a escolha do usuário ou o padrão do perfil.
 */
export const resolverAcessoRapido = ({ salvo, disponiveis, contagem, hoje, padrao }: Entrada): { ids: NavItem[]; salvar?: EscolhaRapido } => {
  const ok = disponiveis.filter(id => !FORA_DO_RAPIDO.includes(id));
  const limpar = (ids: NavItem[]) => ids.filter((id, i, a) => ok.includes(id) && a.indexOf(id) === i).slice(0, MAX_RAPIDO);
  const semana = inicioDaQuinzena(hoje);
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
