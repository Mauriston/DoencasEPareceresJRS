/**
 * Config.gs
 * Configurações globais, IDs de templates e pastas.
 */

var ID_TEMPLATE_TERMO_RECURSO = '1gVSaakcQJBrFJnF4umFbI_cjR9abCXPjfOyfSUFKnRo';
var ID_TEMPLATE_TERMO_CIENTIFICACAO = '1uSdvvwxjPDkvGm7kjCrDGaGnPVF3_pDu4rN6C6tJFiI';
var ID_TEMPLATE_SOLICITACAO_PARECER = '16KIcTgceHNdbTNRe8UeYPjJXn4r_d450Xy61conLO3Q';
var ID_TEMPLATE_PEDIDO_PARECER = '1jE-3VQ8G2t4JQJ5B7ydedq6oupvsXwo7aPX_AVttMEM';
var ID_TEMPLATE_SOLICITACAO_EXAMES = '1SSAzdWANvfQJx7Sip2-NbqDGAM0cgpVD6Q4Ci9UhGqQ';

var ID_PASTA_RAIZ_CONCURSOS = '1eBTehJDTOPjsgOeP3DjWKbE-iXdIKGos';
var ID_AGENDA_JRS_HNRE = 'c_b103c034ba38b68e447b1ea6ab97b0da658878ebc7daa7535d612f9f7eaed762@group.calendar.google.com';
var ID_PASTA_PARECERES = '176YQTOOWXuE78Xul49XYpJsVNyu-eZFi';

var FIREBASE_API_KEY = 'AIzaSyAWBYm6iGQNQXeC5DO038lMSruxpRjoX2c';
var FIREBASE_PROJECT_ID = 'jrs-app-web';

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
