// Ficheiro: services/apiClient.ts
// Cliente único para falar com os dois backends do app:
//   - servidor Node (Cloud Run, server.ts): rotas /api/*, JSON, token no cabeçalho Authorization;
//   - Apps Script (GAS_URL_CONCURSOS): ação + dados no corpo POST (text/plain, para evitar o
//     preflight de CORS), token no campo "idToken" do corpo.
// Centraliza URL base, serialização, token do Firebase, timeout (AbortController), tratamento de
// erro tipado (ApiError) e o envelope de resposta:
//   Apps Script:  { sucesso: true, dados } | { sucesso: false, erro }      (padrão)
//                 { success, data | message, ... }                          (legado: Gemini)
//   Servidor:     { success: true, ...campos } | { success: false, error }
import { GAS_URL_CONCURSOS } from '../config/endpoints';
import { apiUrl } from '../utils/apiBase';
import { obterIdToken } from './authService';

export type CodigoErroApi =
  | 'nao_autenticado' // sem sessão ou token recusado (401)
  | 'sem_permissao'   // perfil sem acesso à operação (403)
  | 'rede'            // sem conexão / servidor inalcançável
  | 'timeout'         // passou de timeoutMs
  | 'resposta_invalida' // corpo que não é JSON no formato esperado
  | 'negocio';        // o servidor respondeu e recusou (mensagem em `message`)

export class ApiError extends Error {
  readonly codigo: CodigoErroApi;
  readonly status?: number;
  constructor(codigo: CodigoErroApi, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.codigo = codigo;
    this.status = status;
  }
}

export interface OpcoesApi {
  /** Tempo máximo de espera, em ms (padrão: TIMEOUT_PADRAO_MS). */
  timeoutMs?: number;
  /** Envia o ID token do Firebase (padrão: true). Só desligue em rotas públicas (ex.: resolver NIP). */
  autenticar?: boolean;
  /** Mensagem exibida quando não há conexão (substitui a genérica). */
  mensagemRede?: string;
  /** Mensagem exibida quando a resposta não é um JSON válido. */
  mensagemRespostaInvalida?: string;
}

/** Geração de documentos/Gemini no Apps Script pode demorar; 2 min cobre as novas tentativas do Gemini. */
export const TIMEOUT_PADRAO_MS = 120_000;
const MSG_REDE = 'Sem comunicação com o servidor. Verifique sua conexão e tente novamente.';
const MSG_TIMEOUT = 'O servidor demorou demais para responder. Tente novamente.';
const MSG_SESSAO = 'Sessão expirada. Faça login novamente.';

const exigirToken = async (): Promise<string> => {
  const token = await obterIdToken();
  if (!token) throw new ApiError('nao_autenticado', MSG_SESSAO);
  return token;
};

/** fetch com timeout; converte falhas de rede/timeout em ApiError. */
const enviar = async (url: string, init: RequestInit, opts: OpcoesApi): Promise<Response> => {
  const controlador = new AbortController();
  const tempo = setTimeout(() => controlador.abort(), opts.timeoutMs ?? TIMEOUT_PADRAO_MS);
  try {
    return await fetch(url, { ...init, signal: controlador.signal });
  } catch (e) {
    if (controlador.signal.aborted) throw new ApiError('timeout', MSG_TIMEOUT);
    throw new ApiError('rede', opts.mensagemRede || MSG_REDE);
  } finally {
    clearTimeout(tempo);
  }
};

const lerJson = async (resp: Response, opts: OpcoesApi): Promise<any> => {
  try {
    return await resp.json();
  } catch {
    throw new ApiError('resposta_invalida', opts.mensagemRespostaInvalida || 'O servidor respondeu em um formato inesperado.', resp.status);
  }
};

/**
 * Chama uma rota do servidor Node (ex.: '/api/auth/resolver-nip'). Devolve o corpo da resposta
 * ({ success: true, ...campos }); lança ApiError quando o HTTP falha ou success é false.
 */
export const chamarServidor = async <T = Record<string, any>>(rota: string, corpo: unknown = {}, opts: OpcoesApi = {}): Promise<T> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.autenticar !== false) headers.Authorization = `Bearer ${await exigirToken()}`;
  const resp = await enviar(apiUrl(rota), { method: 'POST', headers, body: JSON.stringify(corpo) }, opts);
  const json = await lerJson(resp, opts);
  if (!resp.ok || !json?.success) {
    const codigo: CodigoErroApi = resp.status === 401 ? 'nao_autenticado' : resp.status === 403 ? 'sem_permissao' : 'negocio';
    throw new ApiError(codigo, json?.error || `Servidor respondeu ${resp.status}.`, resp.status);
  }
  return json as T;
};

/**
 * Chama uma ação do Apps Script. Devolve `dados` (envelope padrão) ou `data` (envelope legado do
 * Gemini; sem `data`, o corpo inteiro menos o campo `success`). Lança ApiError nas falhas.
 */
export const chamarScript = async <T = any>(action: string, dados: Record<string, unknown> = {}, opts: OpcoesApi = {}): Promise<T> => {
  const idToken = opts.autenticar === false ? undefined : await exigirToken();
  const resp = await enviar(GAS_URL_CONCURSOS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...(idToken ? { idToken } : {}), ...dados }),
  }, {
    mensagemRespostaInvalida: 'O servidor devolveu uma resposta inválida (verifique a implantação do Apps Script).',
    ...opts,
  });
  const json = await lerJson(resp, opts);
  return extrairEnvelopeScript<T>(json);
};

/** Interpreta os dois envelopes do Apps Script (exportada para os testes). */
export const extrairEnvelopeScript = <T = any>(json: any): T => {
  if (json && typeof json === 'object') {
    if ('sucesso' in json) {
      if (json.sucesso) return json.dados as T;
      throw new ApiError(classificarMensagem(json.erro), json.erro || 'Erro ao processar a solicitação.');
    }
    if ('success' in json) {
      if (json.success) {
        if ('data' in json) return json.data as T;
        const { success: _s, ...resto } = json;
        return resto as T;
      }
      throw new ApiError(classificarMensagem(json.message), json.message || 'Erro ao processar a solicitação.');
    }
  }
  throw new ApiError('resposta_invalida', 'O servidor respondeu em um formato inesperado.');
};

/** O Apps Script devolve a recusa de acesso como texto; mapeia para os códigos tipados. */
const classificarMensagem = (mensagem: unknown): CodigoErroApi => {
  const m = String(mensagem || '');
  if (/Sessão (inválida|não identificada)|expirada/i.test(m)) return 'nao_autenticado';
  if (/sem permissão|Acesso negado|usuário inativo/i.test(m)) return 'sem_permissao';
  return 'negocio';
};
