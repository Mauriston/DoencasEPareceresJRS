// Ficheiro: utils/afastamentosIS.ts
// Afastamentos (LTS ou Restrições) calculados pela IA a partir do Laudo e das Restrições de uma IS
// finalizada do grupo "Verificações e Términos" (services/afastamentosIS.ts faz a chamada e grava).
// Aqui ficam as regras puras, testadas em utils/__tests__/afastamentosIS.test.ts:
//  - quando a IS precisa (re)processar: finalizada com TIS assinado, Laudo preenchido e a "impressão digital"
//    (hash) do que a IA lê diferente da última processada — idempotente;
//  - normalização da resposta da IA: tipos, quantidades (dias ou meses), datas encadeadas a partir da data
//    do laudo, restrições e CID (o da IS, salvo se o laudo citar outro);
//  - adaptação ao formato das perícias menores (PericiaResumivel), para a Ficha do inspecionado somar os
//    períodos de LTS (Dispensa total) e de Restrições aos das perícias.
import { normalizarBusca } from './corposQuadros';
import { grupoComRestricoes, separarRestricoes } from './conclusaoIS';
import { dataFimDe, dataValida, diasEntre, somarDias } from './afastamentos';
import type { PericiaResumivel } from './periciaMenorResumo';

/** Versão das regras/prompt: mudando, as IS são reprocessadas na próxima finalização. */
export const VERSAO_AFASTAMENTOS_IS = 1;

export type TipoAfastamentoIS = 'lts' | 'restricoes';
export const ROTULO_AFASTAMENTO_IS: Record<TipoAfastamentoIS, string> = { lts: 'LTS', restricoes: 'Restrições' };
/** Dispensa equivalente à LTS nas perícias menores (vence as restrições — utils/periciaMenorLista.tiposDispensa). */
export const DISPENSA_TOTAL = 'TODAS AS ATIVIDADES';
/** Teto de um período (2 anos): acima disso a leitura é tida como erro. */
const MAX_DIAS = 730;

/** Um período de afastamento decorrente da IS (gravado em inspecoes/{id}.afastamentos[]). */
export interface AfastamentoIS {
  tipo: TipoAfastamentoIS;
  /** Dias corridos (inclusive). */
  dias: number;
  /** AAAA-MM-DD */
  dataInicio: string;
  /** AAAA-MM-DD (inclusive) = dataInicio + dias − 1. */
  dataTermino: string;
  /** Restrições do período (tipo "restricoes"); [] na LTS. */
  restricoes: string[];
  /** Mesmo papel das `dispensas` da perícia menor: LTS → ["TODAS AS ATIVIDADES"]; Restrições → a lista. */
  dispensas: string[];
  /** CID no formato DESCRABREV (ex.: "M54.5 Dor lombar baixa") — o da IS, salvo se o laudo citar outro. */
  cid: string;
  /** SUBCAT sem ponto, em maiúsculas (ex.: "M545"). */
  cidCodigo: string;
  /** Trecho do laudo que justifica o período (conferência humana). */
  trecho: string;
}

export type SituacaoProcessamentoIS = 'processando' | 'concluido' | 'sem_afastamento' | 'erro';

/** Marcador de processamento (inspecoes/{id}.afastamentosProcessamento). */
export interface ProcessamentoAfastamentosIS {
  versao: number;
  /** Hash do que a IA leu (laudo, restrições, CID, data do laudo, finalidade). */
  hash: string;
  situacao: SituacaoProcessamentoIS;
  /** Date.now() do início da última tentativa (trava de concorrência). */
  iniciadoEmMs: number;
  /** Tentativas com este hash (erros seguidos param em MAX_TENTATIVAS). */
  tentativas: number;
  /** Mensagem curta do último erro (sem dados pessoais). */
  erro?: string;
  /** Observação da IA (ex.: "laudo sem período definido"). */
  observacao?: string;
}

/** O que a regra precisa da IS. */
export interface ISParaAfastamentos {
  grupoFinalidade?: string;
  finalidade?: string;
  situacao?: string;
  status?: string;
  laudo?: string;
  restricoes?: string;
  cid?: string;
  cidCodigo?: string;
  dataLaudo?: string;
  dataEntrevista?: string;
  afastamentosProcessamento?: ProcessamentoAfastamentosIS | null;
}

export const MAX_TENTATIVAS = 3;
/** "processando" mais antigo que isto é tido como abandonado (aba fechada no meio). */
export const PRAZO_PROCESSANDO_MS = 10 * 60_000;

