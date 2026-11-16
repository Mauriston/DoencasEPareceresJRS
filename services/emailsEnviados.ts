// Ficheiro: services/emailsEnviados.ts
// Leitura dos e-mails enviados com conteúdo (aba Emails da Ficha — contrato em utils/emailsEnviados.ts):
//  - observarEmailsDoInspecionado: emails_enviados where nips array-contains NIP (tempo real; a ordem é feita no
//    app, sem índice composto);
//  - lerCorpoEmail: emails_enviados/{id}/conteudo/corpo (HTML e texto), só quando o e-mail é aberto.
// Só a equipe lê (firestore.rules); só o servidor grava.
import { getFirestore, collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { COL_EMAILS_ENVIADOS, DOC_CORPO, SUB_CONTEUDO, type CorpoEmailEnviado, type EmailEnviado } from '../utils/emailsEnviados';

const db = getFirestore(app);

export type EmailEnviadoRecord = EmailEnviado & { id: string };

export const observarEmailsDoInspecionado = (
  nip: string,
  onData: (lista: EmailEnviadoRecord[]) => void,
  onError?: (e: Error) => void,
) => onSnapshot(
  query(collection(db, COL_EMAILS_ENVIADOS), where('nips', 'array-contains', String(nip).replace(/\D/g, ''))),
  snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as EmailEnviado) }))),
  err => onError?.(err),
);

export const lerCorpoEmail = async (id: string): Promise<CorpoEmailEnviado | null> => {
  const snap = await getDoc(doc(db, COL_EMAILS_ENVIADOS, id, SUB_CONTEUDO, DOC_CORPO));
  return snap.exists() ? (snap.data() as CorpoEmailEnviado) : null;
};
