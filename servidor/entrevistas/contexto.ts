// Ficheiro: servidor/entrevistas/contexto.ts
// Conhecimento de referência da JRS para o prompt da entrevista ("RAG leve"): glossário da junta
// (fluxo da IS, finalidades, vocabulário de laudos, siglas) + trechos da DGPM-406 da finalidade da IS.
// Os textos vêm de servidor/entrevistas/contexto/*.md, embutidos como strings em contexto/textos.ts
// (gerado por scripts/entrevistas/gerar-contexto.mjs) para entrar no bundle do servidor. Puro e testado.

import { GLOSSARIO_JRS, TRECHO_AO, TRECHO_BENEFICIO, TRECHO_TERMINO, TRECHO_VDF } from './contexto/textos';

export type IdFinalidade = 'ao' | 'vdf' | 'termino' | 'beneficio';

export const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Palavras-chave (sem acento/caixa) de cada finalidade; `sigla` casa no texto original, só em maiúsculas. */
export const FINALIDADES: ReadonlyArray<{ id: IdFinalidade; chaves: RegExp; sigla?: RegExp }> = [
  // "ao" é preposição comum: a sigla AO/ISO casa só em maiúsculas.
  { id: 'ao', chaves: /atestado de origem|inquerito sanitario de origem|acidente/, sigla: /\b(AO|ISO)\b/ },
  { id: 'vdf', chaves: /\bvdf\b|deficiencia funcional|verificacao de deficiencia/ },
  { id: 'termino', chaves: /termino|restric|incapacidade|licenca|\blts\b/ },
  { id: 'beneficio', chaves: /beneficio|doenca especificada|especificada em lei|isencao|reforma/ },
];

/** Finalidades reconhecidas no texto livre da finalidade da IS, na ordem de FINALIDADES. Pura. */
export const finalidadesDaIS = (finalidade: string): IdFinalidade[] => {
  const original = String(finalidade || '');
  const f = semAcento(original);
  return FINALIDADES.filter(r => r.chaves.test(f) || !!r.sigla?.test(original)).map(r => r.id);
};

export const TRECHOS_DGPM: Record<IdFinalidade, string> = {
  ao: TRECHO_AO, vdf: TRECHO_VDF, termino: TRECHO_TERMINO, beneficio: TRECHO_BENEFICIO,
};

/** Glossário da JRS + trechos da DGPM-406 das finalidades reconhecidas (só o glossário se nenhuma). Pura. */
export const contextoParaFinalidade = (finalidade: string): string =>
  [GLOSSARIO_JRS, ...finalidadesDaIS(finalidade).map(id => TRECHOS_DGPM[id])].map(t => t.trim()).join('\n\n---\n\n');
