// Ficheiro: services/afastamentoIA.ts
// Leitura, pelo Gemini via Firebase AI Logic (services/geminiAI.ts), do documento enviado no formulário de férias /
// afastamento (página Férias). Não há modelo fixo: Comunicação Padronizada de férias, portaria, atestado/papeleta de
// LTS, licença administrativa… A IA identifica do que se trata e extrai só o que estiver escrito (esquema JSON).
import { arquivoParaBase64IA, gerarComGemini, lerJsonIA } from './geminiAI';
import type { TipoAfastamento } from '../utils/afastamentos';

export interface DadosAfastamentoIA {
  /** O que é o documento, em poucas palavras (ex.: "CP de férias relativas a 2026"). */
  resumo?: string;
  tipo?: TipoAfastamento;
  /** Nome completo de quem vai se afastar (não de quem assina por ordem nem do substituto). */
  nome?: string;
  posto?: string;
  dataInicio?: string;
  dataFim?: string;
  duracaoDias?: number;
  /** Ano de referência (exercício) das férias. */
  referencia?: string;
  /** Motivo da licença administrativa. */
  motivo?: string;
}

const INSTRUCOES = [
  'Você lê um documento militar da Marinha do Brasil (PDF ou foto) sobre férias ou afastamento de um militar/servidor',
  '(ex.: Comunicação Padronizada de férias, portaria, papeleta/atestado de LTS — Licença para Tratamento de Saúde —,',
  'licença administrativa). Não há modelo fixo: primeiro entenda do que se trata e depois extraia os dados do esquema.',
  '- resumo: o que é o documento, em até 12 palavras.',
  '- tipo: "ferias" (férias), "lts" (licença/afastamento para tratamento de saúde) ou "lic_adm" (licença administrativa, dispensa, núpcias, luto, paternidade, etc.).',
  '- nome: nome completo de QUEM SE AFASTA (em CP de férias, normalmente quem assina participando "tenho a intenção de gozar");',
  '  NUNCA o substituto ("responderá pela...") nem quem apenas despacha.',
  '- posto: posto/graduação dessa pessoa, se houver.',
  '- dataInicio e dataFim: período do afastamento no formato AAAA-MM-DD. Datas militares como "05 a 19JAN2027" = 2027-01-05 a 2027-01-19.',
  '- duracaoDias: número de dias do afastamento (inclusive), se escrito ou se calculável pelo período.',
  '- referencia: ano de referência/exercício das férias (ex.: "relativas ao exercício de 2026" → "2026").',
  '- motivo: motivo da licença administrativa, em poucas palavras.',
  'Se um dado não estiver no documento, omita o campo. Não invente.',
].join('\n');

/** Lê o documento (PDF ou imagem) e devolve os dados encontrados. */
export const extrairDadosAfastamento = async (arquivo: File): Promise<DadosAfastamentoIA> => {
  const base64 = await arquivoParaBase64IA(arquivo);
  try {
    const r = await gerarComGemini({
      contexto: 'leitura do documento de férias/afastamento',
      instrucoes: INSTRUCOES,
      arquivos: [{ base64, mimeType: arquivo.type || 'application/pdf' }],
      esquema: Schema => Schema.object({
        properties: {
          resumo: Schema.string(),
          tipo: Schema.enumString({ enum: ['ferias', 'lts', 'lic_adm'] }),
          nome: Schema.string(),
          posto: Schema.string(),
          dataInicio: Schema.string({ description: 'AAAA-MM-DD' }),
          dataFim: Schema.string({ description: 'AAAA-MM-DD' }),
          duracaoDias: Schema.integer(),
          referencia: Schema.string({ description: 'ano, ex.: 2026' }),
          motivo: Schema.string(),
        },
        optionalProperties: ['resumo', 'tipo', 'nome', 'posto', 'dataInicio', 'dataFim', 'duracaoDias', 'referencia', 'motivo'],
      }),
    });
    return lerJsonIA<DadosAfastamentoIA>(r, 'Não foi possível ler o documento automaticamente.');
  } catch {
    throw new Error('Não foi possível ler o documento automaticamente. Preencha os campos à mão.');
  }
};
