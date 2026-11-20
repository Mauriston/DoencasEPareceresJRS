// Ficheiro: services/fichaDados.ts
// Dados e contas da Ficha do inspecionado (components/ficha/FichaInspecionado.tsx), aba "Inspeções de Saúde".
// Reaproveita as consultas das IS (sem duplicar leitura):
//  - services/examesIS.ts › listarDocumentosDasISDoInspecionado: exames e atestados/relatórios enviados nas IS;
//  - services/afastamentosIS.ts › listarAfastamentosECidsDoInspecionado: períodos de LTS/Restrições e CID das IS.
// Aqui ficam só a carga combinada (cada fonte falha sozinha, sem derrubar a outra) e as contas puras da ficha
// (resumo do ano, faixa dos últimos 12 meses e CID agrupados), testadas em services/__tests__/fichaDados.test.ts.
import { listarDocumentosDasISDoInspecionado, type DocumentoDaIS } from './examesIS';
import { listarAfastamentosECidsDoInspecionado, type AfastamentoDaIS } from './afastamentosIS';
import type { CidDaIS, TipoAfastamentoIS } from '../utils/afastamentosIS';
import { getDriveEmbedUrl, isGoogleDriveUrl } from '../utils/googleDrive';

export interface DadosISDaFicha {
  exames: DocumentoDaIS[];
  atestados: DocumentoDaIS[];
  afastamentos: AfastamentoDaIS[];
  cids: CidDaIS[];
}

export const DADOS_IS_VAZIOS: DadosISDaFicha = { exames: [], atestados: [], afastamentos: [], cids: [] };

/** Exames, atestados, afastamentos e CID das IS do inspecionado (NIP só dígitos). Nunca lança. */
export const carregarDadosISDaFicha = async (nip: string): Promise<DadosISDaFicha> => {
  const [docs, afast] = await Promise.allSettled([
    listarDocumentosDasISDoInspecionado(nip, { comUrl: false }),
    listarAfastamentosECidsDoInspecionado(nip),
  ]);
  return {
    exames: docs.status === 'fulfilled' ? docs.value.exames : [],
    atestados: docs.status === 'fulfilled' ? docs.value.atestados : [],
    afastamentos: afast.status === 'fulfilled' ? afast.value.afastamentos : [],
    cids: afast.status === 'fulfilled' ? afast.value.cids : [],
  };
};

/** URL para o iframe do modal: link do Drive vira o preview embutido; os demais passam direto. */
export const urlParaModal = (url: string): string => (isGoogleDriveUrl(url) ? getDriveEmbedUrl(url) || url : url);

// ---------- Contas da aba Inspeções de Saúde ----------

type Periodo = { tipo: TipoAfastamentoIS; dataInicio: string; dataFim: string; dias: number };

/** Dias de um período que caem no ano `ano`. */
const diasNoAno = (p: Periodo, ano: number): number => {
  if (!p.dataInicio || !p.dataFim) return 0;
  const ini = p.dataInicio > `${ano}-01-01` ? p.dataInicio : `${ano}-01-01`;
  const fim = p.dataFim < `${ano}-12-31` ? p.dataFim : `${ano}-12-31`;
  if (fim < ini) return 0;
  const [ya, ma, da] = ini.split('-').map(Number);
  const [yb, mb, db] = fim.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000) + 1;
};

export interface ResumoIS {
  ano: number;
  /** IS abertas no ano corrente (canceladas não contam). */
  isNoAno: number;
  isTotal: number;
  lts: { ano: number; total: number };
  restricoes: { ano: number; total: number };
}

export const resumoIS = (
  inspecoes: ReadonlyArray<{ dataAbertura?: string; status?: string }>,
  periodos: ReadonlyArray<Periodo>,
  hoje: string,
): ResumoIS => {
  const ano = Number(hoje.slice(0, 4));
  const validas = inspecoes.filter(i => i.status !== 'cancelada');
  const soma = (tipo: TipoAfastamentoIS) => {
    const ps = periodos.filter(p => p.tipo === tipo);
    return { ano: ps.reduce((s, p) => s + diasNoAno(p, ano), 0), total: ps.reduce((s, p) => s + (p.dias || 0), 0) };
  };
  return {
    ano,
    isNoAno: validas.filter(i => (i.dataAbertura || '').startsWith(String(ano))).length,
    isTotal: validas.length,
    lts: soma('lts'),
    restricoes: soma('restricoes'),
  };
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export interface MesFaixaIS { chave: string; rotulo: string; tipo: TipoAfastamentoIS | null }

/** Os 12 meses até o atual, marcando os que têm LTS (prioridade) ou restrições. */
export const faixa12MesesIS = (periodos: ReadonlyArray<Periodo>, hoje: string): MesFaixaIS[] => {
  const [a, m] = hoje.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (11 - i), 1));
    const ano = d.getUTCFullYear(); const mes = d.getUTCMonth() + 1;
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;
    const inicio = `${chave}-01`;
    const fim = `${chave}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, '0')}`;
    const tipos = periodos.filter(p => p.dataInicio && p.dataInicio <= fim && (p.dataFim || p.dataInicio) >= inicio).map(p => p.tipo);
    return { chave, rotulo: MESES[mes - 1], tipo: tipos.includes('lts') ? 'lts' : tipos.includes('restricoes') ? 'restricoes' : null };
  });
};

export interface CidAgrupadoIS { chave: string; texto: string; n: number; isNumeros: number[] }

/** CID das IS agrupados (mesmo texto, sem diferenciar maiúsculas/acentos/espaços), por frequência. */
export const agruparCidsIS = (cids: ReadonlyArray<Pick<CidDaIS, 'cid' | 'isNumero'>>): CidAgrupadoIS[] => {
  const mapa = new Map<string, CidAgrupadoIS>();
  for (const c of cids) {
    const texto = (c.cid || '').replace(/\s+/g, ' ').trim();
    if (!texto) continue;
    const chave = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const atual = mapa.get(chave);
    if (atual) { atual.n++; if (!atual.isNumeros.includes(c.isNumero)) atual.isNumeros.push(c.isNumero); }
    else mapa.set(chave, { chave, texto, n: 1, isNumeros: [c.isNumero] });
  }
  return [...mapa.values()].sort((x, y) => y.n - x.n || x.texto.localeCompare(y.texto, 'pt-BR'));
};
