// Ficheiro: services/emailAgendaIS.ts
// E-mail "IS AGENDADAS EM dd/mm/aaaa" (servidor/email/agendaIS.ts): envio manual pelo Admin (página Inspeções
// de Saúde) e leitura do registro dos envios (emailsAgendaIS/{AAAA-MM-DD}, só o Admin lê; só o servidor grava).
// O envio automático das 18h é do Cloud Scheduler, sem o app.
import { getFirestore, collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { ApiError, chamarServidor } from './apiClient';

const db = getFirestore(app);

export interface RegistroEmailAgenda {
  data: string;
  envios: number;
  totalIS: number;
  totalConcursos: number;
  ultimoEnvioEm: Timestamp | null;
  envioAutomaticoEm?: Timestamp | null;
}

/** Registros de envio por data (AAAA-MM-DD). */
export const observarEnviosAgendaIS = (onData: (porData: Map<string, RegistroEmailAgenda>) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    collection(db, 'emailsAgendaIS'),
    snap => onData(new Map(snap.docs.map(d => [d.id, { data: d.id, envios: 0, totalIS: 0, totalConcursos: 0, ultimoEnvioEm: null, ...(d.data() as Partial<RegistroEmailAgenda>) }]))),
    err => onError?.(err),
  );

export interface ResultadoEnvioAgenda { data: string; para: string[]; cc: string[]; totalIS: number; totalConcursos: number; reenvio: boolean }

/** Envia agora o e-mail das IS agendadas em `data` (AAAA-MM-DD). Só o Admin. */
export const enviarEmailAgendaIS = async (data: string): Promise<ResultadoEnvioAgenda> => {
  try {
    const { success: _s, ...r } = await chamarServidor<ResultadoEnvioAgenda & { success: boolean }>('/api/email/agenda-is', { data }, { timeoutMs: 180_000 });
    return r;
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Autorize-a em Usuários.', 503);
    if (e instanceof ApiError && e.status === 404) throw new ApiError('negocio', 'O servidor ainda não tem o envio da agenda por e-mail. Tente de novo após a próxima publicação.', 404);
    throw e;
  }
};
