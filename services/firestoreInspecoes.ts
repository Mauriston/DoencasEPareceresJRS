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
  getFirestore, collection, doc, query, where, getDoc, setDoc, updateDoc, deleteDoc, deleteField, onSnapshot, runTransaction, serverTimestamp, Timestamp, writeBatch,
} from 'firebase/firestore';
import { novoId } from '../utils/dados';
import { app } from './firebaseAuth';
import { registrarAcaoSensivel } from './auditoriaAcoes';
import { registrarUsoAcao } from './usoDiario';
import { registrarEventoInspecionado } from './eventosInspecionado';
import { notificarAcao } from './notificacoesPush';
import { apagarGuiasExames } from './guiasExames';
import { ApiError, chamarServidor } from './apiClient';
import { patchEntregaGuias, type EstadoEntregaGuias } from '../utils/guiasExamesIS';
import type { AfastamentoIS, ProcessamentoAfastamentosIS } from '../utils/afastamentosIS';
import { logErroSeguro } from '../utils/logSeguro';
import { chaveDispensa, type EmailsDispensados, type TipoEmailPendente } from '../utils/emailsDispensados';
import {
  chaveSlot, chavesOcupadas, duracaoDoGrupo, situacaoDoStatus, statusAoAgendar, TODOS_PERITOS,
  type BloqueioAgenda, type ConfigAgenda, type SituacaoIS, type StatusIS, type Turno,
} from '../utils/inspecoes';

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
  /** E-mail do resultado ao inspecionado (gravado pelo servidor — servidor/email/resultadoIS.ts). */
  emailResultadoPara?: string;
  emailResultadoEnviadoEm?: Timestamp | null;
  emailResultadoEnviadoPor?: string;
  /** E-mail de agendamento ao inspecionado (servidor/email/agendamentoIS.ts): a data/hora a que se refere o envio. */
  emailAgendamentoPara?: string;
  emailAgendamentoDataEntrevista?: string;
  emailAgendamentoEnviadoEm?: Timestamp | null;
  /** Comunicação de falta (HNRe; servidor/email/faltasHNRe.ts): a data da entrevista a que se refere o envio. */
  emailFaltaDataEntrevista?: string;
  emailFaltaEnviadoEm?: Timestamp | null;
  /** E-mail ao NAC (IS finalizada de Verificações e Términos; servidor/email/nac.ts). */
  emailNacEnviadoEm?: Timestamp | null;
  emailNacEnviadoPor?: string;
  /** E-mails tirados da lista de pendências sem envio ("Limpar", só Admin — utils/emailsDispensados.ts). */
  emailsDispensados?: EmailsDispensados | null;
  // ----- Guias de exames (só finalidades com exames mínimos no Anexo O; utils/guiasExames.ts) -----
  /** Guias em PDF geradas no servidor (servidor/documentos/guiasExames/; Storage inspecoes/{id}/guias/guias-exames.pdf). */
  guiasExames?: GuiasExamesIS | null;
  /** Guias entregues ao inspecionado (caixa "Guias entregues ao inspecionado?" ou envio por e-mail). */
  guiasEntregues?: boolean;
  /** AAAA-MM-DD da entrega (data de hoje ao marcar; data do envio quando por e-mail). */
  guiasEntreguesEm?: string;
  guiasEntreguesVia?: 'presencial' | 'email';
  guiasEntreguesPor?: string;
  /** Último envio das guias por e-mail (inspecionado e/ou SEC-JRS): define "Enviar" × "Reenviar por e-mail". */
  emailGuiasEnviadoEm?: Timestamp | null;
  /** Último envio das guias por e-mail AO INSPECIONADO (servidor/email/guiasIS.ts). */
  emailGuiasInspecionadoEm?: Timestamp | null;
  /** E-mail de abertura ao inspecionado (servidor/email/aberturaIS.ts). */
  emailAberturaPara?: string;
  emailAberturaEnviadoEm?: Timestamp | null;
  /** E-mail de resultado de Benefícios (servidor/email/resultadoBeneficios.ts). */
  emailResultadoBeneficiosEnviadoEm?: Timestamp | null;
  emailResultadoBeneficiosModelo?: 'nao_enquadramento' | 'enquadramento_militar' | 'enquadramento_nao_militar';
  criadoPor: string;
  criadoEm: Timestamp | null;
  atualizadoEm?: Timestamp | null;
  // ----- Conclusão explícita ("Concluir IS"; utils/conclusaoIS.ts → patchConcluirIS/patchReabrirIS) -----
  /** AAAA-MM-DD da conclusão (nunca anterior à Data do laudo); '' depois de "Reabrir IS". */
  dataConclusao?: string;
  /** Quem concluiu a IS (pode reabri-la mesmo sem a função inspecoes.reabrir); null depois de reabrir. */
  concluidaPor?: { uid: string; usuario: string } | null;
  /** Quando a situação passou a "finalizada" (TIS assinado ou cancelada): conta os 15 dias para apagar as guias. */
  finalizadaEm?: Timestamp | null;
  // ----- Verificações e Términos: CID e afastamentos (utils/conclusaoIS.ts, utils/afastamentosIS.ts) -----
  /** CID da IS no formato DESCRABREV do public/cid.json (ex.: "M54.5 Dor lombar baixa"); obrigatório para finalizar. */
  cid?: string;
  /** Código SUBCAT do CID, sem ponto (ex.: "M545"). */
  cidCodigo?: string;
  /** Períodos de LTS/Restrições calculados pela IA depois da finalização (services/afastamentosIS.ts). */
  afastamentos?: AfastamentoIS[];
  /** Marcador do processamento em segundo plano (hash da entrada, situação, tentativas). */
  afastamentosProcessamento?: ProcessamentoAfastamentosIS | null;
  /** Quando os afastamentos foram gravados (serverTimestamp). */
  afastamentosProcessadosEm?: Timestamp | null;
}
export type InspecaoRecord = InspecaoDoc & { id: string };

