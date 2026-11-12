// Ficheiro: services/configEmails.ts
// Configuração dos e-mails automáticos (documento config/emails; contrato em config/emails.ts): leitura em
// tempo real e gravação pela página Configurações. Regras: leitura para autenticados, gravação só do Admin
// (firestore.rules, match /config/{docId}). O servidor lê o documento a cada envio (servidor/email/comum.ts).
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { registrarAcaoSensivel } from './auditoriaAcoes';
import { mesclarConfigEmails, type ConfigEmails } from '../config/emails';

const db = getFirestore(app);
const REF = doc(db, 'config', 'emails');

/** Configuração efetiva (documento salvo mesclado aos padrões). */
export const observarConfigEmails = (onData: (config: ConfigEmails) => void, onError?: (e: Error) => void) =>
  onSnapshot(REF, snap => onData(mesclarConfigEmails(snap.exists() ? snap.data() : undefined)), err => onError?.(err));

/** Grava a configuração completa (todas as listas), com quem e quando. */
export const salvarConfigEmails = async (config: ConfigEmails, usuario: string): Promise<void> => {
  await setDoc(REF, { ...config, atualizadoEm: serverTimestamp(), atualizadoPor: usuario || '' }, { merge: true });
  void registrarAcaoSensivel('config.alterar', 'emails');
};
