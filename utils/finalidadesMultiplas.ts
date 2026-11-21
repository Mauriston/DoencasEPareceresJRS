// Ficheiro: utils/finalidadesMultiplas.ts
// IS com mais de uma finalidade (ex.: Benefícios "Preexistência de doença especificada em lei" + "Isenção de IR",
// ou as compostas "Engajamento / Deixar o SMI", "Término de Restrições / Deixar o SMV"). No SiNAIS cada
// finalidade tem o seu laudo. O campo `finalidade` (texto) continua existindo para tudo o que já o lê
// (e-mails, guias, listas): é a junção das finalidades com " / ". A lista fica em `finalidades` e os
// laudos, um por finalidade, em `laudosFinalidades`; o `laudo` (texto) só é preenchido quando TODAS as
// finalidades têm laudo — assim as regras de status/TIS (utils/conclusaoIS.ts) exigem um laudo por finalidade.

import { partesDaFinalidade } from './finalidadesCompostas';

export const SEPARADOR_FINALIDADES = ' / ';

export interface LaudoFinalidade { finalidade: string; laudo: string }

/** Texto único (campo `finalidade`) a partir da lista. */
export const juntarFinalidades = (lista: string[]): string =>
  lista.map(f => f.trim()).filter(Boolean).join(SEPARADOR_FINALIDADES);

/** Lista das finalidades da IS (docs antigos: só o texto `finalidade`). Não divide o texto: há finalidades com "/" no nome. */
export const finalidadesDaIS = (is: { finalidade?: string; finalidades?: string[] }): string[] =>
  is.finalidades?.length ? is.finalidades.filter(Boolean) : (is.finalidade?.trim() ? [is.finalidade.trim()] : []);

/** Acrescenta (sem repetir) ou retira uma finalidade da lista. */
export const alternarFinalidade = (lista: string[], nome: string): string[] =>
  lista.includes(nome) ? lista.filter(f => f !== nome) : [...lista, nome];

/** Laudos alinhados às finalidades (os de finalidades retiradas saem; as novas começam vazias). */
export const alinharLaudos = (finalidades: string[], laudos: LaudoFinalidade[] = []): LaudoFinalidade[] =>
  finalidades.map(f => ({ finalidade: f, laudo: laudos.find(l => l.finalidade === f)?.laudo ?? '' }));

/**
 * Laudo único (campo `laudo`) a partir dos laudos por finalidade: "FINALIDADE: texto", um por parágrafo.
 * Vazio enquanto alguma finalidade estiver sem laudo.
 */
export const laudoComposto = (laudos: LaudoFinalidade[]): string => {
  if (laudos.length === 0 || laudos.some(l => !l.laudo.trim())) return '';
  if (laudos.length === 1) return laudos[0].laudo.trim();
  return laudos.map(l => `${l.finalidade.toUpperCase()}: ${l.laudo.trim()}`).join('\n\n');
};

/** Laudos por finalidade iniciais de uma IS (docs antigos com uma finalidade: o `laudo` existente). */
export const laudosDaIS = (is: { finalidade?: string; finalidades?: string[]; laudo?: string; laudosFinalidades?: LaudoFinalidade[] }): LaudoFinalidade[] => {
  // Finalidade composta ("Deixar o SAM / VDF ou TR ou TI"): um laudo para cada parte.
  const lista = finalidadesDaIS(is).flatMap(partesDaFinalidade);
  if (is.laudosFinalidades?.length) return alinharLaudos(lista, is.laudosFinalidades);
  if (lista.length === 1) return [{ finalidade: lista[0], laudo: is.laudo || '' }];
  return alinharLaudos(lista);
};
