// Ficheiro: utils/guiasExames.ts
// Regras puras (sem Firebase) das GUIAS DE EXAMES da IS: quais exames do Anexo O da DGPM-406 (a mesma
// fonte da página Exames mínimos — data/anexoOExamesMinimos.json, components/ExamesGuide.tsx) viram
// guias para a finalidade, o sexo e a idade do inspecionado, e em que ordem as páginas saem no PDF
// (servidor/documentos/guiasExames/). Usadas pelo servidor (que recalcula, sem confiar no cliente),
// pelos e-mails das guias e pelas telas da IS.
//
// Regras do pedido do Presidente (ESPECIFICAÇÃO "Regras do negócio para gerar as guias"):
//  - filtra por Condicao_Genero e Condicao_Idade_Minima, como a página Exames mínimos;
//  - Exame toxicológico fica de fora (é por amostragem, não por padrão);
//  - "Teste Imunológico de Gravidez (TIG)" vira só "TIG"; só os nomes, sem as observações;
//  - Biometria e Oftalmologia geral não geram guia;
//  - páginas: 1 dos laboratoriais (ordem alfabética, duas colunas); 1 de Audiometria; 1 do Exame
//    odontológico geral; 1 de Oftalmologia Especial; 1 do Laudo ginecológico e de mamas; 1 por exame
//    de imagem; 1 por exame de "Outros exames".
import { casarFinalidadeAnexoO } from './guiasExamesIS';
import examesData from '../data/anexoOExamesMinimos.json';

export type SexoGuia = 'Masculino' | 'Feminino';

interface ExameAnexo { Exame: string; Condicao_Genero: SexoGuia | null; Condicao_Idade_Minima: number | null }
interface FinalidadeAnexo { Finalidade_Inspecao: string; Grupos_Exame: { Grupo_Exame: string; Exames: ExameAnexo[] }[] }
interface GrupoFinalidadeAnexo { Grupo_Finalidade_Inspecao: string; Finalidades_Inspecao: FinalidadeAnexo[] }

/** Grupos do Anexo O, na ordem em que as páginas saem no PDF (e as linhas da tabela do e-mail). */
export const GRUPOS_GUIA = ['Exames laboratoriais', 'Avaliações', 'Exames de imagem', 'Outros exames'] as const;
export type GrupoGuia = typeof GRUPOS_GUIA[number];

export interface GrupoExamesGuia { grupo: string; exames: string[] }

// Alguns nomes no JSON trazem quebra de linha ("Ingresso SAM / SMV\n(oriundos do meio civil)") — o mesmo
// limparNome de components/ExamesGuide.tsx, que é o texto gravado na finalidade da IS.
const limparNome = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();
/** Chave de comparação: sem acento, minúsculas e espaços simples. */
const chave = (s: string) => limparNome(String(s ?? '')).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');

const FINALIDADES = new Map<string, FinalidadeAnexo>(
  (examesData as GrupoFinalidadeAnexo[]).flatMap(g => g.Finalidades_Inspecao.map(f => [chave(f.Finalidade_Inspecao), f] as const)),
);

/** Exames do Anexo O que nunca geram guia. */
const SEM_GUIA = new Set(['biometria', 'oftalmologia geral', 'exame toxicologico']);

/** Nomes de exibição (os dos templates do Google Docs da JRS) quando diferem do Anexo O. */
const NOMES_EXIBICAO: Record<string, string> = {
  'teste imunologico de gravidez (tig)': 'TIG',
  'radiografia de torax': 'Radiografia de tórax PA e perfil',
  'eletrocardiograma': 'Eletrocardiograma com 12 derivações',
};

/** Ordem das páginas das Avaliações (as que não estão aqui vão depois, na ordem do Anexo O). */
const ORDEM_AVALIACOES = ['audiometria', 'exame odontologico', 'oftalmologia especial', 'laudo detalhado'];
const posicaoAvaliacao = (exame: string) => {
  const i = ORDEM_AVALIACOES.findIndex(p => chave(exame).startsWith(p));
  return i < 0 ? ORDEM_AVALIACOES.length : i;
};

const compararPtBr = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });

/**
 * Exames das guias por grupo, na ordem das páginas: laboratoriais (ordem alfabética, ignorando acento),
 * Avaliações (Audiometria, Exame odontológico geral, Oftalmologia Especial, Laudo ginecológico), Exames de
 * imagem e Outros exames (na ordem do Anexo O). Grupos sem exame ficam de fora. Finalidade desconhecida → [].
 * Idade inválida (NaN) não libera exame com idade mínima.
 */
/**
 * Finalidade do Anexo O equivalente à da IS: nome igual ou um apelido conhecido (utils/guiasExamesIS.ts —
 * ex.: "Deixar o SAM" → "Deixar o SAM, SMV, SMI ou SPG"). O app pode mandar ao servidor a escolhida pela IA.
 */
