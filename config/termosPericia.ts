// Ficheiro: config/termosPericia.ts
// A página "Perícia Menor" chama-se "Atestados" para os médicos da MPI (user_medicos_mpi) e os demais
// médicos do HNRe (user_medicos_geral): mesmos dados e fluxo, só os rótulos mudam.
export interface TermosPericia {
  /** Nome da página (menu, título, breadcrumbs). */
  pagina: string;
  singular: string;
  plural: string;
  /** Título do formulário de registro. */
  novo: string;
}

const PERICIA: TermosPericia = { pagina: 'Perícia Menor', singular: 'perícia menor', plural: 'perícias menores', novo: 'Nova perícia menor' };
const ATESTADO: TermosPericia = { pagina: 'Atestados', singular: 'atestado', plural: 'atestados', novo: 'Novo atestado' };

const PERFIS_ATESTADO = new Set(['user_medicos_geral', 'user_medicos_mpi']);

export const termosPericia = (perfil: string | undefined): TermosPericia => (PERFIS_ATESTADO.has(perfil ?? '') ? ATESTADO : PERICIA);
