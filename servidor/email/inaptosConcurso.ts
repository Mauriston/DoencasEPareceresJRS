// Ficheiro: servidor/email/inaptosConcurso.ts
// E-mail "{concurso} - Candidatos Inaptos" à Divisão de Apoio aos Concursos da EAMPE.
// CONTRATO (implementação: agente "inaptos"): rota POST /api/email/inaptos-concurso { concursoId, candidatoIds: string[] }.
import type { Firestore } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';

export const enviarInaptosConcurso = async (_db: Firestore, _concursoId: unknown, _candidatoIds: unknown, _uid: string): Promise<{ enviados: number; para: string[]; cc: string[] }> => {
  throw new ErroContaGoogle('falha', 'E-mail de inaptos ainda não implementado.');
};
