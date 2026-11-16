// Ficheiro: utils/fichaInspecionado.ts
// Funções puras da Ficha do inspecionado (components/ficha/FichaInspecionado.tsx), testadas em
// utils/__tests__/fichaInspecionado.test.ts:
// - afastamentosDaIS: ADAPTADOR ÚNICO dos períodos de LTS e de Restrições de uma IS. Lê, nesta ordem, o
//   que existir no documento (campos estruturados gravados por rotinas/servidor) e, sem nada disso, extrai
//   do texto do laudo ("necessitando de 30 dias de LTS", "Apto com restrições por 60 dias"). Se a estrutura
//   gravada mudar, ajuste só esta função;
// - dias de cada tipo dentro de um ano (períodos que cruzam o ano contam só a parte do ano) e o resumo do ano;
// - CIDs das IS (campos estruturados ou "CID: M54.5" no laudo, nas observações e no texto dos exames);
// - a faixa de 12 meses com os períodos (LTS × Restrições, Dispensa × Restrições);
// - guia da ficha (Inspeções de Saúde × Perícias Menores): filtro da linha do tempo e se há registros.

export type TipoAfastamentoIS = 'lts' | 'restricoes';

export interface PeriodoAfastamento {
  tipo: TipoAfastamentoIS;
  /** AAAA-MM-DD */
  inicio: string;
  /** AAAA-MM-DD (inclusive) = inicio + dias − 1. */
  fim: string;
  dias: number;
  /** 'campo' = gravado no documento da IS; 'laudo' = extraído do texto do laudo. */
  origem: 'campo' | 'laudo';
}

const ISO = /^\d{4}-\d{2}-\d{2}/;
const iso = (v: unknown): string => {
  if (typeof v === 'string' && ISO.test(v)) return v.slice(0, 10);
  const d = (v as { toDate?: () => Date } | null)?.toDate?.();
  if (d instanceof Date && !Number.isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return '';
};
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

const utc = (s: string) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const deUtc = (t: number) => new Date(t).toISOString().slice(0, 10);
/** AAAA-MM-DD + n dias. */
export const somarDiasISO = (s: string, n: number): string => deUtc(utc(s) + n * 86_400_000);
/** Dias corridos entre a e b, inclusive (a ≤ b); 0 se inválido. */
const diasInclusive = (a: string, b: string): number => (a && b && b >= a ? Math.round((utc(b) - utc(a)) / 86_400_000) + 1 : 0);

const tipoDe = (v: unknown): TipoAfastamentoIS | null => {
  const t = String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/lts|licenca|incapa|afastament/.test(t)) return 'lts';
  if (/restri/.test(t)) return 'restricoes';
  return null;
};

/** Monta o período a partir de início + (fim ou dias); null se não der para saber os dias. */
const periodo = (tipo: TipoAfastamentoIS, inicioBase: string, o: Record<string, unknown> | null, diasSoltos = 0, origem: PeriodoAfastamento['origem'] = 'campo'): PeriodoAfastamento | null => {
  const inicio = iso(o?.inicio) || iso(o?.dataInicio) || iso(o?.de) || inicioBase;
  const fimGravado = iso(o?.fim) || iso(o?.dataFim) || iso(o?.dataTermino) || iso(o?.termino) || iso(o?.ate);
  const dias = num(o?.dias) || num(o?.duracaoDias) || num(o?.tempo) || num(o?.tempoDias) || num(o?.quantidade) || diasSoltos || (fimGravado ? diasInclusive(inicio, fimGravado) : 0);
  if (!inicio || !dias) return null;
  return { tipo, inicio, fim: fimGravado && fimGravado >= inicio ? fimGravado : somarDiasISO(inicio, dias - 1), dias, origem };
};

const UNIDADE = '(dias?|mes(?:es)?)';
const EXTENSO = '(?:\\s*\\([^)]*\\))?';
/** "30 dias", "30 (trinta) dias", "2 meses" → dias (mês = 30 dias). */
const paraDias = (n: string, unidade: string) => Number(n) * (/^mes/i.test(unidade) ? 30 : 1);

