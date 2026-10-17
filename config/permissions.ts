// Ficheiro: config/permissions.ts
// Matriz de permissões (páginas do app e funcionalidades) por perfil de
// usuário, editável em Usuários (Admin) e persistida no Firestore
// (services/firestorePermissions.ts, doc config/permissoes) — compartilhada
// entre todos os usuários/dispositivos. O perfil "admin" sempre tem acesso
// total e não aparece como editável na matriz.
import { NavItem } from '../types';
import { salvarPermissoesRemoto, type PermissoesArmazenadas } from '../services/firestorePermissions';

export type Role = 'user_medicos' | 'user_secretaria' | 'user_medicos_mpi';

export const ROLES: { id: Role; label: string }[] = [
  { id: 'user_medicos', label: 'User Médicos' },
  { id: 'user_secretaria', label: 'User Secretaria' },
  { id: 'user_medicos_mpi', label: 'User Médicos MPI' },
];

export interface PageDef {
  id: NavItem;
  label: string;
  icon: string;
  subtitle: string;
}

export const PAGE_DEFS: PageDef[] = [
  { id: 'guide', label: 'Doenças de Lei', icon: 'medical_information', subtitle: 'Critérios clínicos e documentos por doença prevista em lei.' },
  { id: 'portaria', label: 'Portaria', icon: 'article', subtitle: 'Leia a Portaria GM-MD nº 3.551/2021 na íntegra.' },
  { id: 'concursosJRS', label: 'Concursos', icon: 'fact_check', subtitle: 'Acompanhe as planilhas de controle dos candidatos em concurso.' },
  { id: 'concursos', label: 'Índices mínimos', icon: 'emoji_events', subtitle: 'Consulte os índices mínimos exigidos por concurso.' },
  { id: 'exames', label: 'Exames mínimos', icon: 'science', subtitle: 'Veja os exames mínimos exigidos por finalidade de IS.' },
  { id: 'pareceres', label: 'Pareceres', icon: 'assignment', subtitle: 'Acompanhe e gere pedidos de parecer médico em PDF por especialidade.' },
  // "Perícia Menor" não tem permissão de página própria: é controlada pelas
  // duas sub-permissões (features) "pericia-menor.novo"/"pericia-menor.historico"
  // abaixo — uma por aba —, editáveis na tabela de Páginas do App (ver
  // canAccessPage e UsuariosManagement.tsx). Este registro só fornece
  // label/ícone/subtítulo para a navegação (Home/Sidebar).
  { id: 'pericia-menor', label: 'Perícia Menor', icon: 'personal_injury', subtitle: 'Registre as Perícias Menores dos militares de bordo.' },
  { id: 'mensagens', label: 'Mensagens', icon: 'chat', subtitle: 'Faça minutas das MSG de IS auxiliado por IA.' },
  { id: 'dgpm406', label: 'DGPM-406', icon: 'anchor', subtitle: 'Consulte capítulos e anexos da DGPM-406.' },
  { id: 'laws', label: 'Legislação', icon: 'balance', subtitle: 'Pesquise as leis que fundamentam as IS.' },
  { id: 'templates', label: 'Modelos', icon: 'edit_document', subtitle: 'Baixe modelos e templates para laudos e documentos.' },
  { id: 'casos', label: 'Casos Periciais', icon: 'quiz', subtitle: 'Teste seus conhecimentos em casos comentados.' },
  { id: 'videos', label: 'Vídeos', icon: 'smart_display', subtitle: 'Assista vídeos sobre os processos das IS.' },
  { id: 'infograficos', label: 'Infográficos', icon: 'image', subtitle: 'Resumos ilustrados para consultas rápidas.' },
  { id: 'roteiro', label: 'Roteiro JRS', icon: 'view_list', subtitle: 'Trilha de estudos para capacitação dos AMP.' },
];

