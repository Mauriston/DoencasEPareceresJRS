// Ficheiro: utils/assessorIA.ts
// Regras puras do "Assessor IA" (chat com a IA na Ficha do inspecionado — components/ficha/assessor/): quem usa,
// quais IS ele atende, as sugestões de comando e o que "Inserir na IS" grava em cada campo.
//   - Uso exclusivo de Admin, user_medicos e user_medicos_mpi (PERFIS_MEDICOS), fora da matriz de permissões.
//   - Só IS em andamento (situação "andamento"): o botão do cabeçalho só aparece se houver ao menos uma.
//   - Campos de redação da IS (gravados só pelo Assessor ou editados depois): redacaoEntrevista,
//     redacaoExameClinico e redacaoConclusao. Inserir qualquer um leva a IS a "Conclusão pendente" (se ainda
//     estiver antes dela); o Laudo segue a regra do campo Laudo (patchConclusao: "Votação pendente" e Data do laudo);
//     o CID vale para qualquer finalidade (Z10.2 quando não há doença).
// Testadas em utils/__tests__/assessorIA.test.ts.
import { PERFIS_MEDICOS, patchConclusao, type EstadoConclusao, type PatchConclusao } from './conclusaoIS';
import { situacaoDoStatus, type StatusIS } from './inspecoes';

export const podeUsarAssessorIA = (perfil: string | undefined | null): boolean => PERFIS_MEDICOS.includes(String(perfil || ''));

export type CampoRedacao = 'redacaoEntrevista' | 'redacaoExameClinico' | 'redacaoConclusao';
export const CAMPOS_REDACAO: { campo: CampoRedacao; rotulo: string }[] = [
  { campo: 'redacaoEntrevista', rotulo: 'Entrevista' },
  { campo: 'redacaoExameClinico', rotulo: 'Exame Clínico' },
  { campo: 'redacaoConclusao', rotulo: 'Conclusão' },
];

/** IS que o Assessor atende: em andamento, da mais recente para a mais antiga (pelo número). */
export const isDoAssessor = <T extends { situacao?: string; status?: string; is?: number }>(lista: T[]): T[] =>
  lista.filter(i => i.situacao === 'andamento' && i.status !== 'cancelada').sort((a, b) => (b.is ?? 0) - (a.is ?? 0));

/** Status anteriores à "Conclusão pendente": inserir um texto da redação leva a ela. */
const ANTES_DA_CONCLUSAO: StatusIS[] = ['aberta', 'realizando_exames', 'agendada', 'reagendada', 'faltou', 'parecer_solicitado'];

/** Patch de "Inserir na IS" para Entrevista, Exame Clínico ou Conclusão. */
export const patchInserirRedacao = (status: StatusIS, campo: CampoRedacao, texto: string): Record<string, unknown> => {
  const patch: Record<string, unknown> = { [campo]: String(texto ?? '').trim() };
  if (ANTES_DA_CONCLUSAO.includes(status)) {
    patch.status = 'conclusao_pendente';
    patch.situacao = situacaoDoStatus('conclusao_pendente');
  }
  return patch;
};

/** Patch de "Inserir na IS" para o Laudo (uma finalidade): as mesmas regras do campo Laudo do detalhe. */
export const patchInserirLaudo = (atual: EstadoConclusao, laudo: string, hoje?: string, perfil?: string): PatchConclusao =>
  patchConclusao(atual, 'laudo', laudo, hoje, perfil).patch;

/** Patch de "Inserir na IS" para o CID (qualquer finalidade). */
export const patchInserirCid = (atualCid: string | undefined, cid: { descrAbrev: string; subcat: string }): { cid?: string; cidCodigo?: string } => {
  const descr = cid.descrAbrev.trim();
  if (!descr || descr === String(atualCid || '').trim()) return {};
  return { cid: descr, cidCodigo: cid.subcat.trim().toUpperCase() };
};

/** CID de quem não tem doença (controle periódico, licenciamento e demais IS de MPI sem doença). */
export const CID_SEM_DOENCA = 'Z10.2';

export interface SugestaoComando { rotulo: string; comando: string }

/** Sugestões de comando mostradas ao abrir o chat. Sem o número da IS: o chat é sempre da IS aberta (o servidor
 *  junta os dados dela a cada pedido). */
export const sugestoesDoAssessor = (is: { grupoFinalidade?: string; laudo?: string }): SugestaoComando[] => {
  const doenca = is.grupoFinalidade === 'Verificações e Términos' || is.grupoFinalidade === 'Benefícios';
  const lista: SugestaoComando[] = [
    { rotulo: 'Redigir a IS', comando: 'Redija a IS.' },
    doenca
      ? { rotulo: 'Redigir com os dados da entrevista', comando: 'Redija a IS. Na entrevista, o inspecionado relatou ' }
      : { rotulo: 'Redigir IS sem alterações', comando: 'Redija a IS. Inspecionado sem queixas e sem alterações ao exame.' },
    { rotulo: 'Qual laudo cabe?', comando: 'Quais laudos são cabíveis para esta IS e qual você recomenda, com a fundamentação na DGPM-406?' },
    { rotulo: 'Resumir os documentos', comando: 'Resuma os exames, atestados e relatórios enviados nesta IS e o histórico de IS do inspecionado.' },
  ];
  if (is.laudo?.trim()) lista.push({ rotulo: 'Conferir o laudo registrado', comando: 'O laudo registrado nesta IS está correto para a finalidade e o vínculo? Aponte qualquer erro de enquadramento.' });
  return lista;
};