/** Dias de LTS e de Restrições escritos no laudo (DGPM-406: "necessitando de 30 dias de LTS",
 *  "Apto com restrições por 60 dias", "LTS por 30 dias"). 0 = não consta. */
export const diasDoLaudo = (laudo: string): { lts: number; restricoes: number } => {
  const t = String(laudo || '');
  const lts = t.match(new RegExp(`(\\d{1,4})${EXTENSO}\\s*${UNIDADE}\\s+de\\s+(?:LTS|licen[çc]a\\s+para\\s+tratamento)`, 'i'))
    ?? t.match(new RegExp(`\\bLTS\\b[^.;\\d]{0,20}?(?:por|de|durante)\\s+(\\d{1,4})${EXTENSO}\\s*${UNIDADE}`, 'i'));
  const res = t.match(new RegExp(`restri[çc](?:[õo]es|[ãa]o)[^.;\\d]{0,40}?(?:por|durante|de)\\s+(\\d{1,4})${EXTENSO}\\s*${UNIDADE}`, 'i'));
  return { lts: lts ? paraDias(lts[1], lts[2]) : 0, restricoes: res ? paraDias(res[1], res[2]) : 0 };
};

/** Data de referência da IS para os períodos: laudo → entrevista → abertura. */
export const dataReferenciaIS = (is: { dataLaudo?: string; dataEntrevista?: string; dataAbertura?: string }): string =>
  iso(is.dataLaudo) || iso(is.dataEntrevista) || iso(is.dataAbertura);

/**
 * ADAPTADOR dos afastamentos (LTS e Restrições) de uma IS. Lê, na ordem:
 *  1. `afastamentos` / `periodos`: lista de { tipo: 'lts'|'restricoes'|…, inicio|dataInicio, fim|dataFim|dataTermino, dias|duracaoDias };
 *  2. objetos `lts`/`periodoLts` e `periodoRestricoes`/`restricoesPeriodo` (mesmos campos);
 *  3. números `diasLts`/`ltsDias` e `diasRestricoes`/`restricoesDias` (início = data de referência);
 *  4. sem nada estruturado: o texto do `laudo` (diasDoLaudo), a partir da data do laudo.
 */
export const afastamentosDaIS = (is: Record<string, unknown>): PeriodoAfastamento[] => {
  const base = dataReferenciaIS(is as { dataLaudo?: string; dataEntrevista?: string; dataAbertura?: string });
  const lista = Array.isArray(is.afastamentos) ? is.afastamentos : Array.isArray(is.periodos) ? is.periodos : null;
  if (lista) {
    return lista.flatMap(o => {
      const r = o && typeof o === 'object' ? o as Record<string, unknown> : null;
      const tipo = tipoDe(r?.tipo);
      const p = tipo ? periodo(tipo, base, r) : null;
      return p ? [p] : [];
    });
  }
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null);
  const estruturados = [
    periodo('lts', base, obj(is.lts) ?? obj(is.periodoLts), num(is.diasLts) || num(is.ltsDias)),
    periodo('restricoes', base, obj(is.periodoRestricoes) ?? obj(is.restricoesPeriodo), num(is.diasRestricoes) || num(is.restricoesDias)),
  ].filter((p): p is PeriodoAfastamento => !!p);
  if (estruturados.length) return estruturados;
  const d = diasDoLaudo(String(is.laudo ?? ''));
  return [
    d.lts ? periodo('lts', base, null, d.lts, 'laudo') : null,
    d.restricoes ? periodo('restricoes', base, null, d.restricoes, 'laudo') : null,
  ].filter((p): p is PeriodoAfastamento => !!p);
};

/** Dias de um tipo dentro do ano (só a parte do período que cai no ano). */
export const diasNoAno = (periodos: ReadonlyArray<PeriodoAfastamento>, tipo: TipoAfastamentoIS, ano: number): number => {
  const ini = `${ano}-01-01`; const fim = `${ano}-12-31`;
  return periodos.filter(p => p.tipo === tipo).reduce((s, p) => s + diasInclusive(p.inicio > ini ? p.inicio : ini, p.fim < fim ? p.fim : fim), 0);
};

export interface ResumoISAno { ano: number; inspecoes: number; diasLts: number; diasRestricoes: number }

