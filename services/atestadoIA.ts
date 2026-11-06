// Ficheiro: services/atestadoIA.ts
// Leitura do atestado fotografado (Perícia Menor / Atestados) pelo Gemini via Firebase AI Logic
// (services/geminiAI.ts), com saída estruturada por esquema JSON obrigatório.
import { gerarComGemini, lerJsonIA } from './geminiAI';

export interface DadosAtestado {
  nomeMilitar?: string;
  dataAtestado?: string;
  tempoAtestado?: string | number;
  cid?: string;
  /** Médico que emitiu o atestado e o CRM dele (atestado externo, para homologação). */
  medicoEmissor?: string;
  crmEmissor?: string;
}

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

export const extrairDadosAtestado = async (base64Image: string): Promise<DadosAtestado> => {
  try {
    const r = await gerarComGemini({
      contexto: 'leitura do atestado',
      instrucoes: INSTRUCOES,
      arquivos: [{ base64: base64Image, mimeType: 'image/jpeg' }],
      esquema: Schema => Schema.object({
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
    });
    return lerJsonIA<DadosAtestado>(r, 'Não foi possível ler o atestado automaticamente.');
  } catch {
    throw new Error('Não foi possível ler o atestado automaticamente.');
  }
};
