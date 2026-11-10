// Ficheiro: services/destinatariosIA.ts
// Sugestão de PARA/INFO por IA (Gemini via Firebase AI Logic, services/geminiAI.ts) para a minuta de resultado
// da página Inspeções, quando o roteamento determinístico (utils/destinatariosIS.ts) não decide sozinho — ex.:
// finalidade com nome diferente do Anexo M, inspecionado sem vínculo no cadastro, laudo em redação livre.
//
// A IA NÃO escreve destinatários: ela só escolhe as três CHAVES da tabela do Anexo M da DGPM-406
// (finalidadeIS, situacaoInspecionado, laudo); o PARA/INFO sai sempre de data/destinatariosInspecoes.json.
// Minimização (LGPD): vão só finalidade, grupo, vínculo, posto/quadro e o laudo — sem nome, NIP ou OM.
import { gerarComGemini, lerJsonIA } from './geminiAI';
import { higienizarParaIA } from '../utils/minimizacaoIA';
import { destinatariosPorChaves, tabelaDestinatariosParaPrompt, type Destinatarios } from '../utils/destinatariosIS';

export interface DadosRoteamentoIA {
  finalidade: string;
  grupoFinalidade?: string;
  vinculo?: string;
  /** Só posto/quadro (ex.: "1T (RM2-Md)"), sem NIP e nome. */
  posto?: string;
  laudo: string;
}

interface RespostaRoteamento { finalidadeIS: string; situacaoInspecionado: string; laudo: string; justificativa: string }

export interface SugestaoDestinatarios extends Destinatarios { justificativa: string }

/** "1T (RM2-Md) 12.3456.78 FULANO" → "1T (RM2-Md)" (posto/quadro, antes do NIP). */
export const postoDoInspecionado = (inspecionado: string): string =>
  (inspecionado.split(/\s\d{2}\.?\d{4}\.?\d{2}\b/)[0] || '').trim().slice(0, 40);

const instrucoes = (d: DadosRoteamentoIA): string => [
  'Você roteia mensagens de conclusão de Inspeção de Saúde (IS) da Marinha do Brasil pela tabela do Anexo M, item 2, da DGPM-406.',
  'A tabela (JSON) é hierárquica: finalidadeIS → situacaoInspecionado → laudo ("Any" = qualquer laudo) → para/info.',
  'Escolha a linha que corresponde à IS abaixo e devolva as três chaves COPIADAS LITERALMENTE da tabela.',
  'Regras: temporário (RM2, CPRM/CORM) → "Militares temporários" (se a finalidade só tiver "Militares da ativa", use-a);',
  'carreira → "Militares da ativa"; inativo (RM1, reformado) → "Militares inativos"; servidor civil → variante "- Servidor Civil" da finalidade, quando existir;',
  'laudo: ignore o período das restrições; se o laudo omitir o serviço, deduza-o da situação (ativa → SAM, temporário → SMV, servidor → SPG).',
  'Se nenhuma linha se aplicar com segurança, devolva as três chaves vazias e explique o motivo em "justificativa" (uma frase).',
  '',
  'TABELA:',
  tabelaDestinatariosParaPrompt(),
  '',
  'IS:',
  `- Finalidade: ${higienizarParaIA(d.finalidade, 200)}`,
  `- Grupo da finalidade: ${higienizarParaIA(d.grupoFinalidade || '(não informado)', 100)}`,
  `- Vínculo do inspecionado: ${higienizarParaIA(d.vinculo || '(não informado)', 50)}`,
  `- Posto/quadro: ${higienizarParaIA(d.posto || '(não informado)', 40)}`,
  `- Laudo: ${higienizarParaIA(d.laudo || '(sem laudo)', 600)}`,
].join('\n');

/**
 * Pede à IA as chaves da tabela e devolve PARA/INFO da própria tabela. Null quando a IA não acha linha segura
 * (ou devolve chaves que não existem na tabela) — o perito preenche à mão.
 */
export const sugerirDestinatariosIA = async (d: DadosRoteamentoIA): Promise<SugestaoDestinatarios | null> => {
  const r = await gerarComGemini({
    contexto: 'roteamento PARA/INFO da minuta de IS',
    instrucoes: instrucoes(d),
    arquivos: [],
    temperature: 0,
    esquema: S => S.object({
      properties: {
        finalidadeIS: S.string(), situacaoInspecionado: S.string(), laudo: S.string(), justificativa: S.string(),
      },
    }),
  });
  const j = lerJsonIA<RespostaRoteamento>(r, 'A IA devolveu uma resposta inválida. Tente novamente.');
  if (!j.finalidadeIS || !j.situacaoInspecionado || !j.laudo) return null;
  const dest = destinatariosPorChaves(j.finalidadeIS, j.situacaoInspecionado, j.laudo);
  return dest ? { ...dest, justificativa: (j.justificativa || '').trim() } : null;
};
