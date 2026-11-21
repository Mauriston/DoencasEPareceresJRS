// Ficheiro: utils/validacaoLaudo.ts
// Validação do campo Laudo das IS contra as formas de conclusão da DGPM-406 (data/formasConclusaoIS.json).
// Serve tanto ao laudo digitado quanto ao colado/lido do SINAIS (Ctrl+V ou "IS por foto"): não reescreve nada,
// só devolve achados (erro/alerta) com a fonte normativa. Regras puras, testadas em utils/__tests__/validacaoLaudo.test.ts.
//  1. regraDaIS: finalidade (nome exato do public/finalidadesIS.json) + vínculo/tipo de serviço → chave da regra
//     (ordem: "Temporário:SMV"/"Temporário:SMI", vínculo, "*").
//  2. identificarLaudo: compara o texto normalizado (minúsculas, sem acento, sem pontuação) com os modelos do
//     catálogo, convertidos em expressões regulares ({{campo}} → captura; {{(não)}} → "não" opcional; [trecho]
//     → opcional). "Em prorrogação" é retirado antes e anotado. Entre vários modelos que casam, vence o de mais
//     texto literal; primeiro entre os permitidos da finalidade, depois no catálogo inteiro (= não permitido).
//  3. validarLaudo: aplica as `verificacoes` declarativas do JSON ao laudo identificado, às restrições e ao
//     contexto da IS (utils/contextoLaudo.ts). Condição de contexto sem dado → `nivelSemDado` (ou nada).
import type { ContextoLaudo } from './contextoLaudo';

// ------------------------------------------------------------------ tipos do JSON

export interface CampoLaudo { nome: string; tipo: string; descricao?: string; valores?: string[]; formato?: string }
export interface ModeloLaudo {
  modelo: string; categoria?: string; fonte: string; campos?: CampoLaudo[]; aplicarQuando?: string; exige?: string[];
  admiteEmProrrogacao?: boolean; textoComplementar?: { quando: string; texto: string; onde?: string[] }; observacoes?: string[];
}
export interface RegraLaudo { fonte: string; laudosPermitidos: string[]; regrasDeAplicacao?: string[]; observacoes?: string[] }
export interface CondicaoVerificacao {
  regras?: string[]; finalidades?: string[]; tipoServico?: string[]; laudos?: string[]; categorias?: string[];
  laudoIdentificado?: boolean; laudoPermitido?: boolean; emProrrogacao?: boolean; restricoesPreenchidas?: boolean;
  textoContem?: string; textoNaoContem?: string; restoTexto?: boolean;
  campoNumerico?: { nome: string; min?: number; max?: number };
  contexto?: Record<string, unknown>;
  qualquer?: CondicaoVerificacao[];
}
export type Severidade = 'erro' | 'alerta';
export interface Verificacao {
  id: string; severidade: Severidade; se: CondicaoVerificacao; mensagem: string; fonte: string;
  nivelSemDado?: Severidade; mensagemSemDado?: string;
}
export interface FormasConclusao {
  versao: number;
  finalidades: Record<string, Record<string, string>>;
  regras: Record<string, RegraLaudo>;
  laudos: Record<string, ModeloLaudo>;
  verificacoes?: Verificacao[];
  itensArt108EM?: Record<string, string>;
}

let cache: Promise<FormasConclusao> | null = null;
/** Carrega o JSON sob demanda (fora do bundle inicial). */
export const carregarFormasConclusao = (): Promise<FormasConclusao> => {
  if (!cache) cache = import('../data/formasConclusaoIS.json').then(m => (m.default ?? m) as unknown as FormasConclusao).catch(e => { cache = null; throw e; });
  return cache;
};

// ------------------------------------------------------------------ normalização

export const normalizarTextoLaudo = (t: string): string =>
  String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const RE_PRORROGACAO = /\(?\s*em\s+prorroga[cç][aã]o\s*\)?/gi;
