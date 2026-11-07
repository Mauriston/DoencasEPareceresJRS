// Ficheiro: servidor/entrevistas/transcricao.ts
// Transcrição da entrevista com separação de falantes: Google Cloud Speech-to-Text V2, modelo Chirp 3,
// pt-BR, BatchRecognize (operação longa, resultado inline). A conversão do resultado em falas
// (`resultadoParaFalas`) é pura e testada.
//
// Campos conforme google/cloud/speech/v2/cloud_speech.proto (@google-cloud/speech 7.x/8.x):
// RecognitionConfig { autoDecodingConfig, model, languageCodes, features { enableWordTimeOffsets,
// enableAutomaticPunctuation, diarizationConfig { minSpeakerCount, maxSpeakerCount } } };
// BatchRecognizeRequest { recognizer, config, files[{ uri }], recognitionOutputConfig { inlineResponseConfig } };
// WordInfo { startOffset, endOffset, word, speakerLabel }.

import type { FalaTranscrita } from '../../config/entrevistas';

export const MODELO_SPEECH = 'chirp_3';
export const IDIOMA_SPEECH = 'pt-BR';
/** Multirregião onde o Chirp 3 roda (us | eu | …). O endpoint é `{loc}-speech.googleapis.com`. */
export const localizacaoSpeech = () => (process.env.SPEECH_LOCALIZACAO || 'us').trim();
export const projetoGoogle = () => (process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'jrs-app-web').trim();

// ------------------------------------------------------------------ conversão pura

/** Duration do protobuf ({ seconds: string|number|Long, nanos }) ou "1.5s" (JSON) → segundos. */
export const duracaoEmSegundos = (d: unknown): number => {
  if (d == null) return 0;
  if (typeof d === 'number') return Number.isFinite(d) ? d : 0;
  if (typeof d === 'string') { const n = parseFloat(d.replace(/s$/, '')); return Number.isFinite(n) ? n : 0; }
  if (typeof d === 'object') {
    const o = d as { seconds?: unknown; nanos?: unknown };
    const s = o.seconds;
    const seg = s == null ? 0
      : typeof s === 'number' ? s
      : typeof s === 'string' ? Number(s)
      : typeof (s as { toNumber?: () => number }).toNumber === 'function' ? (s as { toNumber: () => number }).toNumber()
      : Number(s);
    const nanos = Number(o.nanos ?? 0);
    const total = (Number.isFinite(seg) ? seg : 0) + (Number.isFinite(nanos) ? nanos / 1e9 : 0);
    return Number.isFinite(total) ? total : 0;
  }
  return 0;
};

const umaCasa = (n: number) => Math.round(Math.max(0, n) * 10) / 10;

interface PalavraSpeech { word?: string | null; startOffset?: unknown; endOffset?: unknown; speakerLabel?: string | null }
interface ResultadoSpeech {
  alternatives?: Array<{ transcript?: string | null; words?: PalavraSpeech[] | null }> | null;
  resultEndOffset?: unknown;
}

/**
 * Converte os resultados do BatchRecognize em falas: palavras consecutivas do mesmo falante viram uma
 * fala; os rótulos do Speech ("1", "2"…) são renumerados na ordem em que aparecem ("F1", "F2"…);
 * tempos em segundos com 1 casa. Palavra sem rótulo fica com o falante anterior. Se não vierem
 * palavras (sem diarização), cada resultado vira uma fala do mesmo falante "F1".
 */
export const resultadoParaFalas = (resultados: ResultadoSpeech[] | null | undefined): FalaTranscrita[] => {
  const falas: FalaTranscrita[] = [];
  const rotulos = new Map<string, string>();
  const rotular = (bruto: string) => {
    if (!rotulos.has(bruto)) rotulos.set(bruto, `F${rotulos.size + 1}`);
    return rotulos.get(bruto)!;
  };
  let atual: { falante: string; inicio: number; fim: number; palavras: string[] } | null = null;
  let rotuloAnterior = '';
  const fechar = () => {
    if (atual && atual.palavras.length) {
      falas.push({ falante: atual.falante, inicioSeg: umaCasa(atual.inicio), fimSeg: umaCasa(Math.max(atual.fim, atual.inicio)), texto: atual.palavras.join(' ').replace(/\s+([,.;:!?])/g, '$1').trim() });
    }
    atual = null;
  };
  let fimAnterior = 0;
  for (const r of resultados || []) {
    const alt = r?.alternatives?.[0];
    if (!alt) continue;
    const palavras = (alt.words || []).filter(p => String(p?.word ?? '').trim());
    if (!palavras.length) {
      const texto = String(alt.transcript ?? '').trim();
      const fim = duracaoEmSegundos(r.resultEndOffset);
      if (texto) {
        fechar();
        const falante = rotular(rotuloAnterior || '1');
        falas.push({ falante, inicioSeg: umaCasa(fimAnterior), fimSeg: umaCasa(Math.max(fim, fimAnterior)), texto });
      }
      fimAnterior = Math.max(fimAnterior, fim);
      continue;
    }
    for (const p of palavras) {
      const bruto = String(p.speakerLabel ?? '').trim() || rotuloAnterior || '1';
      rotuloAnterior = bruto;
      const falante = rotular(bruto);
      const inicio = duracaoEmSegundos(p.startOffset);
      const fim = Math.max(duracaoEmSegundos(p.endOffset), inicio);
      if (!atual || atual.falante !== falante) {
        fechar();
        atual = { falante, inicio, fim, palavras: [] };
      }
      atual!.palavras.push(String(p.word).trim());
      atual!.fim = Math.max(atual!.fim, fim);
      fimAnterior = Math.max(fimAnterior, fim);
    }
  }
  fechar();
  return falas;
};

