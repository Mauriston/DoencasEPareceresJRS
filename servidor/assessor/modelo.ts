// Ficheiro: servidor/assessor/modelo.ts
// Provedor de IA do Assessor IA — o ÚNICO ponto que muda para trocar de modelo. Dado de saúde: sempre no Vertex AI
// do projeto (credenciais da conta de serviço do Cloud Run; nunca chave de API).
//   ASSESSOR_PROVEDOR = "gemini" (padrão) | "claude"
//   ASSESSOR_MODELO_GEMINI (padrão gemini-3.1-pro-preview) · ASSESSOR_MODELO_CLAUDE (padrão claude-opus-5-5)
//   ASSESSOR_LOCALIZACAO (padrão global)
// O Claude no Vertex depende da cota "Global online prediction requests per base model" (anthropic-claude-opus)
// liberada no projeto; enquanto ela não sai, fica o Gemini.
import { Type, type Schema } from '@google/genai';
import { projetoGoogle } from '../entrevistas/transcricao';
import type { MensagemConversa } from './prompt';

export type ProvedorAssessor = 'gemini' | 'claude';
export const provedorAssessor = (): ProvedorAssessor => ((process.env.ASSESSOR_PROVEDOR || '').trim().toLowerCase() === 'claude' ? 'claude' : 'gemini');
const localizacao = () => (process.env.ASSESSOR_LOCALIZACAO || 'global').trim();
const modeloGemini = () => (process.env.ASSESSOR_MODELO_GEMINI || 'gemini-3.1-pro-preview').trim();
const modeloClaude = () => (process.env.ASSESSOR_MODELO_CLAUDE || 'claude-opus-5-5').trim();

const STR = { type: Type.STRING } as const;
/** Esquema da resposta (Gemini); o Claude recebe o mesmo formato pelas instruções. */
export const ESQUEMA_ASSESSOR: Schema = {
  type: Type.OBJECT,
  properties: {
    mensagem: STR,
    entrevista: STR,
    exameClinico: STR,
    conclusao: STR,
    laudos: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { finalidade: STR, laudo: STR }, required: ['finalidade', 'laudo'] } },
    cid: { type: Type.OBJECT, properties: { codigo: STR, descricao: STR }, required: ['codigo', 'descricao'] },
  },
  required: ['mensagem', 'entrevista', 'exameClinico', 'conclusao', 'laudos', 'cid'],
};

export interface SaidaModelo { texto: string; modelo: string; cortada: boolean }

const chamarGemini = async (sistema: string, conversa: MensagemConversa[]): Promise<SaidaModelo> => {
  const { GoogleGenAI } = await import('@google/genai');
  // project/location explícitos: o SDK ignora a GEMINI_API_KEY do ambiente e usa as credenciais padrão (Vertex).
  const ai = new GoogleGenAI({ vertexai: true, project: projetoGoogle(), location: localizacao() });
  const modelo = modeloGemini();
  const r = await ai.models.generateContent({
    model: modelo,
    contents: conversa.map(m => ({ role: m.papel === 'assessor' ? 'model' : 'user', parts: [{ text: m.texto }] })),
    config: { systemInstruction: sistema, responseMimeType: 'application/json', responseSchema: ESQUEMA_ASSESSOR, temperature: 0.2, maxOutputTokens: 16_384 },
  });
  const fim = String(r.candidates?.[0]?.finishReason || '');
  return { texto: String(r.text || ''), modelo, cortada: fim === 'MAX_TOKENS' };
};

/** Claude no Vertex AI (rawPredict, formato da Messages API da Anthropic). */
const chamarClaude = async (sistema: string, conversa: MensagemConversa[]): Promise<SaidaModelo> => {
  // Token OAuth das credenciais padrão (conta de serviço do Cloud Run; escopo cloud-platform do Admin SDK).
  const { applicationDefault } = await import('firebase-admin/app');
  const token = (await applicationDefault().getAccessToken()).access_token;
  const modelo = modeloClaude();
  const loc = localizacao();
  const host = loc === 'global' ? 'aiplatform.googleapis.com' : `${loc}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${projetoGoogle()}/locations/${loc}/publishers/anthropic/models/${modelo}:rawPredict`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anthropic_version: 'vertex-2023-10-16',
      max_tokens: 16_384,
      temperature: 0.2,
      // As instruções (longas e iguais entre pedidos) ficam em cache por alguns minutos: as leituras seguintes saem mais baratas.
      system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
      messages: conversa.map(m => ({ role: m.papel === 'assessor' ? 'assistant' : 'user', content: m.texto })),
    }),
  });
  const json = await resp.json().catch(() => ({})) as any;
  if (!resp.ok) {
    const e = new Error(String(json?.error?.message || `Vertex AI respondeu ${resp.status}`));
    (e as any).status = resp.status;
    throw e;
  }
  const texto = (Array.isArray(json?.content) ? json.content : []).filter((c: any) => c?.type === 'text').map((c: any) => c.text).join('');
  return { texto, modelo, cortada: json?.stop_reason === 'max_tokens' };
};

export const chamarModeloAssessor = (sistema: string, conversa: MensagemConversa[]): Promise<SaidaModelo> =>
  provedorAssessor() === 'claude' ? chamarClaude(sistema, conversa) : chamarGemini(sistema, conversa);
