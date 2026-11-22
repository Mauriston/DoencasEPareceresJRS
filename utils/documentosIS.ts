// Ficheiro: utils/documentosIS.ts
// Regras puras (app e servidor) dos documentos gerados a partir de uma IS — "Gerar Documento ▾" da Ficha do
// inspecionado: tipos, rótulos, perfis que geram, quando cada item aparece/está habilitado e o caminho no Storage.
// Front: components/ficha/inspecoes/documentos/registro.tsx. Servidor: servidor/documentos/is/.
import { GRUPO_BENEFICIOS, GRUPO_VERIFICACOES } from './inspecoes';
import { normalizarTexto } from './destinatariosIS';
import { ehVerificacaoOuTermino, laudoIncapazDefinitivoSAM } from './minutaMensagemResultado';

export const TIPOS_DOCUMENTO_IS = ['solicitacaoExames', 'declaracaoComparecimento', 'termoRecurso', 'papeletaDispensa', 'laudoPericial'] as const;
export type TipoDocumentoIS = typeof TIPOS_DOCUMENTO_IS[number];
export const ehTipoDocumentoIS = (v: unknown): v is TipoDocumentoIS => (TIPOS_DOCUMENTO_IS as readonly unknown[]).includes(v);

export const ROTULO_DOCUMENTO_IS: Record<TipoDocumentoIS, string> = {
  solicitacaoExames: 'Solicitação de Exames',
  declaracaoComparecimento: 'Declaração de Comparecimento',
  termoRecurso: 'Termo de Recurso',
  papeletaDispensa: 'Papeleta de Dispensa',
  laudoPericial: 'Laudo Pericial',
};

/** Perfis que veem/geram cada documento (conferido também no servidor). */
export const PERFIS_DOCUMENTO_IS: Record<TipoDocumentoIS, readonly string[]> = {
  solicitacaoExames: ['admin', 'user_medicos', 'user_medicos_mpi'],
  declaracaoComparecimento: ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'],
  termoRecurso: ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'],
  papeletaDispensa: ['admin', 'user_medicos'],
  laudoPericial: ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'],
};

/** Quem vê a lista dos documentos gerados da IS: todos menos user_medicos_geral. */
export const PERFIS_VER_DOCUMENTOS_IS: readonly string[] = ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'];
export const podeVerDocumentosIS = (perfil: string | undefined | null): boolean => PERFIS_VER_DOCUMENTOS_IS.includes(String(perfil ?? ''));

/** Depois da IS finalizada, só estes aparecem no menu. */
export const TIPOS_APOS_FINALIZADA: readonly TipoDocumentoIS[] = ['termoRecurso', 'laudoPericial'];

/** O mínimo da IS que as regras usam. */
export interface ISParaDocumento {
  situacao?: string;
  finalidade?: string;
  grupoFinalidade?: string;
  laudo?: string;
  /** Junta de competência da finalidade (JRS ou MPI). */
  amp?: string;
  /** N.º do TIS (AAA.000.N…); vazio = ainda sem TIS. */
  tis?: string;
  tags?: unknown;
}

const mesmo = (a: string | undefined, b: string) => normalizarTexto(a || '') === normalizarTexto(b);
export const isFinalizada = (is: ISParaDocumento) => is.situacao === 'finalizada';
export const ehGrupoBeneficios = (is: ISParaDocumento) => mesmo(is.grupoFinalidade, GRUPO_BENEFICIOS);
export const ehGrupoVerificacoes = (is: ISParaDocumento) => mesmo(is.grupoFinalidade, GRUPO_VERIFICACOES);
/** VDF (todas as variantes) ou Término de Incapacidade. */
export const ehVdfOuTermino = (is: ISParaDocumento) => ehVerificacaoOuTermino(is.finalidade || '', is.grupoFinalidade);
export const ehIsencaoIR = (is: ISParaDocumento) => /isencao de (pagamento de )?imposto de renda/.test(normalizarTexto(is.finalidade || ''));
/** Laudo de NÃO enquadramento na Lei 7.713/1988 ("Não apresenta histórico médico de doença especificada…"). */
export const laudoNaoEnquadramento = (laudo: string | undefined) => /^\s*(o\(a\) inspecionado\(a\)\s*)?nao (apresenta|tem) historico medico/.test(normalizarTexto(laudo || ''));
/** As 3 redações de enquadramento (DGPM-406 9.1.6 "g"): reforma por acidente em serviço/doença ocupacional;
 *  histórico médico de doença da Lei 7.713/1988; portador de cegueira (inclusive visão monocular). */