const finalidadeDoAnexo = (finalidade: string): FinalidadeAnexo | undefined =>
  FINALIDADES.get(chave(finalidade)) ?? FINALIDADES.get(chave(casarFinalidadeAnexoO(finalidade) ?? ''));

/** O nome é exatamente uma finalidade do Anexo O (valida a escolhida pela IA no app). */
export const ehFinalidadeAnexoO = (nome: unknown): boolean => typeof nome === 'string' && FINALIDADES.has(chave(nome));

export const examesDasGuias = (finalidade: string, sexo: SexoGuia, idade: number): GrupoExamesGuia[] => {
  const f = finalidadeDoAnexo(finalidade);
  if (!f) return [];
  const porGrupo = new Map<string, string[]>();
  for (const g of f.Grupos_Exame) {
    const nomes = g.Exames
      .filter(e => !SEM_GUIA.has(chave(e.Exame)))
      .filter(e => e.Condicao_Genero === null || e.Condicao_Genero === sexo)
      .filter(e => e.Condicao_Idade_Minima === null || (Number.isFinite(idade) && idade >= e.Condicao_Idade_Minima))
      .map(e => NOMES_EXIBICAO[chave(e.Exame)] ?? limparNome(e.Exame));
    const lista = porGrupo.get(g.Grupo_Exame) ?? [];
    nomes.forEach(n => { if (!lista.includes(n)) lista.push(n); });
    porGrupo.set(g.Grupo_Exame, lista);
  }
  const ordenar = (grupo: string, exames: string[]) => {
    if (grupo === 'Exames laboratoriais') return [...exames].sort(compararPtBr);
    if (grupo === 'Avaliações') return exames.map((e, i) => ({ e, i })).sort((a, b) => posicaoAvaliacao(a.e) - posicaoAvaliacao(b.e) || a.i - b.i).map(x => x.e);
    return exames;
  };
  const outros = [...porGrupo.keys()].filter(g => !(GRUPOS_GUIA as readonly string[]).includes(g));
  return [...GRUPOS_GUIA, ...outros]
    .map(grupo => ({ grupo, exames: ordenar(grupo, porGrupo.get(grupo) ?? []) }))
    .filter(g => g.exames.length > 0);
};

/** A finalidade tem algum exame mínimo que gera guia (para algum sexo e idade). Biometria, Oftalmologia geral e toxicológico não contam. */
export const finalidadeTemExamesMinimos = (finalidade: string): boolean =>
  examesDasGuias(finalidade, 'Masculino', 200).length > 0 || examesDasGuias(finalidade, 'Feminino', 200).length > 0;

/** "AAAA-MM-DD" de hoje no fuso de Recife. */
const hojeRecife = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** Idade em anos completos na data `hoje` (AAAA-MM-DD; padrão: hoje em Recife). Data inválida → NaN. */
export const idadeEm = (dataNascimento: string, hoje: string = hojeRecife()): number => {
  const n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dataNascimento ?? '').trim());
  const h = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(hoje ?? '').trim());
  if (!n || !h) return NaN;
  const [an, mn, dn] = n.slice(1).map(Number);
  const [ah, mh, dh] = h.slice(1).map(Number);
  if (mn < 1 || mn > 12 || dn < 1 || dn > 31) return NaN;
  const idade = ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
  return idade >= 0 ? idade : NaN;
};

// ---------------------------------------------------------------- Páginas do PDF

export type TipoPaginaGuia = 'laboratoriais' | 'audiometria' | 'odontologico' | 'oftalmologiaEspecial' | 'ginecologico' | 'exame';

export interface PaginaGuia {
  tipo: TipoPaginaGuia;
  /** Laboratoriais: todos os exames; demais: o exame da página. */
  exames: string[];
}

const tipoAvaliacao = (exame: string): TipoPaginaGuia => {
  const c = chave(exame);
  if (c.startsWith('audiometria')) return 'audiometria';
  if (c.startsWith('exame odontologico')) return 'odontologico';
  if (c.startsWith('oftalmologia especial')) return 'oftalmologiaEspecial';
  if (c.startsWith('laudo detalhado')) return 'ginecologico';
  return 'exame';
};

/** Uma página por guia, na ordem do PDF: os laboratoriais numa página só; os demais, uma página por exame. */
export const paginasDasGuias = (grupos: GrupoExamesGuia[]): PaginaGuia[] => grupos.flatMap(g =>
  g.grupo === 'Exames laboratoriais'
    ? [{ tipo: 'laboratoriais' as const, exames: g.exames }]
    : g.exames.map(e => ({ tipo: g.grupo === 'Avaliações' ? tipoAvaliacao(e) : 'exame' as const, exames: [e] })));