export const contemEmProrrogacao = (t: string): boolean => /em prorrogacao/.test(normalizarTextoLaudo(t));

// ------------------------------------------------------------------ regra da IS

export type TipoServico = 'carreira' | 'SMV' | 'SMI' | 'outro';

/** Chave da regra para a finalidade e o vínculo (VinculoFinalidade do app) + tipo de serviço. */
export const regraDaIS = (f: FormasConclusao, finalidade: string, vinculo: string, tipoServico?: TipoServico): string | null => {
  const mapa = f.finalidades[finalidade?.trim()];
  if (!mapa) return null;
  const chaves = [
    ...(vinculo === 'Temporário' && (tipoServico === 'SMV' || tipoServico === 'SMI') ? [`Temporário:${tipoServico}`] : []),
    vinculo, '*',
  ];
  for (const c of chaves) if (c && mapa[c]) return mapa[c];
  // Vínculo sem chave própria (ex.: Temporário sem tipo e só chaves SMV/SMI): a 1ª que houver.
  const outras = Object.values(mapa);
  return outras.length === 1 ? outras[0] : null;
};

// ------------------------------------------------------------------ identificação do laudo

interface ModeloCompilado { id: string; re: RegExp; nomes: string[]; literais: number }
const compilados = new WeakMap<FormasConclusao, ModeloCompilado[]>();

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Converte um modelo do catálogo em expressão regular sobre o texto normalizado. */
export const compilarModelo = (modelo: string): { re: RegExp; nomes: string[]; literais: number } => {
  const nomes: string[] = [];
  const marcado = modelo
    .replace(RE_PRORROGACAO, ' ')
    .replace(/\{\{\s*\(n[aã]o\)\s*\}\}/gi, '\u0001N\u0001')
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, n) => { nomes.push(String(n)); return '\u0001P\u0001'; })
    .replace(/\[/g, '\u0001O\u0001').replace(/\]/g, '\u0001C\u0001');
  let literais = 0;
  const partes: string[] = [];
  for (const pedaco of marcado.split('\u0001')) {
    if (pedaco === 'P') partes.push('(.+?)');
    else if (pedaco === 'N') partes.push('(?:nao\\s+)?');
    else if (pedaco === 'O') partes.push('(?:');
    else if (pedaco === 'C') partes.push(')?');
    else {
      const n = normalizarTextoLaudo(pedaco);
      if (!n) continue;
      literais += n.replace(/\s/g, '').length;
      partes.push(`${n.split(' ').map(escapar).join('\\s+')}(?![a-z0-9])\\s*`);
    }
  }
  // Campo no fim do modelo: captura até o fim do texto (o lazy pegaria só 1 caractere).
  if (partes[partes.length - 1] === '(.+?)') partes[partes.length - 1] = '(.+)';
  return { re: new RegExp(`^\\s*${partes.join('')}`), nomes, literais };
};

const modelosCompilados = (f: FormasConclusao): ModeloCompilado[] => {
  let lista = compilados.get(f);
  if (!lista) {
    lista = Object.entries(f.laudos).map(([id, l]) => ({ id, ...compilarModelo(l.modelo) }));
    compilados.set(f, lista);
  }
  return lista;
};

export interface LaudoIdentificado {
  id: string;
  permitido: boolean;
  /** Valores extraídos dos campos {{...}} (texto normalizado). */
  campos: Record<string, string>;
  /** Texto além do modelo (normalizado; '' se nenhum). */
  resto: string;
}

