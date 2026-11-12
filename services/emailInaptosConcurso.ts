// Ficheiro: services/emailInaptosConcurso.ts
// "E-mail de inaptos (EAMPE)" na página do concurso (Admin e Secretaria): o servidor monta e envia o e-mail
// "{concurso} - Candidatos Inaptos" (servidor/email/inaptosConcurso.ts) e marca os candidatos enviados.
import { ApiError, chamarServidor } from './apiClient';

export const enviarEmailInaptosConcurso = async (concursoId: string, candidatoIds: string[]): Promise<{ enviados: number; para: string[]; cc: string[] }> => {
  try {
    const { success: _s, ...r } = await chamarServidor<{ success: boolean; enviados: number; para: string[]; cc: string[] }>('/api/email/inaptos-concurso', { concursoId, candidatoIds });
    return r;
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
    if (e instanceof ApiError && e.status === 404) throw new ApiError('negocio', 'O servidor ainda não tem o envio de inaptos por e-mail. Tente de novo após a próxima publicação.', 404);
    throw e;
  }
};
