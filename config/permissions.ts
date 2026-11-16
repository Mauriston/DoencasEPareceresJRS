// Ficheiro: config/permissions.ts
// Matriz de permissões (páginas do app e funcionalidades) por perfil de
// usuário, editável em Usuários (Admin) e persistida no Firestore
// (services/firestorePermissions.ts, doc config/permissoes) — compartilhada
// entre todos os usuários/dispositivos. O perfil "admin" sempre tem acesso
// total e não aparece como editável na matriz.
import { NavItem } from '../types';
import { salvarPermissoesRemoto, type PermissoesArmazenadas } from '../services/firestorePermissions';
import { DEFAULT_FEATURE_PERMISSIONS, DEFAULT_PAGE_PERMISSIONS, type FeatureKey, type Role } from './permissoesPadrao';

export { DEFAULT_FEATURE_PERMISSIONS, DEFAULT_PAGE_PERMISSIONS };
export type { FeatureKey, Role };


export const ROLES: { id: Role; label: string }[] = [
  { id: 'user_medicos', label: 'User Médicos' },
  { id: 'user_secretaria', label: 'User Secretaria' },
  { id: 'user_medicos_mpi', label: 'User Médicos MPI' },
  // Demais médicos do HNRe: acesso restrito (por padrão só Perícia Menor e Exames mínimos); só são notificados do que podem executar.
  { id: 'user_medicos_geral', label: 'User Médicos Geral' },
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
  // Trabalho: Inspeções de Saúde (agenda, prazos e minutas) e a base de Inspecionados.
  { id: 'inspecoes', label: 'Inspeções de Saúde', icon: 'event_available', subtitle: 'Cadastre IS, agende entrevistas, acompanhe prazos e gere minutas.' },
  { id: 'militares', label: 'Inspecionados', icon: 'groups', subtitle: 'Base de militares, servidores civis, dependentes e pensionistas.' },
  { id: 'pareceres', label: 'Pareceres', icon: 'assignment', subtitle: 'Acompanhe e gere pedidos de parecer médico em PDF por especialidade.' },
  // "Perícia Menor" não tem permissão de página própria: é controlada pelas
  // duas sub-permissões (features) "pericia-menor.novo"/"pericia-menor.historico"
  // abaixo — uma por aba —, editáveis na tabela de Páginas do App (ver
  // canAccessPage e UsuariosManagement.tsx). Este registro só fornece
  // label/ícone/subtítulo para a navegação (Home/Sidebar).
  { id: 'pericia-menor', label: 'Perícia Menor', icon: 'personal_injury', subtitle: 'Registre as Perícias Menores dos militares de bordo.' },
  // Escala de serviço do SPA (supervisão 24h com retém e plantões de 12h dia/noite), enviada pelo Admin em CSV.
  { id: 'escala', label: 'Escala de Serviço', icon: 'calendar_month', subtitle: 'Escala de supervisão e plantões do SPA.' },
  { id: 'mensagens', label: 'Mensagens', icon: 'chat', subtitle: 'Faça minutas das MSG de IS auxiliado por IA.' },
  { id: 'dgpm406', label: 'DGPM-406', icon: 'anchor', subtitle: 'Consulte capítulos e anexos da DGPM-406.' },
  { id: 'laws', label: 'Legislação', icon: 'balance', subtitle: 'Pesquise as leis que fundamentam as IS.' },
  { id: 'casos', label: 'Casos Periciais', icon: 'quiz', subtitle: 'Teste seus conhecimentos em casos comentados.' },
  { id: 'videos', label: 'Vídeos', icon: 'smart_display', subtitle: 'Assista vídeos sobre os processos das IS.' },
  { id: 'infograficos', label: 'Infográficos', icon: 'image', subtitle: 'Resumos ilustrados para consultas rápidas.' },
  { id: 'apresentacoes', label: 'Apresentações', icon: 'slideshow', subtitle: 'Apresentações de slides sobre os processos das IS.' },
  { id: 'roteiro', label: 'Roteiro JRS', icon: 'view_list', subtitle: 'Trilha de estudos para capacitação dos AMP.' },
  // Administração: férias e afastamentos dos usuários da JRS (criar, editar e apagar continuam só com o Admin).
  { id: 'ferias', label: 'Férias', icon: 'beach_access', subtitle: 'Férias e afastamentos dos usuários da JRS.' },
  // Painel: "como estamos no período" (tendências e comparações); na sidebar logo abaixo de Início.
  { id: 'painel', label: 'Painel', icon: 'monitoring', subtitle: 'Indicadores do período: IS, perícias, concursos e uso do app.' },
  // Ajuda: o que o app faz, por área (página "Sobre o app").
  { id: 'sobre', label: 'Sobre o app', icon: 'info', subtitle: 'As principais funcionalidades do app, por área.' },
];



export interface FeatureDef {
  id: FeatureKey;
  label: string;
  group: string;
}

