// Ficheiro: services/firestoreInspecoes.ts
// Inspeções de Saúde (IS) no Firestore:
//  - "inspecoes": um documento por IS; id = número da IS (só dígitos), o que garante número único.
//    Liga ao inspecionado por "inspecionadoId" (= NIP só dígitos, id em "militares"); o texto
//    INSPECIONADO é copiado para a IS (documento histórico).
//  - "agendaSlots": um documento por horário ocupado ({perito}__{AAAA-MM-DD}T{hh-mm}); a gravação
//    do agendamento é uma transação que reserva o slot e libera o anterior, então dois usuários
//    nunca ocupam o mesmo horário do mesmo perito.
//  - "bloqueiosAgenda": bloqueios de horário/turno (de todos os peritos ou de um perito).
//  - config/agendaIS: turnos em que cada perito atende, por dia da semana (só o Admin grava).
import {
  getFirestore, collection, doc, query, where, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { app } from './firebaseAuth';
import { registrarAcaoSensivel } from './auditoriaAcoes';
import {
  chaveSlot, chavesOcupadas, duracaoDoGrupo, situacaoDoStatus, TODOS_PERITOS,
  type BloqueioAgenda, type ConfigAgenda, type SituacaoIS, type StatusIS, type Turno,
} from '@/utils/inspecoes';

const db = getFirestore(app);
const COL = 'inspecoes';
const COL_SLOTS = 'agendaSlots';
const COL_BLOQUEIOS = 'bloqueiosAgenda';
const CONFIG_REF = doc(db, 'config', 'agendaIS');

export type AmpIS = 'JRS' | 'MPI';

export interface InspecaoDoc {
  /** Número da IS (o mesmo do id do documento). */
  is: number;
  /** AAAA-MM-DD */
  dataAbertura: string;
  /** AAAA-MM-DDThh:mm ou '' quando ainda não agendada. */
  dataEntrevista: string;
  finalidade: string;
  /** Grupo da finalidade (ex.: "Benefícios") — define o prazo de atraso (60 dias) e a competência. */
  grupoFinalidade: string;
  amp: AmpIS;
  peritoUid: string;
  /** Login do perito (o que as telas mostram). */
  peritoNome: string;
  /** Gmail do perito: convidado do evento no Google Agenda. */
  peritoGmail: string;
  inspecionadoId: string;
  /** "POSTO (QUADRO) NIP NOME" */
  inspecionado: string;
  situacao: SituacaoIS;
  status: StatusIS;
  dataLaudo: string;
  laudo: string;
  observacoes: string;
  restricoes: string;
  /** Nº do TIS: AAA.000.N… (AAA = 3 últimos dígitos do ano; depois do 2º ponto, 1 ou mais dígitos) */
  tis: string;
  ds1a: string;
  /** Texto da minuta de cancelamento (IS atrasada cancelada). */
  minutaCancelamento?: string;
  /** Id do evento no Google Agenda "JRS/HNRe" (quando sincronizado). */
  eventoAgendaId?: string;
  /** Falso quando a última sincronização com o Google Agenda falhou. */
  agendaSincronizada?: boolean;
  criadoPor: string;
  criadoEm: Timestamp | null;
  atualizadoEm?: Timestamp | null;
}
export type InspecaoRecord = InspecaoDoc & { id: string };

export const observarInspecoes = (onData: (lista: InspecaoRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    collection(db, COL),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as InspecaoDoc) })).sort((a, b) => b.is - a.is)),
    err => onError?.(err),
  );

/** IS de um inspecionado (id = NIP só dígitos), da mais recente para a mais antiga — histórico da ficha em Inspecionados. */
export const observarInspecoesDoInspecionado = (inspecionadoId: string, onData: (lista: InspecaoRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    query(collection(db, COL), where('inspecionadoId', '==', inspecionadoId)),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as InspecaoDoc) })).sort((a, b) => b.is - a.is)),
    err => onError?.(err),
  );

