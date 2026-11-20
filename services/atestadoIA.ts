// Ficheiro: services/atestadoIA.ts
// Leitura do atestado fotografado (Perícia Menor / Atestados) pelo Gemini via Firebase AI Logic
// (services/geminiAI.ts), com saída estruturada por esquema JSON obrigatório.
import { gerarComGemini, lerJsonIA, type ArquivoIA } from './geminiAI';
import { CATEGORIAS_ATESTADO, ehCategoriaAtestado } from '../utils/examesIS';
import type { TranscricaoAtestadoPM } from './firestorePericiasMenores';
import { dataCivilISO } from '../utils/dados';

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
  'Se vierem várias imagens, são páginas (ou frente e verso) do MESMO documento, na ordem: combine as informações.',
  '- nomeMilitar: nome completo do paciente.',
  '- dataAtestado: data de emissão do atestado no formato AAAA-MM-DD.',
  '- tempoAtestado: número de dias de afastamento/dispensa (só o número).',
  '- cid: só o código CID-10 principal, ex.: M54.5.',
  '- medicoEmissor: nome do médico que assina/emite o atestado (carimbo ou assinatura).',
  '- crmEmissor: número do CRM do médico emissor, com a UF se houver, ex.: 12345-PE.',
  'Se um dado não estiver presente ou legível, omita o campo. Não invente dados.',
].join('\n');

/** Página digitalizada (data URL) → arquivo para o Gemini. */
export const dataUrlParaArquivoIA = (dataUrl: string): ArquivoIA => {
  const [cab, base64 = ''] = dataUrl.split(',');
  return { base64, mimeType: /data:([^;]+)/.exec(cab)?.[1] || 'image/jpeg' };
};

/** Lê o atestado: uma imagem (base64 JPEG) ou as páginas digitalizadas (data URLs), pelo Firebase AI Logic. */
export const extrairDadosAtestado = async (imagens: string | string[]): Promise<DadosAtestado> => {
  const arquivos = typeof imagens === 'string'
    ? [{ base64: imagens, mimeType: 'image/jpeg' }]
    : imagens.map(dataUrlParaArquivoIA);
  try {
    const r = await gerarComGemini({
      contexto: 'leitura do atestado',
      instrucoes: INSTRUCOES,
      arquivos,
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

// ---- Transcrição do atestado da Perícia Menor (aba Atestados e Laudos da Ficha) ----
// A mesma leitura dos PDFs das IS (services/examesIS.ts): categoria, especialidade, data de emissão, emissor e o
// texto na íntegra. Roda em segundo plano depois do registro (não atrasa o envio) e grava em periciasMenores/{id}.transcricao.

const INSTRUCOES_TRANSCRICAO = [
  'Você lê a imagem de um documento médico brasileiro (via de regra um atestado) apresentado para homologação numa perícia',
  'médica da Marinha do Brasil e devolve (várias imagens = páginas do mesmo documento, na ordem):',
  '- categoria: atestado (atestado médico), laudo (laudo médico) ou relatorio (relatório médico ou parecer);',
  '- especialidade: a especialidade médica do documento (do emissor ou do conteúdo), ex.: "Ortopedia", "Clínica Médica";',
  '  vazia se não for possível deduzir;',
  '- dataEmissao: data de emissão no formato AAAA-MM-DD (vazia se não constar);',
  '- emissor: serviço/clínica e/ou profissional que assina, com o CRM se houver (vazio se não constar);',
  '- texto: o documento NA ÍNTEGRA, transcrito fielmente, sem resumir, interpretar ou corrigir. Omita só cabeçalhos e',
  '  rodapés administrativos (endereço, telefone, site, códigos de autenticação).',
].join('\n');

export const transcreverAtestadoPM = async (arquivos: ArquivoIA[]): Promise<TranscricaoAtestadoPM> => {
  const r = await gerarComGemini({
    contexto: 'transcrição do atestado (perícia menor)',
    instrucoes: INSTRUCOES_TRANSCRICAO,
    arquivos,
    temperature: 0,
    maxOutputTokens: 16384,
    esquema: Schema => Schema.object({
      properties: {
        categoria: Schema.enumString({ enum: [...CATEGORIAS_ATESTADO] }),
        especialidade: Schema.string(), dataEmissao: Schema.string(), emissor: Schema.string(), texto: Schema.string(),
      },
      optionalProperties: ['categoria', 'especialidade', 'dataEmissao', 'emissor'],
    }),
  });
  const l = lerJsonIA<{ categoria?: string; especialidade?: string; dataEmissao?: string; emissor?: string; texto?: string }>(r, 'A IA não conseguiu ler o atestado.');
  const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    categoria: ehCategoriaAtestado(l.categoria) ? l.categoria : 'atestado',
    especialidade: txt(l.especialidade).replace(/\s+/g, ' '),
    dataEmissao: dataCivilISO(txt(l.dataEmissao)) || '',
    emissor: txt(l.emissor).replace(/\s+/g, ' '),
    texto: txt(l.texto),
    textoIncompleto: r.cortada,
  };
};