/** Identifica o laudo pelo texto; null se não casar com nenhum modelo. */
export const identificarLaudo = (f: FormasConclusao, texto: string, permitidos: string[] = []): LaudoIdentificado | null => {
  const base = normalizarTextoLaudo(String(texto || '').replace(RE_PRORROGACAO, ' '));
  if (!base) return null;
  const todos = modelosCompilados(f);
  const melhor = (lista: ModeloCompilado[]) => {
    let achado: { m: ModeloCompilado; r: RegExpExecArray } | null = null;
    for (const m of lista) {
      const r = m.re.exec(base);
      if (!r) continue;
      if (!achado || m.literais > achado.m.literais) achado = { m, r };
    }
    return achado;
  };
  const ids = new Set(permitidos);
  const entre = melhor(todos.filter(m => ids.has(m.id)));
  const geral = entre ? null : melhor(todos);
  const a = entre || geral;
  if (!a) return null;
  const campos: Record<string, string> = {};
  a.m.nomes.forEach((n, i) => { if (a.r[i + 1] !== undefined) campos[n] = a.r[i + 1].trim(); });
  return { id: a.m.id, permitido: !!entre, campos, resto: base.slice(a.r[0].length).trim() };
};

/** Modelo mais parecido (sobreposição de palavras) entre os permitidos — sugestão quando nada casa. */
export const modeloMaisParecido = (f: FormasConclusao, texto: string, permitidos: string[]): string | null => {
  const palavras = new Set(normalizarTextoLaudo(texto).split(' ').filter(p => p.length > 2));
  if (!palavras.size) return null;
  let melhor: { id: string; nota: number } | null = null;
  for (const id of permitidos) {
    const l = f.laudos[id];
    if (!l) continue;
    const ps = new Set(normalizarTextoLaudo(l.modelo.replace(/\{\{[^}]*\}\}/g, ' ')).split(' ').filter(p => p.length > 2));
    const comuns = [...ps].filter(p => palavras.has(p)).length;
    const nota = comuns / Math.max(ps.size, palavras.size);
    if (!melhor || nota > melhor.nota) melhor = { id, nota };
  }
  return melhor && melhor.nota >= 0.3 ? melhor.id : null;
};

// ------------------------------------------------------------------ validação

export interface EntradaValidacao {
  finalidade: string;
  laudo: string;
  restricoes?: string;
  contexto: ContextoLaudo;
}

export interface AchadoLaudo { id: string; severidade: Severidade; mensagem: string; fonte: string }

export interface ResultadoValidacao {
  regra: string | null;
  laudo: LaudoIdentificado | null;
  /** Sugestão de modelo quando o texto não casou com nenhum. */
  parecido: string | null;
  emProrrogacao: boolean;
  achados: AchadoLaudo[];
}

type Avaliacao = 'sim' | 'nao' | 'sem_dado';

const numeroDe = (s: string | undefined): number | null => {
  const m = String(s || '').match(/\d+/);
  return m ? Number(m[0]) : null;
};

const comparar = (valor: unknown, esperado: unknown): Avaliacao => {
  if (valor === null || valor === undefined) return 'sem_dado';
  if (esperado && typeof esperado === 'object' && !Array.isArray(esperado)) {
    const { min, max } = esperado as { min?: number; max?: number };
    if (typeof valor !== 'number') return 'sem_dado';
    if (min !== undefined && valor < min) return 'nao';
    if (max !== undefined && valor > max) return 'nao';
    return 'sim';
  }
  if (Array.isArray(esperado)) return esperado.includes(valor) ? 'sim' : 'nao';
  return valor === esperado ? 'sim' : 'nao';
};

interface Fatos {
  regra: string | null; finalidade: string; tipoServico: string; laudo: LaudoIdentificado | null; categoria: string;
  emProrrogacao: boolean; restricoesPreenchidas: boolean; texto: string; contexto: ContextoLaudo;
}

