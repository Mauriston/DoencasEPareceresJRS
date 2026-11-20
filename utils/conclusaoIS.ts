// Ficheiro: utils/conclusaoIS.ts
// Regras puras da seção "Conclusão da IS" (detalhe da IS): o status muda sozinho conforme o Laudo,
// o Nº do TIS e o DS-1a são preenchidos ou apagados; a Data do laudo é a data em que o Laudo foi
// inserido/alterado; o encaminhamento (Auditoria | JSD) só existe em certos casos; as Restrições (opcionais)
// aparecem quando a finalidade é do grupo "Verificações e Términos" E o Laudo menciona "restrições"; nesse
// grupo o CID (DESCRABREV do public/cid.json) é obrigatório para finalizar (DS-1a).
// Conclusão EXPLÍCITA (16/11/2026): o DS-1a não finaliza mais a IS sozinho — com ele preenchido, o botão
// "Concluir IS" grava a Data da Conclusão (nunca anterior à Data do laudo), quem concluiu e o status "TIS
// assinado" (Finalizada); "Reabrir IS" (função inspecoes.reabrir ou quem concluiu) desfaz.
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
  /** CID (DESCRABREV, ex.: "M54.5 Dor lombar baixa"); obrigatório em Verificações e Términos. Docs antigos: ''. */
  cid?: string;
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

/** Finalidade do grupo Verificações e Términos (o único em que as Restrições e o CID da IS existem). */
export const grupoComRestricoes = (grupoFinalidade: string | undefined | null): boolean => grupoFinalidade === GRUPO_VERIFICACOES;

/** O Laudo menciona "restrições" (ou "restrição"), sem diferenciar maiúsculas nem acentos. */
export const laudoMencionaRestricoes = (laudo: string | undefined | null): boolean => /\brestri(coes|cao)\b/.test(norm(laudo));

/**
 * Restrições (opcionais): só quando a finalidade é do grupo Verificações e Términos E o Laudo menciona
 * "restrições" (ex.: "Apto para o SAM com restrições por 30 dias").
 */
export const mostraRestricoes = (is: Pick<EstadoConclusao, 'grupoFinalidade' | 'laudo'>): boolean =>
  grupoComRestricoes(is.grupoFinalidade) && laudoMencionaRestricoes(is.laudo);

/** CID obrigatório (Verificações e Términos). */
export const exigeCid = (is: Pick<EstadoConclusao, 'grupoFinalidade'>): boolean => grupoComRestricoes(is.grupoFinalidade);
/** Falta o CID obrigatório: a IS não pode ser finalizada (DS-1a). */
export const faltaCid = (is: Pick<EstadoConclusao, 'grupoFinalidade' | 'cid'>): boolean => exigeCid(is) && !String(is.cid || '').trim();

// ---------------------------------------------------------------------------
// Restrições (várias, gravadas num só texto)
// ---------------------------------------------------------------------------

export const SEPARADOR_RESTRICOES = '; ';
export const separarRestricoes = (texto: string): string[] => String(texto || '').split(';').map(s => s.trim()).filter(Boolean);
export const juntarRestricoes = (lista: string[]): string => Array.from(new Set(lista.map(s => s.trim()).filter(Boolean))).join(SEPARADOR_RESTRICOES);
/** Opção que não cabe nas Restrições da IS (é das dispensas da Perícia Menor). */
const TODAS_AS_ATIVIDADES = 'todas as atividades';
/** Opções do campo Restrições: sem "TODAS AS ATIVIDADES". */
export const opcoesDeRestricoes = (lista: string[]): string[] => lista.filter(op => norm(op).trim() !== TODAS_AS_ATIVIDADES);

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** Status anteriores à votação: o Laudo leva a "Votação pendente". */
export const STATUS_ANTES_DA_VOTACAO: StatusIS[] = ['aberta', 'realizando_exames', 'agendada', 'reagendada', 'faltou', 'parecer_solicitado', 'conclusao_pendente'];
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
 *    Inserido com "Parecer solicitado": `concluirPareceres`. O encaminhamento que deixa de valer é desfeito.
 *  - Laudo apagado: apaga Data do laudo, Nº do TIS e DS-1a; status → Agendada (com entrevista) ou Aberta.
 *  - Restrições só existem com a finalidade do grupo Verificações e Términos e o Laudo mencionando
 *    "restrições": o Laudo que deixa de mencioná-las (ou apagado) apaga as Restrições.
 *  - Nº do TIS inserido → Assinaturas pendentes; apagado → apaga o DS-1a e volta a Votação pendente.
 *  - DS-1a inserido (em Verificações e Términos, só com o CID) → continua Assinaturas pendentes: a IS só é
 *    finalizada pelo botão "Concluir IS" (patchConcluirIS); apagado → Assinaturas pendentes.
 *  - Restrições só ficam gravadas se o campo estiver visível (finalidade do grupo).
 *  - Observações preenchidas por médico (`perfil`) numa IS Agendada/Reagendada → Conclusão pendente.
 */
