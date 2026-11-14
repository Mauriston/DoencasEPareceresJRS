// Ficheiro: utils/periciaMenorResumo.ts
// Funções puras do detalhe da Perícia Menor (painel/sheet "Esta perícia · Histórico") e da Ficha do
// inspecionado (auditoria v3, seções 5 e 9), testadas em utils/__tests__/periciaMenorResumo.test.ts:
// - contagem regressiva do término ("termina em 2 dias", "termina hoje", "terminou 07/11");
// - dias decorridos do atestado (barra "3 de 5 dias homologados");
// - tipo da perícia (Dispensa total × Restrições) e CID em código + descrição;
// - resumo 2 × 3 (Dispensa/Restrições × 30 dias/12 meses/Total), faixa dos últimos 12 meses,
//   CID mais frequentes e o aviso de CID que se repete;
// - nº de registros por militar ("4 no histórico") e ordem da lista (vigentes pelo término mais próximo).
import { codigoCid, rotuloCidAbreviado, tiposDispensa } from './periciaMenorLista';

export interface PericiaResumivel {
  id?: string;
  militarId?: string;
  inspecionado?: string;
  dataAtestado: string;
  dataTermino: string;
  tempoHomologado: number;
  tempoAtestado?: number;
  dispensas?: ReadonlyArray<string>;
  cid?: string;
  cidCodigo?: string;
  vdf?: boolean;
}

/** Dias corridos entre duas datas "AAAA-MM-DD" (b − a). */
export const diasEntreISO = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
};

/** AAAA-MM-DD → DD/MM. */
export const diaMes = (iso: string): string => {
  const [, m, d] = (iso || '').split('-');
  return m && d ? `${d}/${m}` : '';
};

export type TomContagem = 'hoje' | 'futuro' | 'passado';
export interface ContagemTermino {
  /** "termina em 2 dias" · "termina amanhã" · "termina hoje" · "terminou 07/11". */
  texto: string;
  /** Para a coluna Término: "em 2 dias" · "amanhã" · "hoje" · "07/11". */
  curto: string;
  /** Título do bloco principal do detalhe: "Termina em 2 dias" · "Terminou em 07/11". */
  titulo: string;
  tom: TomContagem;
  /** Dias até o término (negativo = já terminou). */
  dias: number;
}

export const contagemTermino = (dataTermino: string, hoje: string): ContagemTermino => {
  if (!dataTermino) return { texto: 'sem término', curto: '—', titulo: 'Sem término', tom: 'passado', dias: -1 };
  const dias = diasEntreISO(hoje, dataTermino);
  if (dias < 0) return { texto: `terminou ${diaMes(dataTermino)}`, curto: diaMes(dataTermino), titulo: `Terminou em ${diaMes(dataTermino)}`, tom: 'passado', dias };
  if (dias === 0) return { texto: 'termina hoje', curto: 'hoje', titulo: 'Termina hoje', tom: 'hoje', dias };
  if (dias === 1) return { texto: 'termina amanhã', curto: 'amanhã', titulo: 'Termina amanhã', tom: 'futuro', dias };
  return { texto: `termina em ${dias} dias`, curto: `em ${dias} dias`, titulo: `Termina em ${dias} dias`, tom: 'futuro', dias };
};

/** Dias já decorridos do atestado (o dia do atestado conta como o 1º), entre 0 e o total homologado. */
export const diasDecorridos = (p: Pick<PericiaResumivel, 'dataAtestado' | 'tempoHomologado'>, hoje: string): { decorridos: number; total: number } => {
  const total = Math.max(0, p.tempoHomologado || 0);
  const decorridos = Math.min(total, Math.max(0, diasEntreISO(p.dataAtestado, hoje) + 1));
  return { decorridos, total };
};

export type TipoPericia = 'dispensa' | 'restricoes' | 'nenhum';
/** Dispensa total quando há "TODAS AS ATIVIDADES" (vence as restrições); senão Restrições. */
export const tipoDaPericia = (dispensas: ReadonlyArray<string> | undefined): TipoPericia => {
  const t = tiposDispensa(dispensas);
  return t.dispensa ? 'dispensa' : t.restricoes ? 'restricoes' : 'nenhum';
};
export const ROTULO_TIPO_PERICIA: Record<TipoPericia, string> = { dispensa: 'Dispensa total', restricoes: 'Restrições', nenhum: 'Sem dispensas' };

/** CID em duas partes, para o código em destaque: { codigo: "M54.5", descricao: "Dor lombar baixa" }. */
export const partesCid = (p: { cid?: string; cidCodigo?: string }, abreviados: ReadonlyMap<string, string> | null = null): { codigo: string; descricao: string } => {
  const rotulo = rotuloCidAbreviado(p, abreviados).trim();
  if (!rotulo) return { codigo: '', descricao: '' };
  const m = rotulo.match(/^(\S+)\s+[—–-]\s+(.+)$/) ?? rotulo.match(/^([A-Z]\d{2}(?:\.\d{1,2})?[A-Z0-9]?)\s+(.+)$/i);
  if (!m) return { codigo: '', descricao: rotulo };
  // Descrição em caixa de frase quando vem toda em maiúsculas ("DOR LOMBAR BAIXA" → "Dor lombar baixa").
  const desc = m[2].trim();
  const frase = desc === desc.toUpperCase() ? desc.charAt(0) + desc.slice(1).toLocaleLowerCase('pt-BR') : desc;
  return { codigo: m[1], descricao: frase };
};

const somaDias = (lista: PericiaResumivel[]) => lista.reduce((s, p) => s + (p.tempoHomologado || 0), 0);

