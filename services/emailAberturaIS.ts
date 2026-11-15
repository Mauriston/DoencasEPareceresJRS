// Ficheiro: services/emailAberturaIS.ts
// E-mail "ABERTURA DE IS FIM {finalidade} - {inspecionado}" ao inspecionado (servidor/email/aberturaIS.ts —
// pacote B1), logo depois de abrir a IS, com confirmação no app (components/inspecoes/guias/EnviarAberturaDialog).
// Sem e-mail no cadastro, o app manda o informado e o servidor grava no cadastro. O servidor registra o envio
// na IS (emailAberturaPara/EnviadoEm), no histórico de e-mails e na contagem do Painel.
import { ApiError, chamarServidor } from './apiClient';

export const enviarAberturaISPorEmail = async (isId: string, email?: string): Promise<{ para: string; emailSalvo: boolean }> => {
  try {
    const r = await chamarServidor<{ para: string; emailSalvo: boolean }>('/api/email/abertura-is', { isId, ...(email ? { email: email.trim() } : {}) });
    return { para: r.para, emailSalvo: !!r.emailSalvo };
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) {
      throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
    }
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError('negocio', 'O servidor ainda não tem o e-mail de abertura. Tente de novo após a próxima publicação.', 404);
    }
    throw e;
  }
};
