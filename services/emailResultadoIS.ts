// Ficheiro: services/emailResultadoIS.ts
// "Enviar resultado por e-mail" (menu ⋮ das IS com TIS assinado; Admin e Secretaria): o servidor monta o
// e-mail com o template da JRS (servidor/email/) e envia pela conta Google da JRS. Sem Apps Script de
// reserva: sem a conta autorizada no servidor (503), o app explica que o Admin precisa autorizá-la.
import { ApiError, chamarServidor } from './apiClient';

/** E-mail do cadastro do inspecionado (institucional; senão, o pessoal). */
export const emailDoInspecionado = (m?: { email?: string; emailPessoal?: string }): string =>
  String(m?.email || m?.emailPessoal || '').trim().toLowerCase();

export const emailValido = (e: string): boolean => /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(e.trim());

/** Envia o resultado da IS. `email` só quando o cadastro não tem e-mail (o servidor grava no cadastro). */
export const enviarResultadoISPorEmail = async (isId: string, email?: string): Promise<{ para: string; emailSalvo: boolean }> => {
  try {
    const r = await chamarServidor<{ para: string; emailSalvo: boolean }>('/api/email/resultado-is', { isId, ...(email ? { email: email.trim() } : {}) });
    return { para: r.para, emailSalvo: !!r.emailSalvo };
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) {
      throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
    }
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError('negocio', 'O servidor ainda não tem o envio de resultado por e-mail. Tente de novo após a próxima publicação.', 404);
    }
    throw e;
  }
};