const RE_ENQUADRAMENTO = /(^|\b)(tem reforma motivada|tem historico medico de|e portador(a)? de cegueira|portador(a)? de cegueira|visao monocular)/;
/** Laudo de enquadramento: uma das 3 redações, ou qualquer laudo que cite a Lei 7.713 sem ser de não enquadramento. */
export const laudoEnquadramento = (laudo: string | undefined) => {
  const t = normalizarTexto(laudo || '');
  if (!t || laudoNaoEnquadramento(laudo)) return false;
  return RE_ENQUADRAMENTO.test(t) || /7\.?713/.test(t);
};

/** Tag da IS: Isenção de IR com enquadramento, finalizada, aguardando o Laudo Pericial (pendência da Secretaria). */
export const TAG_LAUDO_PERICIAL_PENDENTE = 'LAUDO PERICIAL PENDENTE';
/** Ao finalizar: marca a tag? (Isenção de IR + enquadramento, exceto militar INATIVO — responsabilidade da JSD). */
export const deveMarcarLaudoPericialPendente = (is: ISParaDocumento, inspecionadoInativo: boolean): boolean =>
  !inspecionadoInativo && ehIsencaoIR(is) && laudoEnquadramento(is.laudo);
/** Militar inativo (RM1/Refº), pelo cadastro (tipo ausente = militar). */
export const ehMilitarInativo = (m: { tipo?: unknown; rm1?: unknown; refo?: unknown } | null | undefined): boolean =>
  !!m && (m.tipo ?? 'militar') === 'militar' && (!!m.rm1 || !!m.refo);
export const temTagLaudoPericialPendente = (is: { tags?: unknown }) => Array.isArray(is.tags) && is.tags.includes(TAG_LAUDO_PERICIAL_PENDENTE);

/** Laudo de apto (inclui "apto com restrições…"). */
export const laudoApto = (laudo: string | undefined) => /^\s*apto\b/.test(normalizarTexto(laudo || ''));

/** Quem age sobre a IS: user_medicos só nas de JRS e user_medicos_mpi só nas de MPI; os demais perfis não são limitados. */
export const perfilCompetenteIS = (perfil: string | undefined | null, amp: string | undefined): boolean => {
  if (perfil === 'user_medicos') return amp === 'JRS';
  if (perfil === 'user_medicos_mpi') return amp === 'MPI';
  return true;
};

/** Termo de Recurso: IS com N.º do TIS e laudo recorrível (Verificações/Términos: apto, apto com restrições ou
 *  incapacidade definitiva para o SAM; Benefícios: não enquadramento). */
export const termoRecursoCabe = (is: ISParaDocumento): boolean => {
  if (!(is.tis || '').trim()) return false;
  if (ehGrupoVerificacoes(is)) return laudoApto(is.laudo) || laudoIncapazDefinitivoSAM(is.laudo);
  if (ehGrupoBeneficios(is)) return laudoNaoEnquadramento(is.laudo);
  return false;
};

/** O item aparece no menu? Oculto (nunca "desabilitado") quando a regra não se cumpre. */
export const documentoISVisivel = (tipo: TipoDocumentoIS, perfil: string | undefined | null, is: ISParaDocumento): boolean => {
  if (!PERFIS_DOCUMENTO_IS[tipo].includes(String(perfil ?? ''))) return false;
  const andamento = is.situacao === 'andamento';
  const semLaudo = !(is.laudo || '').trim();
  switch (tipo) {
    case 'declaracaoComparecimento': return andamento;
    case 'solicitacaoExames': return andamento && semLaudo;
    case 'papeletaDispensa': return andamento && semLaudo && is.amp === 'JRS' && ehVdfOuTermino(is);
    case 'termoRecurso': return termoRecursoCabe(is);
    // Só finalizada e enquanto a tag de pendência existir; ao registrar o Laudo Pericial o servidor remove a tag.
    case 'laudoPericial': return isFinalizada(is) && ehIsencaoIR(is) && temTagLaudoPericialPendente(is);
    default: return false;
  }
};