/** Cartão-resumo da guia Inspeções de Saúde: nº de IS abertas no ano e os dias de LTS e Restrições no ano. */
export const resumoISNoAno = (
  inspecoes: ReadonlyArray<{ dataAbertura?: string } & Record<string, unknown>>, hoje: string,
): ResumoISAno => {
  const ano = Number(hoje.slice(0, 4));
  const periodos = inspecoes.flatMap(i => afastamentosDaIS(i));
  return {
    ano,
    inspecoes: inspecoes.filter(i => String(i.dataAbertura || '').startsWith(String(ano))).length,
    diasLts: diasNoAno(periodos, 'lts', ano),
    diasRestricoes: diasNoAno(periodos, 'restricoes', ano),
  };
};

/** Códigos CID-10 escritos após "CID" num texto ("CID: M54.5", "CID-10 F32.1 e F41"), normalizados (M545 → M54.5). */
export const cidsDoTexto = (texto: string): string[] => {
  const t = String(texto || '');
  const achados: string[] = [];
  for (const m of t.matchAll(/\bCID(?:[\s-]*10)?\s*[:\-–]?\s*((?:[A-Z]\d{2}(?:\.?\d{1,2})?(?:\s*(?:[,;/]|e)\s*)?)+)/gi)) {
    for (const c of m[1].matchAll(/[A-Z]\d{2}(?:\.?\d{1,2})?/gi)) achados.push(normalizarCid(c[0]));
  }
  return [...new Set(achados)];
};

/** "m545" → "M54.5"; "F32" → "F32". */
export const normalizarCid = (c: string): string => {
  const s = c.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length > 3 ? `${s.slice(0, 3)}.${s.slice(3)}` : s;
};

/** CIDs de uma IS: campos estruturados (`cids` lista de texto ou { codigo }, `cid`, `cidCodigo`) e, sem eles,
 *  os escritos após "CID" no laudo, nas restrições, nas observações e nos textos extras (ex.: laudos dos exames). */
export const cidsDaIS = (is: Record<string, unknown>, textosExtras: ReadonlyArray<string> = []): string[] => {
  const brutos: unknown[] = [...(Array.isArray(is.cids) ? is.cids : []), is.cidCodigo, is.cid];
  const estruturados = brutos.flatMap(v => {
    const s = typeof v === 'string' ? v : (v as { codigo?: unknown } | null)?.codigo;
    const m = typeof s === 'string' ? s.match(/[A-Z]\d{2}(?:\.?\d{1,2})?/i) : null;
    return m ? [normalizarCid(m[0])] : [];
  });
  const doTexto = [is.laudo, is.restricoes, is.observacoes, ...textosExtras].flatMap(t => cidsDoTexto(String(t ?? '')));
  return [...new Set([...estruturados, ...doTexto])];
};

export interface CidNasIS { codigo: string; inspecoes: number[] }

/** Lista dos CIDs das IS do inspecionado, cada um com os nº das IS onde aparece (ordem: mais frequente, depois código). */
export const listaCidsDasIS = (porIS: ReadonlyArray<{ is: number; cids: ReadonlyArray<string> }>): CidNasIS[] => {
  const mapa = new Map<string, Set<number>>();
  porIS.forEach(({ is, cids }) => cids.forEach(c => { if (!mapa.has(c)) mapa.set(c, new Set()); mapa.get(c)!.add(is); }));
  return [...mapa.entries()]
    .map(([codigo, s]) => ({ codigo, inspecoes: [...s].sort((a, b) => a - b) }))
    .sort((a, b) => b.inspecoes.length - a.inspecoes.length || a.codigo.localeCompare(b.codigo));
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export interface MesPeriodo<T extends string> { chave: string; rotulo: string; tipo: T | null }

/** Os 12 meses até o mês de hoje, com o tipo que cobriu cada mês; `prioridade[0]` vence os demais. */
export const faixaPeriodos12Meses = <T extends string>(
  periodos: ReadonlyArray<{ tipo: T; inicio: string; fim: string }>, hoje: string, prioridade: ReadonlyArray<T>,
): MesPeriodo<T>[] => {
  const [a, m] = hoje.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (11 - i), 1));
    const ano = d.getUTCFullYear(); const mes = d.getUTCMonth() + 1;
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;
    const inicio = `${chave}-01`;
    const fim = `${chave}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, '0')}`;
    const tipos = periodos.filter(p => p.inicio && p.inicio <= fim && (p.fim || p.inicio) >= inicio).map(p => p.tipo);
    return { chave, rotulo: MESES[mes - 1], tipo: prioridade.find(t => tipos.includes(t)) ?? null };
  });
};

