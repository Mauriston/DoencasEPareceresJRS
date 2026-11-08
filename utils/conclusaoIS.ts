// Ficheiro: utils/conclusaoIS.ts
// Regras puras da seção "Conclusão da IS" (detalhe da IS): o status muda sozinho conforme o Laudo,
// o Nº do TIS e o DS-1a são preenchidos ou apagados; a Data do laudo é a data em que o Laudo foi
// inserido/alterado; as Restrições e o encaminhamento (Auditoria | JSD) só existem em certos casos.
// Testadas em utils/__tests__/conclusaoIS.test.ts.
import { normalizarBusca } from './corposQuadros';
import {
  GRUPO_BENEFICIOS, GRUPO_LICENCIAMENTO, GRUPO_VERIFICACOES, hojeISO, situacaoDoStatus,
  type SituacaoIS, type StatusIS,
} from './inspecoes';

export type CampoConclusao = 'laudo' | 'restricoes' | 'tis' | 'ds1a' | 'observacoes';

export interface EstadoConclusao {
  status: StatusIS;
  dataEntrevista: string;
  finalidade: string;
  grupoFinalidade: string;
  dataLaudo: string;
  laudo: string;
  restricoes: string;
  tis: string;
  ds1a: string;
  observacoes: string;
}

export type PatchConclusao = Partial<Pick<EstadoConclusao, 'status' | 'dataLaudo' | 'laudo' | 'restricoes' | 'tis' | 'ds1a' | 'observacoes'>> & { situacao?: SituacaoIS };

export interface ResultadoConclusao {
  /** Campos a gravar (vazio = nada mudou). */
  patch: PatchConclusao;
  /** Laudo inserido com "Parecer solicitado": os pareceres da IS passam a Concluído. */
  concluirPareceres: boolean;
}

const norm = (s: string | undefined | null): string => normalizarBusca(String(s || '')).toLowerCase();

// ---------------------------------------------------------------------------
// Detecções no texto do laudo e na finalidade
// ---------------------------------------------------------------------------

/** "Apto com restrições por xx dias…" (não casa com "Inapto"). */
export const laudoAptoComRestricoes = (laudo: string): boolean => /\bapto com restri/.test(norm(laudo));

/** "Incapaz definitivamente para o SAM", "Incapacidade definitiva para o SAM"… */
export const laudoIncapacidadeDefinitivaSam = (laudo: string): boolean => /incapa\w* definitiv\w*.*\bsam\b/.test(norm(laudo));

export const ehTerminoDeIncapacidade = (finalidade: string): boolean => norm(finalidade).trim() === 'termino de incapacidade';

/** Auditoria | JSD: com Laudo, em finalidade de Benefícios, de Licenciamento ou Término de Incapacidade com incapacidade definitiva para o SAM. */
export const mostraEncaminhamento = (is: Pick<EstadoConclusao, 'laudo' | 'finalidade' | 'grupoFinalidade'>): boolean => {
  if (!is.laudo.trim()) return false;
  if (is.grupoFinalidade === GRUPO_BENEFICIOS || is.grupoFinalidade === GRUPO_LICENCIAMENTO) return true;
  return ehTerminoDeIncapacidade(is.finalidade) && laudoIncapacidadeDefinitivaSam(is.laudo);
};

/** Restrições: só em Verificações e Términos com laudo "Apto com restrições…". */
export const mostraRestricoes = (is: Pick<EstadoConclusao, 'laudo' | 'grupoFinalidade'>): boolean =>
  is.grupoFinalidade === GRUPO_VERIFICACOES && laudoAptoComRestricoes(is.laudo);

// ---------------------------------------------------------------------------
// Restrições (várias, gravadas num só texto)
// ---------------------------------------------------------------------------

export const SEPARADOR_RESTRICOES = '; ';
export const separarRestricoes = (texto: string): string[] => String(texto || '').split(';').map(s => s.trim()).filter(Boolean);
export const juntarRestricoes = (lista: string[]): string => Array.from(new Set(lista.map(s => s.trim()).filter(Boolean))).join(SEPARADOR_RESTRICOES);

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** Status anteriores à votação: o Laudo leva a "Votação pendente". */
export const STATUS_ANTES_DA_VOTACAO: StatusIS[] = ['aberta', 'agendada', 'reagendada', 'faltou', 'parecer_solicitado', 'conclusao_pendente'];
/** Status do encaminhamento Auditoria | JSD (e as restituições). */
export const STATUS_ENCAMINHAMENTO: StatusIS[] = ['auditoria', 'revisao_exofficio', 'restituicao_auditoria', 'restituicao_jsd'];
/** Status que só existem com Laudo: apagado o Laudo, a IS volta para Agendada (ou Aberta, sem entrevista). */
const STATUS_COM_LAUDO: StatusIS[] = ['votacao_pendente', ...STATUS_ENCAMINHAMENTO, 'assinaturas_pendentes', 'tis_assinado'];

export type Encaminhamento = 'auditoria' | 'jsd';
export const encaminhamentoDoStatus = (status: StatusIS): Encaminhamento | null =>
  status === 'auditoria' || status === 'restituicao_auditoria' ? 'auditoria'
    : status === 'revisao_exofficio' || status === 'restituicao_jsd' ? 'jsd' : null;
