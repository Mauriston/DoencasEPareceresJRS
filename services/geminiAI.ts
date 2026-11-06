// Ficheiro: services/geminiAI.ts
// Ponto único de acesso ao Gemini no app: Firebase AI Logic com o backend Vertex AI (Agent Platform),
// protegido pelo App Check (services/appCheck.ts). Os dados (atestados, laudos, mensagens) ficam no
// contrato do Google Cloud do projeto. O SDK (firebase/ai) é carregado sob demanda.
// Usado por: leitura do atestado (atestadoIA.ts), minuta de mensagens (Mensagens.tsx), leitura da
// mensagem de concurso e transcrição dos exames do candidato (driveConcursos.ts).
import { app } from './firebaseAuth';
import { logErroSeguro } from '../utils/logSeguro';
import type { ObjectSchema } from 'firebase/ai';

/** Modelo e região do Vertex AI. Em nov/2026 o projeto só tem acesso aos Gemini atuais na região
 * "global" (o gemini-2.5-flash e a região us-central1 respondem 404). */
export const MODELO_GEMINI = 'gemini-3.5-flash';
export const REGIAO_GEMINI = 'global';

/** Arquivo enviado ao modelo (imagem ou PDF) em base64, sem o prefixo "data:". */
export interface ArquivoIA { base64: string; mimeType: string }

interface Opcoes {
  /** Instruções (prompt) enviadas antes dos arquivos. */
  instrucoes: string;
  arquivos: ArquivoIA[];
  /** Resposta em JSON: com esquema (estrutura obrigatória) ou livre (só "application/json"). */
  json?: boolean;
  esquema?: (S: typeof import('firebase/ai').Schema) => ObjectSchema;
  temperature?: number;
  maxOutputTokens?: number;
  /** Rótulo para o log de erros (sem dados pessoais). */
  contexto: string;
}

export interface RespostaIA { texto: string; cortada: boolean }

/** Chama o Gemini e devolve o texto da resposta; erros viram mensagens claras (sem expor detalhes). */
export const gerarComGemini = async (o: Opcoes): Promise<RespostaIA> => {
  const { getAI, getGenerativeModel, VertexAIBackend, Schema } = await import('firebase/ai');
  const ai = getAI(app, { backend: new VertexAIBackend(REGIAO_GEMINI) });
  const model = getGenerativeModel(ai, {
    model: MODELO_GEMINI,
    generationConfig: {
      ...(o.json || o.esquema ? { responseMimeType: 'application/json' } : {}),
      ...(o.esquema ? { responseSchema: o.esquema(Schema) } : {}),
      ...(o.temperature !== undefined ? { temperature: o.temperature } : {}),
      ...(o.maxOutputTokens ? { maxOutputTokens: o.maxOutputTokens } : {}),
    },
  });
  try {
    const r = await model.generateContent([o.instrucoes, ...o.arquivos.map(a => ({ inlineData: { mimeType: a.mimeType, data: a.base64 } }))]);
    const cortada = r.response.candidates?.[0]?.finishReason === 'MAX_TOKENS';
    return { texto: r.response.text(), cortada };
  } catch (e) {
    logErroSeguro(`Gemini (AI Logic) falhou: ${o.contexto}`, e);
    const msg = String((e as Error)?.message || '');
    if (/quota|resource.exhausted|429/i.test(msg)) throw new Error('Limite de uso da IA atingido. Tente novamente em alguns minutos.');
    if (/app.?check|unauthenticated|permission|403|401/i.test(msg)) throw new Error('O app não foi autorizado a usar a IA (App Check). Recarregue a página e tente novamente.');
    if (/unavailable|503|500|overloaded/i.test(msg)) throw new Error('A IA está indisponível no momento. Tente novamente em alguns minutos.');
    throw new Error('A IA não conseguiu processar o pedido. Tente novamente.');
  }
};

/** Interpreta a resposta JSON; texto inválido vira a mensagem informada. */
export const lerJsonIA = <T>(r: RespostaIA, mensagemErro: string): T => {
  try { return JSON.parse(r.texto) as T; } catch { throw new Error(mensagemErro); }
};

/** File → base64 (sem o prefixo "data:..."). */
export const arquivoParaBase64IA = (file: Blob): Promise<string> => new Promise((ok, erro) => {
  const leitor = new FileReader();
  leitor.onload = () => ok(String(leitor.result || '').split(',')[1] || '');
  leitor.onerror = () => erro(new Error('Não foi possível ler o arquivo.'));
  leitor.readAsDataURL(file);
});
