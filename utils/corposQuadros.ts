// Ficheiro: utils/corposQuadros.ts
// Hierarquia Corpo → Quadro → Especialidades / Postos-Graduações da MB
// (public/corposQuadrosMB.json) e lista de OM (public/omsMB.json), usadas
// nos campos em cascata do formulário de cadastro de militares.

export type Vinculo = 'Carreira' | 'Temporário';
export type CategoriaMilitar = 'Oficial' | 'Praça' | 'Servidor Civil';

export interface PostoInfo { nome: string; categoria: CategoriaMilitar; ordem: number }
export interface Especialidade { sigla: string; nome: string }
export interface Quadro { sigla: string; nome: string; vinculo: Vinculo; postos: string[]; especialidades: Especialidade[] }
export interface Corpo { sigla: string; nome: string; categoria: CategoriaMilitar; quadros: Quadro[] }
export interface CorposQuadros { postos: Record<string, PostoInfo>; corpos: Corpo[] }

export interface OrganizacaoMilitar { sigla: string; nome: string; cidade: string; uf: string; busca: string }

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const normalizarBusca = semAcento;

let cacheCorpos: Promise<CorposQuadros> | null = null;
let cacheOms: Promise<OrganizacaoMilitar[]> | null = null;

const carregarJson = async <T,>(arquivo: string): Promise<T> => {
  const base = import.meta.env.BASE_URL || '/';
  const resp = await fetch(`${base}${arquivo}`);
  if (!resp.ok) throw new Error(`Não foi possível carregar ${arquivo}.`);
  return resp.json();
};

export const carregarCorposQuadros = (): Promise<CorposQuadros> => {
  if (!cacheCorpos) cacheCorpos = carregarJson<CorposQuadros>('corposQuadrosMB.json').catch(e => { cacheCorpos = null; throw e; });
  return cacheCorpos;
};

export const carregarOms = (): Promise<OrganizacaoMilitar[]> => {
  if (!cacheOms) cacheOms = carregarJson<{ oms: OrganizacaoMilitar[] }>('omsMB.json').then(j => j.oms).catch(e => { cacheOms = null; throw e; });
  return cacheOms;
};

/** Postos/graduações possíveis para o vínculo, na ordem hierárquica. */
export const postosDoVinculo = (d: CorposQuadros, vinculo: Vinculo): string[] => {
  const set = new Set<string>();
  d.corpos.forEach(c => c.quadros.filter(q => q.vinculo === vinculo).forEach(q => q.postos.forEach(p => set.add(p))));
  return Array.from(set).sort((a, b) => (d.postos[a]?.ordem ?? 999) - (d.postos[b]?.ordem ?? 999));
};

export interface QuadroOpcao { corpo: Corpo; quadro: Quadro }

/** Quadros de oficiais que admitem o posto, dentro do vínculo escolhido. */
export const quadrosDoOficial = (d: CorposQuadros, vinculo: Vinculo, posto: string): QuadroOpcao[] =>
  d.corpos
    .filter(c => c.categoria === 'Oficial')
    .flatMap(corpo => corpo.quadros.filter(q => q.vinculo === vinculo && q.postos.includes(posto)).map(quadro => ({ corpo, quadro })));

/** Especialidades de praça: do CPFN (quadro de praças de fuzileiros navais) ou, não sendo CPFN, as demais (Corpo de Praças da Armada; no vínculo temporário, o da Reserva). */
export const especialidadesDaPraca = (d: CorposQuadros, vinculo: Vinculo, posto: string, cpfn: boolean): Especialidade[] => {
  const mapa = new Map<string, Especialidade>();
  d.corpos
    .filter(c => c.categoria === 'Praça' && (cpfn ? c.sigla === 'CPFN' : c.sigla !== 'CPFN'))
    .forEach(c => c.quadros
      .filter(q => q.vinculo === vinculo && q.postos.includes(posto))
      .forEach(q => q.especialidades.forEach(e => { if (!mapa.has(e.sigla)) mapa.set(e.sigla, e); })));
  return Array.from(mapa.values()).sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'));
};

/**
 * Monta o "P/G/Q" e o INSPECIONADO.
 *  Oficial: POSTO (QUADRO) — o quadro "CA" (Corpo da Armada) não entra na sigla.
 *  Praça:   POSTO-ESPECIALIDADE.   Servidor civil: só a sigla.
 */
export type SituacaoMilitar = '' | 'RM1' | 'Refº';

export const montarPgq = (categoria: CategoriaMilitar, posto: string, quadroSigla: string, corpoSigla: string, especialidade: string, situacao: SituacaoMilitar = ''): string => {
  // RM1 (reserva) e Refº (reformado) entram antes do quadro (oficial) ou da especialidade (praça).
  if (categoria === 'Oficial') {
    const quadro = quadroSigla && !(corpoSigla === 'CA' && quadroSigla === 'CA') ? quadroSigla : '';
    const dentro = [situacao, quadro].filter(Boolean).join('-');
    return dentro ? `${posto} (${dentro})` : posto;
  }
  if (categoria === 'Praça') return [posto, situacao, especialidade].filter(Boolean).join('-');
  return posto;
};