export interface LinhaResumo { d30: number; m12: number; total: number }
export interface ResumoPericias {
  dispensa: LinhaResumo;
  restricoes: LinhaResumo;
  registros: number;
  vigentes: number;
  vdf: number;
}

/** Tabela 2 × 3: dias de Dispensa total e de Restrições nos últimos 30 dias, 12 meses e no total
 *  (pela data do atestado). Mais o nº de registros, vigentes e com VDF. */
export const resumoPericias = (lista: PericiaResumivel[], hoje: string): ResumoPericias => {
  const linha = (tipo: TipoPericia): LinhaResumo => {
    const doTipo = lista.filter(p => tipoDaPericia(p.dispensas) === tipo);
    const desde = (n: number) => doTipo.filter(p => { const d = diasEntreISO(p.dataAtestado, hoje); return d >= 0 && d < n; });
    return { d30: somaDias(desde(30)), m12: somaDias(desde(365)), total: somaDias(doTipo) };
  };
  return {
    dispensa: linha('dispensa'),
    restricoes: linha('restricoes'),
    registros: lista.length,
    vigentes: lista.filter(p => p.dataTermino && p.dataTermino >= hoje).length,
    vdf: lista.filter(p => p.vdf).length,
  };
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export interface MesFaixa {
  /** AAAA-MM */
  chave: string;
  rotulo: string;
  /** O que cobriu o mês (Dispensa total vence Restrições); null = nada. */
  tipo: Exclude<TipoPericia, 'nenhum'> | null;
}

/** Os 12 meses até o mês de hoje, marcando os cobertos por alguma perícia (do atestado ao término). */
export const faixa12Meses = (lista: PericiaResumivel[], hoje: string): MesFaixa[] => {
  const [a, m] = hoje.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (11 - i), 1));
    const ano = d.getUTCFullYear(); const mes = d.getUTCMonth() + 1;
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;
    const inicio = `${chave}-01`;
    const fim = `${chave}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, '0')}`;
    const cobrem = lista.filter(p => p.dataAtestado && p.dataAtestado <= fim && (p.dataTermino || p.dataAtestado) >= inicio);
    const tipos = cobrem.map(p => tipoDaPericia(p.dispensas));
    const tipo = tipos.includes('dispensa') ? 'dispensa' : tipos.includes('restricoes') ? 'restricoes' : null;
    return { chave, rotulo: MESES[mes - 1], tipo };
  });
};

export interface CidFrequente { chave: string; codigo: string; descricao: string; n: number }

/** CID mais frequentes do inspecionado (pelo código; registros sem código pelo rótulo gravado). */
export const cidsFrequentes = (lista: PericiaResumivel[], abreviados: ReadonlyMap<string, string> | null = null, limite = 5): CidFrequente[] => {
  const mapa = new Map<string, CidFrequente>();
  for (const p of lista) {
    const chave = codigoCid(p) || (p.cid || '').trim().toUpperCase();
    if (!chave) continue;
    const atual = mapa.get(chave);
    if (atual) atual.n++;
    else { const partes = partesCid(p, abreviados); mapa.set(chave, { chave, codigo: partes.codigo, descricao: partes.descricao, n: 1 }); }
  }
  return [...mapa.values()].sort((x, y) => y.n - x.n || x.codigo.localeCompare(y.codigo)).slice(0, limite);
};

/** "M54.5 se repete — 2 das 4 perícias." quando o CID mais frequente aparece 2+ vezes; senão null. */
export const repeticaoCid = (lista: PericiaResumivel[], plural = 'perícias', abreviados: ReadonlyMap<string, string> | null = null): string | null => {
  const [top] = cidsFrequentes(lista, abreviados, 1);
  if (!top || top.n < 2) return null;
  return `${top.codigo || top.descricao} se repete — ${top.n} das ${lista.length} ${plural}.`;
};

/** Chave do militar (NIP só dígitos ou, sem vínculo, o texto do inspecionado). */
const chave = (p: PericiaResumivel) => p.militarId || p.inspecionado || '';

/** Nº de registros por militar, para o "4 no histórico" da lista. */
export const contarPorMilitar = (lista: PericiaResumivel[]): Map<string, number> => {
  const m = new Map<string, number>();
  lista.forEach(p => { const k = chave(p); m.set(k, (m.get(k) ?? 0) + 1); });
  return m;
};

/** "4 no histórico" · "1º registro". */
export const rotuloHistorico = (n: number): string => (n <= 1 ? '1º registro' : `${n} no histórico`);

/** Ordem da lista: vigentes primeiro, pelo término mais próximo; depois as concluídas, da mais recente. */
export const compararParaLista = (a: PericiaResumivel, b: PericiaResumivel, hoje: string): number => {
  const va = !!a.dataTermino && a.dataTermino >= hoje;
  const vb = !!b.dataTermino && b.dataTermino >= hoje;
  if (va !== vb) return va ? -1 : 1;
  if (va) return a.dataTermino.localeCompare(b.dataTermino) || b.dataAtestado.localeCompare(a.dataAtestado);
  return (b.dataTermino || '').localeCompare(a.dataTermino || '') || b.dataAtestado.localeCompare(a.dataAtestado);
};

/** Posto/graduação do texto "POSTO (QUADRO) NIP NOME" (sem o NIP), ex.: "CB-MO". */
export const postoDoInspecionado = (inspecionado: string, nome: string): string => {
  const i = nome ? inspecionado.indexOf(nome) : -1;
  const prefixo = (i >= 0 ? inspecionado.slice(0, i) : '').trim();
  return prefixo.replace(/\b\d{2}\.?\d{4}\.?\d{2}\b/, '').replace(/\s+/g, ' ').trim();
};
