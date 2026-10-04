// Ficheiro: config/permissions.ts
// Matriz de permissões (páginas do app e funcionalidades) por perfil de
// usuário, editável em Usuários (Admin) e persistida no Firestore
// (services/firestorePermissions.ts, doc config/permissoes) — compartilhada
// entre todos os usuários/dispositivos. O perfil "admin" sempre tem acesso
// total e não aparece como editável na matriz.
import { NavItem } from '../types';
import { salvarPermissoesRemoto, type PermissoesArmazenadas } from '../services/firestorePermissions';

export type Role = 'user_medicos' | 'user_secretaria';

export const ROLES: { id: Role; label: string }[] = [
  { id: 'user_medicos', label: 'User Médicos' },
  { id: 'user_secretaria', label: 'User Secretaria' },
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
  { id: 'concursosJRS', label: 'Planilhas de Controle', icon: 'fact_check', subtitle: 'Acompanhe o andamento dos candidatos em concurso.' },
  { id: 'concursos', label: 'Índices Mínimos', icon: 'emoji_events', subtitle: 'Consulte os índices mínimos exigidos por concurso.' },
  { id: 'exames', label: 'Exames Mínimos', icon: 'science', subtitle: 'Veja os exames mínimos exigidos por finalidade de IS.' },
  { id: 'pareceres', label: 'Pareceres', icon: 'assignment', subtitle: 'Gere solicitações de Pareceres em PDF por especialidade.' },
  // "Perícia Menor" não tem permissão de página própria: é controlada pelas
  // duas sub-permissões (features) "pericia-menor.novo"/"pericia-menor.historico"
  // abaixo — uma por aba —, editáveis na tabela de Páginas do App (ver
  // canAccessPage e UsuariosManagement.tsx). Este registro só fornece
  // label/ícone/subtítulo para a navegação (Home/Sidebar).
  { id: 'pericia-menor', label: 'Perícia Menor', icon: 'personal_injury', subtitle: 'Registre as Perícias Menores dos militares de bordo.' },
  { id: 'mensagens', label: 'Mensagens', icon: 'chat', subtitle: 'Faça minutas das MSG de IS auxiliado por IA.' },
  { id: 'dgpm406', label: 'DGPM-406', icon: 'anchor', subtitle: 'Consulte capítulos e anexos da DGPM-406.' },
  { id: 'laws', label: 'Legislação', icon: 'balance', subtitle: 'Pesquise as leis que fundamentam as IS.' },
  { id: 'templates', label: 'Templates', icon: 'edit_document', subtitle: 'Baixe modelos e templates para laudos e documentos.' },
  { id: 'casos', label: 'Casos Periciais', icon: 'quiz', subtitle: 'Teste seus conhecimentos em casos comentados.' },
  { id: 'videos', label: 'Vídeos', icon: 'smart_display', subtitle: 'Assista vídeos sobre os processos das IS.' },
  { id: 'infograficos', label: 'Infográficos', icon: 'image', subtitle: 'Resumos ilustrados para consultas rápidas.' },
  { id: 'roteiro', label: 'Roteiro JRS', icon: 'view_list', subtitle: 'Trilha de estudos para capacitação dos AMP.' },
];

