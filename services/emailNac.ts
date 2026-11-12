// Ficheiro: services/emailNac.ts
// E-mail "INSPEÇÕES DE SAÚDE VDF E TÉRMINOS" ao NAC (menu "Enviar Email" de Inspeções; Admin e Secretaria): o servidor
// (servidor/email/nac.ts) monta o e-mail e o anexo em PDF das IS escolhidas e envia pela conta Google da JRS.
import { ApiError, chamarServidor } from './apiClient';

export interface ResultadoEnvioNac { enviados: number; para: string[]; cc: string[]; periodo: { inicio: string; fim: string } }

export const enviarEmailNac = async (isIds: string[]): Promise<ResultadoEnvioNac> => {
  try {
    const { success: _s, enviado: _e, ...r } = await chamarServidor<ResultadoEnvioNac & { success: boolean; enviado: boolean }>('/api/email/nac', { isIds }, { timeoutMs: 180_000 });
    return r;
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
    if (e instanceof ApiError && e.status === 404) throw new ApiError('negocio', 'O servidor ainda não tem o envio ao NAC. Tente de novo após a próxima publicação.', 404);
    throw e;
  }
};
