// Ficheiro: servidor/entrevistas/fluxo.ts
// Máquina de estados da entrevista da IS (inspecoes/{isId}/entrevistas/{entrevistaId}), gravada pelo
// Admin SDK: aguardando_envio → transcrevendo → organizando → pronta | erro.
//  - processar: converte o original em FLAC, inicia o BatchRecognize e volta (não espera a transcrição);
//  - situacao: consulta a operação; concluída, grava a transcrição e passa a `organizando` numa
//    TRANSAÇÃO — só quem fez a troca (ou quem retoma uma trava vencida, > 5 min) roda o Gemini;
//  - reorganizar: refaz só a organização com o mapaFalantes atual, pela mesma trava.
// `tempos` guarda os marcos (ms epoch) de cada etapa para medir a duração do processamento.
// Nenhum log aqui contém transcrição, nomes ou conteúdo: só o contexto fixo e o erro mascarado.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Firestore, DocumentReference, Transaction } from 'firebase-admin/firestore';
import type { getStorage } from 'firebase-admin/storage';
/** Bucket do Admin SDK (tipo derivado do firebase-admin: @google-cloud/storage é dependência opcional dele e pode não estar instalado no CI). */
export type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;
import {
  DIAS_RETENCAO_AUDIO, MAX_BYTES_AUDIO, MAX_DURACAO_SEG, MAX_PARTICIPANTES, MIN_PARTICIPANTES,
  caminhoAudioOriginal, type EntrevistaRecord, type FalaTranscrita, type SituacaoEntrevista,
} from '../../config/entrevistas';
import { logErroSeguro } from '../../utils/logSeguro';
import {
  caminhoAudioFlac, comPastaTemporaria, converterParaFlac, dataApagarApos, extensaoDoCaminhoOriginal,
  extensaoDoMime, idValido, mimeBase, mimeDaExtensao,
} from './audio';
import { MODELO_SPEECH, consultarTranscricao, iniciarTranscricao } from './transcricao';
import { MODELO_GEMINI_ENTREVISTA, organizarAnamnese } from './organizacao';

/** Erro com status HTTP e mensagem legível (pode ir ao app; nunca contém dados pessoais). */
export class ErroEntrevista extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ErroEntrevista'; }
}

export const TRAVA_VENCIDA_MS = 5 * 60 * 1000;
/** `transcrevendo` sem operação do Speech por mais que isto = processamento interrompido. */
const INICIO_VENCIDO_MS = 20 * 60 * 1000;

/** Trava de organização ausente ou mais velha que 5 min pode ser (re)tomada. Pura. */
export const travaVencida = (desde: unknown, agora = Date.now()): boolean => {
  const t = typeof desde === 'number' ? desde : Number(desde);
  return !Number.isFinite(t) || agora - t > TRAVA_VENCIDA_MS;
};

type Doc = Partial<EntrevistaRecord> & {
  transcrevendoDesde?: number; organizandoDesde?: number; travaOrganizacao?: string; [k: string]: unknown;
};

const refEntrevista = (db: Firestore, isId: string, entrevistaId: string): DocumentReference => {
  if (!idValido(isId) || !idValido(entrevistaId)) throw new ErroEntrevista(400, 'Identificação da entrevista inválida.');
  return db.collection('inspecoes').doc(isId).collection('entrevistas').doc(entrevistaId);
};

const lerDoc = async (ref: DocumentReference, tx?: Transaction): Promise<Doc> => {
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (!snap.exists) throw new ErroEntrevista(404, 'Entrevista não encontrada.');
  return snap.data() as Doc;
};

const fv = async () => (await import('firebase-admin/firestore')).FieldValue;

const dataDaEntrevista = (d: Doc): Date => {
  for (const q of [d.consentimento, d.criadoPor]) {
    const em: any = q?.em;
    const data = typeof em?.toDate === 'function' ? em.toDate() : em instanceof Date ? em : typeof em === 'string' || typeof em === 'number' ? new Date(em) : null;
    if (data && Number.isFinite(data.getTime())) return data;
  }
  return new Date();
};