export const DEFAULT_PAGE_PERMISSIONS: Record<string, Record<Role, boolean>> = {
  guide: { user_medicos: true, user_secretaria: true },
  portaria: { user_medicos: true, user_secretaria: true },
  concursosJRS: { user_medicos: true, user_secretaria: true },
  concursos: { user_medicos: true, user_secretaria: true },
  exames: { user_medicos: true, user_secretaria: true },
  pareceres: { user_medicos: true, user_secretaria: false },
  mensagens: { user_medicos: false, user_secretaria: false },
  dgpm406: { user_medicos: true, user_secretaria: true },
  laws: { user_medicos: true, user_secretaria: true },
  templates: { user_medicos: true, user_secretaria: true },
  casos: { user_medicos: true, user_secretaria: false },
  videos: { user_medicos: true, user_secretaria: false },
  infograficos: { user_medicos: true, user_secretaria: false },
  roteiro: { user_medicos: true, user_secretaria: false },
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
  | 'pericia-menor.novo'
  | 'pericia-menor.historico';

export interface FeatureDef {
  id: FeatureKey;
  label: string;
  group: string;
}

export const FEATURE_DEFS: FeatureDef[] = [
  { id: 'concursosJRS.editarDadosTabela', label: 'Editar Status/Observações/Nº TIS na tabela', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.registrarMensagemPDF', label: 'Registrar Mensagem (PDF): criar concurso, candidatos e agendamento', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.reagendar', label: 'Reagendar candidato', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.gerarMinutaResultados', label: 'Gerar Minuta de Resultados', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.importarCsv', label: 'Importar Concurso (CSV)', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.abrirEncerrarConcurso', label: 'Alterar Status do Concurso (Abrir/Encerrar/Em Breve)', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.registrarMensagemArquivo', label: 'Registrar Mensagem: arquivar mensagem em concurso existente', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.listarMensagens', label: 'Listar Mensagens arquivadas do concurso', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.adicionarCandidato', label: 'Adicionar Candidato manualmente (concurso Em Andamento/Em Breve)', group: 'Concursos (Planilhas de Controle)' },
  { id: 'concursosJRS.visualizarTabela', label: 'Alternar para visão em tabela (lista de concursos, desktop)', group: 'Concursos (Planilhas de Controle)' },
  // Substituem a antiga permissão única de página "Perícia Menor": cada aba
  // (Novo/Histórico) é liberada separadamente por perfil.
  { id: 'pericia-menor.novo', label: 'Perícia Menor - Novo', group: 'Perícia Menor' },
  { id: 'pericia-menor.historico', label: 'Perícia Menor - Histórico', group: 'Perícia Menor' },
];

export const DEFAULT_FEATURE_PERMISSIONS: Record<FeatureKey, Record<Role, boolean>> = {
  'concursosJRS.editarDadosTabela': { user_medicos: true, user_secretaria: false },
  'concursosJRS.registrarMensagemPDF': { user_medicos: true, user_secretaria: false },
  'concursosJRS.reagendar': { user_medicos: false, user_secretaria: true },
  'concursosJRS.gerarMinutaResultados': { user_medicos: true, user_secretaria: false },
  'concursosJRS.importarCsv': { user_medicos: false, user_secretaria: false },
  'concursosJRS.abrirEncerrarConcurso': { user_medicos: false, user_secretaria: false },
  'concursosJRS.registrarMensagemArquivo': { user_medicos: true, user_secretaria: false },
  'concursosJRS.listarMensagens': { user_medicos: true, user_secretaria: true },
  'concursosJRS.adicionarCandidato': { user_medicos: true, user_secretaria: false },
  'concursosJRS.visualizarTabela': { user_medicos: true, user_secretaria: true },
  'pericia-menor.novo': { user_medicos: true, user_secretaria: false },
  'pericia-menor.historico': { user_medicos: true, user_secretaria: false },
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
    const defaults = DEFAULT_PAGE_PERMISSIONS[page.id] || { user_medicos: true, user_secretaria: true };
    const overrides = stored[page.id] || {};
    result[page.id] = {
      user_medicos: overrides.user_medicos ?? defaults.user_medicos,
      user_secretaria: overrides.user_secretaria ?? defaults.user_secretaria,
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
    };
  });
  return result;
};

export const savePermissions = (
  pages: Record<string, Record<Role, boolean>>,
  features: Record<FeatureKey, Record<Role, boolean>>
): Promise<void> => salvarPermissoesRemoto({ pages, features });

export const canUseFeature = (featureId: FeatureKey, perfil: string | undefined): boolean => {
  if (perfil === 'admin') return true;
  if (perfil !== 'user_medicos' && perfil !== 'user_secretaria') return false;
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
  if (perfil !== 'user_medicos' && perfil !== 'user_secretaria') return false;
  const perms = getPagePermissions();
  return perms[pageId] ? perms[pageId][perfil] : true;
};
