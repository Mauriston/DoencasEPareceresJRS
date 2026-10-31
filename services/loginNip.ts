// Ficheiro: services/loginNip.ts
// Chamadas ao backend (Cloud Run, server.ts) do login por NIP e da
// redefinição de senha pelo Admin.
import { ApiError, chamarServidor } from './apiClient';

export interface UsuarioPorNip {
  usuario: string;
  ativo: boolean;
  /** true enquanto o usuário não trocou a senha inicial padrão. */
  senhaTemporaria: boolean;
}

export class NipError extends Error {}

export const resolverNip = async (nip: string): Promise<UsuarioPorNip> => {
  try {
    // Rota pública (o usuário ainda não está logado): sem token.
    const json = await chamarServidor<{ usuario: string; ativo: boolean; senhaTemporaria: boolean }>(
      '/api/auth/resolver-nip', { nip }, { autenticar: false, timeoutMs: 20_000 });
    return { usuario: json.usuario, ativo: json.ativo, senhaTemporaria: json.senhaTemporaria };
  } catch (e) {
    if (e instanceof ApiError && (e.codigo === 'rede' || e.codigo === 'timeout')) throw new NipError('Erro de conexão. Tente novamente.');
    throw new NipError(e instanceof ApiError && e.codigo === 'negocio' ? e.message : 'Não foi possível consultar o NIP. Tente novamente.');
  }
};

/** Admin: devolve a senha do usuário para a inicial padrão. */
export const resetarSenhaUsuario = async (uid: string): Promise<void> => {
  await chamarServidor('/api/admin/resetar-senha', { uid }, { timeoutMs: 30_000 });
};

export const excluirUsuario = async (uid: string): Promise<void> => {
  await chamarServidor('/api/admin/excluir-usuario', { uid }, { timeoutMs: 30_000 });
};
