/**
 * Config.gs
 * Configurações globais, IDs de templates e pastas.
 * 
 * Chaves necessárias nas Propriedades do Script (Script Properties):
 * - ID_TEMPLATE_TERMO_RECURSO: ID do Google Doc para termo de recurso
 * - ID_TEMPLATE_TERMO_CIENTIFICACAO: ID do Google Doc para termo de cientificação
 * - ID_TEMPLATE_SOLICITACAO_PARECER: ID do Google Doc para solicitação de parecer
 * - ID_TEMPLATE_PEDIDO_PARECER: ID do Google Doc para pedido de parecer
 * - ID_TEMPLATE_SOLICITACAO_EXAMES: ID do Google Doc para solicitação de exames
 * - ID_PASTA_RAIZ_CONCURSOS: ID da pasta raiz no Drive para arquivos de concursos
 * - ID_AGENDA_JRS_HNRE: ID da agenda do Google Calendar
 * - ID_PASTA_PARECERES: ID da pasta no Drive onde os pareceres são salvos
 * - FIREBASE_API_KEY: Chave de API do Firebase
 * - FIREBASE_PROJECT_ID: ID do projeto Firebase (ex: jrs-app-web)
 * - GEMINI_API_KEY: Chave de API do Google Gemini
 */

var scriptProperties = PropertiesService.getScriptProperties();

var ID_TEMPLATE_TERMO_RECURSO = scriptProperties.getProperty('ID_TEMPLATE_TERMO_RECURSO');
var ID_TEMPLATE_TERMO_CIENTIFICACAO = scriptProperties.getProperty('ID_TEMPLATE_TERMO_CIENTIFICACAO');
var ID_TEMPLATE_SOLICITACAO_PARECER = scriptProperties.getProperty('ID_TEMPLATE_SOLICITACAO_PARECER');
var ID_TEMPLATE_PEDIDO_PARECER = scriptProperties.getProperty('ID_TEMPLATE_PEDIDO_PARECER');
var ID_TEMPLATE_SOLICITACAO_EXAMES = scriptProperties.getProperty('ID_TEMPLATE_SOLICITACAO_EXAMES');

var ID_PASTA_RAIZ_CONCURSOS = scriptProperties.getProperty('ID_PASTA_RAIZ_CONCURSOS');
var ID_AGENDA_JRS_HNRE = scriptProperties.getProperty('ID_AGENDA_JRS_HNRE');
var ID_PASTA_PARECERES = scriptProperties.getProperty('ID_PASTA_PARECERES');

var FIREBASE_API_KEY = scriptProperties.getProperty('FIREBASE_API_KEY');
var FIREBASE_PROJECT_ID = scriptProperties.getProperty('FIREBASE_PROJECT_ID');

var MODELO_GEMINI = 'gemini-2.5-flash';

var PERFIS_EQUIPE = ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'];
var PERFIS_MEDICOS = ['admin', 'user_medicos', 'user_medicos_mpi'];

var PERFIS_POR_ACAO = {
  gerarPedidoParecer: PERFIS_MEDICOS,
  salvarPdfParecer: PERFIS_MEDICOS,
  enviarParecerImpressao: PERFIS_MEDICOS,
  extrair_dados_atestado: PERFIS_MEDICOS
};
var ACOES_SENSIVEIS = ['removerArquivoDrive', 'enviarParecerImpressao', 'enviarTermoRecursoImpressao', 'enviarSolicitacaoConcursoImpressao'];
