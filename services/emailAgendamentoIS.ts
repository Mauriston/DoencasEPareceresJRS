// Ficheiro: services/emailAgendamentoIS.ts
// E-mail "AGENDAMENTO DE INSPEÇÃO DE SAÚDE" (servidor/email/agendamentoIS.ts):
//  - enviarAgendamentoISPorEmail: chama o servidor (conta Google da JRS; sem Apps Script de reserva);
//  - avisarAgendamento / observarAgendamentos: aviso, dentro do app, de que uma IS acabou de ser agendada ou
//    reagendada (AgendarDialog, AgendarNoHorarioDialog, TrocarPeritoDialog, IS nova com data, arraste no
//    calendário). A página Inspeções de Saúde escuta e pergunta se envia o e-mail ao inspecionado.
import { ApiError, chamarServidor } from './apiClient';
import { ehElegivelAgendamento, type ISParaAgendamento } from '../utils/emailAgendamentoIS';

export const enviarAgendamentoISPorEmail = async (isId: string, email?: string): Promise<{ para: string; emailSalvo: boolean }> => {
  try {
    const r = await chamarServidor<{ para: string; emailSalvo: boolean }>('/api/email/agendamento-is', { isId, ...(email ? { email: email.trim() } : {}) });
    return { para: r.para, emailSalvo: !!r.emailSalvo };
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) {
      throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
    }
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError('negocio', 'O servidor ainda não tem o envio do e-mail de agendamento. Tente de novo após a próxima publicação.', 404);
    }
    throw e;
  }
};

export interface AgendamentoFeito { isId: string; dataEntrevista: string }

type Ouvinte = (a: AgendamentoFeito) => void;
const ouvintes = new Set<Ouvinte>();

/** Avisa que a IS foi agendada para `dataEntrevista` (só as finalidades com e-mail de agendamento). */
export const avisarAgendamento = (is: { id: string } & ISParaAgendamento, dataEntrevista: string) => {
  if (!ehElegivelAgendamento({ ...is, dataEntrevista })) return;
  ouvintes.forEach(o => o({ isId: is.id, dataEntrevista }));
};

export const observarAgendamentos = (o: Ouvinte): (() => void) => {
  ouvintes.add(o);
  return () => { ouvintes.delete(o); };
};