export const idDaIs = (numero: string | number): string => String(numero).replace(/\D/g, '').replace(/^0+(?=\d)/, '');

type SlotReserva = { peritoUid: string; dataEntrevista: string; grupoFinalidade: string };
/** Documentos de slot tocados por uma entrevista (30 min = 2 slots; 60 min = 3). */
const refsSlots = (r: SlotReserva) => chavesOcupadas(r.peritoUid, r.dataEntrevista, duracaoDoGrupo(r.grupoFinalidade)).map(k => doc(db, COL_SLOTS, k));

/**
 * Grava a IS (criação ou alteração) reservando o slot novo e liberando o antigo, tudo numa transação.
 * `criar` recusa número de IS já existente.
 */
const gravarComSlot = async (
  id: string,
  dados: Record<string, unknown>,
  slotNovo: SlotReserva | null,
  slotAntigo: SlotReserva | null,
  criar: boolean,
) => {
  const refIs = doc(db, COL, id);
  await runTransaction(db, async tx => {
    const existente = await tx.get(refIs);
    if (criar && existente.exists()) throw new Error(`Já existe a IS nº ${id}.`);
    if (!criar && !existente.exists()) throw new Error('IS não encontrada.');
    // Todas as leituras antes das gravações: nenhum slot novo pode estar com outra IS.
    const refsNovos = slotNovo ? refsSlots(slotNovo) : [];
    const docsNovos = await Promise.all(refsNovos.map(r => tx.get(r)));
    if (docsNovos.some(d => d.exists() && d.data().inspecaoId !== id)) throw new Error('Esse horário acabou de ser ocupado por outra IS. Escolha outro horário.');

    const idsNovos = new Set(refsNovos.map(r => r.id));
    refsNovos.forEach(r => tx.set(r, { inspecaoId: id, peritoUid: slotNovo!.peritoUid, dataEntrevista: slotNovo!.dataEntrevista, atualizadoEm: serverTimestamp() }));
    // Libera os slots da reserva anterior que a nova não usa mais.
    if (slotAntigo) refsSlots(slotAntigo).filter(r => !idsNovos.has(r.id)).forEach(r => tx.delete(r));
    if (criar) tx.set(refIs, { ...dados, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
    else tx.update(refIs, { ...dados, atualizadoEm: serverTimestamp() });
  });
};

export type NovaInspecao = Omit<InspecaoDoc, 'situacao' | 'status' | 'criadoEm' | 'atualizadoEm' | 'is'> & { is: number };

/** Cria a IS: "Aberta", ou "Agendada" quando já nasce com a data da entrevista. */
export const criarInspecao = async (dados: NovaInspecao): Promise<string> => {
  const id = idDaIs(dados.is);
  if (!id) throw new Error('Informe o número da IS.');
  const status: StatusIS = dados.dataEntrevista ? 'agendada' : 'aberta';
  const completo = { ...dados, is: Number(id), status, situacao: situacaoDoStatus(status) };
  await gravarComSlot(id, completo, dados.dataEntrevista ? { peritoUid: dados.peritoUid, dataEntrevista: dados.dataEntrevista, grupoFinalidade: dados.grupoFinalidade } : null, null, true);
  return id;
};

/** Atualiza campos que não mexem na agenda (laudo, restrições, TIS, DS-1a, observações, status…). */
export const atualizarInspecao = (id: string, patch: Partial<InspecaoDoc>) =>
  updateDoc(doc(db, COL, id), { ...patch, ...(patch.status ? { situacao: situacaoDoStatus(patch.status) } : {}), atualizadoEm: serverTimestamp() } as Record<string, unknown>);

/** Marca o resultado da sincronização com o Google Agenda. */
export const registrarSincronizacaoAgenda = (id: string, patch: { eventoAgendaId?: string; agendaSincronizada: boolean }) =>
  updateDoc(doc(db, COL, id), patch as Record<string, unknown>);

export interface Agendamento {
  peritoUid: string;
  peritoNome: string;
  peritoGmail: string;
  amp: AmpIS;
  dataEntrevista: string;
}

/**
 * Agenda ou reagenda: grava perito + data/hora, reserva o slot novo, libera o antigo e ajusta o status
 * (Agendada na primeira vez; Reagendada se já havia data ou se faltou).
 */
export const agendarInspecao = async (atual: InspecaoRecord, novo: Agendamento): Promise<StatusIS> => {
  const status: StatusIS = atual.dataEntrevista || atual.status === 'faltou' ? 'reagendada' : 'agendada';
  const slotAntigo = atual.dataEntrevista ? { peritoUid: atual.peritoUid, dataEntrevista: atual.dataEntrevista, grupoFinalidade: atual.grupoFinalidade } : null;
  await gravarComSlot(atual.id, { ...novo, status, situacao: situacaoDoStatus(status) }, { peritoUid: novo.peritoUid, dataEntrevista: novo.dataEntrevista, grupoFinalidade: atual.grupoFinalidade }, slotAntigo, false);
  return status;
};

/** Cancela a IS (situação Finalizada) e libera o horário reservado. */
export const cancelarInspecao = async (atual: InspecaoRecord, minuta: string): Promise<void> => {
  const slotAntigo = atual.dataEntrevista ? { peritoUid: atual.peritoUid, dataEntrevista: atual.dataEntrevista, grupoFinalidade: atual.grupoFinalidade } : null;
  await gravarComSlot(atual.id, {
    status: 'cancelada', situacao: situacaoDoStatus('cancelada'), minutaCancelamento: minuta,
  }, null, slotAntigo, false);
};

/** Apaga a IS (só Admin) e libera o horário. */
export const apagarInspecao = async (atual: InspecaoRecord): Promise<void> => {
  if (atual.dataEntrevista) await Promise.all(refsSlots(atual).map(r => deleteDoc(r).catch(() => { /* slot já liberado */ })));
  await deleteDoc(doc(db, COL, atual.id));
  void registrarAcaoSensivel('inspecao.excluir', 'inspecoes');
};

export const inspecaoExiste = async (id: string): Promise<boolean> => (await getDoc(doc(db, COL, id))).exists();

// ---------------------------------------------------------------------------
// Bloqueios da agenda
// ---------------------------------------------------------------------------

export const observarBloqueios = (onData: (lista: BloqueioAgenda[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    collection(db, COL_BLOQUEIOS),
    snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BloqueioAgenda, 'id'>) })).sort((a, b) => a.data.localeCompare(b.data) || (a.hora ?? '').localeCompare(b.hora ?? ''))),
    err => onError?.(err),
  );

