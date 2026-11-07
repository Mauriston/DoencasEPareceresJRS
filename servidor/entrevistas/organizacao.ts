// Ficheiro: servidor/entrevistas/organizacao.ts
// Organização da anamnese pelo Gemini no Vertex AI (dado de saúde: Vertex, com as credenciais da conta
// de serviço do Cloud Run — nunca a Gemini API com chave). Resposta em JSON com esquema; a
// normalização (`normalizarResultado`) é pura e testada.

import { Type, type Schema } from '@google/genai';
import type { AnamneseEntrevista, CitacaoLiteral, FalaTranscrita, FonteInformacao, ItemCronologia, ParticipanteEntrevista } from '../../config/entrevistas';
import { montarPromptAnamnese } from './prompt';
import { projetoGoogle } from './transcricao';

/** Mesmo modelo de services/geminiAI.ts (MODELO_GEMINI). */
export const MODELO_GEMINI_ENTREVISTA = (process.env.GEMINI_MODELO_ENTREVISTA || 'gemini-3.5-flash').trim();
const localizacaoGemini = () => (process.env.GEMINI_LOCALIZACAO || 'global').trim();

export const NAO_REFERIDO = 'Não referido';
export const NAO_IDENTIFICADO = 'Não identificado';
const FONTES: FonteInformacao[] = ['relato_inspecionado', 'documento_citado', 'perito', 'acompanhante', 'outro'];

const STR = { type: Type.STRING } as const;
const LISTA_STR = { type: Type.ARRAY, items: STR } as const;

/** Esquema de resposta: AnamneseEntrevista + mapaFalantes (lista {rotulo, nome}, pois o esquema não aceita chaves dinâmicas). */
export const ESQUEMA_RESPOSTA: Schema = {
  type: Type.OBJECT,
  properties: {
    mapaFalantes: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { rotulo: STR, nome: STR }, required: ['rotulo', 'nome'] },
    },
    anamnese: {
      type: Type.OBJECT,
      properties: {
        resumoExecutivo: STR,
        queixaPrincipal: STR,
        alegacoesInspecionado: LISTA_STR,
        historiaCronologica: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              quando: STR,
              evento: STR,
              fonte: { type: Type.STRING, enum: FONTES },
              tempoSeg: { type: Type.NUMBER },
            },
            required: ['quando', 'evento', 'fonte'],
          },
        },
        antecedentes: LISTA_STR,
        medicacoes: LISTA_STR,
        tratamentos: LISTA_STR,
        examesCitados: LISTA_STR,
        repercussaoFuncional: STR,
        secaoFinalidade: { type: Type.OBJECT, properties: { titulo: STR, texto: STR }, required: ['titulo', 'texto'] },
        pontosAEsclarecer: LISTA_STR,
        citacoes: {
          type: Type.ARRAY,
          items: { type: Type.OBJECT, properties: { falante: STR, texto: STR, tempoSeg: { type: Type.NUMBER } }, required: ['falante', 'texto', 'tempoSeg'] },
        },
      },
      required: ['resumoExecutivo', 'queixaPrincipal', 'alegacoesInspecionado', 'historiaCronologica', 'antecedentes', 'medicacoes',
        'tratamentos', 'examesCitados', 'repercussaoFuncional', 'secaoFinalidade', 'pontosAEsclarecer', 'citacoes'],
    },
  },
  required: ['mapaFalantes', 'anamnese'],
};

// ------------------------------------------------------------------ normalização (pura)

const txt = (v: unknown, max = 4000): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').replace(/[ \t]+/g, ' ').trim().slice(0, max);
const txtOu = (v: unknown, padrao = NAO_REFERIDO, max = 4000) => txt(v, max) || padrao;
const lista = (v: unknown, max = 80): string[] => (Array.isArray(v) ? v : []).map(x => txt(x, 1000)).filter(Boolean).slice(0, max);
const segundos = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : undefined;
};

export interface ResultadoOrganizacao { anamnese: AnamneseEntrevista; mapaFalantes: Record<string, string> }

/**
 * Valida e normaliza a resposta do modelo: arrays ausentes viram [], textos vazios viram "Não referido",
 * fontes desconhecidas viram "outro", itens sem conteúdo são descartados; o mapa de falantes só aceita
 * rótulos que existem na transcrição e nomes da lista de participantes (o resto vira "Não identificado").
 */