export const FEATURE_DEFS: FeatureDef[] = [
  { id: 'concursosJRS.editarDadosTabela', label: 'Editar Status/Observações/Nº TIS na tabela', group: 'Concursos' },
  { id: 'concursosJRS.registrarMensagemPDF', label: 'Registrar mensagem (PDF): criar concurso, candidatos e agendamento', group: 'Concursos' },
  { id: 'concursosJRS.reagendar', label: 'Reagendar candidato', group: 'Concursos' },
  { id: 'concursosJRS.gerarMinutaResultados', label: 'Gerar Minuta de Resultados', group: 'Concursos' },
  { id: 'concursosJRS.importarCsv', label: 'Importar concurso (CSV)', group: 'Concursos' },
  { id: 'concursosJRS.abrirEncerrarConcurso', label: 'Alterar status do Concurso (Abrir/Encerrar/Em breve)', group: 'Concursos' },
  { id: 'concursosJRS.registrarMensagemArquivo', label: 'Registrar mensagem: arquivar mensagem em concurso existente', group: 'Concursos' },
  { id: 'concursosJRS.listarMensagens', label: 'Listar Mensagens arquivadas do concurso', group: 'Concursos' },
  { id: 'concursosJRS.adicionarCandidato', label: 'Adicionar candidato manualmente (concurso Em andamento/Em breve)', group: 'Concursos' },
  { id: 'concursosJRS.visualizarTabela', label: 'Alternar para visão em tabela (lista de concursos, desktop)', group: 'Concursos' },
  { id: 'concursosJRS.gerarTermoRecurso', label: 'Gerar Termo de Recurso (a visualização do termo já gerado é liberada a todos)', group: 'Concursos' },
  { id: 'concursosJRS.solicitarParecerExames', label: 'Solicitar Parecer / Exames (menu ⋮ da planilha; a visualização é só de quem tem o menu)', group: 'Concursos' },
  { id: 'concursosJRS.enviarExamesCandidato', label: 'Enviar exames do candidato em PDF (salva no Drive e transcreve com IA; a leitura da transcrição é liberada a todos)', group: 'Concursos' },
  { id: 'concursosJRS.enviarEmailInaptos', label: 'Enviar e-mail dos candidatos inaptos (botão "+ Email Inaptos" do concurso em andamento)', group: 'Concursos' },
  { id: 'inspecoes.cadastrar', label: 'Cadastrar nova IS (a lista e o calendário são vistos por quem acessa a página)', group: 'Inspeções de Saúde' },
  { id: 'inspecoes.agendar', label: 'Agendar e reagendar IS (escolher perito, data e horário)', group: 'Inspeções de Saúde' },
  { id: 'inspecoes.editar', label: 'Editar IS: status, laudo, restrições, TIS, DS-1a e observações', group: 'Inspeções de Saúde' },
  { id: 'inspecoes.gerarMinuta', label: 'Gerar Minuta de Mensagem (cancelamento de IS atrasada)', group: 'Inspeções de Saúde' },
  { id: 'inspecoes.enviarExames', label: 'Enviar exames em PDF da IS (a IA identifica o exame e transcreve o laudo; não vale para IS finalizada)', group: 'Inspeções de Saúde' },
  { id: 'inspecoes.enviarEmails', label: 'Enviar e-mails da IS: agendamento, resultado, faltas do HNRe e NAC (menu "Enviar e-mails", detalhe da IS, card de faltas e itens de e-mail das Pendências da Início; o "Limpar" dos modais é só do Admin)', group: 'Inspeções de Saúde' },
  { id: 'inspecoes.cancelar', label: 'Cancelar IS (menu ⋮ da IS)', group: 'Inspeções de Saúde' },
  { id: 'inspecoes.bloquearAgenda', label: 'Bloquear horários e turnos da agenda (perfis médicos só bloqueiam os próprios turnos; a configuração de turnos dos peritos é só do Admin)', group: 'Inspeções de Saúde' },
  { id: 'militares.cadastrar', label: 'Cadastrar novo inspecionado (Militares e Dep/Pens.); editar, apagar e inativar continuam só com o Admin', group: 'Inspecionados' },
  { id: 'pareceres.gerar', label: 'Gerar Pedido de Parecer e marcar como concluído (a lista de pareceres é vista por quem acessa a página)', group: 'Pareceres' },
  // Substituem a antiga permissão única de página "Perícia Menor": cada aba
  // (Novo/Histórico) é liberada separadamente por perfil.
  { id: 'pericia-menor.novo', label: 'Perícia Menor - Novo', group: 'Perícia Menor' },
  { id: 'pericia-menor.historico', label: 'Perícia Menor - Histórico', group: 'Perícia Menor' },
];


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
    const defaults = DEFAULT_PAGE_PERMISSIONS[page.id] || { user_medicos: true, user_secretaria: true, user_medicos_mpi: true, user_medicos_geral: false };
    const overrides = (stored[page.id] || {}) as Partial<Record<Role, boolean>>;
    result[page.id] = Object.fromEntries(ROLES.map(r => [r.id, overrides[r.id] ?? defaults[r.id]])) as Record<Role, boolean>;
  });
  return result;
};

export const getFeaturePermissions = (): Record<FeatureKey, Record<Role, boolean>> => {
  const stored = permissoesCache?.features || {};
  const result = {} as Record<FeatureKey, Record<Role, boolean>>;
  FEATURE_DEFS.forEach(feature => {
    const defaults = DEFAULT_FEATURE_PERMISSIONS[feature.id];
    const overrides = (stored[feature.id] || {}) as Partial<Record<Role, boolean>>;
    result[feature.id] = Object.fromEntries(ROLES.map(r => [r.id, overrides[r.id] ?? defaults[r.id]])) as Record<Role, boolean>;
  });
  return result;
};

export const savePermissions = (
  pages: Record<string, Record<Role, boolean>>,
  features: Record<FeatureKey, Record<Role, boolean>>
): Promise<void> => salvarPermissoesRemoto({ pages, features });

const isPerfilEditavel = (perfil: string | undefined): perfil is Role => ROLES.some(r => r.id === perfil);

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
