// Ficheiro: services/firestoreCasos.ts
// Resultado do teste "Casos Periciais" (Extras) no Firestore. Id do
// documento = UID do Firebase Authentication, um único resultado (o mais
// recente) por usuário — ver firestore.rules para as regras de acesso.
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from './firebaseAuth';

const db = getFirestore(app);
const COLLECTION = 'casos_periciais_resultados';

export interface CasosResultado {
  respostas: string[];
  acertos: number;
  total: number;
  nota: number;
  concluidoEm: string;
}

export const getCasosResultado = async (uid: string): Promise<CasosResultado | null> => {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  return snap.data() as CasosResultado;
};

export const saveCasosResultado = (uid: string, data: CasosResultado) =>
  setDoc(doc(db, COLLECTION, uid), data);
