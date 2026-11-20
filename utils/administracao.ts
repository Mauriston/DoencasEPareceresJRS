// Ficheiro: utils/administracao.ts
// Regras puras da área Administração (auditoria v3, 8b): agrupamento das permissões por área, diferença
// entre a matriz salva e o rascunho (resumo da barra de salvar e "Revisar e salvar"), contagens por perfil,
// último acesso relativo e a diferença dos turnos da agenda. Testes em utils/__tests__/administracao.test.ts.
import { FEATURE_DEFS, PAGE_DEFS, ROLES, type FeatureKey, type Role } from '../config/permissions';
import type { NavItem } from '../types';

export type MatrizPaginas = Record<string, Record<Role, boolean>>;
export type MatrizFuncoes = Record<FeatureKey, Record<Role, boolean>>;
export interface Matriz { pages: MatrizPaginas; features: MatrizFuncoes }

export const PERFIL_ROTULO: Record<string, string> = {
  admin: 'Admin', user_medicos: 'User Médicos', user_medicos_mpi: 'User Médicos MPI',
  user_medicos_geral: 'User Médicos Geral', user_secretaria: 'User Secretaria',
};
export const rotuloPerfil = (perfil: string): string => PERFIL_ROTULO[perfil] || perfil;

/** Quem é cada perfil (formulário de usuário e cabeçalho de Perfis e permissões). */
export const PERFIL_DESCRICAO: Record<string, string> = {
  admin: 'Presidente da JRS: acesso total, inclusive Administração.',
  user_medicos: 'Membros da JRS: inspeções, concursos, pareceres e consulta.',
  user_medicos_mpi: 'Médicos do MPI: inspeções do MPI, concursos e consulta.',
  user_secretaria: 'Secretaria da JRS: agendamentos, e-mails e concursos.',
  user_medicos_geral: 'Demais médicos do HNRe: atestados (Perícia Menor) e exames mínimos.',
};

/** Perfis que têm CRM/RQE (o Admin é o Presidente da JRS, médico). */
export const PERFIS_MEDICOS = ['admin', 'user_medicos', 'user_medicos_mpi', 'user_medicos_geral'];
export const ehPerfilMedico = (perfil: string): boolean => PERFIS_MEDICOS.includes(perfil);
/** Perfis que atendem IS como perito (impacto ao desativar). */
export const PERFIS_PERITO = ['admin', 'user_medicos', 'user_medicos_mpi'];

/** Grupo de funções de FEATURE_DEFS → página dona (desligar a página desliga e trava as funções dela). */
export const PAGINA_DO_GRUPO: Record<string, IdPaginaArea> = {
  'Concursos': 'concursosJRS',
  'Inspeções de Saúde': 'inspecoes',
  'Inspecionados': 'militares',
  'Pareceres': 'pareceres',
  'Perícia Menor': 'pericia-menor',
  'Ficha do inspecionado': 'ficha',
};

/** "Páginas" sem permissão própria: valem as funções (abas). Ligar/desligar liga/desliga todas. */
const PAGINAS_DERIVADAS = new Set<string>(['pericia-menor', 'ficha']);
/** Ficha do inspecionado: não está em PAGE_DEFS (abre a partir de Inspecionados, IS e Perícias). */
const PAGINA_FICHA = { id: 'ficha' as const, rotulo: 'Ficha do inspecionado' };

/** Páginas por área, na ordem da sidebar (config/navigation.ts). */
const AREAS_DEF: { id: string; rotulo: string; paginas: IdPaginaArea[] }[] = [
  { id: 'trabalho', rotulo: 'Trabalho', paginas: ['inspecoes', 'militares', 'ficha', 'concursosJRS', 'pericia-menor', 'escala', 'pareceres', 'mensagens'] },
  { id: 'consulta', rotulo: 'Consulta', paginas: ['guide', 'exames', 'concursos', 'dgpm406', 'portaria', 'laws'] },
  { id: 'formacao', rotulo: 'Formação', paginas: ['casos', 'videos', 'infograficos', 'apresentacoes', 'roteiro'] },
  { id: 'sistema', rotulo: 'Painel, férias e ajuda', paginas: ['painel', 'ferias', 'sobre', 'feedback'] },
];

export type IdPaginaArea = NavItem | 'ficha';
export interface FuncaoArea { id: FeatureKey; rotulo: string; ajuda: string }
export interface PaginaArea { id: IdPaginaArea; rotulo: string; funcoes: FuncaoArea[]; /** Perícia Menor e Ficha: sem permissão de página própria (vale a das funções). */ derivada: boolean }
export interface Area { id: string; rotulo: string; paginas: PaginaArea[] }

/** "Cadastrar nova IS (a lista … página)" → rótulo "Cadastrar nova IS" + ajuda "A lista … página". */
export const partirRotulo = (label: string): { rotulo: string; ajuda: string } => {
  const i = label.indexOf(' (');
  if (i < 0 || !label.endsWith(')')) return { rotulo: label, ajuda: '' };
  const ajuda = label.slice(i + 2, -1);
  return { rotulo: label.slice(0, i), ajuda: ajuda.charAt(0).toUpperCase() + ajuda.slice(1) };
};

