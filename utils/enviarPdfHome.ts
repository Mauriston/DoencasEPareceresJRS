// Ficheiro: utils/enviarPdfHome.ts
// Regras puras do "Enviar PDF ▾" da Início (Secretaria): a IA identifica o nome do inspecionado no PDF e o app procura
// uma IS aberta ou em andamento dele (situacao 'aberta' | 'andamento'). Sem IS ativa, o envio não segue: o app pergunta
// se abre uma IS (Início → Inspeções de Saúde ?novo=manual) ou aborta.
import { normalizarTexto } from './destinatariosIS';

export type DestinoPdfHome = 'exames' | 'atestados';
export const DESTINOS_PDF_HOME: Record<DestinoPdfHome, { rotulo: string; icone: string; campo: string }> = {
  exames: { rotulo: 'Exames', icone: 'lab_profile', campo: 'Laudos e resultados de exames' },
  atestados: { rotulo: 'Atestados e Laudos', icone: 'note_alt', campo: 'Atestados, relatórios e laudos médicos' },
};

interface ISMin { id: string; is: number; situacao?: string; inspecionado: string }

/** IS aberta ou em andamento (agendada, reagendada e demais status da situação "em andamento"). */
export const isAbertaOuEmAndamento = (is: Pick<ISMin, 'situacao'>) => is.situacao === 'aberta' || is.situacao === 'andamento';

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const tokensDoNome = (nome: string) => normalizarTexto(nome).split(/[^a-z0-9]+/).filter(t => t && !PARTICULAS.has(t));

/** O nome lido no PDF corresponde ao texto "POSTO (QUADRO) NIP NOME"? Todas as palavras do nome (≥ 2) devem constar. */
export const nomeConfere = (nomeLido: string, textoCadastro: string): boolean => {
  const lidos = tokensDoNome(nomeLido);
  if (lidos.length < 2) return false;
  const cadastro = new Set(tokensDoNome(textoCadastro));
  return lidos.every(t => cadastro.has(t));
};

/** IS ativa do inspecionado; com mais de uma, a mais recente (maior número). */
export const isAtivaDoInspecionado = <T extends ISMin>(nomeLido: string, inspecoes: readonly T[]): T | null =>
  inspecoes.filter(i => isAbertaOuEmAndamento(i) && nomeConfere(nomeLido, i.inspecionado)).sort((a, b) => b.is - a.is)[0] ?? null;

/** Cadastro do inspecionado pelo nome lido (para abrir a IS já com ele escolhido); só com uma correspondência. */
export const militarPeloNome = <T extends { id: string; nome: string }>(nomeLido: string, militares: readonly T[]): T | null => {
  const achados = militares.filter(m => nomeConfere(nomeLido, m.nome));
  return achados.length === 1 ? achados[0] : null;
};

export const mensagemSemIS = (nome: string) =>
  `O envio de documentos deve estar relacionado a uma IS e não há IS aberta ou em andamento para ${nome}. Deseja abrir uma IS?`;
