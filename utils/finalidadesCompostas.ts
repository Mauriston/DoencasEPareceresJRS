// Ficheiro: utils/finalidadesCompostas.ts
// Finalidades compostas do SINAIS (uma só finalidade no SINAIS, várias partes, um laudo por parte):
// "DEIXAR O SAM / VDF OU TR OU TI", "ENGAJAMENTO / DEIXAR O SMI / VDF OU TR"…
// Aparecem no menu de finalidades num grupo próprio (carregarFinalidadesIS acrescenta), mas as regras da IS
// (CID, restrições, duração da entrevista) são as do grupo Verificações e Términos (VDF/TR/TI).
import type { FinalidadeIS } from './corposQuadros';

export const GRUPO_COMPOSTAS = 'Finalidades compostas';
export const GRUPO_REGRAS_COMPOSTAS = 'Verificações e Términos';

export const FINALIDADES_COMPOSTAS: FinalidadeIS[] = ([
  { nome: 'Controle trienal / VDF ou TR', amp: 'JRS', vinculos: ['Carreira', 'Temporário'] },
  { nome: 'Deixar o SAM / VDF ou TR ou TI', amp: 'JRS', vinculos: ['Carreira'] },
  { nome: 'Deixar o SMI / VDF ou TR ou TI', amp: 'JRS', vinculos: ['Temporário'] },
  { nome: 'Deixar o SMV / VDF ou TR ou TI', amp: 'JRS', vinculos: ['Temporário'] },
  { nome: 'Deixar o SPG / VDF ou TR ou TI', amp: 'JRS', vinculos: ['Carreira', 'Temporário'] },
  { nome: 'Engajamento / Deixar o SMI / VDF ou TR', amp: 'JRS', vinculos: ['Temporário'] },
] as FinalidadeIS[]).map(f => ({ ...f, grupoRegras: GRUPO_REGRAS_COMPOSTAS }));

const POR_NOME = new Map(FINALIDADES_COMPOSTAS.map(f => [f.nome, f]));

export const ehFinalidadeComposta = (nome: string): boolean => POR_NOME.has(nome);

/** Partes da finalidade (cada uma com o seu laudo): a composta dividida em " / "; a simples, ela mesma. */
export const partesDaFinalidade = (nome: string): string[] =>
  POR_NOME.has(nome) ? nome.split(' / ').map(s => s.trim()).filter(Boolean) : [nome];