/** Guias de exames geradas (gravado pelo servidor; Admin SDK). */
export interface GuiasExamesIS {
  /** Caminho no Storage: inspecoes/{isId}/guias/guias-exames.pdf */
  caminho: string;
  /** Exames solicitados por grupo, na ordem das páginas (ver utils/guiasExames.ts). */
  grupos: { grupo: string; exames: string[] }[];
  paginas: number;
  geradoEm: Timestamp | null;
  geradoPor: string;
}

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
  registrarUsoAcao('is_cadastrar');
  if (dados.dataEntrevista) registrarUsoAcao('is_agendar');
  registrarEventoInspecionado(dados.inspecionadoId, 'is.cadastrar', `IS ${id}`);
  notificarAcao('is.cadastrada', id);
  return id;
};

/**
 * IS finalizada com TIS assinado: em segundo plano (sem bloquear a gravação), a IA calcula os afastamentos
 * (LTS/Restrições) das IS de Verificações e Términos — services/afastamentosIS.ts decide se precisa (idempotente).
 */
const aposFinalizar = (id: string, status: StatusIS | undefined): void => {
  if (status !== 'tis_assinado') return;
  import('./afastamentosIS')
    .then(m => m.processarAfastamentosEmSegundoPlano(id))
    .catch(e => logErroSeguro('Afastamentos da IS: módulo não carregado', e));
};

/** `finalizadaEm` quando o status leva a IS à situação "finalizada" (limpeza das guias 15 dias depois, no servidor). */
const marcaFinalizacao = (status: StatusIS | undefined): { finalizadaEm?: ReturnType<typeof serverTimestamp> } =>
  status && situacaoDoStatus(status) === 'finalizada' ? { finalizadaEm: serverTimestamp() } : {};

/** Atualiza campos que não mexem na agenda (laudo, restrições, TIS, DS-1a, observações, status…). */
export const atualizarInspecao = async (id: string, patch: Partial<InspecaoDoc>): Promise<void> => {
  await updateDoc(doc(db, COL, id), { ...patch, ...(patch.status ? { situacao: situacaoDoStatus(patch.status), ...marcaFinalizacao(patch.status) } : {}), atualizadoEm: serverTimestamp() } as Record<string, unknown>);
  aposFinalizar(id, patch.status);
  notificarAcao('is.editada', id);
};

/**
 * "Limpar" dos modais de e-mails pendentes (só Admin): tira as IS da lista de pendências do e-mail `tipo` sem enviá-lo
 * (emailsDispensados.{tipo}; utils/emailsDispensados.ts). Não mexe em atualizadoEm nem notifica "IS atualizada".
 */