export const AREAS: Area[] = (() => {
  const porId = new Map<string, { label: string }>([...PAGE_DEFS.map(p => [p.id, p] as const), [PAGINA_FICHA.id, { label: PAGINA_FICHA.rotulo }]]);
  const usadas = new Set<string>();
  const pagina = (id: IdPaginaArea): PaginaArea | null => {
    const def = porId.get(id);
    if (!def) return null;
    usadas.add(id);
    const grupo = Object.entries(PAGINA_DO_GRUPO).find(([, pid]) => pid === id)?.[0];
    const funcoes = grupo ? FEATURE_DEFS.filter(f => f.group === grupo).map(f => ({ id: f.id, ...partirRotulo(f.label) })) : [];
    return { id, rotulo: def.label, funcoes, derivada: PAGINAS_DERIVADAS.has(id) };
  };
  const areas = AREAS_DEF.map(a => ({ id: a.id, rotulo: a.rotulo, paginas: a.paginas.map(pagina).filter((p): p is PaginaArea => !!p) }));
  const outras = PAGE_DEFS.filter(p => !usadas.has(p.id)).map(p => pagina(p.id)).filter((p): p is PaginaArea => !!p);
  if (outras.length) areas.push({ id: 'outras', rotulo: 'Outras', paginas: outras });
  return areas;
})();

const PAGINA_DA_FUNCAO: Record<string, IdPaginaArea> = Object.fromEntries(
  FEATURE_DEFS.map(f => [f.id, PAGINA_DO_GRUPO[f.group]]).filter(([, p]) => !!p),
);
const ROTULO_PAGINA: Record<string, string> = { ...Object.fromEntries(PAGE_DEFS.map(p => [p.id, p.label])), [PAGINA_FICHA.id]: PAGINA_FICHA.rotulo };
const ROTULO_FUNCAO: Record<string, string> = Object.fromEntries(FEATURE_DEFS.map(f => [f.id, partirRotulo(f.label).rotulo]));

const funcoesDaPagina = (pagina: string): FeatureKey[] => FEATURE_DEFS.filter(f => PAGINA_DO_GRUPO[f.group] === pagina).map(f => f.id);

/** A página está ligada para o perfil (Perícia Menor e Ficha: alguma das abas). */
export const paginaLigada = (m: Matriz, pagina: string, role: Role): boolean =>
  PAGINAS_DERIVADAS.has(pagina)
    ? funcoesDaPagina(pagina).some(f => !!m.features[f]?.[role])
    : m.pages[pagina]?.[role] ?? true;

const copiar = (m: Matriz): Matriz => JSON.parse(JSON.stringify(m));

/** Liga/desliga a página para o perfil. Desligar desliga também as funções dela (que ficam travadas). */
export const alternarPagina = (m: Matriz, pagina: string, role: Role, ligar: boolean): Matriz => {
  const n = copiar(m);
  const funcoes = funcoesDaPagina(pagina);
  if (PAGINAS_DERIVADAS.has(pagina)) {
    // Sem permissão de página: ligar libera todas as abas; desligar fecha todas.
    funcoes.forEach(f => { n.features[f] = { ...n.features[f], [role]: ligar }; });
    return n;
  }
  n.pages[pagina] = { ...n.pages[pagina], [role]: ligar };
  if (!ligar) funcoes.forEach(f => { n.features[f] = { ...n.features[f], [role]: false }; });
  return n;
};

export const alternarFuncao = (m: Matriz, funcao: FeatureKey, role: Role, ligar: boolean): Matriz => {
  const n = copiar(m);
  n.features[funcao] = { ...n.features[funcao], [role]: ligar };
  return n;
};

export interface DiferencaPermissao {
  role: Role;
  tipo: 'pagina' | 'funcao';
  id: string;
  /** "Inspeções de Saúde" ou "Inspeções de Saúde › Cadastrar nova IS". */
  rotulo: string;
  depois: boolean;
}

/** O que mudou do salvo para o rascunho, na ordem dos perfis e das definições. */
export const diferencasPermissoes = (salvo: Matriz, rascunho: Matriz): DiferencaPermissao[] => {
  const r: DiferencaPermissao[] = [];
  ROLES.forEach(({ id: role }) => {
    PAGE_DEFS.forEach(p => {
      if (p.id === 'pericia-menor') return;
      const a = salvo.pages[p.id]?.[role] ?? true;
      const b = rascunho.pages[p.id]?.[role] ?? true;
      if (a !== b) r.push({ role, tipo: 'pagina', id: p.id, rotulo: p.label, depois: b });
    });
    FEATURE_DEFS.forEach(f => {
      const a = !!salvo.features[f.id]?.[role];
      const b = !!rascunho.features[f.id]?.[role];
      if (a === b) return;
      const pag = PAGINA_DA_FUNCAO[f.id];
      r.push({ role, tipo: 'funcao', id: f.id, rotulo: `${pag ? `${ROTULO_PAGINA[pag]} › ` : ''}${ROTULO_FUNCAO[f.id]}`, depois: b });
    });
  });
  return r;
};