// Perfil novo (user_medicos_mpi) começa espelhando os defaults de
// user_medicos — o Admin ajusta a matriz depois conforme a necessidade.
export const DEFAULT_PAGE_PERMISSIONS: Record<string, Record<Role, boolean>> = {
  guide: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  portaria: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  concursosJRS: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  concursos: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  exames: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  pareceres: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  mensagens: { user_medicos: false, user_secretaria: false, user_medicos_mpi: false },
  dgpm406: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  laws: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  templates: { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  casos: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  videos: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  infograficos: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  roteiro: { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
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
  | 'pareceres.gerar'
  | 'pericia-menor.novo'
  | 'pericia-menor.historico';

export interface FeatureDef {
  id: FeatureKey;
  label: string;
  group: string;
}

export const FEATURE_DEFS: FeatureDef[] = [
  { id: 'concursosJRS.editarDadosTabela', label: 'Editar Status/Observações/Nº TIS na tabela', group: 'Concursos' },
  { id: 'concursosJRS.registrarMensagemPDF', label: 'Registrar Mensagem (PDF): criar concurso, candidatos e agendamento', group: 'Concursos' },
  { id: 'concursosJRS.reagendar', label: 'Reagendar candidato', group: 'Concursos' },
  { id: 'concursosJRS.gerarMinutaResultados', label: 'Gerar Minuta de Resultados', group: 'Concursos' },
  { id: 'concursosJRS.importarCsv', label: 'Importar Concurso (CSV)', group: 'Concursos' },
  { id: 'concursosJRS.abrirEncerrarConcurso', label: 'Alterar Status do Concurso (Abrir/Encerrar/Em Breve)', group: 'Concursos' },
  { id: 'concursosJRS.registrarMensagemArquivo', label: 'Registrar Mensagem: arquivar mensagem em concurso existente', group: 'Concursos' },
  { id: 'concursosJRS.listarMensagens', label: 'Listar Mensagens arquivadas do concurso', group: 'Concursos' },
  { id: 'concursosJRS.adicionarCandidato', label: 'Adicionar Candidato manualmente (concurso Em Andamento/Em Breve)', group: 'Concursos' },
  { id: 'concursosJRS.visualizarTabela', label: 'Alternar para visão em tabela (lista de concursos, desktop)', group: 'Concursos' },
  { id: 'concursosJRS.gerarTermoRecurso', label: 'Gerar Termo de Recurso (a visualização do termo já gerado é liberada a todos)', group: 'Concursos' },
  { id: 'concursosJRS.solicitarParecerExames', label: 'Solicitar Parecer / Exames (menu ⋮ da planilha; a visualização é só de quem tem o menu)', group: 'Concursos' },
  { id: 'pareceres.gerar', label: 'Gerar Pedido de Parecer e marcar como concluído (a lista de pareceres é vista por quem acessa a página)', group: 'Pareceres' },
  // Substituem a antiga permissão única de página "Perícia Menor": cada aba
  // (Novo/Histórico) é liberada separadamente por perfil.
  { id: 'pericia-menor.novo', label: 'Perícia Menor - Novo', group: 'Perícia Menor' },
  { id: 'pericia-menor.historico', label: 'Perícia Menor - Histórico', group: 'Perícia Menor' },
];

export const DEFAULT_FEATURE_PERMISSIONS: Record<FeatureKey, Record<Role, boolean>> = {
  'concursosJRS.editarDadosTabela': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'concursosJRS.registrarMensagemPDF': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'concursosJRS.reagendar': { user_medicos: false, user_secretaria: true, user_medicos_mpi: false },
  'concursosJRS.gerarMinutaResultados': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'concursosJRS.importarCsv': { user_medicos: false, user_secretaria: false, user_medicos_mpi: false },
  'concursosJRS.abrirEncerrarConcurso': { user_medicos: false, user_secretaria: false, user_medicos_mpi: false },
  'concursosJRS.registrarMensagemArquivo': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'concursosJRS.listarMensagens': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  'concursosJRS.adicionarCandidato': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'concursosJRS.visualizarTabela': { user_medicos: true, user_secretaria: true, user_medicos_mpi: true },
  'concursosJRS.gerarTermoRecurso': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'concursosJRS.solicitarParecerExames': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'pareceres.gerar': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'pericia-menor.novo': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
  'pericia-menor.historico': { user_medicos: true, user_secretaria: false, user_medicos_mpi: true },
};

// Cache em memória alimentado pelo listener em tempo real do Firestore
// (iniciado no bootstrap do app — ver App.tsx `observarPermissoes`). Mantém
// `getPagePermissions`/`getFeaturePermissions`/`canUseFeature`/`canAccessPage`
// síncronos (chamados inline durante o render em várias páginas) sem
// precisar transformá-los em funções assíncronas.
let permissoesCache: PermissoesArmazenadas | null = null;

export const setPermissoesCache = (dados: PermissoesArmazenadas | null) => {
  permissoesCache = dados;
};

export const getPagePermissions = (): Record<string, Record<Role, boolean>> => {
  const stored = permissoesCache?.pages || {};
  const result: Record<string, Record<Role, boolean>> = {};
  PAGE_DEFS.forEach(page => {
    const defaults = DEFAULT_PAGE_PERMISSIONS[page.id] || { user_medicos: true, user_secretaria: true, user_medicos_mpi: true };
    const overrides = stored[page.id] || {};
    result[page.id] = {
      user_medicos: overrides.user_medicos ?? defaults.user_medicos,
      user_secretaria: overrides.user_secretaria ?? defaults.user_secretaria,
      user_medicos_mpi: overrides.user_medicos_mpi ?? defaults.user_medicos_mpi,
    };
  });
  return result;
};

export const getFeaturePermissions = (): Record<FeatureKey, Record<Role, boolean>> => {
  const stored = permissoesCache?.features || {};
  const result = {} as Record<FeatureKey, Record<Role, boolean>>;
  FEATURE_DEFS.forEach(feature => {
    const defaults = DEFAULT_FEATURE_PERMISSIONS[feature.id];
    const overrides = stored[feature.id] || {};
    result[feature.id] = {
      user_medicos: overrides.user_medicos ?? defaults.user_medicos,
      user_secretaria: overrides.user_secretaria ?? defaults.user_secretaria,
      user_medicos_mpi: overrides.user_medicos_mpi ?? defaults.user_medicos_mpi,
    };
  });
  return result;
};

export const savePermissions = (
  pages: Record<string, Record<Role, boolean>>,
  features: Record<FeatureKey, Record<Role, boolean>>
): Promise<void> => salvarPermissoesRemoto({ pages, features });

const isPerfilEditavel = (perfil: string | undefined): perfil is Role =>
  perfil === 'user_medicos' || perfil === 'user_secretaria' || perfil === 'user_medicos_mpi';

export const canUseFeature = (featureId: FeatureKey, perfil: string | undefined): boolean => {
  if (perfil === 'admin') return true;
  if (!isPerfilEditavel(perfil)) return false;
  const perms = getFeaturePermissions();
  return perms[featureId] ? perms[featureId][perfil] : false;
};

export const canAccessPage = (pageId: string, perfil: string | undefined): boolean => {
  if (perfil === 'admin') return true;
  // "Perícia Menor" não tem permissão de página própria: a página aparece
  // (na Home/Sidebar e na rota) se pelo menos uma das abas estiver liberada.
  if (pageId === 'pericia-menor') {
    return canUseFeature('pericia-menor.novo', perfil) || canUseFeature('pericia-menor.historico', perfil);
  }
  if (!isPerfilEditavel(perfil)) return false;
  const perms = getPagePermissions();
  return perms[pageId] ? perms[pageId][perfil] : true;
};
