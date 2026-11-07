// Ficheiro: servidor/google/contaGoogle.ts
// Acesso do servidor à conta Google da JRS (a dona da agenda "JRS/HNRe" e remetente dos e-mails de
// impressão) por OAuth 2.0 — substitui o Apps Script no envio de e-mails e na sincronização do Google
// Agenda. O Admin autoriza UMA vez (Usuários → Conta Google do servidor): o servidor guarda o refresh
// token em `segredos_servidor/contaGoogle` (Firestore; as regras negam qualquer acesso pelo app — só o
// Admin SDK lê) e troca por tokens de acesso quando precisa.
//
// Configuração (Cloud Run): GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET (cliente OAuth "Aplicativo
// da Web" do projeto jrs-app-web, com o URI de redirecionamento {URL do servidor}/api/google/retorno) e,
// opcional, URL_PUBLICA_SERVIDOR (padrão: a URL do Cloud Run). Ver docs/configuracao.md.
import { randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

export const ESCOPOS_GOOGLE = [
  'openid', 'email',
  'https://www.googleapis.com/auth/gmail.send',      // e-mails de impressão
  'https://www.googleapis.com/auth/calendar.events', // eventos da agenda JRS/HNRe
  'https://www.googleapis.com/auth/drive.readonly',  // ler os PDFs do Drive para anexar
];

const DOC_CONTA = { colecao: 'segredos_servidor', id: 'contaGoogle' };
const DOC_ESTADO = { colecao: 'segredos_servidor', id: 'contaGoogleEstado' };

export class ErroContaGoogle extends Error {
  constructor(public readonly codigo: 'nao_configurado' | 'nao_autorizado' | 'falha', mensagem: string) { super(mensagem); }
}

const cliente = () => {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const segredo = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  if (!id || !segredo) throw new ErroContaGoogle('nao_configurado', 'O cliente OAuth do Google não está configurado no servidor.');
  return { id, segredo };
};

export const urlRetorno = (urlServidor: string) => `${(process.env.URL_PUBLICA_SERVIDOR || urlServidor).replace(/\/+$/, '')}/api/google/retorno`;

/** Gera o endereço de autorização (Admin) e guarda o "state" por 10 minutos. */
export const iniciarAutorizacao = async (db: Firestore, uid: string, urlServidor: string): Promise<string> => {
  const { id } = cliente();
  const estado = randomBytes(24).toString('hex');
  await db.collection(DOC_ESTADO.colecao).doc(DOC_ESTADO.id).set({ estado, uid, expira: Date.now() + 10 * 60_000 });
  const q = new URLSearchParams({
    client_id: id, redirect_uri: urlRetorno(urlServidor), response_type: 'code', scope: ESCOPOS_GOOGLE.join(' '),
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: estado,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
};

/** Recebe o retorno do Google: confere o "state", troca o código e guarda o refresh token. Devolve a conta. */
export const concluirAutorizacao = async (db: Firestore, codigo: string, estado: string, urlServidor: string): Promise<string> => {
  const refEstado = db.collection(DOC_ESTADO.colecao).doc(DOC_ESTADO.id);
  const salvo = (await refEstado.get()).data();
  await refEstado.delete();
  if (!salvo || salvo.estado !== estado || Number(salvo.expira) < Date.now()) throw new ErroContaGoogle('falha', 'Autorização expirada ou inválida. Comece de novo pelo app.');
  const { id, segredo } = cliente();
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: codigo, client_id: id, client_secret: segredo, redirect_uri: urlRetorno(urlServidor), grant_type: 'authorization_code' }),
  });
  const j: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !j.refresh_token) throw new ErroContaGoogle('falha', `O Google não devolveu a autorização (${j.error || resp.status}).`);
  const conta = emailDoIdToken(j.id_token);
  const escopos = String(j.scope || '').split(' ').filter(Boolean);
  await db.collection(DOC_CONTA.colecao).doc(DOC_CONTA.id).set({ refreshToken: j.refresh_token, conta, escopos, autorizadoPor: salvo.uid, em: new Date() });
  tokenCache = null;
  return conta;
};

const emailDoIdToken = (idToken: unknown): string => {
  try { return String(JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8')).email || ''); } catch { return ''; }
};

export const situacaoConta = async (db: Firestore): Promise<{ configurado: boolean; autorizado: boolean; conta: string; escopos: string[] }> => {
  const configurado = !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const d = (await db.collection(DOC_CONTA.colecao).doc(DOC_CONTA.id).get()).data();
  return { configurado, autorizado: !!d?.refreshToken, conta: d?.conta || '', escopos: d?.escopos || [] };
};

let tokenCache: { token: string; expira: number; conta: string } | null = null;

/** Token de acesso da conta Google da JRS (renovado pelo refresh token; cache em memória). */
export const tokenGoogle = async (db: Firestore): Promise<{ token: string; conta: string }> => {
  if (tokenCache && tokenCache.expira > Date.now() + 60_000) return tokenCache;
  const d = (await db.collection(DOC_CONTA.colecao).doc(DOC_CONTA.id).get()).data();
  if (!d?.refreshToken) throw new ErroContaGoogle('nao_autorizado', 'A conta Google do servidor ainda não foi autorizada.');
  const { id, segredo } = cliente();
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: d.refreshToken, client_id: id, client_secret: segredo, grant_type: 'refresh_token' }),
  });
  const j: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !j.access_token) {
    // invalid_grant: autorização revogada ou expirada (app OAuth em "Teste" expira em 7 dias).
    throw new ErroContaGoogle(j.error === 'invalid_grant' ? 'nao_autorizado' : 'falha', `Falha ao renovar o acesso Google (${j.error || resp.status}).`);
  }
  tokenCache = { token: j.access_token, expira: Date.now() + Number(j.expires_in || 3000) * 1000, conta: d.conta || '' };
  return tokenCache;
};

/** fetch autenticado nas APIs do Google; erro com a mensagem da API. */
export const googleFetch = async (db: Firestore, url: string, init: RequestInit = {}): Promise<Response> => {
  const { token } = await tokenGoogle(db);
  const resp = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  if (!resp.ok && resp.status !== 404 && resp.status !== 410) {
    const j: any = await resp.json().catch(() => ({}));
    throw new ErroContaGoogle('falha', `Google respondeu ${resp.status}: ${j?.error?.message || ''}`.trim());
  }
  return resp;
};
