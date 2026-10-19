// Ficheiro: services/peritosIS.ts
// Peritos (usuários médicos ativos) das Inspeções de Saúde, lidos de "usuarios".
// Competência: finalidades da JRS são agendadas só para o Admin e user_medicos;
// as do MPI, só para user_medicos_mpi.
import { listUsuarios } from './firestoreUsuarios';
import type { AmpIS } from './firestoreInspecoes';

export interface PeritoIS {
  uid: string;
  /** Login (ex.: "CT MAURISTON"), o que as telas mostram. */
  usuario: string;
  nome: string;
  postoGraduacao: string;
  gmail: string;
  perfil: string;
  /** Foto de perfil (URL), quando houver. */
  imageProfile: string;
}

const PERFIS_PERITO = ['admin', 'user_medicos', 'user_medicos_mpi'];

export const carregarPeritos = async (): Promise<PeritoIS[]> =>
  (await listUsuarios())
    .filter(u => u.ativo && PERFIS_PERITO.includes(u.perfil))
    .map(u => ({ uid: u.id, usuario: u.usuario, nome: u.nome, postoGraduacao: u.postoGraduacao, gmail: (u.gmail || '').trim().toLowerCase(), perfil: u.perfil, imageProfile: u.imageProfile || '' }))
    .sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR'));

export const perfilAtendeAmp = (perfil: string, amp: AmpIS): boolean =>
  amp === 'JRS' ? perfil === 'admin' || perfil === 'user_medicos' : perfil === 'user_medicos_mpi';

export const peritosDoAmp = (peritos: PeritoIS[], amp: AmpIS): PeritoIS[] => peritos.filter(p => perfilAtendeAmp(p.perfil, amp));

/** AMP de competência de uma finalidade (MPIQ é do MPI). */
export const ampDaFinalidade = (amp: string): AmpIS => (amp === 'JRS' ? 'JRS' : 'MPI');
