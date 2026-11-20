// Ficheiro: utils/afastamentosIS.ts
// Regras puras dos afastamentos que saem das IS de Verificações e Términos (services/afastamentosIS.ts):
//  - só a IS finalizada com o TIS assinado, do grupo "Verificações e Términos", gera afastamentos;
//  - cada afastamento é LTS (Licença para Tratamento de Saúde) ou Restrições, com N dias; o 1º começa na data da IS
//    e os encadeados ("após", "em seguida") começam no dia seguinte ao fim do anterior;
//  - a leitura é da IA (Firebase AI Logic); se a IA falhar, o fallback por expressões regulares extrai "N dias" e
//    o tipo (LTS/restrições) do laudo e das restrições.
// Testadas em utils/__tests__/afastamentosIS.test.ts.
import { dataFimDe, somarDias } from './afastamentos';
import { GRUPO_VERIFICACOES } from './inspecoes';

export type TipoAfastamentoIS = 'lts' | 'restricoes';
export const TIPOS_AFASTAMENTO_IS: readonly TipoAfastamentoIS[] = ['lts', 'restricoes'];
export const ROTULO_AFASTAMENTO_IS: Record<TipoAfastamentoIS, string> = { lts: 'LTS', restricoes: 'Restrições' };

/** Maior duração aceita (10 anos): acima disso é erro de leitura. */
export const MAX_DIAS_AFASTAMENTO_IS = 3650;

/** Afastamento lido do laudo, ainda sem datas. */
export interface AfastamentoLido {
  tipo: TipoAfastamentoIS;
  dias: number;
  /** Começa depois do fim do afastamento anterior (ex.: "30 dias de LTS e, após, restrições por 60 dias"). */
  aposAnterior?: boolean;
}

/** Afastamento com o período calculado (gravado em afastamentosIS/{isId}.afastamentos). */
export interface AfastamentoIS {
  tipo: TipoAfastamentoIS;
  dias: number;
  /** AAAA-MM-DD */
  dataInicio: string;
  /** AAAA-MM-DD (inclusive) */
  dataFim: string;
  /** CID associado ("descrição abreviatura"), '' se desconhecido. */
  cid: string;
  /** Restrições da IS (só no tipo "restricoes"). */
  restricoes?: string;
}

/** A IS gera afastamentos: TIS assinado e finalidade do grupo Verificações e Términos. */
export const isGeraAfastamentos = (is: { status?: string; situacao?: string; grupoFinalidade?: string }): boolean =>
  is.status === 'tis_assinado' && is.grupoFinalidade === GRUPO_VERIFICACOES;

/** Data da IS (início do 1º afastamento): dia da entrevista; senão a data do laudo; senão a abertura. */
export const dataDaIS = (is: { dataEntrevista?: string; dataLaudo?: string; dataAbertura?: string }): string => {
  const ok = (v?: string) => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : '');
  return ok(is.dataEntrevista) || ok(is.dataLaudo) || ok(is.dataAbertura);
};

const diasValidos = (n: unknown): number | null => {
  const v = typeof n === 'string' ? Number(n) : n;
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_DIAS_AFASTAMENTO_IS ? v : null;
};

/** O que a IA devolve (ainda não conferido). */
export interface LeituraAfastamentosIA {
  afastamentos?: { tipo?: string; dias?: number | string; aposAnterior?: boolean }[];
  cid?: string;
}

/** Itens válidos da leitura da IA: tipo conhecido e dias inteiros entre 1 e 3650. */
export const normalizarAfastamentosIA = (l: LeituraAfastamentosIA | null | undefined): AfastamentoLido[] =>
  (l?.afastamentos ?? []).flatMap(a => {
    const tipo = String(a?.tipo || '').toLowerCase();
    const dias = diasValidos(a?.dias);
    if (!dias || !(TIPOS_AFASTAMENTO_IS as readonly string[]).includes(tipo)) return [];
    return [{ tipo: tipo as TipoAfastamentoIS, dias, ...(a?.aposAnterior ? { aposAnterior: true } : {}) }];
  });

