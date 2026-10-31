// Ficheiro: services/firestorePareceres.ts
// Pedidos de Parecer Médico (coleção "pareceres": um documento por pedido,
// id automático). Fica na raiz — e não numa subcoleção do militar — para
// listar/filtrar todos de uma vez e para sobreviver à exclusão do cadastro;
// o vínculo com o militar é "militarId" (= NIP só dígitos, id em "militares"),
// o mesmo que a Perícia Menor poderá usar. Dados do militar (inspecionado)
// são copiados para o pedido, que é um documento histórico.
//
// Status gravado: "solicitado" ou "concluido". "Atrasado" não é gravado — é
// derivado (solicitado há 20 dias ou mais), pois nada atualizaria um valor
// gravado com o passar do tempo.
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { camposIdDrive } from '@/utils/googleDrive';
import { app } from './firebaseAuth';

const db = getFirestore(app);
const COL = 'pareceres';
export const PRAZO_ATRASO_DIAS = 20;

export type StatusParecer = 'solicitado' | 'atrasado' | 'concluido';

export interface ParecerDoc {
  militarId: string;
  /** "POSTO (QUADRO) NIP NOME" — o texto que vai para o pedido. */
  inspecionado: string;
  especialidade: string;
  finalidade: string;
  historico: string;
  quesitos: string[];
  pdfUrl: string;
  /** ID do arquivo no Drive (quando pdfUrl é do Drive); ausente nos pareceres antigos. */
  pdfFileId?: string;
  status: 'solicitado' | 'concluido';
  solicitanteUid: string;
  solicitanteNome: string;
  /** Login do solicitante (ex.: "CT MAURISTON") — o que a tabela mostra. Pedidos antigos podem não ter. */
  solicitanteUsuario?: string;
  solicitantePosto: string;
  criadoEm: Timestamp | null;
  concluidoEm?: Timestamp | null;
  concluidoPor?: string;
}
export type ParecerRecord = ParecerDoc & { id: string };

export const novoIdParecer = (): string => doc(collection(db, COL)).id;

export const statusEfetivo = (p: Pick<ParecerDoc, 'status' | 'criadoEm'>, agora = Date.now()): StatusParecer => {
  if (p.status === 'concluido') return 'concluido';
  const criado = p.criadoEm?.toMillis?.() ?? agora;
  return agora - criado >= PRAZO_ATRASO_DIAS * 86_400_000 ? 'atrasado' : 'solicitado';
};

export const observarPareceres = (onData: (lista: ParecerRecord[]) => void, onError?: (e: Error) => void, max?: number) =>
  onSnapshot(
    max ? query(collection(db, COL), orderBy('criadoEm', 'desc'), limit(max)) : collection(db, COL),
    snap => onData(snap.docs
      .map(d => ({ id: d.id, ...(d.data() as ParecerDoc) }))
      // Documento incompleto (ex.: apagado pela metade direto no console do Firestore) fica de
      // fora: todas as telas assumem o texto do inspecionado e quebrariam sem ele.
      .filter(p => typeof p.inspecionado === 'string' && p.inspecionado !== '')
      .sort((a, b) => (b.criadoEm?.toMillis?.() ?? Date.now()) - (a.criadoEm?.toMillis?.() ?? Date.now()))),
    err => onError?.(err),
  );

export const registrarParecer = (id: string, dados: Omit<ParecerDoc, 'criadoEm' | 'status'>) =>
  setDoc(doc(db, COL, id), { ...dados, ...camposIdDrive(dados.pdfUrl), status: 'solicitado', criadoEm: serverTimestamp() });

export const marcarConcluido = (id: string, concluido: boolean, porNome: string) =>
  updateDoc(doc(db, COL, id), concluido
    ? { status: 'concluido', concluidoEm: serverTimestamp(), concluidoPor: porNome }
    : { status: 'solicitado', concluidoEm: null, concluidoPor: '' });
