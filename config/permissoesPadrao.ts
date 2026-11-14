// Ficheiro: config/permissoesPadrao.ts
// Padrões da matriz de permissões (páginas e funcionalidades) por perfil, sem
// nenhuma dependência do Firebase: usados pelo app (config/permissions.ts, que
// os reexporta e soma a matriz salva no Firestore) e pelo servidor (server.ts,
// que escolhe os destinatários das notificações conforme o perfil).

export type Role = 'user_medicos' | 'user_secretaria' | 'user_medicos_mpi' | 'user_medicos_geral';

// Perfil novo (user_medicos_mpi) começa espelhando os defaults de
// user_medicos — o Admin ajusta a matriz depois conforme a necessidade.
export const DEFAULT_PAGE_PERMISSIONS: Record<string, Record<Role, boolean>> = {
  guide: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  portaria: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  concursosJRS: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  concursos: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  exames: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: true },
  pareceres: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  inspecoes: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  // Inspecionados começa restrita ao Admin (como era "Militares"); o Admin libera por perfil.
  militares: { user_medicos: false, user_secretaria: false, user_medicos_mpi: false, user_medicos_geral: false },
  escala: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: true },
  mensagens: { user_medicos: false, user_secretaria: false, user_medicos_mpi: false, user_medicos_geral: false },
  dgpm406: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  laws: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  casos: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  videos: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  infograficos: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  apresentacoes: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  roteiro: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  // Férias: a equipe da JRS (as regras do Firestore só deixam a equipe ler os afastamentos).
  ferias: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  // Sobre o app: começa oculta para todos (o Admin sempre vê); liberar por perfil em Usuários quando for publicada.
  sobre: { user_medicos: false, user_secretaria: false, user_medicos_mpi: false, user_medicos_geral: false },
};

export type FeatureKey =
  | 'concursosJRS.editarDadosTabela'
  | 'concursosJRS.registrarMensagemPDF'
  | 'concursosJRS.reagendar'
  | 'concursosJRS.gerarMinutaResultados'
  | 'concursosJRS.importarCsv'
  | 'concursosJRS.abrirEncerrarConcurso'
  | 'concursosJRS.registrarMensagemArquivo'
  | 'concursosJRS.listarMensagens'
  | 'concursosJRS.adicionarCandidato'
  | 'concursosJRS.visualizarTabela'
  | 'concursosJRS.gerarTermoRecurso'
  | 'concursosJRS.solicitarParecerExames'
  | 'concursosJRS.enviarExamesCandidato'
  | 'concursosJRS.enviarEmailInaptos'
  | 'inspecoes.cadastrar'
  | 'inspecoes.agendar'
  | 'inspecoes.editar'
  | 'inspecoes.gerarMinuta'
  | 'inspecoes.bloquearAgenda'
  | 'inspecoes.enviarExames'
  | 'inspecoes.enviarEmails'
  | 'inspecoes.cancelar'
  | 'militares.cadastrar'
  | 'pareceres.gerar'
  | 'pericia-menor.novo'
  | 'pericia-menor.historico';

// Os padrões das funcionalidades "concursosJRS.*" se repetem em firestore.rules (função pode()),
// que aplica a mesma matriz nas gravações: ao mudar um padrão aqui, mude lá também e rode
// scripts/testar-regras-firestore.cjs.
export const DEFAULT_FEATURE_PERMISSIONS: Record<FeatureKey, Record<Role, boolean>> = {
  'concursosJRS.editarDadosTabela': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  'concursosJRS.registrarMensagemPDF': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  'concursosJRS.reagendar': { user_medicos: false, user_secretaria: true, user_medicos_mpi: false, user_medicos_geral: false },
  'concursosJRS.gerarMinutaResultados': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  'concursosJRS.importarCsv': { user_medicos: false, user_secretaria: false, user_medicos_mpi: false, user_medicos_geral: false },
  'concursosJRS.abrirEncerrarConcurso': { user_medicos: false, user_secretaria: false, user_medicos_mpi: false, user_medicos_geral: false },
  'concursosJRS.registrarMensagemArquivo': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  'concursosJRS.listarMensagens': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  'concursosJRS.adicionarCandidato': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  'concursosJRS.visualizarTabela': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  'concursosJRS.gerarTermoRecurso': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  'concursosJRS.solicitarParecerExames': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  // Enviar os exames entregues pelo candidato é trabalho de recepção/secretaria tanto quanto dos médicos.
  'concursosJRS.enviarExamesCandidato': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  // E-mails e cancelamento: por padrão Admin e Secretaria (como antes de virarem configuráveis).
  'concursosJRS.enviarEmailInaptos': { user_medicos: false, user_secretaria: true, user_medicos_mpi: false, user_medicos_geral: false },
  'inspecoes.enviarEmails': { user_medicos: false, user_secretaria: true, user_medicos_mpi: false, user_medicos_geral: false },
  'inspecoes.cancelar': { user_medicos: false, user_secretaria: true, user_medicos_mpi: false, user_medicos_geral: false },
  'inspecoes.cadastrar': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  'inspecoes.agendar': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  'inspecoes.editar': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  'inspecoes.gerarMinuta': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  'inspecoes.enviarExames': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  // Bloqueios: por padrão só Admin e Secretaria; se o Admin liberar a um perfil médico, ele só bloqueia os próprios turnos.
  'inspecoes.bloquearAgenda': { user_medicos: false, user_secretaria: true, user_medicos_mpi: false, user_medicos_geral: false },
  'militares.cadastrar': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false },
  'pareceres.gerar': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: false },
  'pericia-menor.novo': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: true },
  'pericia-menor.historico': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true, user_medicos_geral: true },
};

export interface MatrizPermissoesArmazenada {
  pages?: Record<string, Partial<Record<string, boolean>> | undefined>;
  features?: Record<string, Partial<Record<string, boolean>> | undefined>;
}

const ehRole = (perfil: string | undefined): perfil is Role =>
  perfil === 'user_medicos' || perfil === 'user_secretaria' || perfil === 'user_medicos_mpi' || perfil === 'user_medicos_geral';

/** Funcionalidade liberada para o perfil (matriz salva + padrão). Admin sempre pode. */
export const featurePermitida = (matriz: MatrizPermissoesArmazenada | null | undefined, featureId: FeatureKey, perfil: string | undefined): boolean => {
  if (perfil === 'admin') return true;
  if (!ehRole(perfil)) return false;
  const salvo = matriz?.features?.[featureId]?.[perfil];
  return salvo ?? DEFAULT_FEATURE_PERMISSIONS[featureId]?.[perfil] ?? false;
};

/** Página liberada para o perfil (matriz salva + padrão). Admin sempre pode. */
export const paginaPermitida = (matriz: MatrizPermissoesArmazenada | null | undefined, pageId: string, perfil: string | undefined): boolean => {
  if (perfil === 'admin') return true;
  if (pageId === 'pericia-menor') {
    return featurePermitida(matriz, 'pericia-menor.novo', perfil) || featurePermitida(matriz, 'pericia-menor.historico', perfil);
  }
  if (!ehRole(perfil)) return false;
  const salvo = matriz?.pages?.[pageId]?.[perfil];
  return salvo ?? DEFAULT_PAGE_PERMISSIONS[pageId]?.[perfil] ?? true;
};
