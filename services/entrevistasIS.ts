// Ficheiro: services/entrevistasIS.ts
// Entrevistas gravadas da IS (contrato em config/entrevistas.ts): documentos em
// `inspecoes/{isId}/entrevistas/{entrevistaId}`, envio do áudio gravado no celular e as rotas do
// servidor que transcrevem (Speech-to-Text) e organizam a anamnese (Gemini).
//
// Envio do áudio: primeiro direto ao Storage (uploadBytesResumable, com progresso). A rede da
// Marinha pode bloquear firebasestorage.googleapis.com — nesse caso o upload trava ou falha e o
// áudio vai pela rota de reserva do servidor (POST binário em /api/entrevistas/audio). Os pedaços
// guardados no aparelho (services/gravacaoLocal.ts) só são apagados depois que o servidor aceitou
// o processamento.
import { useEffect, useRef } from 'react';
import {
  getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { app } from './firebaseAuth';
import { chamarServidor, baixarDoServidor, ApiError } from './apiClient';
import { obterIdToken } from './authService';
import { apiUrl } from '../utils/apiBase';
import {
  caminhoAudioOriginal, situacaoEmAndamento, MAX_BYTES_AUDIO,
  type EntrevistaRecord, type ParticipanteEntrevista, type SituacaoEntrevista,
} from '../config/entrevistas';
import { apagarGravacaoLocal, atualizarGravacaoLocal, lerAudioLocal, obterGravacaoLocal } from './gravacaoLocal';

const db = getFirestore(app);
const colecao = (isId: string) => collection(db, 'inspecoes', isId, 'entrevistas');

const milis = (v: unknown): number => {
  const t = v as { toMillis?: () => number } | null | undefined;
  return typeof t?.toMillis === 'function' ? t.toMillis() : 0;
};

// ---------------------------------------------------------------- Firestore

/** Observa as entrevistas da IS (mais recentes primeiro). Devolve a função que encerra a escuta. */
export const observarEntrevistas = (isId: string, cb: (lista: EntrevistaRecord[]) => void, erro?: (e: Error) => void): (() => void) =>
  onSnapshot(
    colecao(isId),
    snap => {
      const lista = snap.docs.map(d => ({ ...(d.data({ serverTimestamps: 'estimate' }) as Omit<EntrevistaRecord, 'id'>), id: d.id }));
      lista.sort((a, b) => milis(b.criadoPor?.em) - milis(a.criadoPor?.em));
      cb(lista);
    },
    e => erro?.(e),
  );

/**
 * Cria o documento da entrevista (id automático) só com os campos que o app pode criar
 * (CAMPOS_CRIACAO_APP), na situação "aguardando_envio". Devolve o id.
 */
export const criarEntrevista = async (
  isId: string,
  dados: { participantes: ParticipanteEntrevista[]; finalidade: string },
  usuario: { uid: string; nome: string },
): Promise<string> => {
  const ref_ = doc(colecao(isId));
  const quem = { uid: usuario.uid, nome: usuario.nome, em: serverTimestamp() };
  await setDoc(ref_, {
    isId,
    participantes: dados.participantes.map(p => ({ nome: p.nome.trim(), papel: p.papel })),
    finalidade: dados.finalidade.trim(),
    consentimento: quem,
    criadoPor: quem,
    situacao: 'aguardando_envio' satisfies SituacaoEntrevista,
  });
  return ref_.id;
};

type PatchEntrevista = Partial<Pick<EntrevistaRecord, 'mapaFalantes' | 'falantesConfirmados' | 'anamneseEditada' | 'editadoPor' | 'revisada'>>;

/** Atualiza os campos que o app pode editar; `em` de editadoPor/revisada vira serverTimestamp(). */
export const atualizarEntrevista = async (isId: string, entrevistaId: string, patch: PatchEntrevista): Promise<void> => {
  const dados: Record<string, unknown> = {};
  if (patch.mapaFalantes !== undefined) dados.mapaFalantes = patch.mapaFalantes;
  if (patch.falantesConfirmados !== undefined) dados.falantesConfirmados = patch.falantesConfirmados;
  if (patch.anamneseEditada !== undefined) dados.anamneseEditada = patch.anamneseEditada;
  if (patch.editadoPor !== undefined) dados.editadoPor = patch.editadoPor && { uid: patch.editadoPor.uid, nome: patch.editadoPor.nome, em: serverTimestamp() };
  if (patch.revisada !== undefined) dados.revisada = patch.revisada && { uid: patch.revisada.uid, nome: patch.revisada.nome, em: serverTimestamp() };
  if (Object.keys(dados).length === 0) return;
  await updateDoc(doc(colecao(isId), entrevistaId), dados);
};

// ---------------------------------------------------------------- Servidor

/** Pergunta ao servidor a situação — é o que o faz avançar (verifica o Speech; organiza a anamnese). */
export const consultarSituacao = async (isId: string, entrevistaId: string): Promise<SituacaoEntrevista> => {
  const r = await chamarServidor<{ situacao: SituacaoEntrevista }>('/api/entrevistas/situacao', { isId, entrevistaId }, { timeoutMs: 60_000 });
  return r.situacao;
};

/** Refaz a organização da anamnese com o mapa de falantes confirmado. */
export const reorganizarEntrevista = async (isId: string, entrevistaId: string): Promise<SituacaoEntrevista> => {
  const r = await chamarServidor<{ situacao: SituacaoEntrevista }>('/api/entrevistas/reorganizar', { isId, entrevistaId }, { timeoutMs: 60_000 });
  return r.situacao;
};

/** Baixa o áudio da entrevista (enquanto existir no Storage). */
export const ouvirAudio = (isId: string, entrevistaId: string): Promise<Blob> =>
  baixarDoServidor('/api/entrevistas/ouvir', { isId, entrevistaId }, { timeoutMs: 180_000 });

/** Pede o processamento do áudio já enviado (converte e inicia a transcrição). */
export const processarEntrevista = async (
  isId: string, entrevistaId: string, caminho: string, mimeType: string, duracaoSeg: number,
): Promise<SituacaoEntrevista> => {
  const r = await chamarServidor<{ situacao: SituacaoEntrevista }>(
    '/api/entrevistas/processar', { isId, entrevistaId, caminho, mimeType, duracaoSeg: Math.round(duracaoSeg) }, { timeoutMs: 90_000 },
  );
  return r.situacao;
};

const INTERVALO_ACOMPANHAR_MS = 10_000;

/** Enquanto montado, chama consultarSituacao a cada 10 s se a situação estiver em andamento (é o que faz o servidor avançar). */
export const useAcompanharEntrevista = (isId: string, e: EntrevistaRecord | null): void => {
  const emAndamento = !!e && situacaoEmAndamento(e.situacao);
  const entrevistaId = e?.id;
  const ocupado = useRef(false);
  useEffect(() => {
    if (!emAndamento || !entrevistaId) return;
    const consultar = () => {
      if (ocupado.current || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
      ocupado.current = true;
      consultarSituacao(isId, entrevistaId).catch(() => { /* tenta de novo no próximo ciclo */ }).finally(() => { ocupado.current = false; });
    };
    consultar();
    const id = window.setInterval(consultar, INTERVALO_ACOMPANHAR_MS);
    return () => window.clearInterval(id);
  }, [isId, entrevistaId, emAndamento]);
};

// ---------------------------------------------------------------- Envio do áudio

export type EtapaEnvio = 'preparando' | 'storage' | 'reserva' | 'processando';
export interface ProgressoEnvio { etapa: EtapaEnvio; enviados: number; total: number }

/** Sem progresso por este tempo, o upload direto é dado como bloqueado e vai para a reserva. */
const UPLOAD_TRAVADO_MS = 30_000;

/** Upload direto ao Storage com progresso; rejeita se falhar ou ficar parado por UPLOAD_TRAVADO_MS. */
export const enviarAudioStorage = (caminho: string, audio: Blob, contentType: string, onProgresso?: (enviados: number, total: number) => void): Promise<void> =>
  new Promise((resolve, reject) => {
    let tarefa: UploadTask;
    try {
      tarefa = uploadBytesResumable(ref(getStorage(app), caminho), audio, { contentType });
    } catch (e) { reject(e); return; }
    let ultimo = Date.now();
    let bytesUltimo = -1;
    const vigia = window.setInterval(() => {
      if (Date.now() - ultimo > UPLOAD_TRAVADO_MS) { window.clearInterval(vigia); tarefa.cancel(); }
    }, 2_000);
    tarefa.on(
      'state_changed',
      snap => {
        if (snap.bytesTransferred !== bytesUltimo) { bytesUltimo = snap.bytesTransferred; ultimo = Date.now(); }
        onProgresso?.(snap.bytesTransferred, snap.totalBytes);
      },
      erro => { window.clearInterval(vigia); reject(erro); },
      () => { window.clearInterval(vigia); resolve(); },
    );
  });

/**
 * Reserva: envia o áudio (corpo binário) ao servidor, que o grava no Storage. Usa XHR para ter o
 * progresso do upload. Devolve o caminho gravado.
 */
export const enviarAudioReserva = async (
  isId: string, entrevistaId: string, audio: Blob, contentType: string, onProgresso?: (enviados: number, total: number) => void,
): Promise<string> => {
  const token = await obterIdToken();
  if (!token) throw new ApiError('nao_autenticado', 'Sessão expirada. Faça login novamente.');
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/api/entrevistas/audio'));
    xhr.timeout = 15 * 60_000;
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-Is-Id', isId);
    xhr.setRequestHeader('X-Entrevista-Id', entrevistaId);
    xhr.upload.onprogress = ev => { if (ev.lengthComputable) onProgresso?.(ev.loaded, ev.total); };
    xhr.onload = () => {
      let json: any = null;
      try { json = JSON.parse(xhr.responseText); } catch { /* corpo não-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && json?.caminho) { resolve(String(json.caminho)); return; }
      const codigo = xhr.status === 401 ? 'nao_autenticado' : xhr.status === 403 ? 'sem_permissao' : json ? 'negocio' : 'resposta_invalida';
      reject(new ApiError(codigo, json?.error || `Servidor respondeu ${xhr.status}.`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('rede', 'Sem comunicação com o servidor. Verifique sua conexão e tente novamente.'));
    xhr.ontimeout = () => reject(new ApiError('timeout', 'O envio demorou demais. Tente novamente.'));
    xhr.send(audio);
  });
};

/**
 * Envia a gravação guardada neste aparelho e pede o processamento. Etapas: Storage direto →
 * (falhou) reserva pelo servidor → /processar. O caminho enviado fica anotado na cópia local, então
 * um reenvio depois de falha no /processar não repete o upload. Só apaga a cópia local quando o
 * /processar responde OK.
 */
export const enviarGravacao = async (entrevistaId: string, onProgresso: (p: ProgressoEnvio) => void): Promise<SituacaoEntrevista> => {
  onProgresso({ etapa: 'preparando', enviados: 0, total: 0 });
  const meta = await obterGravacaoLocal(entrevistaId);
  if (!meta) throw new Error('A gravação não está mais neste aparelho.');
  let caminho = meta.caminhoEnviado;
  if (!caminho) {
    const audio = await lerAudioLocal(entrevistaId);
    if (!audio || audio.size === 0) throw new Error('A gravação está vazia neste aparelho.');
    if (audio.size > MAX_BYTES_AUDIO) throw new Error(`O áudio passou do limite de ${Math.round(MAX_BYTES_AUDIO / 1024 / 1024)} MB.`);
    const destino = caminhoAudioOriginal(meta.isId, entrevistaId, meta.ext);
    try {
      await enviarAudioStorage(destino, audio, meta.mimeType, (enviados, total) => onProgresso({ etapa: 'storage', enviados, total }));
      caminho = destino;
    } catch {
      onProgresso({ etapa: 'reserva', enviados: 0, total: audio.size });
      caminho = await enviarAudioReserva(meta.isId, entrevistaId, audio, meta.mimeType, (enviados, total) => onProgresso({ etapa: 'reserva', enviados, total }));
    }
    await atualizarGravacaoLocal(entrevistaId, { caminhoEnviado: caminho }).catch(() => { /* só otimiza o reenvio */ });
  }
  onProgresso({ etapa: 'processando', enviados: 0, total: 0 });
  const situacao = await processarEntrevista(meta.isId, entrevistaId, caminho, meta.mimeType, meta.duracaoSeg);
  await apagarGravacaoLocal(entrevistaId).catch(() => { /* fica como pendente já enviada; o reenvio só repete o /processar */ });
  return situacao;
};