/** FNV-1a 32 bits, em hexadecimal (estável entre navegadores). */
export const hashTexto = (texto: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

const limpo = (s: string | undefined | null): string => String(s || '').replace(/\s+/g, ' ').trim();

/** Impressão digital da entrada da IA: muda quando muda algo que altera o cálculo. */
export const hashEntradaAfastamentos = (is: ISParaAfastamentos): string => hashTexto(JSON.stringify([
  VERSAO_AFASTAMENTOS_IS, limpo(is.finalidade), limpo(is.laudo), limpo(is.restricoes), limpo(is.cid), limpo(is.cidCodigo), limpo(is.dataLaudo),
]));

/** IS elegível: Verificações e Términos, finalizada com TIS assinado e com Laudo. */
export const elegivelAfastamentos = (is: ISParaAfastamentos): boolean =>
  grupoComRestricoes(is.grupoFinalidade) && is.situacao === 'finalizada' && is.status === 'tis_assinado' && !!limpo(is.laudo);

/** Precisa (re)processar agora? Idempotente: mesmo hash já concluído (ou em curso, ou com erros demais) não reprocessa. */
export const precisaProcessarAfastamentos = (is: ISParaAfastamentos, agoraMs: number): boolean => {
  if (!elegivelAfastamentos(is)) return false;
  const p = is.afastamentosProcessamento;
  if (!p || p.hash !== hashEntradaAfastamentos(is) || p.versao !== VERSAO_AFASTAMENTOS_IS) return true;
  if (p.situacao === 'concluido' || p.situacao === 'sem_afastamento') return false;
  if (p.situacao === 'processando') return agoraMs - (p.iniciadoEmMs || 0) > PRAZO_PROCESSANDO_MS;
  return (p.tentativas || 0) < MAX_TENTATIVAS; // erro
};

/** Marcador "processando" a gravar ao iniciar (conta as tentativas do mesmo hash). */
export const marcadorProcessando = (is: ISParaAfastamentos, agoraMs: number): ProcessamentoAfastamentosIS => {
  const hash = hashEntradaAfastamentos(is);
  const p = is.afastamentosProcessamento;
  const tentativas = p && p.hash === hash && p.versao === VERSAO_AFASTAMENTOS_IS ? (p.tentativas || 0) + 1 : 1;
  return { versao: VERSAO_AFASTAMENTOS_IS, hash, situacao: 'processando', iniciadoEmMs: agoraMs, tentativas };
};

/** Data de início do 1º período: a do laudo; sem ela, a da entrevista; sem ambas, `hoje`. */
export const dataBaseAfastamentos = (is: ISParaAfastamentos, hoje: string): string => {
  if (dataValida(String(is.dataLaudo || ''))) return String(is.dataLaudo);
  const ent = String(is.dataEntrevista || '').slice(0, 10);
  return dataValida(ent) ? ent : hoje;
};

// ---------------------------------------------------------------- Resposta da IA

/** Item como a IA devolve (esquema em services/afastamentosIS.ts). */
export interface AfastamentoLidoIA {
  tipo?: string;
  quantidade?: number;
  unidade?: string;
  dataInicio?: string;
  restricoes?: string[];
  cidCodigo?: string;
  trecho?: string;
}
export interface RespostaAfastamentosIA { afastamentos?: AfastamentoLidoIA[]; observacao?: string }

/** "LTS", "licença para tratamento de saúde", "dispensa total" → lts; "restrições" → restricoes. */
export const tipoAfastamentoDe = (t: string | undefined): TipoAfastamentoIS | null => {
  const k = normalizarBusca(String(t || '')).toLowerCase();
  if (/\blts\b|licenca|tratamento de saude|dispensa total|afastamento total/.test(k)) return 'lts';
  if (/restri/.test(k)) return 'restricoes';
  return null;
};

/** Mesma data N meses adiante (dia ajustado ao fim do mês). */
const somarMeses = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), Math.min(d, ultimo))).toISOString().slice(0, 10);
};

/** Quantidade + unidade → dias corridos a partir de `inicio` (meses e anos pelo calendário; semanas × 7). 0 = inválido. */
export const diasDoPeriodo = (quantidade: number | undefined, unidade: string | undefined, inicio: string): number => {
  const q = Number(quantidade);
  if (!Number.isFinite(q) || q <= 0) return 0;
  const u = normalizarBusca(String(unidade || 'dias')).toLowerCase();
  let dias: number;
  if (/^mes/.test(u)) dias = Number.isInteger(q) ? diasEntre(inicio, somarMeses(inicio, q)) : Math.round(q * 30);
  else if (/^ano/.test(u)) dias = Number.isInteger(q) ? diasEntre(inicio, somarMeses(inicio, q * 12)) : Math.round(q * 365);
  else if (/^seman/.test(u)) dias = Math.round(q * 7);
  else dias = Math.round(q);
  return dias >= 1 && dias <= MAX_DIAS ? dias : 0;
};