export interface NovoBloqueio {
  data: string;
  /** Bloqueio de período: último dia. */
  dataFim?: string;
  /** Evento de dia inteiro já criado no Google Agenda (só período). */
  eventoAgendaId?: string;
  turno: Turno | 'dia';
  hora?: string;
  peritoUid: string;
  peritoNome?: string;
  motivo: string;
  criadoPor: string;
}

export const criarBloqueio = async (b: NovoBloqueio): Promise<void> => {
  const dados: Record<string, unknown> = { ...b, criadoEm: serverTimestamp() };
  Object.keys(dados).forEach(k => { if (dados[k] === undefined) delete dados[k]; });
  await addDoc(collection(db, COL_BLOQUEIOS), dados);
};

export const apagarBloqueio = (id: string) => deleteDoc(doc(db, COL_BLOQUEIOS, id));

export { TODOS_PERITOS };

// ---------------------------------------------------------------------------
// Turnos de atendimento dos peritos (Admin)
// ---------------------------------------------------------------------------

export const observarConfigAgenda = (onData: (config: ConfigAgenda) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    CONFIG_REF,
    snap => onData(snap.exists() ? ((snap.data().peritos ?? {}) as ConfigAgenda) : {}),
    err => onError?.(err),
  );

export const salvarConfigAgenda = (peritos: ConfigAgenda) => setDoc(CONFIG_REF, { peritos, atualizadoEm: serverTimestamp() });
