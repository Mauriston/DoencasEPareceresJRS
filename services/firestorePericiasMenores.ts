// Ficheiro: services/firestorePericiasMenores.ts
// Perícias Menores (coleção "periciasMenores": um documento por perícia, id automático).
// Migradas da aba "Pericia_Menor" da planilha (scripts/migrar-pericias-menores.mjs). O vínculo
// com o militar é "militarId" (= NIP só dígitos, id em "militares"); os dados do inspecionado
// são copiados para a perícia, que é um documento histórico. O PDF do atestado fotografado
// fica no Storage (periciasMenores/{id}.pdf).
//
// Status NÃO é gravado: é derivado de "dataTermino" (dataAtestado + tempoHomologado - 1),
// pois nada atualizaria um valor gravado com o passar do tempo.
import { getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseAuth';

const db = getFirestore(app);
const COL = 'periciasMenores';

export interface PericiaMenorDoc {
  militarId: string;
  /** "POSTO (QUADRO) NIP NOME". */
  inspecionado: string;
  om: string;
  /** Serviço do HNRe do militar no momento do registro ("Nome (HNRe-00.0)"); só para militares da OM HNRe. */
  servico?: string;
  /** "G432 - Estado de mal enxaquecoso". */
  cid: string;
  dispensas: string[];
  /** AAAA-MM-DD. */
  dataAtestado: string;
  tempoAtestado: number;
  tempoHomologado: number;
  /** AAAA-MM-DD = dataAtestado + tempoHomologado - 1. */
  dataTermino: string;
  vdf: boolean;
  /** Médico que registrou a perícia (login do usuário, ex.: "CT MAURISTON"). */
  peritoUsuario: string;
  peritoNome: string;
  peritoUid: string;
  /** URL de visualização do PDF do atestado (Storage ou, nas migradas, Drive); vazio se não houver. */
  pdfUrl: string;
  criadoEm: Timestamp | null;
}
export type PericiaMenorRecord = PericiaMenorDoc & { id: string };
export type StatusPericia = 'vigente' | 'concluida';

/** Chave do militar nas rotas e agrupamentos: o NIP (militarId) ou, sem vínculo, o texto do inspecionado. */
export const chaveMilitar = (p: Pick<PericiaMenorDoc, 'militarId' | 'inspecionado'>): string => p.militarId || p.inspecionado;

export const novoIdPericiaMenor = (): string => doc(collection(db, COL)).id;

const dataLocalISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** DATA_TERMINO = DATA_ATESTADO + TEMPO_HOMOLOGADO - 1 (o dia do atestado conta como o 1º dia). */
export const calcularDataTermino = (dataAtestado: string, tempoHomologado: number): string => {
  const [a, m, d] = dataAtestado.split('-').map(Number);
  if (!a || !m || !d || !(tempoHomologado > 0)) return '';
  return dataLocalISO(new Date(a, m - 1, d + tempoHomologado - 1));
};

/** Vigente enquanto hoje não passou da data de término; depois, Concluída. */
export const statusPericia = (p: Pick<PericiaMenorDoc, 'dataTermino'>, hoje: string = dataLocalISO(new Date())): StatusPericia =>
  p.dataTermino && p.dataTermino >= hoje ? 'vigente' : 'concluida';

/** AAAA-MM-DD → DD/MM/AAAA. */
export const dataBR = (iso: string): string => {
  const [a, m, d] = (iso || '').split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
};

export const observarPericiasMenores = (onData: (lista: PericiaMenorRecord[]) => void, onError?: (e: Error) => void, max?: number) =>
  onSnapshot(
    max ? query(collection(db, COL), orderBy('dataAtestado', 'desc'), limit(max)) : collection(db, COL),
    snap => onData(snap.docs
      .map(d => ({ id: d.id, ...(d.data() as PericiaMenorDoc) }))
      .sort((a, b) => b.dataAtestado.localeCompare(a.dataAtestado))),
    err => onError?.(err),
  );

/** Perícias de um militar (pelo militarId = NIP só dígitos), da mais recente para a mais antiga. */
export const observarPericiasDoMilitar = (militarId: string, onData: (lista: PericiaMenorRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    query(collection(db, COL), where('militarId', '==', militarId)),
    snap => onData(snap.docs
      .map(d => ({ id: d.id, ...(d.data() as PericiaMenorDoc) }))
      .sort((a, b) => b.dataAtestado.localeCompare(a.dataAtestado))),
    err => onError?.(err),
  );

/** Envia o PDF ao Storage e devolve a URL de download. */
export const enviarPdfPericiaMenor = async (id: string, pdf: Blob): Promise<string> => {
  const r = ref(getStorage(app), `${COL}/${id}.pdf`);
  await uploadBytes(r, pdf, { contentType: 'application/pdf' });
  return getDownloadURL(r);
};

export type NovaPericiaMenor = Omit<PericiaMenorDoc, 'criadoEm' | 'dataTermino'>;

export const registrarPericiaMenor = (id: string, dados: NovaPericiaMenor) =>
  setDoc(doc(db, COL, id), { ...dados, dataTermino: calcularDataTermino(dados.dataAtestado, dados.tempoHomologado), criadoEm: serverTimestamp() });