/** Reescreve o P/G/Q com (ou sem) RM1/Refº: "CF (Md)" ↔ "CF (RM1-Md)", "SO-EF" ↔ "SO-Refº-EF". */
export const aplicarSituacaoAoPgq = (pgq: string, situacao: SituacaoMilitar, postos: CorposQuadros['postos']): string => {
  const sep = separarPosto(pgq, postos);
  if (!sep) return pgq;
  const oficial = postos[sep.posto]?.categoria === 'Oficial';
  let resto = sep.resto;
  // remove a marca anterior
  resto = resto.replace(/\((?:RM1|Refº|Ref)-?/i, '(').replace(/^\(\)$/, '').replace(/-(?:RM1|Refº|Ref)(?=-|$)/i, '');
  if (situacao) {
    if (oficial) resto = resto.startsWith('(') ? `(${situacao}-${resto.slice(1)}` : `(${situacao})`;
    else if (!resto.startsWith('(')) resto = `-${situacao}${resto}`;
  }
  return `${sep.posto}${resto}`;
};

export const montarInspecionado = (pgq: string, nip: string, nome: string): string => `${pgq} ${nip} ${nome}`.replace(/\s+/g, ' ').trim();

/** Separa o posto/graduação do restante do P/G/Q (ex.: "GM(RM2-Md)" → { posto: "GM", resto: "(RM2-Md)" }). Null se não reconhecer. */
export const separarPosto = (pgq: string, postos: CorposQuadros['postos']): { posto: string; resto: string } | null => {
  const texto = pgq.trim();
  let melhor = '';
  for (const sigla of Object.keys(postos)) {
    if (!texto.toUpperCase().startsWith(sigla.toUpperCase())) continue;
    const resto = texto.slice(sigla.length);
    if ((resto === '' || /^[\s(-]/.test(resto)) && sigla.length > melhor.length) melhor = sigla;
  }
  return melhor ? { posto: melhor, resto: texto.slice(melhor.length) } : null;
};

export interface ServicoHnre { servico_id: string; servico: string; servico_label: string; superior_direto?: string }

let cacheServicos: Promise<ServicoHnre[]> | null = null;
/** Serviços/setores do HNRe (public/servicosHNRe.json). */
export const carregarServicosHnre = (): Promise<ServicoHnre[]> => {
  if (!cacheServicos) cacheServicos = carregarJson<ServicoHnre[]>('servicosHNRe.json').catch(e => { cacheServicos = null; throw e; });
  return cacheServicos;
};

export interface CidItem { SUBCAT: string; DESCRICAO: string; DESCRABREV: string }

let cacheCid: Promise<CidItem[]> | null = null;
/** Lista de CID-10 (public/cid.json). */
export const carregarCid = (): Promise<CidItem[]> => {
  if (!cacheCid) cacheCid = carregarJson<CidItem[]>('cid.json').catch(e => { cacheCid = null; throw e; });
  return cacheCid;
};

export type VinculoFinalidade = 'Carreira' | 'Temporário' | 'Inativo' | 'Pensionista' | 'Dependente';
export interface FinalidadeIS { nome: string; amp: string; vinculos: VinculoFinalidade[] }
export interface GrupoFinalidadeIS { grupo: string; finalidades: FinalidadeIS[] }

let cacheFinalidades: Promise<GrupoFinalidadeIS[]> | null = null;
/** Finalidades de IS por grupo, com AMP competente e vínculos aplicáveis (public/finalidadesIS.json). */
export const carregarFinalidadesIS = (): Promise<GrupoFinalidadeIS[]> => {
  if (!cacheFinalidades) cacheFinalidades = carregarJson<{ grupos: GrupoFinalidadeIS[] }>('finalidadesIS.json').then(j => j.grupos).catch(e => { cacheFinalidades = null; throw e; });
  return cacheFinalidades;
};

/** Mantém só as finalidades disponíveis ao vínculo; grupos vazios saem. Sem vínculo, devolve tudo. */
export const filtrarFinalidadesPorVinculo = (grupos: GrupoFinalidadeIS[], vinculo: VinculoFinalidade | ''): GrupoFinalidadeIS[] =>
  !vinculo ? grupos : grupos
    .map(g => ({ ...g, finalidades: g.finalidades.filter(f => f.vinculos.includes(vinculo)) }))
    .filter(g => g.finalidades.length > 0);

/** Oficial do quadro de médicos (Md, RM2-Md ou RM3-Md), a partir do P/G/Q. */
export const ehOficialMedico = (pgq: string): boolean => /\((?:(?:RM\d|Refº|Ref)-)?Md\)/i.test(pgq);

export const omEhHnre = (om: string): boolean => om.trim().toUpperCase() === 'HNRE';
