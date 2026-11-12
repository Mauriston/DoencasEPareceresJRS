// Ficheiro: services/emailFaltasHNRe.ts
// "E-mail de faltas (HNRe)" (botão do cabeçalho de Inspeções de Saúde e card da Início; Admin e Secretaria):
// o servidor (servidor/email/faltasHNRe.ts) monta a comunicação das faltas escolhidas e envia pela conta Google
// da JRS. Sem a conta autorizada no servidor (503), o app explica que o Admin precisa autorizá-la.
import { ApiError, chamarServidor } from './apiClient';

export interface ResultadoEnvioFaltas { enviados: number; para: string[]; cc: string[] }

export const enviarEmailFaltasHNRe = async (isIds: string[]): Promise<ResultadoEnvioFaltas> => {
  try {
    const { success: _s, enviado: _e, ...r } = await chamarServidor<ResultadoEnvioFaltas & { success: boolean; enviado: boolean }>('/api/email/faltas-hnre', { isIds });
    return r;
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
    if (e instanceof ApiError && e.status === 404) throw new ApiError('negocio', 'O servidor ainda não tem o envio das faltas por e-mail. Tente de novo após a próxima publicação.', 404);
    throw e;
  }
};