/** Período de cada afastamento: o 1º (e os não encadeados) na data da IS; os encadeados no dia seguinte ao fim do anterior. */
export const montarAfastamentosIS = (
  lidos: AfastamentoLido[], dataIS: string, cid: string, restricoes = '',
): AfastamentoIS[] => {
  const saida: AfastamentoIS[] = [];
  for (const [i, a] of lidos.entries()) {
    const anterior = saida[saida.length - 1];
    const dataInicio = i > 0 && a.aposAnterior && anterior ? somarDias(anterior.dataFim, 1) : dataIS;
    const dataFim = dataFimDe(dataInicio, a.dias);
    if (!dataFim) continue;
    saida.push({
      tipo: a.tipo, dias: a.dias, dataInicio, dataFim, cid: cid.trim(),
      ...(a.tipo === 'restricoes' && restricoes.trim() ? { restricoes: restricoes.trim() } : {}),
    });
  }
  return saida;
};

// ---------------------------------------------------------------------------
// Fallback por expressões regulares
// ---------------------------------------------------------------------------

const POR_EXTENSO: Record<string, number> = {
  um: 1, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, quarenta_e_cinco: 45, cinquenta: 50, sessenta: 60, setenta: 70,
  oitenta: 80, noventa: 90, cem: 100, cento_e_vinte: 120, cento_e_cinquenta: 150, cento_e_oitenta: 180,
  duzentos_e_dez: 210, duzentos_e_quarenta: 240, trezentos_e_sessenta_e_cinco: 365,
};
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const EXTENSO_RE = Object.keys(POR_EXTENSO).sort((a, b) => b.length - a.length).map(k => k.replace(/_/g, '\\s+')).join('|');

/** "30 dias", "30 (trinta) dias", "trinta dias", "2 meses" (= 60 dias). Texto já sem acentos e em minúsculas. */
const DURACAO_RE = new RegExp(`\\b(\\d{1,4}|${EXTENSO_RE})\\s*(?:\\([^)]{0,40}\\)\\s*)?(dias?|mes(?:es)?)\\b`, 'g');
const LTS_RE = /\blts\b|licenca\s+(?:para|p\/)\s*(?:o\s+)?tratamento|tratamento\s+de\s+saude|\bincapaz/g;
const RESTRICOES_RE = /restric/g;

const posicoes = (re: RegExp, texto: string): number[] => Array.from(texto.matchAll(new RegExp(re.source, 'g')), m => m.index ?? 0);

/**
 * Tipo da duração [ini, fim) pelas palavras-chave do trecho [de, ate): primeiro a que vem logo depois ("30 dias de LTS",
 * "30 dias com restrições"); senão a mais próxima antes ("restrições por 30 dias", "incapaz … por 30 dias"); senão a
 * mais próxima depois.
 */
const tipoDoTrecho = (texto: string, ini: number, fim: number, de: number, ate: number): TipoAfastamentoIS | null => {
  const depois = texto.slice(fim, ate);
  const colado = /^\s*(?:de|em|com|sob)\s+(?:licenca|lts\b|tratamento|restric)/.exec(depois);
  if (colado) return /restric/.test(colado[0]) ? 'restricoes' : 'lts';
  const antes = (re: RegExp) => Math.max(-1, ...posicoes(re, texto).filter(p => p >= de && p < ini));
  const aLts = antes(LTS_RE); const aRes = antes(RESTRICOES_RE);
  if (aLts >= 0 || aRes >= 0) return aRes > aLts ? 'restricoes' : 'lts';
  const prox = (re: RegExp) => Math.min(Infinity, ...posicoes(re, texto).filter(p => p >= fim && p < ate));
  const dLts = prox(LTS_RE); const dRes = prox(RESTRICOES_RE);
  if (dLts === Infinity && dRes === Infinity) return null;
  return dRes < dLts ? 'restricoes' : 'lts';
};

/**
 * Fallback sem IA: acha cada "N dias" (ou "N meses") no laudo e nas restrições e decide o tipo pela palavra-chave
 * do mesmo trecho (ver tipoDoTrecho) (LTS / licença para tratamento de saúde / incapaz → LTS; restrição → Restrições).
 * Sem palavra-chave, usa o laudo: "incapaz" → LTS; "apto" com restrições preenchidas → Restrições. Durações seguidas
 * de "após"/"em seguida"/"posteriormente" no trecho ficam encadeadas. Repetições (mesmo tipo e dias) saem.
 */
