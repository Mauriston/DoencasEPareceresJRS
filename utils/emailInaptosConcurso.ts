// Ficheiro: utils/emailInaptosConcurso.ts
// Regras puras do e-mail "{concurso} - Candidatos Inaptos" à EAMPE (servidor/email/inaptosConcurso.ts e botão
// da página do concurso). Testes em utils/__tests__/emailInaptosConcurso.test.ts.

/** Candidato com resultado INAPTO cujo e-mail à EAMPE ainda não saiu. */
export const inaptoPendente = (c: { status?: string; emailInaptoEnviadoEm?: unknown }): boolean =>
  String(c.status || '').trim().toUpperCase() === 'INAPTO' && !c.emailInaptoEnviadoEm;

/** O botão só existe com o concurso Em andamento. */
export const concursoAceitaEmailInaptos = (status?: string): boolean => status === 'em_andamento';

/** Assunto: "CP-C-FSD-FN-TI/2027 - Candidatos Inaptos". */
export const assuntoInaptos = (nomeConcurso: string): string => `${String(nomeConcurso || '').trim()} - Candidatos Inaptos`;

/** "2026-11-04" → "04/11/2026" (vazio fora de AAAA-MM-DD). */
export const dataBrCurta = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
