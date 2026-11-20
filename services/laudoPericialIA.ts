// Ficheiro: services/laudoPericialIA.ts
// Pré-preenchimento, por IA (Gemini via Firebase AI Logic — services/geminiAI.ts, sem rota no servidor), do formulário
// do Laudo Pericial (Isenção de IR): sugere a doença legal (Lei 7.713/1988, inciso XIV) e redige a "Exposição das
// observações, estudos, exames efetuados…" em itens curtos com as datas, a partir do laudo da IS e das transcrições
// dos exames PDF já lidas pela IA no envio (inspecoes/{id}/exames — services/examesIS.ts). Minimização (LGPD): sem
// nome, NIP, OM nem CPF. Sem exames, a exposição volta vazia. O usuário revisa e edita tudo antes de gerar.
import { gerarComGemini, lerJsonIA } from './geminiAI';
import type { ExameISRecord } from './examesIS';
import { DOENCAS_LEGAIS_IR, ehDoencaLegalIR, sugerirDoencaLegalPeloLaudo, type DoencaLegalIR } from '../utils/documentosIS';

export interface SugestaoLaudoPericial { doenca: DoencaLegalIR | null; exposicao: string }

const dataBr = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso;

/** Texto dos exames enviado ao modelo (título, data, emissor e laudo, limitado). */
export const resumoExamesParaIA = (exames: Pick<ExameISRecord, 'itens'>[], max = 30000): string =>
  exames.flatMap(e => e.itens || []).map((it, i) =>
    `#${i + 1} ${it.titulo || 'Documento'} | data: ${dataBr(it.data) || 'não consta'} | tipo: ${it.tipo}\n${String(it.texto || '').slice(0, 2500)}`,
  ).join('\n\n').slice(0, max);

export const sugerirLaudoPericial = async (
  is: { laudo?: string; finalidade?: string }, exames: Pick<ExameISRecord, 'itens'>[],
): Promise<SugestaoLaudoPericial> => {
  const textoExames = resumoExamesParaIA(exames);
  const r = await gerarComGemini({
    contexto: 'pré-preenchimento do Laudo Pericial (Isenção de IR)',
    instrucoes: [
      'Você auxilia a Junta Regular de Saúde da Marinha do Brasil a preencher o Laudo Pericial de Isenção de Imposto de Renda (DGPM-406, Anexo V-I-1).',
      `Laudo exarado na Inspeção de Saúde: "${String(is.laudo || '').slice(0, 1500)}"`,
      `1) doenca: escolha EXATAMENTE uma das doenças da Lei 7.713/1988 que corresponde ao laudo: ${DOENCAS_LEGAIS_IR.join('; ')}. Reforma por acidente em serviço ou doença ocupacional = "Moléstia Profissional"; visão monocular = "Cegueira (inclusive monocular)".`,
      '2) exposicao: itens curtos (um por linha, sem marcador), em português, só com os exames/laudos/relatórios que fundamentam a conclusão, no formato "Nome do exame (dd/mm/aaaa): achado/conclusão principal." Ordem cronológica. No máximo 8 itens. Sem dados pessoais. Não invente nada que não esteja nos documentos; sem documentos, devolva "".',
      textoExames ? `Documentos médicos da IS (transcrições):\n${textoExames}` : 'Não há documentos médicos anexados à IS.',
    ].join('\n\n'),
    arquivos: [],
    temperature: 0,
    esquema: S => S.object({ properties: { doenca: S.enumString({ enum: [...DOENCAS_LEGAIS_IR] }), exposicao: S.string() } }),
  });
  const j = lerJsonIA<{ doenca?: string; exposicao?: string }>(r, 'A IA devolveu uma resposta inválida. Preencha manualmente.');
  return {
    doenca: ehDoencaLegalIR(j.doenca) ? j.doenca : sugerirDoencaLegalPeloLaudo(is.laudo),
    exposicao: textoExames ? String(j.exposicao || '').split('\n').map(l => l.replace(/^\s*[-•*–]\s*/, '').trim()).filter(Boolean).join('\n') : '',
  };
};
