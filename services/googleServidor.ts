// Ficheiro: services/googleServidor.ts
// E-mails de impressão e Google Agenda pelo servidor (Cloud Run, conta Google da JRS autorizada por
// OAuth — servidor/google/*), com o Apps Script como reserva: enquanto a conta não estiver autorizada
// (ou o cliente OAuth não estiver configurado), o servidor responde 503 "google_indisponivel" e a
// mesma ação vai para o Apps Script, com o mesmo corpo e a mesma resposta. Depois de uma recusa, o app
// vai direto ao Apps Script por 10 minutos (evita uma ida e volta inútil a cada evento).
import { ApiError, chamarScript as chamarScriptApi, chamarServidor } from './apiClient';

const PAUSA_MS = 10 * 60_000;
let indisponivelAte = 0;

/** O servidor não tem a conta Google (503) ou ainda não tem a rota (404, versão antiga no ar). */
export const deveUsarReserva = (e: unknown): boolean => e instanceof ApiError && (e.status === 503 || e.status === 404);

/** Chama `rota` no servidor; se o Google do servidor estiver indisponível, chama `acaoScript` no Apps Script. */
export const chamarGoogle = async <T>(rota: string, acaoScript: string, dados: Record<string, unknown>): Promise<T> => {
  if (Date.now() >= indisponivelAte) {
    try {
      const { success: _s, ...resto } = await chamarServidor<Record<string, unknown>>(rota, dados);
      return resto as T;
    } catch (e) {
      if (!deveUsarReserva(e)) throw e;
      indisponivelAte = Date.now() + PAUSA_MS;
    }
  }
  return chamarScriptApi<T>(acaoScript, dados, { mensagemRede: 'Não foi possível falar com o Google. Verifique sua conexão e tente novamente.' });
};

/** Só para os testes. */
export const _reiniciarReserva = () => { indisponivelAte = 0; };

// ---------------------------------------------------------------- Admin: conta Google do servidor

export interface SituacaoContaGoogle { configurado: boolean; autorizado: boolean; conta: string; escopos: string[] }

export const situacaoContaGoogle = async (): Promise<SituacaoContaGoogle> => {
  const { success: _s, ...r } = await chamarServidor<SituacaoContaGoogle & { success: boolean }>('/api/google/situacao');
  return r;
};

/** Endereço do Google para o Admin autorizar a conta da JRS (abre em outra aba). */
export const urlAutorizacaoGoogle = async (): Promise<string> =>
  (await chamarServidor<{ url: string }>('/api/google/autorizacao')).url;
