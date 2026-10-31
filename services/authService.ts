// Ficheiro: services/authService.ts
// Fachada da autenticação do app (Firebase Authentication — única fonte de verdade da sessão).
// Reúne o que o resto do app precisa saber sobre "quem está logado": observar a sessão, entrar,
// sair, trocar a senha e obter o ID token que o servidor (Cloud Run) e o Apps Script exigem.
//
// Nenhuma senha, hash de senha ou credencial é guardada no navegador por este app (nem em
// localStorage): quem mantém a sessão é o próprio SDK do Firebase. O token só viaja no cabeçalho
// Authorization (servidor) ou no corpo POST (Apps Script) — nunca em query string.
import { auth } from './firebaseAuth';

export {
  auth,
  onAuthChange,
  loginUsuario,
  logoutUsuario,
  trocarSenha,
  usuarioToEmail,
  criarContaEUsuario,
} from './firebaseAuth';

/** Erro de sessão (nenhum usuário logado ou token expirado e não renovável). */
export class SessaoExpiradaError extends Error {
  constructor() {
    super('Sessão expirada. Faça login novamente.');
    this.name = 'SessaoExpiradaError';
  }
}

/** ID token do usuário logado (o SDK o renova sozinho); null quando não há sessão. */
export const obterIdToken = async (): Promise<string | null> => {
  const usuario = auth.currentUser;
  if (!usuario) return null;
  try {
    return await usuario.getIdToken();
  } catch {
    return null;
  }
};

/** Como obterIdToken, mas lança SessaoExpiradaError quando não há sessão. */
export const exigirIdToken = async (): Promise<string> => {
  const token = await obterIdToken();
  if (!token) throw new SessaoExpiradaError();
  return token;
};