/** Por que o item está desabilitado (dica do menu e erro 400 no servidor); null = habilitado. */
export const motivoDocumentoISIndisponivel = (tipo: TipoDocumentoIS, is: ISParaDocumento): string | null => {
  switch (tipo) {
    case 'solicitacaoExames':
    case 'declaracaoComparecimento':
    case 'termoRecurso':
      return ehGrupoVerificacoes(is) || ehGrupoBeneficios(is) ? null : 'Só em IS de Verificações e Términos ou Benefícios';
    case 'papeletaDispensa':
      if (isFinalizada(is)) return 'IS finalizada';
      return ehVdfOuTermino(is) ? null : 'Só em IS de VDF ou Término de Incapacidade';
    case 'laudoPericial':
      if (!ehGrupoBeneficios(is) || !ehIsencaoIR(is)) return 'Só em IS de Isenção de Imposto de Renda';
      if (!isFinalizada(is)) return 'Só com a IS finalizada';
      return laudoEnquadramento(is.laudo) ? null : 'Só com laudo de enquadramento';
    default:
      return 'Indisponível';
  }
};

/** Caminho permanente do PDF no Storage (sem regra de exclusão automática; só some ao excluir a IS). */
export const caminhoDocumentoIS = (isId: string, tipo: TipoDocumentoIS, id: string) => `inspecoes/${isId}/documentos/${tipo}-${id}.pdf`;
/** Subcoleção do Firestore com o registro de cada documento gerado. */
export const SUBCOL_DOCUMENTOS_IS = 'documentos';

/** Doenças do inciso XIV do art. 6º da Lei 7.713/1988 (quadro do Laudo Pericial, DGPM-406 Anexo V-I-1). */
export const DOENCAS_LEGAIS_IR = [
  'Moléstia Profissional', 'Alienação Mental', 'Cegueira (inclusive monocular)', 'Estados Avançados da Doença de Paget (Osteíte Deformante)',
  'Paralisia Irreversível e Incapacitante', 'Cardiopatia Grave', 'Esclerose Múltipla', 'Hanseníase', 'Tuberculose Ativa', 'Nefropatia Grave',
  'Contaminação por Radiação', 'Síndrome de Imunodeficiência Adquirida', 'Fibrose Cística (mucoviscidose)', 'Doença de Parkinson',
  'Neoplasia Maligna', 'Espondiloartrose Anquilosante', 'Hepatopatia Grave',
] as const;
export type DoencaLegalIR = typeof DOENCAS_LEGAIS_IR[number];
export const ehDoencaLegalIR = (v: unknown): v is DoencaLegalIR => (DOENCAS_LEGAIS_IR as readonly unknown[]).includes(v);

/** Sugestão (sem IA) da doença legal pelo texto do laudo: palavras-chave e CID; null sem pista. */
export const sugerirDoencaLegalPeloLaudo = (laudo: string | undefined): DoencaLegalIR | null => {
  const t = normalizarTexto(laudo || '');
  const regras: [RegExp, DoencaLegalIR][] = [
    [/cegueira|monocular|\bh54/, 'Cegueira (inclusive monocular)'],
    [/neoplasia|cancer|carcinoma|linfoma|leucemia|\bc\d{2}|\bd0[0-9]/, 'Neoplasia Maligna'],
    [/cardiopatia|\bi2[0-5]|\bi50/, 'Cardiopatia Grave'],
    [/parkinson|\bg20/, 'Doença de Parkinson'],
    [/esclerose multipla|\bg35/, 'Esclerose Múltipla'],
    [/alienacao mental|esquizofren|\bf2\d/, 'Alienação Mental'],
    [/nefropatia|renal cronica|\bn18/, 'Nefropatia Grave'],
    [/hepatopatia|cirrose|\bk7[0-4]/, 'Hepatopatia Grave'],
    [/hanseniase|\ba30/, 'Hanseníase'],
    [/tuberculose|\ba1[5-9]/, 'Tuberculose Ativa'],
    [/imunodeficiencia|\bhiv|\bb2[0-4]/, 'Síndrome de Imunodeficiência Adquirida'],
    [/fibrose cistica|mucoviscidose|\be84/, 'Fibrose Cística (mucoviscidose)'],
    [/espondil|anquilosante|\bm45/, 'Espondiloartrose Anquilosante'],
    [/paget|osteite deformante|\bm88/, 'Estados Avançados da Doença de Paget (Osteíte Deformante)'],
    [/paralisia|tetraplegi|paraplegi|hemiplegi/, 'Paralisia Irreversível e Incapacitante'],
    [/radiacao/, 'Contaminação por Radiação'],
    [/acidente em servico|doenca ocupacional|molestia profissional/, 'Moléstia Profissional'],
  ];
  return regras.find(([re]) => re.test(t))?.[1] ?? null;
};
