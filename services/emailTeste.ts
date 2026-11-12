// Ficheiro: services/emailTeste.ts
// E-mails de teste (Configurações; só Admin): o servidor (servidor/email/teste.ts) monta o e-mail do tipo com dados
// fictícios e envia só aos destinatários de teste de config/emails, sem CCO, com "[TESTE]" no assunto.
import { ApiError, chamarServidor } from './apiClient';
import type { TipoEmail } from '../config/emails';

export const enviarEmailTeste = async (tipo: TipoEmail): Promise<{ para: string[]; cc: string[] }> => {
  try {
    const r = await chamarServidor<{ para: string[]; cc: string[] }>('/api/email/teste', { tipo }, { timeoutMs: 180_000 });
    return { para: r.para, cc: r.cc };
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Autorize-a em Usuários.', 503);
    if (e instanceof ApiError && e.status === 404) throw new ApiError('negocio', 'O servidor ainda não tem os e-mails de teste. Tente de novo após a próxima publicação.', 404);
    throw e;
  }
};