export const statusDoEncaminhamento = (e: Encaminhamento): StatusIS => (e === 'auditoria' ? 'auditoria' : 'revisao_exofficio');

/** Item "Restituição …" do menu da tabela, conforme o status. */
export const restituicaoDoStatus = (status: StatusIS): { rotulo: string; status: StatusIS } | null =>
  status === 'auditoria' ? { rotulo: 'Restituição Auditoria', status: 'restituicao_auditoria' }
    : status === 'revisao_exofficio' ? { rotulo: 'Restituição JSD', status: 'restituicao_jsd' } : null;

/** Com DS-1a (TIS assinado) ou cancelada, nada da IS é editável (só "Reabrir IS", Admin). */
export const conclusaoTravada = (status: StatusIS): boolean => status === 'tis_assinado' || status === 'cancelada';

const comSituacao = (patch: PatchConclusao): PatchConclusao => (patch.status ? { ...patch, situacao: situacaoDoStatus(patch.status) } : patch);

/**
 * Patch completo a gravar quando um campo da Conclusão muda (autosave):
 *  - Laudo inserido/alterado: Data do laudo = hoje; status → Votação pendente se ainda antes da votação.
 *    Inserido com "Parecer solicitado": `concluirPareceres`. Restrições e encaminhamento que deixam de
 *    valer são desfeitos.
 *  - Laudo apagado: apaga Data do laudo, Restrições, Nº do TIS e DS-1a; status → Agendada (com
 *    entrevista) ou Aberta.
 *  - Nº do TIS inserido → Assinaturas pendentes; apagado → apaga o DS-1a e volta a Votação pendente.
 *  - DS-1a inserido → TIS assinado (Finalizada); apagado (depois de reabrir) → Assinaturas pendentes.
 *  - Restrições só ficam gravadas se o campo estiver visível.
 */
export const patchConclusao = (atual: EstadoConclusao, campo: CampoConclusao, valorBruto: string, hoje: string = hojeISO()): ResultadoConclusao => {
  const valor = campo === 'restricoes' ? juntarRestricoes(separarRestricoes(valorBruto)) : String(valorBruto ?? '').trim();
  const nada: ResultadoConclusao = { patch: {}, concluirPareceres: false };
  if (valor === (atual[campo] ?? '')) return nada;

  switch (campo) {
    case 'observacoes':
      return { patch: { observacoes: valor }, concluirPareceres: false };

    case 'restricoes':
      if (valor && !mostraRestricoes(atual)) return nada;
      return { patch: { restricoes: valor }, concluirPareceres: false };

    case 'laudo': {
      if (!valor) {
        const patch: PatchConclusao = { laudo: '', dataLaudo: '', restricoes: '', tis: '', ds1a: '' };
        if (STATUS_COM_LAUDO.includes(atual.status)) patch.status = atual.dataEntrevista ? 'agendada' : 'aberta';
        return { patch: comSituacao(patch), concluirPareceres: false };
      }
      const novo = { ...atual, laudo: valor };
      const patch: PatchConclusao = { laudo: valor, dataLaudo: hoje };
      if (STATUS_ANTES_DA_VOTACAO.includes(atual.status)) patch.status = 'votacao_pendente';
      else if (STATUS_ENCAMINHAMENTO.includes(atual.status) && !mostraEncaminhamento(novo)) patch.status = 'votacao_pendente';
      if (atual.restricoes && !mostraRestricoes(novo)) patch.restricoes = '';
      return { patch: comSituacao(patch), concluirPareceres: atual.status === 'parecer_solicitado' && !atual.laudo.trim() };
    }

    case 'tis': {
      if (!valor) {
        const patch: PatchConclusao = { tis: '', ds1a: '' };
        if (atual.status === 'assinaturas_pendentes' || atual.status === 'tis_assinado') patch.status = 'votacao_pendente';
        return { patch: comSituacao(patch), concluirPareceres: false };
      }
      if (!atual.laudo.trim()) return nada; // TIS só depois do Laudo
      return { patch: comSituacao({ tis: valor, status: atual.ds1a.trim() ? 'tis_assinado' : 'assinaturas_pendentes' }), concluirPareceres: false };
    }

    case 'ds1a': {
      if (!valor) {
        const patch: PatchConclusao = { ds1a: '' };
        if (atual.status === 'tis_assinado') patch.status = 'assinaturas_pendentes';
        return { patch: comSituacao(patch), concluirPareceres: false };
      }
      if (!atual.tis.trim()) return nada; // DS-1a só depois do Nº do TIS
      return { patch: comSituacao({ ds1a: valor, status: 'tis_assinado' }), concluirPareceres: false };
    }
  }
  return nada;
};

/** Botão Auditoria | JSD: muda o status (só com o encaminhamento visível e antes do Nº do TIS). */
export const patchEncaminhamento = (atual: EstadoConclusao, e: Encaminhamento): PatchConclusao => {
  if (!mostraEncaminhamento(atual) || atual.tis.trim() || conclusaoTravada(atual.status)) return {};
  const status = statusDoEncaminhamento(e);
  return status === atual.status ? {} : comSituacao({ status });
};