const codigoCidLimpo = (c: string | undefined): string => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export interface ContextoNormalizacao {
  is: ISParaAfastamentos;
  hoje: string;
  /** SUBCAT → DESCRABREV (utils/periciaMenorLista.indiceCidAbreviado), para o CID citado no laudo. */
  cidsAbreviados?: ReadonlyMap<string, string> | null;
}

/**
 * Resposta da IA → períodos a gravar. Períodos sem tipo/duração válidos saem; sem data explícita, cada
 * período começa no dia seguinte ao fim do anterior (o 1º, na data do laudo). Restrições sem lista própria
 * ficam com as Restrições da IS; a LTS vira "TODAS AS ATIVIDADES" nas `dispensas`.
 */
export const normalizarAfastamentosIA = (r: RespostaAfastamentosIA | null | undefined, ctx: ContextoNormalizacao): AfastamentoIS[] => {
  const base = dataBaseAfastamentos(ctx.is, ctx.hoje);
  const restricoesIS = separarRestricoes(ctx.is.restricoes || '');
  const cidIS = limpo(ctx.is.cid);
  const codigoIS = codigoCidLimpo(ctx.is.cidCodigo) || codigoCidLimpo(cidIS.split(/\s/)[0]);
  const saida: AfastamentoIS[] = [];
  let proximo = base;
  for (const item of r?.afastamentos ?? []) {
    const tipo = tipoAfastamentoDe(item?.tipo);
    if (!tipo) continue;
    const explicita = String(item.dataInicio || '').slice(0, 10);
    const inicio = dataValida(explicita) && explicita >= base ? explicita : proximo;
    const dias = diasDoPeriodo(item.quantidade, item.unidade, inicio);
    if (!dias) continue;
    const lidas = (item.restricoes ?? []).map(limpo).filter(Boolean);
    const restricoes = tipo === 'restricoes' ? Array.from(new Set(lidas.length ? lidas : restricoesIS)) : [];
    const codigoLido = codigoCidLimpo(item.cidCodigo);
    const outroCid = !!codigoLido && codigoLido !== codigoIS;
    const cid = outroCid ? (ctx.cidsAbreviados?.get(codigoLido) ?? codigoLido) : cidIS;
    const cidCodigo = outroCid ? codigoLido : codigoIS;
    const dataTermino = dataFimDe(inicio, dias);
    const novo: AfastamentoIS = {
      tipo, dias, dataInicio: inicio, dataTermino, restricoes,
      dispensas: tipo === 'lts' ? [DISPENSA_TOTAL] : restricoes,
      cid, cidCodigo, trecho: limpo(item.trecho).slice(0, 300),
    };
    if (saida.some(a => a.tipo === novo.tipo && a.dataInicio === novo.dataInicio && a.dias === novo.dias)) continue;
    saida.push(novo);
    proximo = somarDias(dataTermino, 1);
  }
  return saida.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
};

// ---------------------------------------------------------------- Ficha do inspecionado

/**
 * Período da IS no formato das perícias menores (utils/periciaMenorResumo.PericiaResumivel): a Ficha soma
 * LTS como "Dispensa total" e Restrições como "Restrições" no resumo e na faixa dos 12 meses.
 */
export const afastamentoComoPericia = (a: AfastamentoIS, is: { id: string; inspecionadoId?: string; inspecionado?: string }, indice = 0): PericiaResumivel => ({
  id: `is-${is.id}-${indice}`,
  militarId: is.inspecionadoId,
  inspecionado: is.inspecionado,
  dataAtestado: a.dataInicio,
  dataTermino: a.dataTermino,
  tempoHomologado: a.dias,
  dispensas: a.dispensas,
  cid: a.cid,
  cidCodigo: a.cidCodigo,
});

/** Todos os períodos das IS de um inspecionado, já no formato das perícias menores. */
export const afastamentosDasIS = (lista: ReadonlyArray<{ id: string; inspecionadoId?: string; inspecionado?: string; afastamentos?: AfastamentoIS[] | null }>): PericiaResumivel[] =>
  lista.flatMap(is => (is.afastamentos ?? []).map((a, i) => afastamentoComoPericia(a, is, i)));