export const normalizarResultado = (
  bruto: unknown,
  ctx: { finalidade: string; participantes: ParticipanteEntrevista[]; rotulos: string[] },
): ResultadoOrganizacao => {
  const r: any = bruto && typeof bruto === 'object' ? bruto : {};
  const a: any = r.anamnese && typeof r.anamnese === 'object' ? r.anamnese : r;

  const historiaCronologica: ItemCronologia[] = (Array.isArray(a.historiaCronologica) ? a.historiaCronologica : [])
    .map((i: any): ItemCronologia | null => {
      const evento = txt(i?.evento, 1500);
      if (!evento) return null;
      const fonte = FONTES.includes(i?.fonte) ? i.fonte as FonteInformacao : 'outro';
      const t = segundos(i?.tempoSeg);
      return { quando: txtOu(i?.quando, NAO_REFERIDO, 120), evento, fonte, ...(t !== undefined ? { tempoSeg: t } : {}) };
    })
    .filter(Boolean).slice(0, 120) as ItemCronologia[];

  const citacoes: CitacaoLiteral[] = (Array.isArray(a.citacoes) ? a.citacoes : [])
    .map((c: any): CitacaoLiteral | null => {
      const texto = txt(c?.texto, 1500);
      if (!texto) return null;
      return { falante: txt(c?.falante, 120) || NAO_IDENTIFICADO, texto, tempoSeg: segundos(c?.tempoSeg) ?? 0 };
    })
    .filter(Boolean).slice(0, 60) as CitacaoLiteral[];

  const sf: any = a.secaoFinalidade && typeof a.secaoFinalidade === 'object' ? a.secaoFinalidade : {};
  const anamnese: AnamneseEntrevista = {
    resumoExecutivo: txtOu(a.resumoExecutivo),
    queixaPrincipal: txtOu(a.queixaPrincipal),
    alegacoesInspecionado: lista(a.alegacoesInspecionado),
    historiaCronologica,
    antecedentes: lista(a.antecedentes),
    medicacoes: lista(a.medicacoes),
    tratamentos: lista(a.tratamentos),
    examesCitados: lista(a.examesCitados),
    repercussaoFuncional: txtOu(a.repercussaoFuncional),
    secaoFinalidade: {
      titulo: txt(sf.titulo, 200) || (txt(ctx.finalidade, 200) ? `Finalidade: ${txt(ctx.finalidade, 200)}` : 'Finalidade da inspeção'),
      texto: txtOu(sf.texto),
    },
    pontosAEsclarecer: lista(a.pontosAEsclarecer),
    citacoes,
  };

  const nomes = new Map(ctx.participantes.map(p => [txt(p.nome, 200).toLocaleLowerCase('pt-BR'), txt(p.nome, 200)]));
  const entradas: Array<{ rotulo?: unknown; nome?: unknown }> = Array.isArray(r.mapaFalantes) ? r.mapaFalantes
    : r.mapaFalantes && typeof r.mapaFalantes === 'object' ? Object.entries(r.mapaFalantes).map(([rotulo, nome]) => ({ rotulo, nome })) : [];
  const sugerido = new Map<string, string>();
  for (const e of entradas) {
    const rotulo = txt(e?.rotulo, 20);
    const nome = nomes.get(txt(e?.nome, 200).toLocaleLowerCase('pt-BR'));
    if (rotulo && nome && !sugerido.has(rotulo)) sugerido.set(rotulo, nome);
  }
  const mapaFalantes: Record<string, string> = {};
  for (const rot of ctx.rotulos) mapaFalantes[rot] = sugerido.get(rot) || NAO_IDENTIFICADO;
  return { anamnese, mapaFalantes };
};

// ------------------------------------------------------------------ chamada ao Gemini (Vertex AI)

export const organizarAnamnese = async (entrada: {
  finalidade: string;
  participantes: ParticipanteEntrevista[];
  transcricao: FalaTranscrita[];
  mapaConfirmado?: Record<string, string> | null;
}): Promise<ResultadoOrganizacao> => {
  const { GoogleGenAI } = await import('@google/genai');
  // project/location explícitos: o SDK ignora a GEMINI_API_KEY do ambiente e usa as credenciais padrão (Vertex).
  const ai = new GoogleGenAI({ vertexai: true, project: projetoGoogle(), location: localizacaoGemini() });
  const resposta = await ai.models.generateContent({
    model: MODELO_GEMINI_ENTREVISTA,
    contents: montarPromptAnamnese(entrada),
    config: { responseMimeType: 'application/json', responseSchema: ESQUEMA_RESPOSTA, temperature: 0.2 },
  });
  const texto = String(resposta.text || '').trim();
  if (!texto) throw new Error('O Gemini não devolveu a anamnese.');
  let json: unknown;
  try { json = JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw new Error('O Gemini devolveu uma resposta inválida.'); }
  const rotulos = [...new Set(entrada.transcricao.map(f => f.falante))];
  const resultado = normalizarResultado(json, { finalidade: entrada.finalidade, participantes: entrada.participantes, rotulos });
  // Mapa confirmado pelo perito prevalece sobre o que o modelo devolver.
  if (entrada.mapaConfirmado && Object.keys(entrada.mapaConfirmado).length) resultado.mapaFalantes = { ...entrada.mapaConfirmado };
  return resultado;
};