/** Guias da ficha. */
export type GuiaFicha = 'is' | 'pm';

/** Itens da linha do tempo da guia: IS na guia Inspeções de Saúde, perícias na guia Perícias Menores. */
export const itensDaGuia = <I extends { tipo: string }>(itens: ReadonlyArray<I>, guia: GuiaFicha): I[] =>
  itens.filter(i => (guia === 'is' ? i.tipo === 'is' : i.tipo === 'pericias'));

/** Guia inicial: a pedida (se o perfil a vê); senão IS, a menos que só haja perícias registradas. */
export const guiaInicial = (
  pedida: string | null, vis: { is: boolean; pm: boolean }, n: { is: number; pm: number },
): GuiaFicha => {
  if (pedida === 'pm' && vis.pm) return 'pm';
  if (pedida === 'is' && vis.is) return 'is';
  if (!vis.is) return 'pm';
  if (!vis.pm) return 'is';
  return n.is === 0 && n.pm > 0 ? 'pm' : 'is';
};

/** Pareceres pedidos a partir das IS do inspecionado (vínculo isId), do mais recente para o mais antigo. */
export const pareceresDasIS = <P extends { isId?: string; criadoEm?: { toMillis?: () => number } | null }>(
  pareceres: ReadonlyArray<P>, idsIS: ReadonlyArray<string>,
): P[] => {
  const ids = new Set(idsIS);
  return pareceres.filter(p => !!p.isId && ids.has(p.isId)).sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0));
};

// ---------------------------------------------------------------- Abas da ficha (reformulação de 16/11/2026)

/** Abas da Ficha do inspecionado, na ordem da barra. */
export const ABAS_FICHA = ['is', 'pm', 'afastamentos', 'atestados', 'pareceres', 'exames', 'guias', 'emails', 'mensagens', 'outros', 'transcricoes'] as const;
export type AbaFicha = typeof ABAS_FICHA[number];
export const ehAbaFicha = (v: string | null | undefined): v is AbaFicha => (ABAS_FICHA as readonly string[]).includes(String(v));

export interface EstadoAbaFicha { id: AbaFicha; visivel: boolean; habilitada: boolean }

/**
 * Aba aberta: `?aba=` (se visível e habilitada); senão os parâmetros antigos (`?is=` → IS, `?sel=` → Perícias,
 * `?guia=is|pm`); senão Inspeções de Saúde — ou Perícias Menores, se não houver IS e houver perícias —;
 * senão a primeira habilitada. Nenhuma habilitada: null.
 */
export const abaFichaInicial = (
  params: { aba?: string | null; is?: string | null; sel?: string | null; guia?: string | null },
  abas: ReadonlyArray<EstadoAbaFicha>, n: { is: number; pm: number },
): AbaFicha | null => {
  const ok = (id: string | null | undefined): id is AbaFicha => ehAbaFicha(id) && !!abas.find(a => a.id === id && a.visivel && a.habilitada);
  if (ok(params.aba)) return params.aba;
  if (params.is && ok('is')) return 'is';
  if (params.sel && ok('pm')) return 'pm';
  if (params.guia === 'pm' && ok('pm')) return 'pm';
  if (params.guia === 'is' && ok('is')) return 'is';
  if (n.is === 0 && n.pm > 0 && ok('pm')) return 'pm';
  if (ok('is')) return 'is';
  return abas.find(a => a.visivel && a.habilitada)?.id ?? null;
};

/** Registro aberto no painel principal: o pedido (se existe na lista) ou o mais recente (o 1º da lista). */
export const registroSelecionado = <R extends { id: string }>(lista: ReadonlyArray<R>, pedido: string | null | undefined): R | null =>
  (pedido ? lista.find(r => r.id === pedido) : undefined) ?? lista[0] ?? null;
