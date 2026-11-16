// Ficheiro: utils/exclusaoIS.ts
// Regras puras da EXCLUSÃO de uma IS (app e servidor — rota POST /api/inspecoes/excluir, servidor/inspecoes/excluir.ts):
//  - quem pode: a função "inspecoes.excluir" (padrão: Admin e Secretaria), só com a IS NÃO finalizada; o Admin
//    também apaga IS finalizada (menu "Apagar IS" da página Inspeções de Saúde);
//  - o que vai junto: subcoleções da IS, mensagens registradas, horários da agenda, PDFs no Storage
//    (inspecoes/{id}/… e o áudio das entrevistas), pedidos de parecer vinculados (e os PDFs) e o evento do Google Agenda.
// Testadas em utils/__tests__/exclusaoIS.test.ts.

/** Subcoleções de inspecoes/{id} apagadas junto com a IS (o recursiveDelete do servidor pega também as que surgirem). */
export const SUBCOLECOES_IS = ['exames', 'entrevistas', 'emails', 'mensagens'] as const;

/** Prefixos do Storage com arquivos da IS. */
export const prefixosStorageIS = (isId: string): string[] => [`inspecoes/${isId}/`, `entrevistas/${isId}/`];

/** PDF de um pedido de parecer no Storage (pareceres/{id}.pdf; os mais antigos ficam no Drive). */
export const caminhoPdfParecer = (parecerId: string): string => `pareceres/${parecerId}.pdf`;

/** Pode excluir a IS? ('' = pode; senão, o motivo). */
export const motivoNaoExcluir = (p: { perfil: string | undefined; temFuncao: boolean; situacao: string | undefined }): string => {
  if (p.perfil === 'admin') return '';
  if (!p.temFuncao) return 'Seu perfil não tem permissão para excluir IS.';
  if (p.situacao === 'finalizada') return 'IS finalizada não pode ser excluída.';
  return '';
};
