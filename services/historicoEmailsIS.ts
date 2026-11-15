// Ficheiro: services/historicoEmailsIS.ts
// Leitura (tempo real) do histórico de e-mails enviados de uma IS: inspecoes/{isId}/emails, gravado só pelo
// servidor (servidor/email/registroEmailsIS.ts → registrarEmailIS); lê quem acessa as IS (firestore.rules).
// Mais recente primeiro. Contrato do documento em utils/registroEmailsIS.ts.
import { getFirestore, collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { app } from './firebaseAuth';
import type { RegistroEmailIS } from '../utils/registroEmailsIS';

const db = getFirestore(app);

export type RegistroEmailISRecord = RegistroEmailIS & { id: string };

export const observarEmailsDaIS = (
  isId: string,
  onData: (lista: RegistroEmailISRecord[]) => void,
  onError?: (e: Error) => void,
) => onSnapshot(
  query(collection(db, 'inspecoes', String(isId), 'emails'), orderBy('enviadoEmMs', 'desc')),
  snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as RegistroEmailIS) }))),
  err => onError?.(err),
);
