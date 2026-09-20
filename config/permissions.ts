// Ficheiro: config/permissions.ts
// Matriz de permissões (páginas do app e funcionalidades) por perfil de
// usuário, editável em Usuários (Admin) e persistida localmente
// (localStorage) neste navegador. O perfil "admin" sempre tem acesso
// total e não aparece como editável na matriz.
import { NavItem } from '../types';

export type Role = 'user_medicos' | 'user_secretaria';

export const ROLES: { id: Role; label: string }[] = [
  { id: 'user_medicos', label: 'User Médicos' },
  { id: 'user_secretaria', label: 'User Secretaria' },
];

export interface PageDef {
  id: NavItem;
  label: string;
}

export const PAGE_DEFS: PageDef[] = [
  { id: 'guide', label: 'Doenças de Lei' },
  { id: 'portaria', label: 'Portaria' },
  { id: 'concursosJRS', label: 'Planilhas de Controle' },
  { id: 'concursos', label: 'Índices Mínimos' },
  { id: 'exames', label: 'Exames Mínimos' },
  { id: 'pareceres', label: 'Pareceres' },
  { id: 'pericia-menor', label: 'Perícia Menor' },
  { id: 'mensagens', label: 'Mensagens' },
  { id: 'dgpm406', label: 'DGPM-406' },
  { id: 'laws', label: 'Legislação' },
  { id: 'templates', label: 'Templates' },
  { id: 'casos', label: 'Casos Periciais' },
  { id: 'estudo', label: 'Estudo / Artigos' },
  { id: 'infograficos', label: 'Infográficos' },
  { id: 'resumos', label: 'Resumos' },
  { id: 'roteiro', label: 'Roteiro JRS' },
];

export const DEFAULT_PAGE_PERMISSIONS: Record<string, Record<Role, boolean>> = {
  guide: { user_medicos: true, user_secretaria: true },
  portaria: { user_medicos: true, user_secretaria: true },
  concursosJRS: { user_medicos: true, user_secretaria: true },
  concursos: { user_medicos: true, user_secretaria: true },
  exames: { user_medicos: true, user_secretaria: true },
  pareceres: { user_medicos: true, user_secretaria: false },
  'pericia-menor': { user_medicos: true, user_secretaria: false },
  mensagens: { user_medicos: false, user_secretaria: false },
  dgpm406: { user_medicos: true, user_secretaria: true },
  laws: { user_medicos: true, user_secretaria: true },
  templates: { user_medicos: true, user_secretaria: true },
  casos: { user_medicos: true, user_secretaria: false },
  estudo: { user_medicos: true, user_secretaria: false },
  infograficos: { user_medicos: true, user_secretaria: false },
  resumos: { user_medicos: true, user_secretaria: false },
  roteiro: { user_medicos: true, user_secretaria: false },
};

export type FeatureKey =
  | 'concursosJRS.editarDadosTabela'
  | 'concursosJRS.registrarMensagemPDF'
  | 'concursosJRS.reagendar'
  | 'concursosJRS.gerarMinutaResultados';

export interface FeatureDef {
  id: FeatureKey;
  label: string;
}

export const FEATURE_DEFS: FeatureDef[] = [
  { id: 'concursosJRS.editarDadosTabela', label: 'Editar Status/Observações/Nº TIS na tabela' },
  { id: 'concursosJRS.registrarMensagemPDF', label: 'Registrar Mensagem (PDF) e configurar agendamento' },
  { id: 'concursosJRS.reagendar', label: 'Reagendar candidato' },
  { id: 'concursosJRS.gerarMinutaResultados', label: 'Gerar Minuta de Resultados' },
];

export const DEFAULT_FEATURE_PERMISSIONS: Record<FeatureKey, Record<Role, boolean>> = {
  'concursosJRS.editarDadosTabela': { user_medicos: true, user_secretaria: false },
  'concursosJRS.registrarMensagemPDF': { user_medicos: true, user_secretaria: false },
  'concursosJRS.reagendar': { user_medicos: false, user_secretaria: true },
  'concursosJRS.gerarMinutaResultados': { user_medicos: true, user_secretaria: false },
};

const STORAGE_KEY = 'jrs_permissoes_config';

interface StoredPermissions {
  pages: Record<string, Partial<Record<Role, boolean>>>;
  features: Record<string, Partial<Record<Role, boolean>>>;
}

const readStored = (): StoredPermissions => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pages: {}, features: {} };
    const parsed = JSON.parse(raw);
    return { pages: parsed.pages || {}, features: parsed.features || {} };
  } catch {
    return { pages: {}, features: {} };
  }
};

export const getPagePermissions = (): Record<string, Record<Role, boolean>> => {
  const stored = readStored();
  const result: Record<string, Record<Role, boolean>> = {};
  PAGE_DEFS.forEach(page => {
    const defaults = DEFAULT_PAGE_PERMISSIONS[page.id] || { user_medicos: true, user_secretaria: true };
    const overrides = stored.pages[page.id] || {};
    result[page.id] = {
      user_medicos: overrides.user_medicos ?? defaults.user_medicos,
      user_secretaria: overrides.user_secretaria ?? defaults.user_secretaria,
    };
  });
  return result;
};

export const getFeaturePermissions = (): Record<FeatureKey, Record<Role, boolean>> => {
  const stored = readStored();
  const result = {} as Record<FeatureKey, Record<Role, boolean>>;
  FEATURE_DEFS.forEach(feature => {
    const defaults = DEFAULT_FEATURE_PERMISSIONS[feature.id];
    const overrides = stored.features[feature.id] || {};
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
) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, features }));
};

export const canAccessPage = (pageId: string, perfil: string | undefined): boolean => {
  if (perfil === 'admin') return true;
  if (perfil !== 'user_medicos' && perfil !== 'user_secretaria') return false;
  const perms = getPagePermissions();
  return perms[pageId] ? perms[pageId][perfil] : true;
};

export const canUseFeature = (featureId: FeatureKey, perfil: string | undefined): boolean => {
  if (perfil === 'admin') return true;
  if (perfil !== 'user_medicos' && perfil !== 'user_secretaria') return false;
  const perms = getFeaturePermissions();
  return perms[featureId] ? perms[featureId][perfil] : false;
};
