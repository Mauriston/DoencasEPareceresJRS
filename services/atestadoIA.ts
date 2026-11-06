// Ficheiro: services/atestadoIA.ts
// Leitura do atestado fotografado (Perícia Menor / Atestados).
// Principal: Firebase AI Logic com o Gemini via Vertex AI (dados de saúde ficam no contrato do Google
// Cloud do projeto), saída estruturada por esquema JSON obrigatório e protegida pelo App Check
// (services/appCheck.ts). Reserva: a ação "extrair_dados_atestado" do Apps Script, usada só se o
// AI Logic falhar (ex.: App Check recusado ou serviço indisponível) — a retirar depois de validado.
import { app } from './firebaseAuth';
import { ApiError, chamarScript } from './apiClient';
import { logErroSeguro } from '../utils/logSeguro';

export interface DadosAtestado {
  nomeMilitar?: string;
  dataAtestado?: string;
  tempoAtestado?: string | number;
  cid?: string;
  /** Médico que emitiu o atestado e o CRM dele (atestado externo, para homologação). */
  medicoEmissor?: string;
  crmEmissor?: string;
}

/** Modelo e região do Vertex AI. */
const MODELO = 'gemini-2.5-flash';
const REGIAO = 'us-central1';

const INSTRUCOES = [
  'Você lê a foto de um atestado médico brasileiro e extrai os dados pedidos no esquema.',
  '- nomeMilitar: nome completo do paciente.',
  '- dataAtestado: data de emissão do atestado no formato AAAA-MM-DD.',
  '- tempoAtestado: número de dias de afastamento/dispensa (só o número).',
  '- cid: só o código CID-10 principal, ex.: M54.5.',
  '- medicoEmissor: nome do médico que assina/emite o atestado (carimbo ou assinatura).',
  '- crmEmissor: número do CRM do médico emissor, com a UF se houver, ex.: 12345-PE.',
  'Se um dado não estiver presente ou legível, omita o campo. Não invente dados.',
].join('\n');

/** Leitura pelo Firebase AI Logic (carregado sob demanda para não pesar no bundle inicial). */
const extrairComAiLogic = async (base64Image: string): Promise<DadosAtestado> => {
  const { getAI, getGenerativeModel, VertexAIBackend, Schema } = await import('firebase/ai');
  const ai = getAI(app, { backend: new VertexAIBackend(REGIAO) });
  const model = getGenerativeModel(ai, {
    model: MODELO,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: Schema.object({
        properties: {
          nomeMilitar: Schema.string(),
          dataAtestado: Schema.string({ description: 'AAAA-MM-DD' }),
          tempoAtestado: Schema.integer({ description: 'dias' }),
          cid: Schema.string({ description: 'código CID-10, ex.: M54.5' }),
          medicoEmissor: Schema.string(),
          crmEmissor: Schema.string(),
        },
        optionalProperties: ['nomeMilitar', 'dataAtestado', 'tempoAtestado', 'cid', 'medicoEmissor', 'crmEmissor'],
      }),
    },
  });
  const r = await model.generateContent([INSTRUCOES, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }]);
  return JSON.parse(r.response.text()) as DadosAtestado;
};

/** Reserva: Apps Script (Gemini API com chave no script). */
const extrairComAppsScript = async (base64Image: string): Promise<DadosAtestado> => {
  try {
    const dados = await chamarScript<DadosAtestado | undefined>('extrair_dados_atestado', { base64Image }, {
      mensagemRede: 'Sem comunicação com o servidor de leitura do atestado (Apps Script). Tente novamente.',
    });
    if (!dados) throw new ApiError('negocio', 'Não foi possível ler o atestado.');
    return dados;
  } catch (e) {
    if (e instanceof ApiError && e.codigo === 'timeout') throw new Error('A leitura do atestado demorou demais. Tente novamente.');
    throw e;
  }
};

export const extrairDadosAtestado = async (base64Image: string): Promise<DadosAtestado> => {
  try {
    return await extrairComAiLogic(base64Image);
  } catch (e) {
    logErroSeguro('Leitura do atestado pelo Firebase AI Logic falhou; usando o Apps Script', e);
    return extrairComAppsScript(base64Image);
  }
};