const marcarErro = async (ref: DocumentReference, mensagem: string, condicao?: (d: Doc) => boolean) => {
  const FieldValue = await fv();
  try {
    await ref.firestore.runTransaction(async tx => {
      const d = await lerDoc(ref, tx);
      if (condicao && !condicao(d)) return;
      tx.update(ref, {
        situacao: 'erro', erro: mensagem.slice(0, 300),
        organizandoDesde: FieldValue.delete(), travaOrganizacao: FieldValue.delete(), transcrevendoDesde: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    });
  } catch (e) { logErroSeguro('Entrevista marcar erro', e); }
};

// ------------------------------------------------------------------ envio de reserva (POST /audio)

export const salvarAudioReserva = async (db: Firestore, bucket: Bucket, isId: string, entrevistaId: string, corpo: unknown, mimeType: unknown): Promise<string> => {
  const ref = refEntrevista(db, isId, entrevistaId);
  const ext = extensaoDoMime(mimeType);
  if (!ext) throw new ErroEntrevista(415, 'Formato de áudio não aceito.');
  if (!Buffer.isBuffer(corpo) || !corpo.length) throw new ErroEntrevista(400, 'O áudio chegou vazio.');
  if (corpo.length > MAX_BYTES_AUDIO) throw new ErroEntrevista(413, 'O áudio é grande demais.');
  const d = await lerDoc(ref);
  if (d.situacao !== 'aguardando_envio') throw new ErroEntrevista(409, 'Esta entrevista não está aguardando o envio do áudio.');
  const caminho = caminhoAudioOriginal(isId, entrevistaId, ext);
  await bucket.file(caminho).save(corpo, { contentType: mimeBase(mimeType), resumable: false, metadata: { cacheControl: 'private, no-store' } });
  return caminho;
};

// ------------------------------------------------------------------ processar (POST /processar)

/** Caminho do original já enviado (entrevistas/{isId}/{eid}/original.*), para reprocessar sem o celular. */
const localizarOriginal = async (bucket: Bucket, isId: string, entrevistaId: string): Promise<string> => {
  if (!extensaoDoCaminhoOriginal(`entrevistas/${isId}/${entrevistaId}/original.webm`, isId, entrevistaId)) throw new ErroEntrevista(400, 'Entrevista inválida.');
  const [arquivos] = await bucket.getFiles({ prefix: `entrevistas/${isId}/${entrevistaId}/original.`, maxResults: 5 });
  const achado = arquivos.map(f => f.name).find(n => extensaoDoCaminhoOriginal(n, isId, entrevistaId));
  if (!achado) throw new ErroEntrevista(404, 'O áudio não está no servidor. Reenvie pelo celular onde a entrevista foi gravada.');
  return achado;
};

/** Campos apagados ao refazer a transcrição de uma entrevista pronta (o `audio` é regravado). */
export const CAMPOS_DESCARTADOS_AO_REFAZER = [
  'transcricao', 'anamnese', 'mapaFalantes', 'falantesConfirmados', 'anamneseEditada', 'editadoPor', 'revisada', 'erro', 'operacaoSpeech',
  'tempos',
] as const;

export interface PedidoProcessar { isId: string; entrevistaId: string; caminho: unknown; mimeType: unknown; duracaoSeg: unknown }

export const processarEntrevista = async (db: Firestore, bucket: Bucket, p: PedidoProcessar): Promise<SituacaoEntrevista> => {
  const ref = refEntrevista(db, p.isId, p.entrevistaId);
  // Reprocessar ("Tentar novamente" / "Refazer transcrição"): sem caminho, usa o original que já está no Storage.
  const reprocessamento = !p.caminho;
  if (reprocessamento) p = { ...p, caminho: await localizarOriginal(bucket, p.isId, p.entrevistaId) };
  const ext = extensaoDoCaminhoOriginal(p.caminho, p.isId, p.entrevistaId);
  if (!ext) throw new ErroEntrevista(400, 'Caminho do áudio inválido.');
  const caminho = p.caminho as string;
  const mimeType = extensaoDoMime(p.mimeType) ? mimeBase(p.mimeType) : mimeDaExtensao(ext);
  const duracaoSeg = Math.round(Math.min(MAX_DURACAO_SEG, Math.max(0, Number(p.duracaoSeg) || 0)));

  const original = bucket.file(caminho);
  const [existe] = await original.exists();
  if (!existe) throw new ErroEntrevista(404, 'O áudio ainda não chegou ao armazenamento. Envie de novo.');
  const [meta] = await original.getMetadata();
  const bytes = Number(meta.size || 0);
  if (bytes > MAX_BYTES_AUDIO) throw new ErroEntrevista(413, 'O áudio é grande demais.');

  // Reserva a entrevista (aguardando_envio | erro → transcrevendo) para não processar duas vezes.
  // `pronta` só no reprocessamento explícito (sem caminho: "Refazer transcrição"), que descarta
  // transcrição, anamnese, falantes e edições.
  const FieldValue = await fv();
  const d = await db.runTransaction(async tx => {
    const atual = await lerDoc(ref, tx);
    const refazer = reprocessamento && atual.situacao === 'pronta';
    if (atual.situacao !== 'aguardando_envio' && atual.situacao !== 'erro' && !refazer) {
      throw new ErroEntrevista(409, 'Esta entrevista já está em processamento ou pronta.');
    }
    const descartar = refazer
      ? Object.fromEntries(CAMPOS_DESCARTADOS_AO_REFAZER.map(c => [c, FieldValue.delete()]))
      : {};
    const agora = Date.now();
    tx.update(ref, {
      ...descartar,
      // Os marcos recomeçam a cada processamento (substitui o mapa inteiro).
      tempos: { processamentoIniciado: agora },
      situacao: 'transcrevendo', transcrevendoDesde: agora,
      erro: FieldValue.delete(), operacaoSpeech: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return atual;
  });

  try {
    const nParticipantes = Math.max(MIN_PARTICIPANTES, Math.min(MAX_PARTICIPANTES, Array.isArray(d.participantes) ? d.participantes.length : MIN_PARTICIPANTES));
    const caminhoFlac = caminhoAudioFlac(p.isId, p.entrevistaId);
    await comPastaTemporaria(async pasta => {
      const entrada = path.join(pasta, `original.${ext}`);
      const saida = path.join(pasta, 'audio.flac');
      await original.download({ destination: entrada });
      await converterParaFlac(entrada, saida);
      const { size } = await fs.stat(saida);
      if (!size) throw new Error('conversão vazia');
      await bucket.upload(saida, { destination: caminhoFlac, contentType: 'audio/flac', metadata: { cacheControl: 'private, no-store' } });
    });
    const uriFlac = `gs://${bucket.name}/${caminhoFlac}`;
    const operacao = await iniciarTranscricao(uriFlac, nParticipantes, Array.isArray(d.participantes) ? d.participantes : []);
    await ref.update({
      audio: { caminho, mimeType, bytes, duracaoSeg, apagarApos: dataApagarApos(dataDaEntrevista(d), DIAS_RETENCAO_AUDIO) },
      operacaoSpeech: operacao.nome,
      speechComAdaptacao: operacao.comAdaptacao,
      'tempos.transcricaoIniciada': Date.now(),
      speechUri: uriFlac,
      situacao: 'transcrevendo',
      modelos: { speech: MODELO_SPEECH, gemini: MODELO_GEMINI_ENTREVISTA },
      transcrevendoDesde: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return 'transcrevendo';
  } catch (e) {
    logErroSeguro('Entrevista processar', e);
    const msg = /ffmpeg/i.test(String((e as Error)?.message))
      ? 'Não foi possível converter o áudio. Verifique a gravação e reprocesse.'
      : 'Não foi possível iniciar a transcrição. Tente reprocessar em alguns minutos.';
    await marcarErro(ref, msg, x => x.situacao === 'transcrevendo');
    throw new ErroEntrevista(502, msg);
  }
};

// ------------------------------------------------------------------ organização (Gemini) com trava

/** Tenta tomar a trava de organização. Devolve o token se esta chamada deve rodar o Gemini. */
const tomarTrava = async (ref: DocumentReference, de: (d: Doc) => boolean, extra: (d: Doc) => Record<string, unknown> = () => ({})): Promise<{ token: string; doc: Doc } | null> => {
  const FieldValue = await fv();
  return ref.firestore.runTransaction(async tx => {
    const d = await lerDoc(ref, tx);
    const podeRetomar = d.situacao === 'organizando' && travaVencida(d.organizandoDesde);
    if (!de(d) && !podeRetomar) return null;
    const token = randomUUID();
    const mudancas = { situacao: 'organizando' as const, organizandoDesde: Date.now(), travaOrganizacao: token, ...extra(d) };
    tx.update(ref, { ...mudancas, erro: FieldValue.delete(), atualizadoEm: FieldValue.serverTimestamp() });
    return { token, doc: { ...d, ...mudancas } as Doc };
  });
};

const organizarComTrava = async (ref: DocumentReference, token: string, d: Doc): Promise<SituacaoEntrevista> => {
  const FieldValue = await fv();
  const daTrava = (x: Doc) => x.situacao === 'organizando' && x.travaOrganizacao === token;
  try {
    const transcricao = (d.transcricao || []) as FalaTranscrita[];
    if (!transcricao.length) throw new Error('sem transcrição');
    const mapaConfirmado = d.falantesConfirmados && d.mapaFalantes && Object.keys(d.mapaFalantes).length ? d.mapaFalantes : null;
    const r = await organizarAnamnese({ finalidade: String(d.finalidade || ''), participantes: d.participantes || [], transcricao, mapaConfirmado });
    return await ref.firestore.runTransaction(async tx => {
      const atual = await lerDoc(ref, tx);
      if (!daTrava(atual)) return (atual.situacao || 'organizando') as SituacaoEntrevista;
      tx.update(ref, {
        anamnese: r.anamnese,
        // O mapa confirmado pelo perito nunca é sobrescrito pela sugestão.
        ...(atual.falantesConfirmados ? {} : { mapaFalantes: r.mapaFalantes }),
        situacao: 'pronta',
        // Só a primeira organização conta para a duração do processamento (o "Reorganizar" não altera).
        ...(atual.tempos?.organizacaoConcluida ? {} : { 'tempos.organizacaoConcluida': Date.now() }),
        modelos: { speech: atual.modelos?.speech || MODELO_SPEECH, gemini: MODELO_GEMINI_ENTREVISTA },
        organizandoDesde: FieldValue.delete(), travaOrganizacao: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      return 'pronta' as const;
    });
  } catch (e) {
    logErroSeguro('Entrevista organizar', e);
    await marcarErro(ref, 'A transcrição está pronta, mas não foi possível organizar a anamnese. Use "Reorganizar".', daTrava);
    return 'erro';
  }
};

// ------------------------------------------------------------------ situação (POST /situacao)

export const avancarEntrevista = async (db: Firestore, isId: string, entrevistaId: string): Promise<SituacaoEntrevista> => {
  const ref = refEntrevista(db, isId, entrevistaId);
  const d = await lerDoc(ref);

  if (d.situacao === 'transcrevendo') {
    const nome = d.operacaoSpeech;
    if (!nome) {
      if (Date.now() - Number(d.transcrevendoDesde || 0) > INICIO_VENCIDO_MS) {
        await marcarErro(ref, 'O processamento do áudio foi interrompido. Reprocesse a entrevista.', x => x.situacao === 'transcrevendo' && !x.operacaoSpeech);
        return 'erro';
      }
      return 'transcrevendo';
    }
    let consulta;
    try {
      consulta = await consultarTranscricao(nome);
    } catch (e) {
      logErroSeguro('Entrevista consultar Speech', e);
      return 'transcrevendo'; // falha transitória: o app consulta de novo
    }
    if (!consulta.concluida) return 'transcrevendo';
    if ('erro' in consulta) {
      // O Chirp 3 pode aceitar a lista de frases (nomes/siglas) e falhar ao processar: refaz UMA vez sem ela.
      if (d.speechComAdaptacao === true && typeof d.speechUri === 'string' && d.speechUri) {
        try {
          const nParticipantes = Math.max(MIN_PARTICIPANTES, Math.min(MAX_PARTICIPANTES, Array.isArray(d.participantes) ? d.participantes.length : MIN_PARTICIPANTES));
          const nova = await iniciarTranscricao(d.speechUri, nParticipantes, [], true);
          console.warn('Entrevista: transcrição com adaptação falhou; refeita sem adaptação.');
          const FieldValue = await fv();
          const trocou = await ref.firestore.runTransaction(async tx => {
            const atual = await lerDoc(ref, tx);
            if (atual.situacao !== 'transcrevendo' || atual.operacaoSpeech !== nome) return false;
            tx.update(ref, {
              operacaoSpeech: nova.nome, speechComAdaptacao: false,
              'tempos.transcricaoIniciada': Date.now(), 'tempos.transcricaoRefeita': true,
              atualizadoEm: FieldValue.serverTimestamp(),
            });
            return true;
          });
          if (trocou) return 'transcrevendo';
        } catch (e) {
          logErroSeguro('Entrevista refazer sem adaptação', e);
        }
      }
      await marcarErro(ref, consulta.erro, x => x.situacao === 'transcrevendo' && x.operacaoSpeech === nome);
      return 'erro';
    }
    const falas = consulta.falas;
    const trava = await tomarTrava(ref,
      x => x.situacao === 'transcrevendo' && x.operacaoSpeech === nome,
      () => ({ transcricao: falas, 'tempos.transcricaoConcluida': Date.now() }));
    if (!trava) return ((await lerDoc(ref)).situacao || 'organizando') as SituacaoEntrevista;
    return organizarComTrava(ref, trava.token, trava.doc);
  }

  if (d.situacao === 'organizando') {
    if (!travaVencida(d.organizandoDesde)) return 'organizando';
    const trava = await tomarTrava(ref, () => false);
    if (!trava) return ((await lerDoc(ref)).situacao || 'organizando') as SituacaoEntrevista;
    return organizarComTrava(ref, trava.token, trava.doc);
  }
  return (d.situacao || 'aguardando_envio') as SituacaoEntrevista;
};

// ------------------------------------------------------------------ reorganizar (POST /reorganizar)

export const reorganizarEntrevista = async (db: Firestore, isId: string, entrevistaId: string): Promise<SituacaoEntrevista> => {
  const ref = refEntrevista(db, isId, entrevistaId);
  const d = await lerDoc(ref);
  if (!Array.isArray(d.transcricao) || !d.transcricao.length) throw new ErroEntrevista(409, 'A entrevista ainda não tem transcrição.');
  const trava = await tomarTrava(ref, x => (x.situacao === 'pronta' || x.situacao === 'erro') && Array.isArray(x.transcricao) && x.transcricao.length > 0);
  if (!trava) {
    const atual = await lerDoc(ref);
    if (atual.situacao === 'organizando') return 'organizando';
    throw new ErroEntrevista(409, 'A entrevista não pode ser reorganizada agora.');
  }
  return organizarComTrava(ref, trava.token, trava.doc);
};

// ------------------------------------------------------------------ ouvir (POST /ouvir)

export const localizarAudioOriginal = async (db: Firestore, bucket: Bucket, isId: string, entrevistaId: string) => {
  const ref = refEntrevista(db, isId, entrevistaId);
  const d = await lerDoc(ref);
  const caminho = d.audio?.caminho;
  const ext = extensaoDoCaminhoOriginal(caminho, isId, entrevistaId);
  const naoDisponivel = () => new ErroEntrevista(404, 'O áudio desta entrevista não está mais disponível (apagado após o prazo de retenção).');
  if (!ext) throw naoDisponivel();
  const arquivo = bucket.file(caminho as string);
  const [existe] = await arquivo.exists();
  if (!existe) throw naoDisponivel();
  const [meta] = await arquivo.getMetadata();
  return { arquivo, contentType: String(meta.contentType || mimeDaExtensao(ext)), tamanho: Number(meta.size || 0) };
};
