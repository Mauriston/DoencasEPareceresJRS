// Ficheiro: servidor/email/agendamentoIS.ts
// E-mail "AGENDAMENTO DE INSPEÇÃO DE SAÚDE" (finalidades dos grupos Benefícios e Verificações/Términos).
// CONTRATO (implementação: agente "agendamento"): rota POST /api/email/agendamento-is { isId, email? }.
import type { Firestore } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';

export const enviarAgendamentoIS = async (_db: Firestore, _isId: unknown, _email: unknown, _uid: string): Promise<{ para: string; emailSalvo: boolean }> => {
  throw new ErroContaGoogle('falha', 'E-mail de agendamento ainda não implementado.');
};