const avaliar = (c: CondicaoVerificacao, x: Fatos): Avaliacao => {
  const testes: Avaliacao[] = [];
  const t = (ok: boolean) => testes.push(ok ? 'sim' : 'nao');
  if (c.regras) t(!!x.regra && c.regras.includes(x.regra));
  if (c.finalidades) t(c.finalidades.includes(x.finalidade));
  if (c.tipoServico) t(c.tipoServico.includes(x.tipoServico));
  if (c.laudos) t(!!x.laudo && c.laudos.includes(x.laudo.id));
  if (c.categorias) t(!!x.categoria && c.categorias.includes(x.categoria));
  if (c.laudoIdentificado !== undefined) t(!!x.laudo === c.laudoIdentificado);
  if (c.laudoPermitido !== undefined) t(!!x.laudo && x.laudo.permitido === c.laudoPermitido);
  if (c.emProrrogacao !== undefined) t(x.emProrrogacao === c.emProrrogacao);
  if (c.restricoesPreenchidas !== undefined) t(x.restricoesPreenchidas === c.restricoesPreenchidas);
  if (c.textoContem) t(new RegExp(c.textoContem).test(x.texto));
  if (c.textoNaoContem) t(!new RegExp(c.textoNaoContem).test(x.texto));
  if (c.restoTexto !== undefined) t(!!x.laudo?.resto === c.restoTexto);
  if (c.campoNumerico) {
    const v = numeroDe(x.laudo?.campos[c.campoNumerico.nome]);
    const r = v === null ? 'nao' : comparar(v, { min: c.campoNumerico.min, max: c.campoNumerico.max });
    testes.push(r);
  }
  if (c.contexto) for (const [k, esp] of Object.entries(c.contexto)) testes.push(comparar((x.contexto as unknown as Record<string, unknown>)[k], esp));
  if (c.qualquer) {
    const rs = c.qualquer.map(s => avaliar(s, x));
    testes.push(rs.includes('sim') ? 'sim' : rs.includes('sem_dado') ? 'sem_dado' : 'nao');
  }
  if (testes.includes('nao')) return 'nao';
  if (testes.includes('sem_dado')) return 'sem_dado';
  return 'sim';
};

/** Valida o laudo de uma finalidade. Sem regra para a finalidade, não há o que validar (achados vazios). */
export const validarLaudo = (f: FormasConclusao, e: EntradaValidacao): ResultadoValidacao => {
  const regra = regraDaIS(f, e.finalidade, e.contexto.vinculo, e.contexto.tipoServico);
  const emProrrogacao = contemEmProrrogacao(e.laudo);
  const vazio: ResultadoValidacao = { regra, laudo: null, parecido: null, emProrrogacao, achados: [] };
  if (!regra || !String(e.laudo || '').trim()) return vazio;
  const permitidos = f.regras[regra]?.laudosPermitidos || [];
  const laudo = identificarLaudo(f, e.laudo, permitidos);
  const fatos: Fatos = {
    regra, finalidade: e.finalidade.trim(), tipoServico: e.contexto.tipoServico, laudo,
    categoria: laudo ? f.laudos[laudo.id]?.categoria || '' : '', emProrrogacao,
    restricoesPreenchidas: !!String(e.restricoes || '').trim(), texto: normalizarTextoLaudo(e.laudo), contexto: e.contexto,
  };
  const achados: AchadoLaudo[] = [];
  for (const v of f.verificacoes || []) {
    const r = avaliar(v.se, fatos);
    if (r === 'sim') achados.push({ id: v.id, severidade: v.severidade, mensagem: v.mensagem, fonte: v.fonte });
    else if (r === 'sem_dado' && v.nivelSemDado) achados.push({ id: v.id, severidade: v.nivelSemDado, mensagem: v.mensagemSemDado || v.mensagem, fonte: v.fonte });
  }
  // VDF_SMI_FORMA é a versão específica de LAUDO_NAO_PERMITIDO: não repetir.
  const ids = new Set(achados.map(a => a.id));
  const finais = ids.has('VDF_SMI_FORMA') ? achados.filter(a => a.id !== 'LAUDO_NAO_PERMITIDO') : achados;
  finais.sort((a, b) => (a.severidade === b.severidade ? 0 : a.severidade === 'erro' ? -1 : 1));
  return { regra, laudo, parecido: laudo ? null : modeloMaisParecido(f, e.laudo, permitidos), emProrrogacao, achados: finais };
};
