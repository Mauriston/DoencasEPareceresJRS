// Ficheiro: utils/faltaIS.ts
// Falta numa IS agendada: a IS é CANCELADA POR FALTA automaticamente — "IS CANCELADA POR FALTA" nas observações,
// status Cancelada (situação Finalizada) com motivoCancelamento = 'falta' — e fica a pendência da Minuta MSG de
// cancelamento por falta (tag; Início da Secretaria e do Admin) até a minuta ser marcada como enviada.
// As IS antigas com status "Faltou" (antes desta regra) continuam reconhecidas como falta (ehFaltaIS).

export const OBS_CANCELADA_FALTA = 'IS CANCELADA POR FALTA';
/** Tag da IS cancelada por falta enquanto a Minuta MSG de cancelamento não foi enviada (pendência Secretaria/Admin). */
export const TAG_MINUTA_FALTA_PENDENTE = 'MINUTA MSG CANCELAMENTO POR FALTA PENDENTE';

interface ISFalta { status?: string; motivoCancelamento?: string; observacoes?: string; tags?: unknown }

/** Falta registrada: cancelada por falta (regra atual) ou o status antigo "Faltou". */
export const ehFaltaIS = (is: ISFalta): boolean =>
  is.status === 'faltou' || (is.status === 'cancelada' && is.motivoCancelamento === 'falta');

export const temMinutaFaltaPendente = (is: { tags?: unknown }): boolean =>
  Array.isArray(is.tags) && is.tags.includes(TAG_MINUTA_FALTA_PENDENTE);

/** Observações com "IS CANCELADA POR FALTA" (no início; sem duplicar; mantém o que já havia). */
export const observacoesComFalta = (obs: string | undefined): string => {
  const atual = (obs || '').trim();
  if (atual.toUpperCase().includes(OBS_CANCELADA_FALTA)) return atual;
  return atual ? `${OBS_CANCELADA_FALTA}\n${atual}` : OBS_CANCELADA_FALTA;
};

/** Campos gravados ao registrar a falta (além de status/situação/slot, feitos pelo serviço). */
export const camposCancelamentoPorFalta = (is: ISFalta): { observacoes: string; motivoCancelamento: 'falta'; tags: string[] } => {
  const tags = Array.isArray(is.tags) ? (is.tags as unknown[]).filter((t): t is string => typeof t === 'string') : [];
  return {
    observacoes: observacoesComFalta(is.observacoes),
    motivoCancelamento: 'falta',
    tags: tags.includes(TAG_MINUTA_FALTA_PENDENTE) ? tags : [...tags, TAG_MINUTA_FALTA_PENDENTE],
  };
};

/** Tags sem a pendência da minuta (ao marcar a Minuta MSG como enviada). */
export const tagsSemMinutaFalta = (tags: unknown): string[] =>
  (Array.isArray(tags) ? tags : []).filter((t): t is string => typeof t === 'string' && t !== TAG_MINUTA_FALTA_PENDENTE);

/** A falta só pode ser registrada numa IS agendada/reagendada (com entrevista marcada). */
export const podeRegistrarFalta = (is: { status?: string; dataEntrevista?: string }): boolean =>
  (is.status === 'agendada' || is.status === 'reagendada') && !!is.dataEntrevista;
