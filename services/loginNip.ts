// Ficheiro: services/loginNip.ts
// Chamadas ao backend (Cloud Run, server.ts) do login por NIP e da
// redefinição de senha pelo Admin.
import { apiUrl } from '../utils/apiBase';
import { auth } from './firebaseAuth';

export interface UsuarioPorNip {
  usuario: string;
  ativo: boolean;
  /** true enquanto o usuário não trocou a senha inicial padrão. */
  senhaTemporaria: boolean;
}

export class NipError extends Error {}

export const resolverNip = async (nip: string): Promise<UsuarioPorNip> => {
  let resp: Response;
  try {
    resp = await fetch(apiUrl('/api/auth/resolver-nip'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nip }),
    });
  } catch {
    throw new NipError('Erro de conexão. Tente novamente.');
  }
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json.success) throw new NipError(json.error || 'Não foi possível consultar o NIP. Tente novamente.');
  return { usuario: json.usuario, ativo: json.ativo, senhaTemporaria: json.senhaTemporaria };
};

/** Admin: devolve a senha do usuário para a inicial padrão. */
export const resetarSenhaUsuario = async (uid: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const idToken = await user.getIdToken();
  const resp = await fetch(apiUrl('/api/admin/resetar-senha'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ uid }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json.success) throw new Error(json.error || 'Não foi possível redefinir a senha.');
};
