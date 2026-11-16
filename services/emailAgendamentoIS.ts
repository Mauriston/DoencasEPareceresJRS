// Ficheiro: services/emailAgendamentoIS.ts
// E-mail de agendamento/reagendamento da IS ao inspecionado (servidor/email/agendamentoIS.ts; todos os grupos —
// Verificações e Términos, Benefícios e o modelo geral; variante de reagendamento decidida pelo servidor):
//  - enviarAgendamentoISPorEmail: chama o servidor (conta Google da JRS; sem Apps Script de reserva);
//  - avisarAgendamento / observarAgendamentos: aviso, dentro do app, de que uma IS acabou de ser agendada ou
//    reagendada (AgendarDialog, AgendarNoHorarioDialog, TrocarPeritoDialog, IS nova com data, arraste no
//    calendário). A página Inspeções de Saúde escuta e abre o dialog de confirmação (Enviar · Cancelar).
import { ApiError, chamarServidor } from './apiClient';
import { registrarUsoAcao } from './usoDiario';
import { ehElegivelAgendamento, type ISParaAgendamento } from '../utils/emailAgendamentoIS';

export const enviarAgendamentoISPorEmail = async (isId: string, email?: string): Promise<{ para: string; emailSalvo: boolean }> => {
  try {
    const r = await chamarServidor<{ para: string; emailSalvo: boolean }>('/api/email/agendamento-is', { isId, ...(email ? { email: email.trim() } : {}) });
    registrarUsoAcao('email_enviar');
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

/** Avisa que a IS foi agendada para `dataEntrevista` (elegível: com data, não cancelada — ehElegivelAgendamento). */
export const avisarAgendamento = (is: { id: string } & ISParaAgendamento, dataEntrevista: string) => {
  if (!ehElegivelAgendamento({ ...is, dataEntrevista })) return;
  ouvintes.forEach(o => o({ isId: is.id, dataEntrevista }));
};

export const observarAgendamentos = (o: Ouvinte): (() => void) => {
  ouvintes.add(o);
  return () => { ouvintes.delete(o); };
};
