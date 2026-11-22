// Ficheiro: services/modelosMinutaMSG.ts
// Modelos das Minutas MSG em config/minutasMSG.{tipo} (todos leem; só o Admin grava — firestore.rules, match /config).
// O App assina o documento ao entrar (iniciarModelosMSG) e as funções de minuta passam a usar o modelo salvo.
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { definirModelosMSG, type TipoModeloMSG } from '../utils/modelosMinutaMSG';

const db = getFirestore(app);
const ref = () => doc(db, 'config', 'minutasMSG');

export const observarModelosMSG = (cb: (cru: Record<string, Record<string, unknown>>) => void, onErro?: (e: Error) => void) =>
  onSnapshot(ref(), s => cb((s.data() || {}) as Record<string, Record<string, unknown>>), e => onErro?.(e));

/** Assina os modelos e os deixa ativos para as minutas; devolve o cancelamento da assinatura. */
export const iniciarModelosMSG = (): (() => void) =>
  observarModelosMSG(cru => definirModelosMSG(cru), () => definirModelosMSG(null));

/** Grava os campos de UM modelo (merge; os outros ficam). */
export const salvarModeloMSG = (tipo: TipoModeloMSG, campos: Record<string, string>, usuario: string) =>
  setDoc(ref(), { [tipo]: { ...campos, alteradoPor: usuario, alteradoEm: serverTimestamp() } }, { merge: true });
