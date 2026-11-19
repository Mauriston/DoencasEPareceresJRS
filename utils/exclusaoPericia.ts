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

// ---------------------------------------------------------------- Edição (mesmas regras de quem pode e da justificativa)

/** Campos que a edição pode alterar (o inspecionado, a OM, o PDF e quem registrou ficam como estão). */
export interface CamposEdicaoPericia {
  cid: string;
  cidCodigo: string;
  dispensas: string[];
  dataAtestado: string;
  tempoAtestado: number;
  tempoHomologado: number;
  homologacao: boolean;
  medicoEmissor: string;
  crmEmissor: string;
  vdf: boolean;
  /** Só o Admin troca o perito responsável. */
  peritoUid?: string;
  peritoUsuario?: string;
  peritoNome?: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** DATA_TERMINO = DATA_ATESTADO + TEMPO_HOMOLOGADO - 1 (mesma regra de services/firestorePericiasMenores.ts). */
export const dataTerminoPericia = (dataAtestado: string, tempoHomologado: number): string => {
  const [a, m, d] = dataAtestado.split('-').map(Number);
  if (!a || !m || !d || !(tempoHomologado > 0)) return '';
  const dt = new Date(Date.UTC(a, m - 1, d + tempoHomologado - 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
};

/**
 * Valida e normaliza os campos enviados para a edição (servidor). Devolve o patch a gravar (com o novo término)
 * ou a mensagem de erro. `ehAdmin` libera a troca do perito responsável.
 */
export const patchEdicaoPericia = (c: Partial<CamposEdicaoPericia> | null | undefined, ehAdmin: boolean): { patch?: Record<string, unknown>; erro?: string } => {
  if (!c || typeof c !== 'object') return { erro: 'Dados inválidos.' };
  const texto = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max);
  const inteiro = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 && n <= 365 ? n : 0; };
  const dataAtestado = texto(c.dataAtestado, 10);
  if (!ISO.test(dataAtestado)) return { erro: 'Data do atestado inválida.' };
  const tempoAtestado = inteiro(c.tempoAtestado);
  const tempoHomologado = inteiro(c.tempoHomologado);
  if (!tempoAtestado || !tempoHomologado) return { erro: 'Informe o tempo do atestado.' };
  const cid = texto(c.cid);
  if (!cid) return { erro: 'Informe o CID.' };
  const dispensas = Array.isArray(c.dispensas) ? c.dispensas.map(d => texto(d, 120)).filter(Boolean).slice(0, 30) : [];
  if (!dispensas.length) return { erro: 'Selecione ao menos uma dispensa.' };
  const homologacao = c.homologacao === true;
  const patch: Record<string, unknown> = {
    cid, cidCodigo: texto(c.cidCodigo, 10).toUpperCase(), dispensas, dataAtestado, tempoAtestado, tempoHomologado,
    dataTermino: dataTerminoPericia(dataAtestado, tempoHomologado), homologacao, vdf: c.vdf === true,
    medicoEmissor: homologacao ? texto(c.medicoEmissor, 120) : '', crmEmissor: homologacao ? texto(c.crmEmissor, 40) : '',
  };
  if (ehAdmin && c.peritoUid) {
    patch.peritoUid = texto(c.peritoUid, 128); patch.peritoUsuario = texto(c.peritoUsuario, 80); patch.peritoNome = texto(c.peritoNome, 120);
  }
  return { patch };
};