export const patchConclusao = (atual: EstadoConclusao, campo: CampoConclusao, valorBruto: string, hoje: string = hojeISO(), perfil?: string): ResultadoConclusao => {
  const valor = campo === 'restricoes' ? juntarRestricoes(separarRestricoes(valorBruto)) : String(valorBruto ?? '').trim();
  const nada: ResultadoConclusao = { patch: {}, concluirPareceres: false };
  if (valor === (atual[campo] ?? '')) return nada;

  switch (campo) {
    case 'observacoes': {
      // Observações gravadas por médico numa IS Agendada levam a "Conclusão pendente".
      const novo = valor ? statusAposAtoMedico(atual.status, perfil) : null;
      return { patch: comSituacao({ observacoes: valor, ...(novo ? { status: novo } : {}) }), concluirPareceres: false };
    }

    case 'restricoes':
      if (valor && !mostraRestricoes(atual)) return nada;
      return { patch: { restricoes: valor }, concluirPareceres: false };

    case 'laudo': {
      if (!valor) {
        const patch: PatchConclusao = { laudo: '', dataLaudo: '', tis: '', ds1a: '' };
        if (atual.restricoes) patch.restricoes = '';
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
      // Encaminhada à Auditoria/JSD, a IS mantém o status do encaminhamento ao receber o Nº do TIS.
      if (STATUS_ENCAMINHAMENTO.includes(atual.status)) return { patch: { tis: valor }, concluirPareceres: false };
      return { patch: comSituacao({ tis: valor, status: 'assinaturas_pendentes' }), concluirPareceres: false };
    }

    case 'ds1a': {
      if (!valor) {
        const patch: PatchConclusao = { ds1a: '' };
        if (atual.status === 'tis_assinado') patch.status = 'assinaturas_pendentes';
        return { patch: comSituacao(patch), concluirPareceres: false };
      }
      if (!atual.tis.trim()) return nada; // DS-1a só depois do Nº do TIS
      if (faltaCid(atual)) return nada; // Verificações e Términos: CID antes de finalizar
      // A IS não finaliza sozinha: o status fica (ou volta a) Assinaturas pendentes até o "Concluir IS".
      return { patch: comSituacao({ ds1a: valor, ...(atual.status !== 'assinaturas_pendentes' ? { status: 'assinaturas_pendentes' as StatusIS } : {}) }), concluirPareceres: false };
    }
  }
  return nada;
};

// ---------------------------------------------------------------------------
// Conclusão explícita ("Concluir IS") e "Reabrir IS"
// ---------------------------------------------------------------------------

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Data da Conclusão: obrigatória, AAAA-MM-DD e nunca anterior à Data do laudo. '' = válida. */
export const erroDataConclusao = (dataConclusao: string, dataLaudo: string): string => {
  const d = String(dataConclusao || '').trim();
  if (!d) return 'Informe a Data da Conclusão.';
  if (!DATA_ISO.test(d)) return 'Data da Conclusão inválida.';
  const laudo = String(dataLaudo || '').slice(0, 10);
  if (laudo && d < laudo) return 'A Data da Conclusão não pode ser anterior à Data do laudo.';
  return '';
};

/** Data da Conclusão sugerida: hoje (a validação aponta se a Data do laudo for posterior). */
export const dataConclusaoInicial = (gravada: string | undefined | null, hoje: string = hojeISO()): string =>
  DATA_ISO.test(String(gravada || '')) ? String(gravada) : hoje;

type EstadoParaConcluir = Pick<EstadoConclusao, 'status' | 'dataEntrevista' | 'grupoFinalidade' | 'laudo' | 'tis' | 'ds1a' | 'dataLaudo' | 'cid'>;

/**
 * Por que a IS ainda não pode ser concluída ('' = pode): IS em andamento com entrevista, Laudo, Nº do TIS,
 * DS-1a, CID (Verificações e Términos) e Data da Conclusão válida.
 */
export const motivoNaoConcluir = (is: EstadoParaConcluir, dataConclusao: string): string => {
  if (conclusaoTravada(is.status)) return 'A IS já está finalizada.';
  if (!String(is.dataEntrevista || '').trim()) return 'A IS ainda não tem entrevista.';
  if (!String(is.laudo || '').trim()) return 'Preencha o Laudo.';
  if (!String(is.tis || '').trim()) return 'Preencha o Nº do TIS.';
  if (faltaCid(is)) return 'Informe o CID.';
  if (!String(is.ds1a || '').trim()) return 'Preencha o DS-1a.';
  return erroDataConclusao(dataConclusao, is.dataLaudo);
};

export interface QuemConcluiu { uid: string; usuario: string }
export interface PatchConclusaoIS {
  status: StatusIS;
  situacao: SituacaoIS;
  dataConclusao: string;
  concluidaPor: QuemConcluiu | null;
}

/** "Concluir IS": TIS assinado (Finalizada) com a Data da Conclusão e quem concluiu; null se ainda não pode. */
export const patchConcluirIS = (is: EstadoParaConcluir, dataConclusao: string, quem: QuemConcluiu): PatchConclusaoIS | null => {
  if (motivoNaoConcluir(is, dataConclusao)) return null;
  return { status: 'tis_assinado', situacao: situacaoDoStatus('tis_assinado'), dataConclusao: dataConclusao.trim(), concluidaPor: { uid: quem.uid, usuario: quem.usuario } };
};

/**
 * Status de volta ao reabrir uma IS concluída, coerente com o que está preenchido: com Nº do TIS → Assinaturas
 * pendentes; só com Laudo → Votação pendente; sem Laudo → Agendada (com entrevista) ou Aberta.
 */
export const statusAoReabrir = (is: Pick<EstadoConclusao, 'laudo' | 'tis' | 'dataEntrevista'>): StatusIS =>
  String(is.tis || '').trim() ? 'assinaturas_pendentes'
    : String(is.laudo || '').trim() ? 'votacao_pendente'
      : String(is.dataEntrevista || '').trim() ? 'agendada' : 'aberta';

/** "Reabrir IS": volta a Em andamento (status coerente) e apaga a Data da Conclusão e quem concluiu; null se não está concluída. */
export const patchReabrirIS = (is: Pick<EstadoConclusao, 'status' | 'laudo' | 'tis' | 'dataEntrevista'>): PatchConclusaoIS | null => {
  if (is.status !== 'tis_assinado') return null;
  const status = statusAoReabrir(is);
  return { status, situacao: situacaoDoStatus(status), dataConclusao: '', concluidaPor: null };
};

/** "Reabrir IS": IS concluída (TIS assinado) e o usuário tem a função inspecoes.reabrir OU foi quem concluiu. */
export const podeReabrirIS = (
  is: { status: StatusIS; concluidaPor?: { uid?: string } | null }, uid: string | undefined, temFuncao: boolean,
): boolean => is.status === 'tis_assinado' && (temFuncao || (!!uid && is.concluidaPor?.uid === uid));

/**
 * CID da IS (autocomplete do public/cid.json): grava o rótulo DESCRABREV em `cid` e o código SUBCAT em
 * `cidCodigo` (mesmo par das perícias menores). Só em Verificações e Términos; `null` apaga.
 */
export const patchCid = (
  atual: Pick<EstadoConclusao, 'grupoFinalidade' | 'cid'>, escolhido: { descrAbrev: string; subcat: string } | null,
): { cid?: string; cidCodigo?: string } => {
  const cid = escolhido ? escolhido.descrAbrev.trim() : '';
  if (cid === String(atual.cid || '').trim()) return {};
  if (cid && !exigeCid(atual)) return {};
  return { cid, cidCodigo: escolhido ? escolhido.subcat.trim().toUpperCase() : '' };
};

/** Botão Auditoria | JSD: muda o status (só com o encaminhamento visível e antes do Nº do TIS). */
export const patchEncaminhamento = (atual: EstadoConclusao, e: Encaminhamento): PatchConclusao => {
  if (!mostraEncaminhamento(atual) || conclusaoTravada(atual.status)) return {};
  const status = statusDoEncaminhamento(e);
  return status === atual.status ? {} : comSituacao({ status });
};

// ---------------------------------------------------------------------------
// O que é editável no detalhe da IS
// ---------------------------------------------------------------------------

type EstadoEdicao = Pick<EstadoConclusao, 'status' | 'dataEntrevista'>;
const temEntrevista = (is: EstadoEdicao): boolean => !!String(is.dataEntrevista || '').trim();

/**
 * Conclusão da IS (Laudo, Auditoria | JSD, Restrições, Nº do TIS, DS-1a, Observações): só com data de
 * entrevista, e até a IS ser finalizada (DS-1a/TIS assinado) ou cancelada.
 */
export const podeEditarConclusao = (is: EstadoEdicao): boolean => temEntrevista(is) && !conclusaoTravada(is.status);

/** Finalidade: só com a IS Aberta, ainda sem data de entrevista (é o único campo editável nesse caso). */
export const podeEditarFinalidade = (is: EstadoEdicao): boolean => is.status === 'aberta' && !temEntrevista(is);

export type AmpFinalidade = 'JRS' | 'MPI';

export interface EstadoFinalidade {
  finalidade: string;
  grupoFinalidade: string;
  amp: AmpFinalidade | '';
  peritoUid: string;
  restricoes: string;
}

export interface PatchFinalidade {
  finalidade?: string;
  grupoFinalidade?: string;
  amp?: AmpFinalidade;
  peritoUid?: string;
  peritoNome?: string;
  peritoGmail?: string;
  restricoes?: string;
}

/**
 * Troca da finalidade (IS Aberta sem entrevista): grava finalidade, grupo e o AMP de competência (como no
 * cadastro). Mudando o AMP, o perito escolhido deixa de valer (os peritos da JRS e do MPI são perfis
 * distintos) e é apagado; Restrições gravadas saem se o novo grupo não for Verificações e Términos.
 */
export const patchFinalidade = (atual: EstadoFinalidade, nova: { finalidade: string; grupo: string; amp: AmpFinalidade }): PatchFinalidade => {
  const finalidade = nova.finalidade.trim();
  if (!finalidade || !nova.grupo) return {};
  if (finalidade === atual.finalidade && nova.grupo === atual.grupoFinalidade && nova.amp === atual.amp) return {};
  const patch: PatchFinalidade = { finalidade, grupoFinalidade: nova.grupo, amp: nova.amp };
  if (nova.amp !== atual.amp && atual.peritoUid) Object.assign(patch, { peritoUid: '', peritoNome: '', peritoGmail: '' });
  if (atual.restricoes && !grupoComRestricoes(nova.grupo)) patch.restricoes = '';
  return patch;
};

// ---------------------------------------------------------------------------
// Avanços automáticos para "Conclusão pendente"
// ---------------------------------------------------------------------------

/** Perfis médicos (o Admin também é perito). */
export const PERFIS_MEDICOS: readonly string[] = ['admin', 'user_medicos', 'user_medicos_mpi'];
const STATUS_AGENDADOS: StatusIS[] = ['agendada', 'reagendada'];

/**
 * IS Agendada (ou Reagendada) que recebe, de um médico, Observações, solicitação de exames ou PDF enviado:
 * → Conclusão pendente. Devolve null quando o status não muda.
 */
export const statusAposAtoMedico = (status: StatusIS | string | undefined, perfil: string | undefined): StatusIS | null =>
  STATUS_AGENDADOS.includes(status as StatusIS) && PERFIS_MEDICOS.includes(String(perfil)) ? 'conclusao_pendente' : null;

/** IS em "Parecer solicitado" cujo pedido recebeu resposta (e sem outro pedido em aberto) → Conclusão pendente. */
export const statusAposRespostaParecer = (status: StatusIS | string | undefined, pedidosAbertos: number): StatusIS | null =>
  status === 'parecer_solicitado' && pedidosAbertos === 0 ? 'conclusao_pendente' : null;