/** Linha do resumo/registro: "User Médicos · Inspeções de Saúde › Cadastrar nova IS: desligado". */
export const linhaDiferenca = (d: DiferencaPermissao): string => `${rotuloPerfil(d.role)} · ${d.rotulo}: ${d.depois ? 'ligado' : 'desligado'}`;

export const plural = (n: number, um: string, varios: string): string => `${n} ${n === 1 ? um : varios}`;

/** Resumo da barra de salvar de Perfis e permissões. `usuariosPorPerfil` = ativos de cada perfil. */
export const resumoPermissoes = (difs: DiferencaPermissao[], usuariosPorPerfil: Record<string, number>): string => {
  if (!difs.length) return '';
  const perfis = [...new Set(difs.map(d => d.role))];
  const afetados = perfis.reduce((s, p) => s + (usuariosPorPerfil[p] || 0), 0);
  const afeta = `afeta ${plural(afetados, 'usuário', 'usuários')}`;
  if (difs.length === 1) {
    const d = difs[0];
    return `1 alteração em ${rotuloPerfil(d.role)}: ${d.rotulo} ${d.depois ? 'ligado' : 'desligado'} · ${afeta}`;
  }
  return perfis.length === 1
    ? `${difs.length} alterações em ${rotuloPerfil(perfis[0])} · ${afeta}`
    : `${difs.length} alterações em ${perfis.length} perfis · ${afeta}`;
};

/** Contagem de páginas e funções liberadas para o perfil. */
export const contagemPerfil = (m: Matriz, role: Role): { paginas: number; funcoes: number } => ({
  paginas: PAGE_DEFS.filter(p => paginaLigada(m, p.id, role)).length,
  funcoes: FEATURE_DEFS.filter(f => !!m.features[f.id]?.[role]).length,
});

// ---------------------------------------------------------------- Último acesso

const DIA = 86_400_000;
const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "agora" · "há 12 min" · "hoje 11:20" · "ontem" · "há 9 dias" · "dd/mm/aaaa" · "nunca". */
export const ultimoAcessoRelativo = (em: Date | null | undefined, agora: Date = new Date()): string => {
  if (!em) return 'nunca';
  const ms = agora.getTime() - em.getTime();
  if (ms < 2 * 60_000) return 'agora';
  if (ms < 60 * 60_000) return `há ${Math.floor(ms / 60_000)} min`;
  const dias = Math.round((meiaNoite(agora) - meiaNoite(em)) / DIA);
  if (dias <= 0) return `hoje ${String(em.getHours()).padStart(2, '0')}:${String(em.getMinutes()).padStart(2, '0')}`;
  if (dias === 1) return 'ontem';
  if (dias < 60) return `há ${dias} dias`;
  return em.toLocaleDateString('pt-BR');
};

/** Sem acesso há pelo menos `dias` dias (nunca acessou também conta). */
export const semAcessoHa = (em: Date | null | undefined, dias: number, agora: Date = new Date()): boolean =>
  !em || agora.getTime() - em.getTime() >= dias * DIA;

/** Data e hora curtas ("02/11 10:12"; outro ano: "02/11/2025 10:12"). */
export const dataHoraCurta = (d: Date | null | undefined, agora: Date = new Date()): string => {
  if (!d) return '—';
  const dia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear() !== agora.getFullYear() ? `/${d.getFullYear()}` : ''}`;
  return `${dia} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ---------------------------------------------------------------- Turnos da agenda

export type MapaTurnos = Record<string, Partial<Record<string, Partial<Record<string, boolean>>>>>;

export interface DiferencaTurno { uid: string; dia: string; turno: string; depois: boolean }

export const diferencasTurnos = (salvo: MapaTurnos, rascunho: MapaTurnos): DiferencaTurno[] => {
  const r: DiferencaTurno[] = [];
  const uids = new Set([...Object.keys(salvo || {}), ...Object.keys(rascunho || {})]);
  uids.forEach(uid => {
    const dias = new Set([...Object.keys(salvo?.[uid] || {}), ...Object.keys(rascunho?.[uid] || {})]);
    dias.forEach(dia => {
      const turnos = new Set([...Object.keys(salvo?.[uid]?.[dia] || {}), ...Object.keys(rascunho?.[uid]?.[dia] || {})]);
      turnos.forEach(turno => {
        const a = !!salvo?.[uid]?.[dia]?.[turno];
        const b = !!rascunho?.[uid]?.[dia]?.[turno];
        if (a !== b) r.push({ uid, dia, turno, depois: b });
      });
    });
  });
  return r.sort((x, y) => x.uid.localeCompare(y.uid) || x.dia.localeCompare(y.dia) || x.turno.localeCompare(y.turno));
};

// ---------------------------------------------------------------- Listas de e-mail

/** Diferença de uma lista de e-mails: incluídos e removidos. */
export const diferencaLista = (antes: string[], depois: string[]): { incluidos: string[]; removidos: string[] } => ({
  incluidos: depois.filter(e => !antes.includes(e)),
  removidos: antes.filter(e => !depois.includes(e)),
});