export const dispensarEmailsPendentes = async (tipo: TipoEmailPendente, lista: { id: string; dataEntrevista?: string }[]): Promise<void> => {
  const batch = writeBatch(db);
  lista.forEach(is => batch.update(doc(db, COL, is.id), { [`emailsDispensados.${tipo}`]: chaveDispensa(tipo, is) }));
  await batch.commit();
};

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
 * Agenda, reagenda ou troca o perito: grava perito + data/hora, reserva o slot novo, libera o antigo e
 * ajusta o status (ver statusAoAgendar: Agendada na primeira vez; Reagendada se já havia data ou se
 * faltou; as etapas depois da entrevista mantêm o status).
 */
export const agendarInspecao = async (atual: InspecaoRecord, novo: Agendamento): Promise<StatusIS> => {
  const status: StatusIS = statusAoAgendar(atual, novo.dataEntrevista);
  const slotAntigo = atual.dataEntrevista ? { peritoUid: atual.peritoUid, dataEntrevista: atual.dataEntrevista, grupoFinalidade: atual.grupoFinalidade } : null;
  await gravarComSlot(atual.id, { ...novo, status, situacao: situacaoDoStatus(status) }, { peritoUid: novo.peritoUid, dataEntrevista: novo.dataEntrevista, grupoFinalidade: atual.grupoFinalidade }, slotAntigo, false);
  registrarUsoAcao('is_agendar');
  registrarEventoInspecionado(atual.inspecionadoId, 'is.agendar', `IS ${atual.id}`);
  notificarAcao('is.agendada', atual.id);
  return status;
};

/** IS por foto (prints do SINAIS): os campos conferidos pelo usuário e o status calculado (utils/importacaoIS.ts). */
export type DadosImportacaoIS = Pick<InspecaoDoc,
  'dataAbertura' | 'dataEntrevista' | 'finalidade' | 'grupoFinalidade' | 'amp' | 'peritoUid' | 'peritoNome' | 'peritoGmail'
  | 'inspecionadoId' | 'inspecionado' | 'laudo' | 'dataLaudo' | 'restricoes' | 'tis' | 'ds1a' | 'status' | 'criadoPor'
  | 'cid' | 'cidCodigo' | 'dataConclusao'>;

/**
 * Cria a IS (`atual` nulo) ou atualiza a já cadastrada com o que veio das fotos. Na atualização, campo
 * vazio não apaga o que já estava gravado (as fotos só acrescentam). O horário só é reservado quando
 * `reservarSlot` (entrevista de hoje em diante); mudando a data, o horário antigo é liberado.
 */
export const importarInspecao = async (id: string, dados: DadosImportacaoIS, atual: InspecaoRecord | null, reservarSlot: boolean): Promise<InspecaoRecord> => {
  const slotNovo = reservarSlot && dados.dataEntrevista && dados.peritoUid
    ? { peritoUid: dados.peritoUid, dataEntrevista: dados.dataEntrevista, grupoFinalidade: dados.grupoFinalidade } : null;
  if (!atual) {
    const completo = { ...dados, is: Number(id), observacoes: '', situacao: situacaoDoStatus(dados.status) };
    await gravarComSlot(id, { ...completo, ...marcaFinalizacao(dados.status) }, slotNovo, null, true);
    aposFinalizar(id, dados.status);
    registrarEventoInspecionado(dados.inspecionadoId, 'is.cadastrar', `IS ${id}`);
    notificarAcao('is.importada', id);
    return { ...completo, id, criadoEm: null };
  }
  const { criadoPor: _c, ...resto } = dados;
  const patch: Record<string, unknown> = Object.fromEntries(Object.entries(resto).filter(([k, v]) => k === 'status' || String(v ?? '').trim() !== ''));
  patch.situacao = situacaoDoStatus(dados.status);
  if (atual.situacao !== 'finalizada') Object.assign(patch, marcaFinalizacao(dados.status));
  const mudouData = !!dados.dataEntrevista && dados.dataEntrevista !== atual.dataEntrevista;
  const slotAntigo = mudouData && atual.dataEntrevista ? { peritoUid: atual.peritoUid, dataEntrevista: atual.dataEntrevista, grupoFinalidade: atual.grupoFinalidade } : null;
  await gravarComSlot(id, patch, mudouData ? slotNovo : null, slotAntigo, false);
  aposFinalizar(id, dados.status);
  notificarAcao('is.editada', id);
  return { ...atual, ...(patch as Partial<InspecaoDoc>) };
};

