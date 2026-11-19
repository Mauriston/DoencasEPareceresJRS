// Ficheiro: utils/exclusaoPericia.ts
// Regras puras da EXCLUSÃO de uma perícia menor (app e servidor — servidor/pericias/excluir.ts):
//  - o Admin exclui qualquer registro, sem justificativa obrigatória;
//  - o médico exclui só a perícia em que é o perito responsável (peritoUid) ou que ele mesmo registrou
//    (criadoPor), e precisa escrever a Justificativa (mínimo de 10 caracteres), guardada no registro da exclusão.
// Testes em utils/__tests__/exclusaoPericia.test.ts.

export const MIN_JUSTIFICATIVA_EXCLUSAO = 10;

export interface QuemExclui { uid: string; perfil: string }

/** Pode excluir: Admin (todas) ou o perito responsável / quem registrou. */
export const podeExcluirPericia = (p: { peritoUid?: string; criadoPor?: string }, quem: QuemExclui | null | undefined): boolean => {
  if (!quem?.uid) return false;
  if (quem.perfil === 'admin') return true;
  return (!!p.peritoUid && p.peritoUid === quem.uid) || (!!p.criadoPor && p.criadoPor === quem.uid);
};

/** A justificativa é obrigatória fora do Admin. Devolve a mensagem de erro ('' quando está ok). */
export const erroJustificativaExclusao = (texto: string | undefined | null, perfil: string): string => {
  if (perfil === 'admin') return '';
  const t = String(texto ?? '').trim();
  if (!t) return 'Escreva a justificativa da exclusão.';
  if (t.length < MIN_JUSTIFICATIVA_EXCLUSAO) return `A justificativa precisa ter ao menos ${MIN_JUSTIFICATIVA_EXCLUSAO} caracteres.`;
  return '';
};

/** "Minhas" na lista da Perícia Menor: as perícias em que o usuário é o PERITO RESPONSÁVEL (não quem registrou). */
export const ehMinhaPericia = (p: { peritoUid?: string }, uid: string | undefined): boolean => !!uid && p.peritoUid === uid;
