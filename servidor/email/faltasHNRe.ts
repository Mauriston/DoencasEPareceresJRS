// Ficheiro: servidor/email/faltasHNRe.ts
// E-mail "COMUNICAÇÃO DE FALTAS A INSPEÇÕES DE SAÚDE" (só inspecionados com OM HNRe) à Divisão de Pessoal.
// CONTRATO (implementação: agente "faltas"): rota POST /api/email/faltas-hnre { isIds: string[] }.
import type { Firestore } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';

export const enviarFaltasHNRe = async (_db: Firestore, _isIds: unknown, _uid: string): Promise<{ enviados: number; para: string[]; cc: string[] }> => {
  throw new ErroContaGoogle('falha', 'E-mail de faltas ainda não implementado.');
};
