// Ficheiro: services/afastamentos.ts
// Férias e afastamentos dos usuários da JRS (página Férias): coleção "afastamentos" no Firestore e os documentos
// (PDF/imagem) no Storage em afastamentos/{id}/. Leitura: Admin, médicos JRS/MPI e Secretaria; gravação: só o Admin
// (firestore.rules / storage.rules).
// Ao gravar: médicos (Admin, user_medicos, user_medicos_mpi) ganham um bloqueio de período na agenda das IS
// (bloqueiosAgenda, dia inteiro) com o evento no Google Agenda "JRS/HNRe"; a Secretaria ganha só o evento.
// Editar refaz bloqueio e evento; apagar remove tudo (bloqueio, evento e arquivos).
import { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseAuth';
import { novoId } from '../utils/dados';
import { registrarAcaoSensivel } from './auditoriaAcoes';
import { criarBloqueio, apagarBloqueio } from './firestoreInspecoes';
import { criarEventoBloqueioAgenda, removerEventoBloqueioAgenda } from './agendaGoogleIS';
import {
  dataFimDe, geraBloqueioNaAgenda, statusAoGravar, tituloEventoAfastamento,
  type StatusAfastamento, type TipoAfastamento,
} from '../utils/afastamentos';

const db = getFirestore(app);
const COL = 'afastamentos';

export interface ArquivoAfastamento { nome: string; caminho: string; tipo: string; tamanho: number }

export interface AfastamentoDoc {
  usuarioUid: string;
  /** Login (ex.: "CT MAURISTON"). */
  usuario: string;
  perfil: string;
  tipo: TipoAfastamento;
  /** AAAA-MM-DD */
  dataInicio: string;
  duracaoDias: number;
  /** AAAA-MM-DD (inclusive), calculada. */
  dataFim: string;
  /** Status gravado; o exibido é calculado (utils/afastamentos.ts: statusEfetivo). */
  status: StatusAfastamento;
  /** Ano de referência (férias). */
  referencia?: string;
  /** Motivo (LIC Adm). */
  motivo?: string;
  observacoes?: string;
  arquivos: ArquivoAfastamento[];
  /** Bloqueio na agenda das IS (só médicos). */
  bloqueioId?: string;
  /** Evento no Google Agenda (o do bloqueio, para médicos, ou o próprio, para a Secretaria). */
  eventoAgendaId?: string;
  /** Falso quando o Google Agenda não foi atualizado na última gravação. */
  agendaSincronizada?: boolean;
  criadoPor: string;
  criadoEm?: Timestamp | null;
  atualizadoEm?: Timestamp | null;
}
export type AfastamentoRecord = AfastamentoDoc & { id: string };

export const observarAfastamentos = (onData: (l: AfastamentoRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    collection(db, COL),
    snap => onData(snap.docs.map(d => ({ id: d.id, arquivos: [], ...(d.data() as AfastamentoDoc) })).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio) || a.usuario.localeCompare(b.usuario, 'pt-BR'))),
    err => onError?.(err),
  );

/** Envia um documento (PDF ou imagem, até 15 MB) para afastamentos/{id}/. */
export const enviarArquivoAfastamento = async (afastamentoId: string, arquivo: File): Promise<ArquivoAfastamento> => {
  if (arquivo.size > 15 * 1024 * 1024) throw new Error(`${arquivo.name}: o arquivo passa de 15 MB.`);
  if (!/^(application\/pdf|image\/)/.test(arquivo.type)) throw new Error(`${arquivo.name}: envie PDF ou imagem.`);
  const nomeSeguro = arquivo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80) || 'documento';
  const caminho = `${COL}/${afastamentoId}/${Date.now()}_${nomeSeguro}`;
  await uploadBytes(ref(getStorage(app), caminho), arquivo, { contentType: arquivo.type });
  return { nome: arquivo.name, caminho, tipo: arquivo.type, tamanho: arquivo.size };
};

export const urlArquivoAfastamento = (a: Pick<ArquivoAfastamento, 'caminho'>): Promise<string> => getDownloadURL(ref(getStorage(app), a.caminho));

export interface DadosAfastamento {
  usuarioUid: string; usuario: string; perfil: string;
  tipo: TipoAfastamento; dataInicio: string; duracaoDias: number;
  status: StatusAfastamento; referencia?: string; motivo?: string; observacoes?: string;
}

/** Remove bloqueio e evento antigos (edição/exclusão); falhas no Google Agenda não impedem a operação. */
const desfazerAgenda = async (a: Pick<AfastamentoDoc, 'bloqueioId' | 'eventoAgendaId'>) => {
  if (a.bloqueioId) await apagarBloqueio(a.bloqueioId).catch(() => { /* já removido */ });
  if (a.eventoAgendaId) await removerEventoBloqueioAgenda(a.eventoAgendaId).catch(() => { /* já removido */ });
};