// ------------------------------------------------------------------ chamadas ao Speech-to-Text

type ClienteSpeech = InstanceType<typeof import('@google-cloud/speech').v2.SpeechClient>;
let clienteSpeech: ClienteSpeech | null = null;
const obterCliente = async (): Promise<ClienteSpeech> => {
  if (!clienteSpeech) {
    const { v2 } = await import('@google-cloud/speech');
    const loc = localizacaoSpeech();
    clienteSpeech = new v2.SpeechClient(loc === 'global' ? {} : { apiEndpoint: `${loc}-speech.googleapis.com` });
  }
  return clienteSpeech;
};

/** Monta o pedido do BatchRecognize (puro, testado). */
export const montarPedidoBatch = (uriGcs: string, nParticipantes: number, opcoes: { projeto?: string; localizacao?: string; limitesFalantes?: boolean } = {}) => {
  const n = Math.max(1, Math.min(6, Math.trunc(nParticipantes) || 2));
  const limites = opcoes.limitesFalantes ?? process.env.SPEECH_DIARIZACAO_LIMITES !== '0';
  return {
    recognizer: `projects/${opcoes.projeto || projetoGoogle()}/locations/${opcoes.localizacao || localizacaoSpeech()}/recognizers/_`,
    config: {
      autoDecodingConfig: {},
      model: MODELO_SPEECH,
      languageCodes: [IDIOMA_SPEECH],
      features: {
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        // Mensagem vazia = falantes detectados automaticamente; com limites, min = max = nº de participantes.
        diarizationConfig: limites ? { minSpeakerCount: n, maxSpeakerCount: n } : {},
      },
    },
    files: [{ uri: uriGcs }],
    recognitionOutputConfig: { inlineResponseConfig: {} },
  };
};

/** Inicia o BatchRecognize e devolve o nome da operação (não espera a transcrição). */
export const iniciarTranscricao = async (uriGcs: string, nParticipantes: number): Promise<string> => {
  const cliente = await obterCliente();
  const [operacao] = await cliente.batchRecognize(montarPedidoBatch(uriGcs, nParticipantes) as any);
  const nome = String(operacao?.name || '');
  if (!nome) throw new Error('O Speech-to-Text não devolveu a operação.');
  return nome;
};

export type ConsultaTranscricao =
  | { concluida: false }
  | { concluida: true; erro: string }
  | { concluida: true; falas: FalaTranscrita[] };

/** Consulta a operação; quando concluída, devolve as falas (ou um erro legível). */
export const consultarTranscricao = async (nomeOperacao: string, uriGcs?: string): Promise<ConsultaTranscricao> => {
  const cliente = await obterCliente();
  const op: any = await cliente.checkBatchRecognizeProgress(nomeOperacao);
  if (!op?.done) return { concluida: false };
  if (op.error) return { concluida: true, erro: `O Speech-to-Text recusou o áudio (código ${op.error.code ?? '?'}).` };
  return interpretarRespostaBatch(op.result, uriGcs);
};

/** Extrai as falas da BatchRecognizeResponse (puro, testado). */
export const interpretarRespostaBatch = (resposta: any, uriGcs?: string): ConsultaTranscricao => {
  const mapa = resposta?.results || {};
  const arquivo = (uriGcs && mapa[uriGcs]) || Object.values(mapa)[0] as any;
  if (!arquivo) return { concluida: true, erro: 'O Speech-to-Text não devolveu resultado para o áudio.' };
  if (arquivo.error && Number(arquivo.error.code || 0) !== 0) return { concluida: true, erro: `O Speech-to-Text não transcreveu o áudio (código ${arquivo.error.code}).` };
  const resultados = arquivo.inlineResult?.transcript?.results || arquivo.transcript?.results || [];
  const falas = resultadoParaFalas(resultados);
  if (!falas.length) return { concluida: true, erro: 'Nenhuma fala foi reconhecida no áudio.' };
  return { concluida: true, falas };
};