export const extrairAfastamentosDoTexto = (laudo: string, restricoes = ''): AfastamentoLido[] => {
  const partes = [String(laudo || '')];
  if (/\d|dia|mes/i.test(String(restricoes || ''))) partes.push(`Restrições: ${restricoes}`);
  const texto = semAcento(partes.join('. ')).toLowerCase();
  const achados = Array.from(texto.matchAll(DURACAO_RE));
  const saida: AfastamentoLido[] = [];
  achados.forEach((m, i) => {
    const pos = m.index ?? 0;
    const bruto = m[1].replace(/\s+/g, '_');
    const n = /^\d+$/.test(bruto) ? Number(bruto) : POR_EXTENSO[bruto];
    const dias = diasValidos(/^mes/.test(m[2]) ? n * 30 : n);
    if (!dias) return;
    const fim = pos + m[0].length;
    // Trecho da duração: entre a duração anterior e a seguinte, sem passar do fim de frase (". " ou ";").
    const fimFraseAntes = Math.max(texto.lastIndexOf('. ', pos), texto.lastIndexOf(';', pos));
    const proxFrase = texto.slice(fim).search(/\.(\s|$)|;/);
    const de = Math.max(i > 0 ? (achados[i - 1].index ?? 0) + achados[i - 1][0].length : 0, fimFraseAntes + 1);
    const ate = Math.min(i < achados.length - 1 ? (achados[i + 1].index ?? texto.length) : texto.length, proxFrase >= 0 ? fim + proxFrase : texto.length);
    let tipo = tipoDoTrecho(texto, pos, fim, de, ate);
    if (!tipo) {
      if (/\bincapaz/.test(texto)) tipo = 'lts';
      else if (/\bapto/.test(texto) && String(restricoes || '').trim()) tipo = 'restricoes';
      else return;
    }
    const deAnterior = i > 0 ? (achados[i - 1].index ?? 0) + achados[i - 1][0].length : 0;
    const aposAnterior = saida.length > 0 && /\bapos\b|em\s+seguida|posteriormente|seguid[oa]s?\s+de/.test(texto.slice(deAnterior, pos));
    if (saida.some(s => s.tipo === tipo && s.dias === dias)) return;
    saida.push({ tipo, dias, ...(aposAnterior ? { aposAnterior: true } : {}) });
  });
  return saida;
};

/** Assinatura dos dados usados no processamento: igual à gravada → nada mudou e a IA não é chamada de novo. */
export const assinaturaFonteAfastamentos = (f: { laudo?: string; restricoes?: string; cid?: string; dataIS?: string }): string =>
  JSON.stringify([String(f.laudo || '').trim(), String(f.restricoes || '').trim(), String(f.cid || '').trim(), String(f.dataIS || '')]);

// ---------------------------------------------------------------------------
// Ficha do inspecionado: CIDs registrados nas IS
// ---------------------------------------------------------------------------

export interface CidDaIS { cid: string; isId: string; isNumero: number; data: string; finalidade: string; origem: 'is' | 'ia' }

/**
 * CIDs das IS do inspecionado, da mais recente para a mais antiga: o campo "cid" da IS; se a IS não tem CID,
 * o que a IA inferiu do laudo no processamento dos afastamentos.
 */
export const cidsDasIS = (
  inspecoes: { id: string; is: number; cid?: string; finalidade?: string; dataEntrevista?: string; dataLaudo?: string; dataAbertura?: string }[],
  cidInferidoPorIS: Record<string, string> = {},
): CidDaIS[] => inspecoes
  .flatMap(is => {
    const proprio = String(is.cid || '').trim();
    const cid = proprio || String(cidInferidoPorIS[is.id] || '').trim();
    if (!cid) return [];
    return [{ cid, isId: is.id, isNumero: is.is, data: dataDaIS(is), finalidade: is.finalidade || '', origem: (proprio ? 'is' : 'ia') as 'is' | 'ia' }];
  })
  .sort((a, b) => b.data.localeCompare(a.data) || b.isNumero - a.isNumero);
