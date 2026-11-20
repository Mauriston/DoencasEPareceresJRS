// Ficheiro: services/feedback.ts
// Feedback do app (Ajuda › Feedback): envio e mudança de situação pelo servidor (servidor/feedback/feedback.ts —
// grava, e-mails ao usuário); a lista do Admin vem direto do Firestore (feedbacks: só o Admin lê).
import { getFirestore, collection, onSnapshot, query, orderBy, limit, type Timestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { chamarServidor } from './apiClient';
import type { EntradaFeedback, ImpactoProblema, TipoFeedback } from '../utils/feedback';

const db = getFirestore(app);

export interface FeedbackRecord {
  id: string;
  tipo: TipoFeedback;
  mensagem: string;
  pagina?: string;
  paginaRotulo?: string;
  impacto?: ImpactoProblema;
  uid: string;
  perfil: string;
  usuario: string;
  email: string;
  contexto?: { navegador?: string; tela?: string; versao?: string };
  criadoEm?: Timestamp | null;
  criadoEmTexto?: string;
  lido?: boolean;
  solucionado?: boolean;
  emailSolucaoEnviadoEm?: Timestamp | null;
}

export const enviarFeedback = (e: EntradaFeedback & { paginaRotulo?: string }) =>
  chamarServidor<{ id: string; emailEnviado: boolean }>('/api/feedback', {
    ...e,
    contexto: {
      navegador: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      tela: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
    },
  });

/** Lido (sugestão/elogio) ou Solucionado (problema) — só o Admin. */
export const marcarFeedback = (id: string, marcado: boolean) =>
  chamarServidor<{ emailEnviado: boolean; semEmail?: boolean }>('/api/feedback/status', { id, marcado });

export const observarFeedbacks = (onData: (l: FeedbackRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    query(collection(db, 'feedbacks'), orderBy('criadoEm', 'desc'), limit(500)),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FeedbackRecord, 'id'>) }))),
    err => onError?.(err),
  );
