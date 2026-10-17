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
export const montarPgq = (categoria: CategoriaMilitar, posto: string, quadroSigla: string, corpoSigla: string, especialidade: string): string => {
  if (categoria === 'Oficial') return quadroSigla && !(corpoSigla === 'CA' && quadroSigla === 'CA') ? `${posto} (${quadroSigla})` : posto;
  if (categoria === 'Praça') return especialidade ? `${posto}-${especialidade}` : posto;
  return posto;
};

export const montarInspecionado = (pgq: string, nip: string, nome: string): string => `${pgq} ${nip} ${nome}`.replace(/\s+/g, ' ').trim();
