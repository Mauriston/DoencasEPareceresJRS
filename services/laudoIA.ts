// Ficheiro: services/laudoIA.ts
// "Conferir com IA" do laudo da IS (Gemini via Firebase AI Logic, services/geminiAI.ts): segunda opinião sobre o
// que as regras determinísticas (utils/validacaoLaudo.ts) não pegam — CID incoerente com a doença descrita,
// enquadramento do item V do art. 108, redação divergente do modelo, ruído de leitura de print. A IA recebe só o
// texto do laudo, as restrições, a finalidade, o contexto derivado e a fatia do JSON da regra da finalidade (sem
// nome, NIP ou outros dados pessoais) e devolve apontamentos; nunca reescreve o laudo.
import { gerarComGemini, lerJsonIA } from './geminiAI';
import type { ContextoLaudo } from '../utils/contextoLaudo';
import type { AchadoLaudo, FormasConclusao, Severidade } from '../utils/validacaoLaudo';

export interface ApontamentoIA { severidade: Severidade; mensagem: string; fonte?: string }

const limitar = (t: string, n: number) => String(t || '').slice(0, n);

export const revisarLaudoComIA = async (p: {
  formas: FormasConclusao; regra: string; finalidade: string; laudo: string; restricoes: string; cid?: string;
  contexto: ContextoLaudo; achados: AchadoLaudo[];
}): Promise<ApontamentoIA[]> => {
  const regra = p.formas.regras[p.regra];
  const laudos = Object.fromEntries((regra?.laudosPermitidos || []).map(id => [id, p.formas.laudos[id]]));
  const instrucoes = [
    'Você é assessor médico-pericial da Junta Regular de Saúde (Marinha do Brasil), especialista na DGPM-406 (9ª Rev.).',
    'Confira se o LAUDO abaixo, de uma Inspeção de Saúde, está de acordo com as formas de conclusão previstas para a finalidade.',
    'Use SOMENTE as regras e modelos fornecidos. Não reescreva o laudo; aponte problemas objetivos e cite a fonte (item da norma).',
    'Verifique: redação divergente do modelo; campos faltantes; "em prorrogação" ausente/indevido; coerência entre o CID e a doença',
    'descrita; enquadramento do item V do art. 108 (PN 3.551/2021); restrições/período onde não cabem; texto complementar obrigatório.',
    'Não repita os apontamentos já feitos pelas regras automáticas. Sem problemas: devolva a lista vazia.',
    '',
    `FINALIDADE: ${limitar(p.finalidade, 200)}`,
    `LAUDO: ${limitar(p.laudo, 3000)}`,
    `RESTRIÇÕES (campo próprio): ${limitar(p.restricoes, 1000) || '(vazio)'}`,
    `CID da IS: ${limitar(p.cid || '', 200) || '(não informado)'}`,
    `CONTEXTO (derivado do cadastro e do histórico; null = sem dado): ${JSON.stringify(p.contexto)}`,
    `REGRA DA FINALIDADE: ${JSON.stringify(regra)}`,
    `MODELOS PERMITIDOS: ${JSON.stringify(laudos)}`,
    `APONTAMENTOS JÁ FEITOS PELAS REGRAS: ${JSON.stringify(p.achados.map(a => a.mensagem))}`,
  ].join('\n');
  const r = await gerarComGemini({
    contexto: 'conferência de laudo da IS',
    instrucoes,
    arquivos: [],
    temperature: 0,
    esquema: Schema => Schema.object({
      properties: {
        apontamentos: Schema.array({
          items: Schema.object({
            properties: { severidade: Schema.enumString({ enum: ['erro', 'alerta'] }), mensagem: Schema.string(), fonte: Schema.string() },
            optionalProperties: ['fonte'],
          }),
        }),
      },
    }),
  });
  const j = lerJsonIA<{ apontamentos?: ApontamentoIA[] }>(r, 'A IA não conseguiu conferir o laudo. Tente novamente.');
  return (j.apontamentos || []).filter(a => a && a.mensagem).slice(0, 10).map(a => ({ severidade: a.severidade === 'erro' ? 'erro' : 'alerta', mensagem: limitar(a.mensagem, 500), fonte: a.fonte ? limitar(a.fonte, 80) : undefined }));
};