/** Cancela a IS (situação Finalizada) e libera o horário reservado. */
export const cancelarInspecao = async (atual: InspecaoRecord): Promise<void> => {
  const slotAntigo = atual.dataEntrevista ? { peritoUid: atual.peritoUid, dataEntrevista: atual.dataEntrevista, grupoFinalidade: atual.grupoFinalidade } : null;
  await gravarComSlot(atual.id, {
    status: 'cancelada', situacao: situacaoDoStatus('cancelada'), ...marcaFinalizacao('cancelada'),
  }, null, slotAntigo, false);
  notificarAcao('is.cancelada', atual.id);
};

/** Apaga a IS (só Admin) e libera o horário. Antes, apaga as guias de exames no servidor (PDF; best effort). */
export const apagarInspecao = async (atual: InspecaoRecord): Promise<void> => {
  await apagarGuiasExames(atual.id);
  if (atual.dataEntrevista) await Promise.all(refsSlots(atual).map(r => deleteDoc(r).catch(() => { /* slot já liberado */ })));
  await deleteDoc(doc(db, COL, atual.id));
  void registrarAcaoSensivel('inspecao.excluir', 'inspecoes');
  notificarAcao('is.apagada', atual.id);
};

/** Resumo da exclusão completa feita pelo servidor (POST /api/inspecoes/excluir). */
export interface ResultadoExclusaoIS {
  documentos: number;
  arquivos: number;
  pareceres: number;
  agendaRemovida: boolean;
}

/**
 * Exclui a IS com TUDO o que é dela, no servidor (Admin SDK — servidor/inspecoes/excluir.ts): subcoleções
 * (exames, entrevistas, e-mails), mensagens registradas, horários da agenda, PDFs no Storage, pedidos de
 * parecer vinculados (e os PDFs) e o evento do Google Agenda. Função inspecoes.excluir (IS não finalizada;
 * o Admin também apaga finalizada). Servidor ainda sem a rota (404): cai em apagarInspecao (reserva: só a IS,
 * as guias e os horários).
 */
export const excluirInspecaoCompleta = async (atual: InspecaoRecord): Promise<ResultadoExclusaoIS | null> => {
  try {
    const r = await chamarServidor<ResultadoExclusaoIS & { success: true }>('/api/inspecoes/excluir', { isId: atual.id }, { timeoutMs: 60_000 });
    registrarEventoInspecionado(atual.inspecionadoId, 'is.excluir', `IS ${atual.id}`);
    void registrarAcaoSensivel('inspecao.excluir', 'inspecoes');
    notificarAcao('is.apagada', atual.id);
    return { documentos: r.documentos ?? 0, arquivos: r.arquivos ?? 0, pareceres: r.pareceres ?? 0, agendaRemovida: !!r.agendaRemovida };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404 && /Servidor respondeu 404|Cannot POST/i.test(e.message)) {
      await apagarInspecao(atual);
      return null;
    }
    throw e;
  }
};

/**
 * Caixa "Guias entregues ao inspecionado?" (detalhe da IS): marcar grava a entrega presencial de hoje (em segundo
 * plano) e Aberta → Realizando Exames; desmarcar desfaz (Realizando Exames → Aberta). Regras: utils/guiasExamesIS.ts.
 */
export const registrarEntregaGuias = async (atual: InspecaoRecord & EstadoEntregaGuias, marcar: boolean, quem: string, hoje: string): Promise<void> => {
  const patch = patchEntregaGuias(atual, marcar, quem, hoje);
  const dados: Record<string, unknown> = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === null ? deleteField() : v]));
  if (typeof patch.status === 'string') dados.situacao = situacaoDoStatus(patch.status as StatusIS);
  await updateDoc(doc(db, COL, atual.id), { ...dados, atualizadoEm: serverTimestamp() });
  notificarAcao('is.editada', atual.id);
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

/** Cria o bloqueio e devolve o id (o afastamento da página Férias guarda o id para apagar o bloqueio depois). */
export const criarBloqueio = async (b: NovoBloqueio & { afastamentoId?: string }): Promise<string> => {
  const dados: Record<string, unknown> = { ...b, criadoEm: serverTimestamp() };
  Object.keys(dados).forEach(k => { if (dados[k] === undefined) delete dados[k]; });
  const id = novoId();
  await setDoc(doc(db, COL_BLOQUEIOS, id), dados);
  return id;
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

export const salvarConfigAgenda = async (peritos: ConfigAgenda): Promise<void> => {
  await setDoc(CONFIG_REF, { peritos, atualizadoEm: serverTimestamp() });
  notificarAcao('is.configAgenda');
};