/** Cria evento (todos) e bloqueio (médicos). Devolve os ids e se o Google Agenda foi atualizado. */
const montarAgenda = async (id: string, d: DadosAfastamento, dataFim: string, criadoPor: string) => {
  let eventoAgendaId: string | undefined;
  let agendaSincronizada = true;
  try {
    eventoAgendaId = await criarEventoBloqueioAgenda({ titulo: tituloEventoAfastamento(d.usuario, d.tipo, d.referencia, d.motivo), dataInicio: d.dataInicio, dataFim });
  } catch { agendaSincronizada = false; }
  let bloqueioId: string | undefined;
  if (geraBloqueioNaAgenda(d.perfil)) {
    bloqueioId = await criarBloqueio({
      data: d.dataInicio, dataFim, turno: 'dia', peritoUid: d.usuarioUid, peritoNome: d.usuario,
      motivo: tituloEventoAfastamento('', d.tipo, d.referencia, d.motivo).replace(/^ - /, ''),
      eventoAgendaId, criadoPor, afastamentoId: id,
    });
  }
  return { bloqueioId, eventoAgendaId, agendaSincronizada };
};

const limpar = (o: Record<string, unknown>) => { Object.keys(o).forEach(k => { if (o[k] === undefined) delete o[k]; }); return o; };

/** Cria o afastamento (com os arquivos já enviados) e a agenda. `hoje` = AAAA-MM-DD. */
export const criarAfastamento = async (id: string, d: DadosAfastamento, arquivos: ArquivoAfastamento[], criadoPor: string, hoje: string): Promise<{ agendaSincronizada: boolean }> => {
  const dataFim = dataFimDe(d.dataInicio, d.duracaoDias);
  if (!dataFim) throw new Error('Informe a data de início e a duração.');
  const agenda = await montarAgenda(id, d, dataFim, criadoPor);
  await setDoc(doc(db, COL, id), limpar({
    ...d, dataFim, status: statusAoGravar({ dataInicio: d.dataInicio, dataFim, status: d.status }, hoje),
    referencia: d.tipo === 'ferias' ? d.referencia || undefined : undefined,
    motivo: d.tipo === 'lic_adm' ? d.motivo || undefined : undefined,
    arquivos, ...agenda, criadoPor, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
  }));
  void registrarAcaoSensivel('afastamento.criar', id);
  return { agendaSincronizada: agenda.agendaSincronizada };
};

/** Atualiza; se mudar usuário, tipo ou período, refaz bloqueio e evento. */
export const atualizarAfastamento = async (atual: AfastamentoRecord, d: DadosAfastamento, arquivos: ArquivoAfastamento[], criadoPor: string, hoje: string): Promise<{ agendaSincronizada: boolean }> => {
  const dataFim = dataFimDe(d.dataInicio, d.duracaoDias);
  if (!dataFim) throw new Error('Informe a data de início e a duração.');
  const mudouAgenda = atual.usuarioUid !== d.usuarioUid || atual.tipo !== d.tipo || atual.dataInicio !== d.dataInicio || atual.dataFim !== dataFim
    || (atual.referencia || '') !== (d.referencia || '') || (atual.motivo || '') !== (d.motivo || '');
  let agenda: { bloqueioId?: string; eventoAgendaId?: string; agendaSincronizada: boolean } = {
    bloqueioId: atual.bloqueioId, eventoAgendaId: atual.eventoAgendaId, agendaSincronizada: atual.agendaSincronizada !== false,
  };
  if (mudouAgenda) {
    await desfazerAgenda(atual);
    agenda = await montarAgenda(atual.id, d, dataFim, criadoPor);
  }
  // Arquivos removidos na edição saem do Storage.
  const ficam = new Set(arquivos.map(a => a.caminho));
  await Promise.all((atual.arquivos || []).filter(a => !ficam.has(a.caminho)).map(a => deleteObject(ref(getStorage(app), a.caminho)).catch(() => { /* já removido */ })));
  await updateDoc(doc(db, COL, atual.id), {
    ...d, dataFim, status: statusAoGravar({ dataInicio: d.dataInicio, dataFim, status: d.status }, hoje),
    referencia: d.tipo === 'ferias' ? d.referencia || '' : '', motivo: d.tipo === 'lic_adm' ? d.motivo || '' : '',
    observacoes: d.observacoes || '', arquivos,
    bloqueioId: agenda.bloqueioId ?? null, eventoAgendaId: agenda.eventoAgendaId ?? null, agendaSincronizada: agenda.agendaSincronizada,
    atualizadoEm: serverTimestamp(),
  } as Record<string, unknown>);
  void registrarAcaoSensivel('afastamento.alterar', atual.id);
  return { agendaSincronizada: agenda.agendaSincronizada };
};

/** Apaga o afastamento, o bloqueio, o evento e os arquivos. */
export const apagarAfastamento = async (a: AfastamentoRecord): Promise<void> => {
  await desfazerAgenda(a);
  await Promise.all((a.arquivos || []).map(f => deleteObject(ref(getStorage(app), f.caminho)).catch(() => { /* já removido */ })));
  await deleteDoc(doc(db, COL, a.id));
  void registrarAcaoSensivel('afastamento.apagar', a.id);
};

export const novoIdAfastamento = (): string => novoId();
