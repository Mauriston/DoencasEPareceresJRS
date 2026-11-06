/**
 * CodeConcursos.gs — Backend (Apps Script) mínimo do menu "Concursos" do
 * app DoencasEPareceresJRS.
 *
 * Após a migração do backend de Concursos para o Firebase (Firestore — ver
 * services/firestoreConcursos.ts), este projeto Apps Script STANDALONE não
 * lê nem escreve planilhas. Responsabilidades:
 *  - gerar os PDFs (termos, pedidos de parecer, solicitações de exames) a
 *    partir dos templates Google Docs e devolvê-los em base64;
 *  - guardar os PDFs dos concursos no Google Drive (drive compartilhado,
 *    pasta raiz CONCURSOS > ano > concurso > CANDIDATOS/MENSAGENS) e devolver
 *    as URLs, que o app grava no Firestore (services/driveConcursos.ts);
 *  - guardar o PDF dos exames de um candidato na pasta dele (como
 *    EXAMES_NOME_DO_CANDIDATO.pdf) e a minuta de mensagem como Google Doc.
 * O Gemini NÃO é mais chamado daqui: a IA (minuta, mensagem de concurso, exames
 * e atestado) roda no app pelo Firebase AI Logic (services/geminiAI.ts). A
 * propriedade GEMINI_API_KEY pode ser apagada do projeto.
 * As ações que escrevem no Drive exigem o token de login do Firebase
 * ("idToken") — ver "exigirUsuarioFirebase".
 *
 * Implantação: crie um projeto Apps Script STANDALONE (script.google.com →
 * Novo projeto; não atrelado a planilha nem ao Docs do template), cole este
 * arquivo e use Implantar → Nova implantação → Aplicativo da web, "Executar
 * como: Eu", "Quem pode acessar: Qualquer pessoa". Colar a URL ".../exec"
 * gerada em GAS_URL_CONCURSOS
 * (config/endpoints.ts). Como o script usa Docs/Drive só para
 * copiar e exportar o template (nunca grava nada no Drive do usuário além
 * de uma cópia temporária, descartada ao final), a primeira execução pode
 * pedir autorização dessas permissões.
 */

/**
 * Configuração (IDs de templates, pastas, agenda e e-mail da impressão): vem das Propriedades do script
 * (Configurações do projeto → Propriedades do script), com o valor abaixo como padrão. Assim dá para
 * trocar uma pasta ou um template sem editar o código. Inventário completo em docs/configuracao.md.
 * Para gravar os padrões atuais nas propriedades, rode uma vez gravarConfiguracaoPadrao() no editor.
 */
var CONFIG_PADRAO_ = {};
function cfg_(chave, padrao) {
  CONFIG_PADRAO_[chave] = padrao;
  if (!cfg_.props) cfg_.props = PropertiesService.getScriptProperties().getProperties(); // uma leitura por execução
  var v = cfg_.props[chave];
  return v && String(v).trim() ? String(v).trim() : padrao;
}

/** Grava nas Propriedades do script os valores padrão que ainda não estão lá (rodar no editor). */
function gravarConfiguracaoPadrao() {
  var props = PropertiesService.getScriptProperties();
  var atuais = props.getProperties();
  var novos = {};
  Object.keys(CONFIG_PADRAO_).forEach(function (k) { if (!atuais[k]) novos[k] = CONFIG_PADRAO_[k]; });
  if (!atuais.ID_PASTA_MINUTAS && typeof ID_PASTA_MINUTAS !== 'undefined') novos.ID_PASTA_MINUTAS = ID_PASTA_MINUTAS; // CodePrincipal.gs
  props.setProperties(novos, false);
  Logger.log('Propriedades gravadas: ' + (Object.keys(novos).join(', ') || 'nenhuma (já existiam)'));
}

var ID_TEMPLATE_TERMO_RECURSO = cfg_('ID_TEMPLATE_TERMO_RECURSO', '1gVSaakcQJBrFJnF4umFbI_cjR9abCXPjfOyfSUFKnRo');
var ID_TEMPLATE_TERMO_CIENTIFICACAO = cfg_('ID_TEMPLATE_TERMO_CIENTIFICACAO', '1uSdvvwxjPDkvGm7kjCrDGaGnPVF3_pDu4rN6C6tJFiI');
var ID_TEMPLATE_SOLICITACAO_PARECER = cfg_('ID_TEMPLATE_SOLICITACAO_PARECER', '16KIcTgceHNdbTNRe8UeYPjJXn4r_d450Xy61conLO3Q');
var ID_TEMPLATE_PEDIDO_PARECER = cfg_('ID_TEMPLATE_PEDIDO_PARECER', '1jE-3VQ8G2t4JQJ5B7ydedq6oupvsXwo7aPX_AVttMEM');
var ID_TEMPLATE_SOLICITACAO_EXAMES = cfg_('ID_TEMPLATE_SOLICITACAO_EXAMES', '1SSAzdWANvfQJx7Sip2-NbqDGAM0cgpVD6Q4Ci9UhGqQ');

/** Pasta raiz CONCURSOS (drive compartilhado): dentro dela ficam as pastas por ano. */
var ID_PASTA_RAIZ_CONCURSOS = cfg_('ID_PASTA_RAIZ_CONCURSOS', '1eBTehJDTOPjsgOeP3DjWKbE-iXdIKGos');
/** Agenda "JRS/HNRe" do Google Agenda (entrevistas das Inspeções de Saúde). */
var ID_AGENDA_JRS_HNRE = cfg_('ID_AGENDA_JRS_HNRE', 'c_b103c034ba38b68e447b1ea6ab97b0da658878ebc7daa7535d612f9f7eaed762@group.calendar.google.com');
/** Pasta PARECERES (Drive): uma subpasta por inspecionado (nome completo) com os pedidos de parecer em PDF. */
var ID_PASTA_PARECERES = cfg_('ID_PASTA_PARECERES', '176YQTOOWXuE78Xul49XYpJsVNyu-eZFi');
/** Chave de API web do projeto Firebase (pública, a mesma de firebase-applet-config.json): só serve para validar o idToken. */
var FIREBASE_API_KEY = 'AIzaSyAWBYm6iGQNQXeC5DO038lMSruxpRjoX2c';

/**
 * Versão deste código. AUMENTE a cada alteração em qualquer .gs deste projeto (AAAA-MM-DD.N): o
 * workflow "Apps Script publicado" compara este valor com o da implantação no ar (ação "versao")
 * e abre uma issue com o checklist de reimplantação enquanto forem diferentes.
 */
var VERSAO_SCRIPT = '2026-11-06.5';

/** Ponto de entrada POST do aplicativo da web. Espera um corpo JSON com a propriedade "action". */
function doPost(e) {
  return apiResponder(function() {
    var corpo = {};
    try {
      corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (erroJson) {
      throw new Error('Corpo da requisição não é um JSON válido.');
    }

    // Sem login: só informa a versão publicada (scripts/verificar-apps-script.mjs).
    if (corpo.action === 'versao') return { versao: VERSAO_SCRIPT };
    // Todas as demais ações: login válido + usuário ativo + perfil permitido (autorizarAcao_), com
    // registro das recusas e das operações sensíveis.
    autorizarAcao_(corpo);
    if (corpo.action === 'gerarTermoRecurso') return apiGerarTermoRecurso(corpo);
    if (corpo.action === 'gerarTermoCientificacao') return apiGerarTermoCientificacao(corpo);
    if (corpo.action === 'gerarSolicitacaoParecer') return apiGerarSolicitacaoParecer(corpo);
    if (corpo.action === 'gerarPedidoParecer') return apiGerarPedidoParecer(corpo);
    if (corpo.action === 'gerarSolicitacaoExames') return apiGerarSolicitacaoExames(corpo);
    if (corpo.action === 'criarEstruturaConcurso') return apiCriarEstruturaConcurso(corpo);
    if (corpo.action === 'salvarMensagemPdf') return apiSalvarMensagemPdf(corpo);
    if (corpo.action === 'salvarPdfCandidato') return apiSalvarPdfCandidato(corpo);
    if (corpo.action === 'salvarPdfParecer') return apiSalvarPdfParecer(corpo);
    if (corpo.action === 'enviarParecerImpressao') return apiEnviarParecerImpressao(corpo);
    if (corpo.action === 'enviarTermoRecursoImpressao') return apiEnviarTermoRecursoImpressao(corpo);
    if (corpo.action === 'enviarSolicitacaoConcursoImpressao') return apiEnviarSolicitacaoConcursoImpressao(corpo);
    if (corpo.action === 'removerArquivoDrive') return apiRemoverArquivoDrive(corpo);
    if (corpo.action === 'salvarMinutaMensagem') return apiSalvarMinutaMensagem(corpo);
    if (corpo.action === 'salvarExamesCandidato') return apiSalvarExamesCandidato(corpo);
    if (corpo.action === 'sincronizarEventoIS') return apiSincronizarEventoIS(corpo);
    if (corpo.action === 'sincronizarEventosConcursos') return apiSincronizarEventosConcursos(corpo);
    if (corpo.action === 'sincronizarEventoBloqueio') return apiSincronizarEventoBloqueio(corpo);
    throw new Error('Ação POST desconhecida: "' + corpo.action + '".');
  });
}

/** Antes de enviar e-mail: a cota diária do Apps Script esgotada vira uma mensagem clara (o documento já está salvo). */
function garantirCotaEmail() {
  if (MailApp.getRemainingDailyQuota() < 1) {
    throw new Error('Cota diária de e-mails do Apps Script esgotada. O documento está salvo: imprima pela fila de documentos ou envie amanhã.');
  }
}

/**
 * Log seguro (LGPD): registra só o contexto fixo e a mensagem do erro, mascarada e truncada. NUNCA passe
 * corpo de requisição, NIP, nome, CID, e-mail, token ou base64 para o Logger/console.
 */
function logSeguro_(contexto, erro) {
  var msg = String((erro && erro.message) || erro || '')
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g, '[token]')
    .replace(/([?&](?:key|token|idToken)=)[^&\s"']+/gi, '$1[oculto]')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\b\d{2}\.\d{4}\.\d{2}\b/g, '[nip]')
    .replace(/\b\d{8}\b/g, '[nip]')
    .replace(/[A-Za-z0-9+\/=_-]{120,}/g, '[dados-longos]')
    .substring(0, 200);
  Logger.log(contexto + ': ' + msg);
}

/**
 * Executa "fn", empacota o retorno em { sucesso: true, dados } ou, em caso
 * de erro, { sucesso: false, erro: mensagem }, e devolve como JSON.
 */
function apiResponder(fn) {
  var resultado;
  try {
    resultado = { sucesso: true, dados: fn() };
  } catch (erro) {
    logSeguro_('apiResponder', erro);
    resultado = { sucesso: false, erro: erro.message };
  }
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Formata uma data (objeto Date) para "DD/MM/AAAA", ou string vazia se não for uma data válida. */
function formatarDataSimples(data) {
  if (!data || Object.prototype.toString.call(data) !== '[object Date]' || isNaN(data.getTime())) return '';
  var dia = String(data.getDate()).padStart(2, '0');
  var mes = String(data.getMonth() + 1).padStart(2, '0');
  return dia + '/' + mes + '/' + data.getFullYear();
}

/** Formata uma data (objeto Date) para o padrão militar "DDMMMAAAA" (ex.: 13OUT2026), ou string vazia se não for uma data válida. */
function formatarDataMilitar(data) {
  if (!data || Object.prototype.toString.call(data) !== '[object Date]' || isNaN(data.getTime())) return '';
  var meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var dia = String(data.getDate()).padStart(2, '0');
  return dia + meses[data.getMonth()] + data.getFullYear();
}

/**
 * action=gerarTermoRecurso (POST): { candidatoId, candidatoNome, nomeConcurso,
 * dataLaudo, nomeUsuario, postoGraduacao, cargo } — gera o PDF do Termo de
 * Reconhecimento de Recurso a partir do template Google Docs
 * ("JRSApp - TEMPLATE RECONHECIMENTO RECURSO"), preenchendo os placeholders
 * abaixo, e devolve o conteúdo em base64 (o app grava o PDF no Firebase
 * Storage). Não lê nem grava nada em planilhas ou pastas do Drive do usuário:
 * a cópia do template é sempre temporária e descartada ao final.
 *
 * Placeholders do template:
 *   {{candidatoNome}} {{candidatoId}} (matrícula) {{nomeConcurso}} {{dataLaudo}}
 *   {{DATA_HOJE}} (DDMMMAAAA, ex.: 13OUT2026) {{nomeUsuario}} {{postoGraduacao}} {{cargo}}
 */
function apiGerarTermoRecurso(corpo) {
  var campo = function(nome) { return String((corpo && corpo[nome]) || '').trim(); };

  var candidatoId = campo('candidatoId');
  var candidatoNome = campo('candidatoNome');
  if (!candidatoId) throw new Error('"candidatoId" (matrícula do candidato) é obrigatório.');
  if (!candidatoNome) throw new Error('"candidatoNome" é obrigatório.');

  var valores = {
    candidatoNome: candidatoNome,
    candidatoId: candidatoId,
    nomeConcurso: campo('nomeConcurso'),
    dataLaudo: campo('dataLaudo'),
    DATA_HOJE: formatarDataMilitar(new Date()),
    nomeUsuario: campo('nomeUsuario'),
    postoGraduacao: campo('postoGraduacao'),
    cargo: campo('cargo')
  };

  var docCopia = DriveApp.getFileById(ID_TEMPLATE_TERMO_RECURSO).makeCopy('Temp_Recurso_' + candidatoId);
  try {
    var docAberto = DocumentApp.openById(docCopia.getId());
    var body = docAberto.getBody();

    Object.keys(valores).forEach(function(chave) {
      body.replaceText('\\{\\{' + chave + '\\}\\}', valores[chave]);
    });

    docAberto.saveAndClose();

    var pdfBlob = docCopia.getAs('application/pdf');
    var base64 = Utilities.base64Encode(pdfBlob.getBytes());

    return { candidatoId: candidatoId, pdfBase64: base64 };
  } finally {
    docCopia.setTrashed(true);
  }
}

/**
 * action=gerarTermoCientificacao (POST): { candidatoId, candidatoNome,
 * nomeConcurso, status } — gera o PDF do Termo de Cientificação de Resultado
 * de IS Ingresso/Seleção a partir do template Google Docs, e devolve o
 * conteúdo em base64 (o app grava o PDF no Firebase Storage). Só o candidato
 * assina, então não há dados de médico.
 *
 * "status": APTO | INAPTO | INSUF DOCUMENTAL. Cada opção do template tem um
 * marcador entre parênteses: o do resultado vira "X" (e o parágrafo inteiro
 * da opção fica em negrito); os outros dois são esvaziados.
 *
 * Placeholders do template:
 *   {{candidatoNome}} {{candidatoId}} {{nomeConcurso}} {{DATA_HOJE}} (DDMMMAAAA)
 *   {{X_APTO}} {{X_INAPTO}} {{X_IDM}}
 */
function apiGerarTermoCientificacao(corpo) {
  var campo = function(nome) { return String((corpo && corpo[nome]) || '').trim(); };

  var candidatoId = campo('candidatoId');
  var candidatoNome = campo('candidatoNome');
  if (!candidatoId) throw new Error('"candidatoId" (matrícula do candidato) é obrigatório.');
  if (!candidatoNome) throw new Error('"candidatoNome" é obrigatório.');

  var mapaMarcadores = { 'APTO': 'X_APTO', 'INAPTO': 'X_INAPTO', 'INSUF DOCUMENTAL': 'X_IDM' };
  var status = campo('status').toUpperCase();
  var marcadorEscolhido = mapaMarcadores[status];
  if (!marcadorEscolhido) throw new Error('"status" deve ser APTO, INAPTO ou INSUF DOCUMENTAL.');

  var valores = {
    candidatoNome: candidatoNome,
    candidatoId: candidatoId,
    nomeConcurso: campo('nomeConcurso'),
    DATA_HOJE: formatarDataMilitar(new Date())
  };

  var docCopia = DriveApp.getFileById(ID_TEMPLATE_TERMO_CIENTIFICACAO).makeCopy('Temp_Cientificacao_' + candidatoId);
  try {
    var docAberto = DocumentApp.openById(docCopia.getId());
    var body = docAberto.getBody();

    // Localiza o parágrafo da opção escolhida antes de trocar o marcador.
    var achado = body.findText('\\{\\{' + marcadorEscolhido + '\\}\\}');
    var paragrafo = null;
    if (achado) {
      var el = achado.getElement();
      while (el && el.getType() !== DocumentApp.ElementType.PARAGRAPH && el.getType() !== DocumentApp.ElementType.LIST_ITEM) {
        el = el.getParent();
      }
      paragrafo = el;
    }

    Object.keys(mapaMarcadores).forEach(function(chave) {
      var marcador = mapaMarcadores[chave];
      body.replaceText('\\{\\{' + marcador + '\\}\\}', marcador === marcadorEscolhido ? 'X' : '');
    });
    Object.keys(valores).forEach(function(chave) {
      body.replaceText('\\{\\{' + chave + '\\}\\}', valores[chave]);
    });

    if (paragrafo) paragrafo.editAsText().setBold(true);

    docAberto.saveAndClose();

    var pdfBlob = docCopia.getAs('application/pdf');
    var base64 = Utilities.base64Encode(pdfBlob.getBytes());

    return { candidatoId: candidatoId, pdfBase64: base64 };
  } finally {
    docCopia.setTrashed(true);
  }
}

/**
 * Gera o PDF de um template Google Docs substituindo os placeholders "{{chave}}"
 * pelos valores informados (a cópia do template é temporária e descartada).
 * Os placeholders são substituídos no corpo, no cabeçalho e no RODAPÉ (inclusive dentro de
 * tabelas): body.replaceText não alcança o rodapé — no template do Pedido de Parecer, a data
 * ({{DATA_HOJE}}) e o bloco de assinatura ficam numa tabela no rodapé.
 * "$" é escapado porque o replaceText trata "$1" como referência a grupo.
 */
function gerarPdfDeTemplate(idTemplate, nomeTemp, valores) {
  var docCopia = DriveApp.getFileById(idTemplate).makeCopy(nomeTemp);
  try {
    var docAberto = DocumentApp.openById(docCopia.getId());
    var partes = [docAberto.getBody(), docAberto.getHeader(), docAberto.getFooter()].filter(function(p) { return p; });
    Object.keys(valores).forEach(function(chave) {
      var padrao = '\\{\\{' + chave + '\\}\\}';
      var texto = String(valores[chave]).replace(/\$/g, '\\$');
      partes.forEach(function(parte) { parte.replaceText(padrao, texto); });
    });
    docAberto.saveAndClose();
    return Utilities.base64Encode(docCopia.getAs('application/pdf').getBytes());
  } finally {
    docCopia.setTrashed(true);
  }
}

/** Valores comuns aos dois documentos: candidato, concurso, data e médico signatário. */
function valoresBaseSolicitacao(corpo) {
  var campo = function(nome) { return String((corpo && corpo[nome]) || '').trim(); };
  var candidatoId = campo('candidatoId');
  var candidatoNome = campo('candidatoNome');
  if (!candidatoId) throw new Error('"candidatoId" (matrícula do candidato) é obrigatório.');
  if (!candidatoNome) throw new Error('"candidatoNome" é obrigatório.');
  return {
    campo: campo,
    candidatoId: candidatoId,
    valores: {
      candidatoNome: candidatoNome,
      candidatoId: candidatoId,
      nomeConcurso: campo('nomeConcurso'),
      DATA_HOJE: formatarDataMilitar(new Date()),
      nomeUsuario: campo('nomeUsuario'),
      postoGraduacao: campo('postoGraduacao'),
      cargo: campo('cargo'),
      crmPe: campo('crmPe'),
      email: campo('email')
    }
  };
}

/**
 * action=gerarSolicitacaoParecer (POST): { candidatoId, candidatoNome, nomeConcurso,
 * especialidade, historico, nomeUsuario, postoGraduacao, cargo, crmPe, email } —
 * Pedido de Parecer Médico. Placeholders: {{especialidade}} {{historico}} +
 * os comuns (candidatoNome, candidatoId, nomeConcurso, DATA_HOJE, nomeUsuario,
 * postoGraduacao, cargo, crmPe, email).
 */
function apiGerarSolicitacaoParecer(corpo) {
  var base = valoresBaseSolicitacao(corpo);
  var especialidade = base.campo('especialidade');
  var historico = base.campo('historico');
  if (!especialidade) throw new Error('"especialidade" é obrigatória.');
  if (!historico) throw new Error('"historico" é obrigatório.');
  base.valores.especialidade = especialidade;
  base.valores.historico = historico;
  return {
    candidatoId: base.candidatoId,
    pdfBase64: gerarPdfDeTemplate(ID_TEMPLATE_SOLICITACAO_PARECER, 'Temp_Parecer_' + base.candidatoId, base.valores)
  };
}

/**
 * action=gerarSolicitacaoExames (POST): mesmos campos, com "exames" no lugar de
 * especialidade/historico — Solicitação de Exames Complementares Periciais.
 * Placeholder próprio: {{exames}}.
 */
function apiGerarSolicitacaoExames(corpo) {
  var base = valoresBaseSolicitacao(corpo);
  var exames = base.campo('exames');
  if (!exames) throw new Error('"exames" é obrigatório.');
  base.valores.exames = exames;
  return {
    candidatoId: base.candidatoId,
    pdfBase64: gerarPdfDeTemplate(ID_TEMPLATE_SOLICITACAO_EXAMES, 'Temp_Exames_' + base.candidatoId, base.valores)
  };
}

/** Data por extenso no padrão do pedido de parecer: "1º de outubro de 2026". */
function formatarDataPorExtenso(data) {
  var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var dia = Number(Utilities.formatDate(data, 'America/Recife', 'd'));
  var mes = Number(Utilities.formatDate(data, 'America/Recife', 'M'));
  var ano = Utilities.formatDate(data, 'America/Recife', 'yyyy');
  return (dia === 1 ? '1º' : String(dia)) + ' de ' + meses[mes - 1] + ' de ' + ano;
}

/**
 * action=gerarPedidoParecer (POST): { inspecionado, especialidade, finalidade, historico,
 * quesitos (lista de textos), nomeUsuario, postoGraduacao, cargo, crmPe } — Pedido de Parecer
 * Médico da página Pareceres. Placeholders do template: {{dataHoje}} {{especialidadeParecer}}
 * {{inspecionado}} {{finalidade}} {{historico}} {{quesitos}} (lista numerada) {{nomeUsuario}}
 * {{postoGraduacao}} {{cargo}} {{crmPe}}.
 */
function apiGerarPedidoParecer(corpo) {
  var campo = function(nome) { return String((corpo && corpo[nome]) || '').trim(); };
  ['inspecionado', 'especialidade', 'finalidade', 'historico'].forEach(function(nome) {
    if (!campo(nome)) throw new Error('"' + nome + '" é obrigatório.');
  });
  var quesitos = (corpo.quesitos || []).map(function(q) { return String(q).trim(); }).filter(Boolean);
  if (!quesitos.length) throw new Error('Informe ao menos um quesito.');
  // Lista numerada; linhas seguintes de um mesmo quesito (ex.: "A) ...") recuam sob o número.
  var listaNumerada = quesitos.map(function(q, i) {
    var linhas = q.split(/\r?\n/);
    return (i + 1) + '. ' + linhas[0] + linhas.slice(1).map(function(l) { return '\n    ' + l.trim(); }).join('');
  }).join('\n');
  var valores = {
    dataHoje: formatarDataPorExtenso(new Date()),
    especialidadeParecer: campo('especialidade'),
    inspecionado: campo('inspecionado'),
    finalidade: campo('finalidade'),
    historico: campo('historico'),
    quesitos: listaNumerada,
    nomeUsuario: campo('nomeUsuario'),
    postoGraduacao: campo('postoGraduacao'),
    cargo: campo('cargo'),
    crmPe: campo('crmPe')
  };
  return { pdfBase64: gerarPdfDeTemplate(ID_TEMPLATE_PEDIDO_PARECER, 'Temp_PedidoParecer_' + Date.now(), valores) };
}


// =========================================================================
// GOOGLE DRIVE — estrutura de pastas e arquivos dos concursos
// =========================================================================

/** ID do projeto Firebase (o mesmo de firebase-applet-config.json): usado na API REST do Firestore. */
var FIREBASE_PROJECT_ID = 'jrs-app-web';
var PERFIS_EQUIPE = ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'];
var PERFIS_MEDICOS = ['admin', 'user_medicos', 'user_medicos_mpi'];
/**
 * Perfis aceitos por ação (espelha firestore.rules). Ação fora da lista: qualquer perfil da equipe, ativo.
 * Pedido de parecer é só dos médicos, como nas regras do Firestore.
 * A matriz fina de páginas/funcionalidades (config/permissoes) continua conferida no app e nas regras.
 */
var PERFIS_POR_ACAO = {
  gerarPedidoParecer: PERFIS_MEDICOS,
  salvarPdfParecer: PERFIS_MEDICOS,
  enviarParecerImpressao: PERFIS_MEDICOS
};
/** Operações sensíveis: além do log, cada uso vira um registro em auditoria_acoes (Firestore). */
var ACOES_SENSIVEIS = ['removerArquivoDrive', 'enviarParecerImpressao', 'enviarTermoRecursoImpressao', 'enviarSolicitacaoConcursoImpressao'];

/** Usuário já validado nesta execução (evita repetir a consulta ao Firebase em autorizarAcao_ + exigirUsuarioFirebase). */
var USUARIO_VALIDADO_ = null;

/**
 * Log estruturado de acesso, SEM dados pessoais: só evento, ação, uid, perfil e motivo (nada do corpo da
 * requisição, nem token). Aparece em Execuções/Cloud Logging do Apps Script.
 */
function logAcesso_(evento, acao, uid, perfil, motivo) {
  Logger.log(JSON.stringify({ evento: evento, acao: String(acao || '').substring(0, 60), uid: uid || '', perfil: perfil || '', motivo: motivo || '' }));
}

/**
 * Grava um registro de auditoria em auditoria_acoes (mesma coleção do app; ver firestore.rules) usando o
 * token do PRÓPRIO usuário, que as regras só deixam criar em nome dele. Best effort: nunca interrompe a ação.
 */
function registrarAuditoria_(idToken, uid, usuario, acao, alvo) {
  try {
    UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/auditoria_acoes', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + idToken },
      payload: JSON.stringify({ fields: {
        acao: { stringValue: String(acao).substring(0, 60) },
        alvo: { stringValue: String(alvo || 'apps-script').substring(0, 60) },
        uid: { stringValue: uid },
        usuario: { stringValue: String(usuario || '').substring(0, 60) },
        em: { timestampValue: new Date().toISOString() }
      } }),
      muteHttpExceptions: true
    });
  } catch (erro) {
    logAcesso_('auditoria_falhou', acao, uid, '', 'erro_rede');
  }
}

/** Perfil e situação do usuário em usuarios/{uid}, lidos com o token dele (as regras permitem a leitura). Cache de 60 s. */
function obterPerfilUsuario_(uid, idToken) {
  var cache = CacheService.getScriptCache();
  var emCache = cache.get('perfil_' + uid);
  if (emCache) return JSON.parse(emCache);
  var resp = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/usuarios/' + encodeURIComponent(uid), {
    method: 'get',
    headers: { Authorization: 'Bearer ' + idToken },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) return null;
  var campos = {};
  try { campos = JSON.parse(resp.getContentText()).fields || {}; } catch (e) { return null; }
  var perfil = {
    perfil: (campos.perfil && campos.perfil.stringValue) || '',
    ativo: !(campos.ativo && campos.ativo.booleanValue === false),
    usuario: (campos.usuario && campos.usuario.stringValue) || ''
  };
  cache.put('perfil_' + uid, JSON.stringify(perfil), 60);
  return perfil;
}

/**
 * Porta de entrada de TODAS as ações (exceto "versao"): exige login válido do Firebase, usuário ativo e
 * perfil permitido para a ação (PERFIS_POR_ACAO). Recusas são registradas (log + auditoria_acoes quando o
 * token é válido); as operações sensíveis (ACOES_SENSIVEIS) também. Devolve { uid, perfil, usuario }.
 */
function autorizarAcao_(corpo) {
  var acao = String((corpo && corpo.action) || '');
  var idToken = String((corpo && corpo.idToken) || '');
  var uid;
  try {
    uid = exigirUsuarioFirebase(corpo);
  } catch (erroSessao) {
    logAcesso_('acesso_negado', acao, '', '', idToken ? 'sessao_invalida' : 'sem_token');
    throw erroSessao;
  }
  var dados = obterPerfilUsuario_(uid, idToken);
  var motivo = '';
  if (!dados || !dados.perfil) motivo = 'perfil_inexistente';
  else if (!dados.ativo) motivo = 'usuario_inativo';
  else if ((PERFIS_POR_ACAO[acao] || PERFIS_EQUIPE).indexOf(dados.perfil) === -1) motivo = 'perfil_sem_permissao';
  if (motivo) {
    logAcesso_('acesso_negado', acao, uid, dados && dados.perfil, motivo);
    registrarAuditoria_(idToken, uid, dados && dados.usuario, 'acesso_negado.' + acao, motivo);
    throw new Error('Acesso negado: seu perfil não tem permissão para esta operação.');
  }
  if (ACOES_SENSIVEIS.indexOf(acao) !== -1) {
    logAcesso_('operacao_sensivel', acao, uid, dados.perfil, '');
    registrarAuditoria_(idToken, uid, dados.usuario, 'apps-script.' + acao, 'apps-script');
  }
  return { uid: uid, perfil: dados.perfil, usuario: dados.usuario };
}

/**
 * Valida o token de login do Firebase enviado pelo app ("idToken") e devolve o uid.
 * Chamada por autorizarAcao_ (porta de entrada de todas as ações) e, por segurança, por cada ação que grava
 * no Drive.
 */
function exigirUsuarioFirebase(corpo) {
  var idToken = String((corpo && corpo.idToken) || '');
  if (!idToken) throw new Error('Sessão não identificada. Entre novamente no app.');
  if (USUARIO_VALIDADO_ && USUARIO_VALIDADO_.idToken === idToken) return USUARIO_VALIDADO_.uid;
  var resp = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true
  });
  var json = {};
  try { json = JSON.parse(resp.getContentText()); } catch (e) { /* tratado abaixo */ }
  if (resp.getResponseCode() !== 200 || !json.users || !json.users.length) {
    throw new Error('Sessão inválida ou expirada. Entre novamente no app.');
  }
  USUARIO_VALIDADO_ = { idToken: idToken, uid: json.users[0].localId };
  return json.users[0].localId;
}

/** Nome de pasta/arquivo sem quebras de linha nem espaços sobrando ("/" é permitido pelo Drive). */
function limparNomeDrive(nome) {
  return String(nome || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Devolve a subpasta com esse nome dentro de "pai", criando-a se não existir. */
function obterOuCriarSubpasta(pai, nome) {
  var achadas = pai.getFoldersByName(nome);
  return achadas.hasNext() ? achadas.next() : pai.createFolder(nome);
}

/**
 * Garante a estrutura  raiz > {ano} > {nomeConcurso} > CANDIDATOS e MENSAGENS
 * (cada nível só é criado se ainda não existir) e devolve as pastas.
 * O lock evita pastas duplicadas quando duas chamadas chegam juntas.
 */
function garantirEstruturaConcurso(ano, nomeConcurso) {
  var nome = limparNomeDrive(nomeConcurso);
  if (!nome) throw new Error('"nomeConcurso" é obrigatório.');
  var anoTexto = String(ano || '').replace(/\D/g, '') || Utilities.formatDate(new Date(), 'America/Recife', 'yyyy');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var raiz = DriveApp.getFolderById(ID_PASTA_RAIZ_CONCURSOS);
    var pastaAno = obterOuCriarSubpasta(raiz, anoTexto);
    var pastaConcurso = obterOuCriarSubpasta(pastaAno, nome);
    return {
      concurso: pastaConcurso,
      candidatos: obterOuCriarSubpasta(pastaConcurso, 'CANDIDATOS'),
      mensagens: obterOuCriarSubpasta(pastaConcurso, 'MENSAGENS')
    };
  } finally {
    lock.releaseLock();
  }
}

/** URL de visualização (abre no navegador) de um arquivo do Drive. */
function urlVisualizacaoDrive(idArquivo) {
  return 'https://drive.google.com/file/d/' + idArquivo + '/view';
}

/** Cria um PDF (a partir do base64) dentro da pasta e devolve o arquivo. */
function criarPdfNaPasta(pasta, nomeArquivo, pdfBase64) {
  if (!pdfBase64) throw new Error('"pdfBase64" é obrigatório.');
  var blob = Utilities.newBlob(Utilities.base64Decode(pdfBase64), 'application/pdf', nomeArquivo);
  return pasta.createFile(blob);
}

/**
 * action=criarEstruturaConcurso (POST): { idToken, ano, nomeConcurso } — cria a estrutura de pastas do
 * concurso (ano > concurso > CANDIDATOS e MENSAGENS), se ainda não existir.
 */
function apiCriarEstruturaConcurso(corpo) {
  exigirUsuarioFirebase(corpo);
  var pastas = garantirEstruturaConcurso(corpo.ano, corpo.nomeConcurso);
  return { pastaId: pastas.concurso.getId() };
}

/**
 * action=salvarMensagemPdf (POST): { idToken, ano, nomeConcurso, nomeArquivo, pdfBase64 } — guarda o PDF da
 * mensagem na subpasta MENSAGENS do concurso (criando a estrutura se preciso). Devolve a URL de visualização.
 */
function apiSalvarMensagemPdf(corpo) {
  exigirUsuarioFirebase(corpo);
  var pastas = garantirEstruturaConcurso(corpo.ano, corpo.nomeConcurso);
  var original = limparNomeDrive(corpo.nomeArquivo).replace(/\.pdf$/i, '') || 'mensagem';
  var arquivo = criarPdfNaPasta(pastas.mensagens, Date.now() + '_' + original + '.pdf', corpo.pdfBase64);
  return { fileId: arquivo.getId(), url: urlVisualizacaoDrive(arquivo.getId()) };
}

/**
 * action=salvarPdfCandidato (POST): { idToken, ano, nomeConcurso, candidatoId, candidatoNome, tipoDocumento, pdfBase64 }
 * — guarda o PDF (termoRecurso, termoCientificacao, solicitacaoParecer, solicitacaoExames) na pasta do candidato,
 * dentro de CANDIDATOS (a pasta do candidato é criada na primeira vez). Nome do arquivo:
 * {tipoDocumento}_{candidatoId}_{AAAAMMDD-HHMMSS}.pdf. Devolve a URL de visualização ("view").
 */
function apiSalvarPdfCandidato(corpo) {
  exigirUsuarioFirebase(corpo);
  var candidatoId = limparNomeDrive(corpo.candidatoId);
  var candidatoNome = limparNomeDrive(corpo.candidatoNome);
  var tipo = limparNomeDrive(corpo.tipoDocumento).replace(/[^A-Za-z0-9_-]/g, '');
  if (!candidatoId) throw new Error('"candidatoId" (matrícula do candidato) é obrigatório.');
  if (!candidatoNome) throw new Error('"candidatoNome" é obrigatório.');
  if (!tipo) throw new Error('"tipoDocumento" é obrigatório.');

  var pastas = garantirEstruturaConcurso(corpo.ano, corpo.nomeConcurso);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var pastaCandidato;
  try {
    pastaCandidato = obterOuCriarSubpasta(pastas.candidatos, candidatoNome);
  } finally {
    lock.releaseLock();
  }
  var carimbo = Utilities.formatDate(new Date(), 'America/Recife', 'yyyyMMdd-HHmmss');
  var arquivo = criarPdfNaPasta(pastaCandidato, tipo + '_' + candidatoId + '_' + carimbo + '.pdf', corpo.pdfBase64);
  return { fileId: arquivo.getId(), url: urlVisualizacaoDrive(arquivo.getId()) };
}

/** Remove os acentos (ex.: "Ortopedia e Traumatologia" fica igual; "Clínica Médica" → "Clinica Medica"). */
function semAcentos(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * action=salvarPdfParecer (POST): { idToken, nomeInspecionado, especialidade, pdfBase64 } — guarda o Pedido de
 * Parecer (PDF) em PARECERES > {nome completo do inspecionado} (a subpasta é criada na primeira vez), com o nome
 * SOL_PARECER_{especialidade sem acentos}_{DDMMMAAAA}.PDF (ex.: SOL_PARECER_Clinica Medica_12OUT2026.PDF).
 * Devolve a URL de visualização ("view"), que o app abre numa nova janela (desktop) ou dentro do app (mobile).
 */
function apiSalvarPdfParecer(corpo) {
  exigirUsuarioFirebase(corpo);
  var nomeInspecionado = limparNomeDrive(corpo.nomeInspecionado);
  var especialidade = limparNomeDrive(semAcentos(corpo.especialidade)).replace(/[\\/]+/g, '-');
  if (!nomeInspecionado) throw new Error('"nomeInspecionado" é obrigatório.');
  if (!especialidade) throw new Error('"especialidade" é obrigatória.');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var pasta;
  try {
    pasta = obterOuCriarSubpasta(DriveApp.getFolderById(ID_PASTA_PARECERES), nomeInspecionado);
  } finally {
    lock.releaseLock();
  }
  var nomeArquivo = 'SOL_PARECER_' + especialidade + '_' + formatarDataMilitar(new Date()) + '.PDF';
  var arquivo = criarPdfNaPasta(pasta, nomeArquivo, corpo.pdfBase64);
  return { fileId: arquivo.getId(), url: urlVisualizacaoDrive(arquivo.getId()) };
}

/** Escapa &, <, >, " e ' para inserir texto no HTML do e-mail. */
function escaparHtml(texto) {
  return String(texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Destinatário do "Enviar para Impressão" dos pedidos de parecer. */
var EMAIL_IMPRESSAO = cfg_('EMAIL_IMPRESSAO', 'giorginis@marinha.mil.br');

/**
 * action=enviarParecerImpressao (POST): { idToken, pdfUrl, remetente } — envia o PDF do Pedido de Parecer por
 * e-mail para impressão (EMAIL_IMPRESSAO), a partir da conta dona do script, com o nome de exibição do médico
 * que solicitou o parecer (ex.: "CT MAURISTON"). Aceita o PDF no Drive (só sob a pasta PARECERES) ou, nos
 * pedidos mais antigos, no Firebase Storage do projeto.
 */
function apiEnviarParecerImpressao(corpo) {
  exigirUsuarioFirebase(corpo);
  var pdfUrl = String(corpo.pdfUrl || '').trim();
  var remetente = limparNomeDrive(corpo.remetente).slice(0, 80) || 'JRS/HNRe';
  if (!pdfUrl) throw new Error('"pdfUrl" é obrigatório.');

  var blob;
  var idDrive = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(pdfUrl);
  if (idDrive) {
    var arquivo = DriveApp.getFileById(idDrive[1]);
    if (!estaSobPasta(arquivo, ID_PASTA_PARECERES)) throw new Error('O PDF não está na pasta PARECERES.');
    blob = arquivo.getBlob();
  } else if (/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/jrs-app-web\.firebasestorage\.app\//.test(pdfUrl)) {
    var resp = UrlFetchApp.fetch(pdfUrl, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) throw new Error('Não foi possível baixar o PDF do pedido.');
    blob = resp.getBlob().setName('PEDIDO_DE_PARECER.pdf');
  } else {
    throw new Error('Endereço do PDF não reconhecido.');
  }

  garantirCotaEmail();
  MailApp.sendEmail({
    to: EMAIL_IMPRESSAO,
    cc: EMAILS_COPIA_TERMO_RECURSO,
    subject: 'POR FAVOR, IMPRIMIR',
    body: 'Giorginis,\n\nPor favor, imprimir este documento em frente e verso colorido.\n\nObrigado!\n\n' + remetente,
    // Versão formatada (Arial): saudação maior e em negrito, "frente e verso colorido" em negrito.
    htmlBody:
      '<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222;">' +
      '<p style="font-size: 18px; font-weight: bold; margin: 0 0 16px;">Giorginis,</p>' +
      '<p style="margin: 0 0 16px;">Por favor, imprimir este documento em <strong>frente e verso colorido</strong>.</p>' +
      '<p style="margin: 0 0 16px;">Obrigado!</p>' +
      '<p style="margin: 0;">' + escaparHtml(remetente) + '</p>' +
      '</div>',
    name: remetente,
    attachments: [blob]
  });
  return { enviado: true };
}

/** "Obrigada!" quando quem assina é a 1T Mônica Virgínia; "Obrigado!" para os demais. */
function agradecimentoDe(remetente) {
  return /MONICA/.test(semAcentos(remetente).toUpperCase()) ? 'Obrigada!' : 'Obrigado!';
}

/** Cópias dos e-mails de impressão (Termo de Recurso, solicitações dos concursos e pedidos de parecer). */
var EMAILS_COPIA_TERMO_RECURSO = 'dayvison.rubem@marinha.mil.br,brunelly.cavalcanti@marinha.mil.br';

/**
 * action=enviarTermoRecursoImpressao (POST): { idToken, pdfUrl, candidatoId, candidatoNome, nomeConcurso, remetente }
 * — chamada automaticamente pelo app depois de gerar o Termo de Recurso (+ Cientificação) de um candidato INAPTO:
 * envia o PDF (só sob a pasta CONCURSOS) para EMAIL_IMPRESSAO, com cópia para EMAILS_COPIA_TERMO_RECURSO, para
 * impressão e coleta de assinaturas. Nome de exibição e assinatura = médico que gerou o termo.
 */
function apiEnviarTermoRecursoImpressao(corpo) {
  exigirUsuarioFirebase(corpo);
  var pdfUrl = String(corpo.pdfUrl || '').trim();
  var candidatoId = limparNomeDrive(corpo.candidatoId);
  var candidato = limparNomeDrive(corpo.candidatoNome).toUpperCase();
  var nomeConcurso = limparNomeDrive(corpo.nomeConcurso);
  var remetente = limparNomeDrive(corpo.remetente).slice(0, 80) || 'JRS/HNRe';
  if (!candidato) throw new Error('"candidatoNome" é obrigatório.');

  var idDrive = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(pdfUrl);
  if (!idDrive) throw new Error('Endereço do PDF não reconhecido.');
  var arquivo = DriveApp.getFileById(idDrive[1]);
  if (!estaSobPasta(arquivo, ID_PASTA_RAIZ_CONCURSOS)) throw new Error('O PDF não está na pasta CONCURSOS.');

  var agradecimento = agradecimentoDe(remetente);
  var idCandidato = candidatoId ? candidatoId + ' ' : '';

  garantirCotaEmail();
  MailApp.sendEmail({
    to: EMAIL_IMPRESSAO,
    cc: EMAILS_COPIA_TERMO_RECURSO,
    subject: 'TERMO DE RECURSO INAPTIDÃO - ' + candidato,
    body: 'Giorginis,\n\nSeguem os termos do candidato INAPTO ao ' + nomeConcurso + ' ' + idCandidato + candidato +
      ' para impressão e coleta de assinaturas.\n\n' + agradecimento + '\n\n' + remetente,
    htmlBody:
      '<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222;">' +
      '<p style="font-size: 18px; font-weight: bold; margin: 0 0 16px;">Giorginis,</p>' +
      '<p style="margin: 0 0 16px;">Seguem os termos do candidato <strong style="color: #C00000;">INAPTO</strong> ao ' + escaparHtml(nomeConcurso) +
      ' <strong>' + escaparHtml(idCandidato + candidato) + '</strong> para impressão e coleta de assinaturas.</p>' +
      '<p style="margin: 0 0 16px;">' + agradecimento + '</p>' +
      '<p style="margin: 0;">' + escaparHtml(remetente) + '</p>' +
      '</div>',
    name: remetente,
    attachments: [arquivo.getBlob()]
  });
  return { enviado: true };
}

/**
 * action=enviarSolicitacaoConcursoImpressao (POST): { idToken, pdfUrl, tipo ('parecer' | 'exames'), remetente } —
 * chamada automaticamente pelo app depois de gerar uma Solicitação de Parecer ou de Exames de um candidato:
 * envia o PDF (só sob a pasta CONCURSOS) para EMAIL_IMPRESSAO, com cópia para EMAILS_COPIA_TERMO_RECURSO, para
 * impressão só na frente e colorida. Nome de exibição e assinatura = médico que gerou a solicitação.
 */
function apiEnviarSolicitacaoConcursoImpressao(corpo) {
  exigirUsuarioFirebase(corpo);
  var pdfUrl = String(corpo.pdfUrl || '').trim();
  var tipo = corpo.tipo === 'parecer' ? 'PARECER' : corpo.tipo === 'exames' ? 'EXAMES' : '';
  var remetente = limparNomeDrive(corpo.remetente).slice(0, 80) || 'JRS/HNRe';
  if (!tipo) throw new Error('"tipo" deve ser "parecer" ou "exames".');

  var idDrive = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(pdfUrl);
  if (!idDrive) throw new Error('Endereço do PDF não reconhecido.');
  var arquivo = DriveApp.getFileById(idDrive[1]);
  if (!estaSobPasta(arquivo, ID_PASTA_RAIZ_CONCURSOS)) throw new Error('O PDF não está na pasta CONCURSOS.');

  var agradecimento = agradecimentoDe(remetente);
  garantirCotaEmail();
  MailApp.sendEmail({
    to: EMAIL_IMPRESSAO,
    cc: EMAILS_COPIA_TERMO_RECURSO,
    subject: 'IMPRIMIR - SOLICITAÇÃO DE ' + tipo,
    body: 'Giorginis,\n\nPor favor, imprimir apenas na frente e colorido.\n\n' + agradecimento + '\n\n' + remetente,
    htmlBody:
      '<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222;">' +
      '<p style="font-size: 18px; font-weight: bold; margin: 0 0 16px;">Giorginis,</p>' +
      '<p style="margin: 0 0 16px;">Por favor, imprimir <strong>apenas na frente e colorido</strong>.</p>' +
      '<p style="margin: 0 0 16px;">' + agradecimento + '</p>' +
      '<p style="margin: 0;">' + escaparHtml(remetente) + '</p>' +
      '</div>',
    name: remetente,
    attachments: [arquivo.getBlob()]
  });
  return { enviado: true };
}

/** Verdadeiro se o arquivo está em algum lugar sob a pasta indicada (limite de profundidade por segurança). */
function estaSobPasta(arquivo, idPastaRaiz) {
  var fila = [arquivo];
  for (var nivel = 0; nivel < 8 && fila.length; nivel++) {
    var proxima = [];
    for (var i = 0; i < fila.length; i++) {
      var pais = fila[i].getParents();
      while (pais.hasNext()) {
        var pai = pais.next();
        if (pai.getId() === idPastaRaiz) return true;
        proxima.push(pai);
      }
    }
    fila = proxima;
  }
  return false;
}

/**
 * action=removerArquivoDrive (POST): { idToken, fileId } — manda para a lixeira um PDF de concurso que perdeu o sentido
 * (ex.: termo apagado ao mudar o Status). Só mexe em arquivos que estão sob as pastas CONCURSOS ou PARECERES.
 */
function apiRemoverArquivoDrive(corpo) {
  exigirUsuarioFirebase(corpo);
  var fileId = String(corpo.fileId || '').trim();
  if (!fileId) throw new Error('"fileId" é obrigatório.');
  var arquivo;
  try { arquivo = DriveApp.getFileById(fileId); } catch (e) { return { removido: false }; }
  if (!estaSobPasta(arquivo, ID_PASTA_RAIZ_CONCURSOS) && !estaSobPasta(arquivo, ID_PASTA_PARECERES)) throw new Error('Arquivo fora das pastas de concursos e pareceres.');
  arquivo.setTrashed(true);
  return { removido: true };
}

// =========================================================================
// GOOGLE AGENDA — entrevistas das Inspeções de Saúde
// =========================================================================

/** Converte "AAAA-MM-DD" + "hh:mm" em Date no fuso do script (America/Recife, ver appsscript.json). */
function dataHoraAgenda(data, hhmm) {
  var d = String(data || '').split('-');
  var h = String(hhmm || '').split(':');
  if (d.length !== 3 || h.length < 2) throw new Error('Data ou hora do evento inválida.');
  return new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]), Number(h[0]), Number(h[1]), 0);
}

/**
 * Execute UMA VEZ no editor do Apps Script (selecione "autorizarAgenda" e clique em Executar) para conceder a
 * permissão do Google Agenda ao script; sem essa autorização o app recebe erro ao sincronizar as IS. Também
 * confirma que a agenda JRS/HNRe é acessível (veja o resultado em Execuções/Registros).
 */
function autorizarAgenda() {
  var agenda = CalendarApp.getCalendarById(ID_AGENDA_JRS_HNRE);
  if (!agenda) throw new Error('Agenda JRS/HNRe não encontrada para esta conta.');
  Logger.log('Agenda OK: ' + agenda.getName());
  return agenda.getName();
}

/** Abre a agenda "JRS/HNRe" (pelo id; plano B: pelo nome) ou falha com uma mensagem clara. */
function abrirAgendaJrs(corpo) {
  var agenda = null;
  try { agenda = CalendarApp.getCalendarById(ID_AGENDA_JRS_HNRE); } catch (erroAgenda) { agenda = null; }
  if (!agenda) {
    // Plano B: procura pelo nome (agenda própria ou assinada).
    var nomeAgenda = String(corpo.agenda || 'JRS/HNRe');
    var agendas = CalendarApp.getOwnedCalendarsByName(nomeAgenda);
    if (!agendas.length) agendas = CalendarApp.getCalendarsByName(nomeAgenda);
    if (agendas.length) agenda = agendas[0];
  }
  if (!agenda) throw new Error('Agenda JRS/HNRe não encontrada: a conta que implantou o script precisa ser dona da agenda ou tê-la na lista de agendas (Google Agenda > Outras agendas).');
  return agenda;
}

/** Notificação padrão dos eventos (IS e concursos): 12 horas antes (720 min), no lugar das notificações padrão da agenda. */
function aplicarNotificacaoPadrao(evento) {
  evento.removeAllReminders();
  evento.addPopupReminder(720);
}

/** Cor do evento conforme a situação da IS: Em andamento = amarelo; Finalizada = verde. */
function aplicarCorEventoIS(evento, situacao) {
  if (situacao === 'finalizada') evento.setColor(CalendarApp.EventColor.GREEN);
  else evento.setColor(CalendarApp.EventColor.YELLOW);
}

/**
 * action=sincronizarEventoIS (POST): { idToken, agenda, eventoId?, titulo, descricao, data, horaInicio, horaFim,
 * convidados[], situacao, remover? } — cria, atualiza ou remove o evento da entrevista de uma IS na agenda (padrão "JRS/HNRe")
 * do dono do script. O perito entra como convidado (e-mails em "convidados"). Devolve { eventoId }.
 * A primeira execução pede autorização do serviço Google Agenda (CalendarApp): reimplante o script depois de colar este arquivo.
 */
function apiSincronizarEventoIS(corpo) {
  exigirUsuarioFirebase(corpo);
  var agenda = abrirAgendaJrs(corpo);

  var evento = null;
  var eventoId = String(corpo.eventoId || '');
  if (eventoId) {
    try { evento = agenda.getEventById(eventoId); } catch (erroEvento) { evento = null; }
  }

  if (corpo.remover) {
    if (evento) evento.deleteEvent();
    return { eventoId: '' };
  }

  var titulo = limparNomeDrive(corpo.titulo);
  if (!titulo) throw new Error('"titulo" é obrigatório.');
  var inicio = dataHoraAgenda(corpo.data, corpo.horaInicio);
  var fim = dataHoraAgenda(corpo.data, corpo.horaFim);
  var convidados = [];
  (corpo.convidados || []).forEach(function(email) {
    var limpo = String(email || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo) && convidados.indexOf(limpo) === -1) convidados.push(limpo);
  });

  if (!evento) {
    evento = agenda.createEvent(titulo, inicio, fim, {
      description: String(corpo.descricao || ''),
      guests: convidados.join(','),
      sendInvites: true
    });
    aplicarCorEventoIS(evento, corpo.situacao);
    aplicarNotificacaoPadrao(evento);
    return { eventoId: evento.getId() };
  }

  evento.setTitle(titulo);
  evento.setDescription(String(corpo.descricao || ''));
  evento.setTime(inicio, fim);
  aplicarCorEventoIS(evento, corpo.situacao);
  aplicarNotificacaoPadrao(evento);
  var atuais = evento.getGuestList().map(function(g) { return g.getEmail().toLowerCase(); });
  atuais.forEach(function(email) { if (convidados.indexOf(email) === -1) evento.removeGuest(email); });
  convidados.forEach(function(email) { if (atuais.indexOf(email) === -1) evento.addGuest(email); });
  return { eventoId: evento.getId() };
}

/**
 * action=sincronizarEventoBloqueio (POST): { idToken, titulo, dataInicio, dataFim, eventoId?, remover? } — cria (ou remove, com
 * "remover" + "eventoId") o evento de DIA INTEIRO cinza de um bloqueio de período da agenda das IS, de dataInicio até dataFim
 * (inclusive). Título "{usuário} - {motivo}". Devolve { eventoId }.
 */
function apiSincronizarEventoBloqueio(corpo) {
  exigirUsuarioFirebase(corpo);
  var agenda = abrirAgendaJrs(corpo);
  if (corpo.remover) {
    var existente = null;
    try { existente = agenda.getEventById(String(corpo.eventoId || '')); } catch (erroEvento) { existente = null; }
    if (existente) existente.deleteEvent();
    return { eventoId: '' };
  }
  var titulo = limparNomeDrive(corpo.titulo);
  if (!titulo) throw new Error('"titulo" é obrigatório.');
  var inicio = dataHoraAgenda(corpo.dataInicio, '00:00');
  var fimInclusivo = dataHoraAgenda(corpo.dataFim, '00:00');
  if (fimInclusivo < inicio) throw new Error('A data de término é anterior à de início.');
  // Evento de dia inteiro: o término do Google Agenda é exclusivo (dia seguinte ao último dia do bloqueio).
  var fimExclusivo = new Date(fimInclusivo.getFullYear(), fimInclusivo.getMonth(), fimInclusivo.getDate() + 1);
  var evento = agenda.createAllDayEvent(titulo, inicio, fimExclusivo);
  evento.setColor(CalendarApp.EventColor.GRAY);
  return { eventoId: evento.getId() };
}

/**
 * action=sincronizarEventosConcursos (POST): { idToken, dias[], concursosAtivos[] } — mantém na agenda "JRS/HNRe" UM evento por
 * dia de concurso agendado (07:30–12:00, o turno da manhã inteiro), com todos os usuários ativos do appweb como convidados
 * ("convidados": e-mails Gmail; o convite é enviado por e-mail) e notificação 12 h antes. Cada item de "dias":
 * { chave ("{concursoId}|{AAAA-MM-DD}"), concursoId, data, titulo, descricao, encerrado }. Evento vermelho enquanto o dia está
 * aberto; verde (e título com ✅ na frente, já enviado em "titulo") quando o dia é encerrado. Os eventos são marcados com tags
 * privadas, então a sincronização é idempotente: cria o que falta, atualiza o que mudou e remove os dias que deixaram de existir
 * nos concursos listados em "concursosAtivos" (concursos encerrados não são tocados). Devolve { criados, atualizados, removidos }.
 */
function apiSincronizarEventosConcursos(corpo) {
  exigirUsuarioFirebase(corpo);
  var agenda = abrirAgendaJrs(corpo);
  var convidados = [];
  (corpo.convidados || []).forEach(function(email) {
    var limpo = String(email || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo) && convidados.indexOf(limpo) === -1) convidados.push(limpo);
  });
  var dias = corpo.dias || [];
  var ativos = corpo.concursosAtivos || [];
  var desejados = {};
  dias.forEach(function(d) { desejados[String(d.chave)] = d; });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var hoje = new Date();
    var inicio = new Date(hoje.getTime() - 400 * 86400000);
    var fim = new Date(hoje.getTime() + 500 * 86400000);
    dias.forEach(function(d) {
      var dd = dataHoraAgenda(d.data, '00:00');
      if (dd < inicio) inicio = dd;
      if (dd > fim) fim = new Date(dd.getTime() + 86400000);
    });

    // Eventos já marcados (tag jrsConcurso), por chave; repetidos (corrida entre duas sincronizações) são removidos.
    var existentes = {};
    var removidos = 0;
    agenda.getEvents(inicio, fim).forEach(function(ev) {
      var chave = ev.getTag('jrsConcurso');
      if (!chave) return;
      if (existentes[chave]) { ev.deleteEvent(); removidos++; return; }
      existentes[chave] = ev;
    });

    var criados = 0, atualizados = 0;
    Object.keys(desejados).forEach(function(chave) {
      var d = desejados[chave];
      var ini = dataHoraAgenda(d.data, '07:30');
      var term = dataHoraAgenda(d.data, '12:00');
      var ev = existentes[chave];
      if (ev) {
        ev.setTitle(String(d.titulo));
        ev.setDescription(String(d.descricao || ''));
        ev.setTime(ini, term);
        // Convidados = usuários ativos do appweb: remove quem saiu e convida (por e-mail) quem entrou.
        var atuais = ev.getGuestList().map(function(g) { return g.getEmail().toLowerCase(); });
        atuais.forEach(function(email) { if (convidados.indexOf(email) === -1) ev.removeGuest(email); });
        convidados.forEach(function(email) { if (atuais.indexOf(email) === -1) ev.addGuest(email); });
        atualizados++;
      } else {
        ev = agenda.createEvent(String(d.titulo), ini, term, { description: String(d.descricao || ''), guests: convidados.join(','), sendInvites: true });
        ev.setTag('jrsConcurso', chave);
        ev.setTag('jrsConcursoId', String(d.concursoId));
        criados++;
      }
      ev.setColor(d.encerrado ? CalendarApp.EventColor.GREEN : CalendarApp.EventColor.RED);
      // Notificação padrão: 12 horas antes (720 min), no lugar das notificações da agenda.
      aplicarNotificacaoPadrao(ev);
    });

    // Dias que deixaram de existir (candidatos reagendados, concurso sem candidatos no dia) — só dos concursos ativos.
    Object.keys(existentes).forEach(function(chave) {
      if (desejados[chave]) return;
      var ev = existentes[chave];
      if (ativos.indexOf(ev.getTag('jrsConcursoId')) === -1) return;
      ev.deleteEvent();
      removidos++;
    });

    return { criados: criados, atualizados: atualizados, removidos: removidos };
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// EXAMES DOS CANDIDATOS — PDF no Drive (a transcrição é feita no app, pelo Firebase AI Logic)
// =========================================================================

/**
 * Nome do arquivo de exames na pasta do candidato: a palavra EXAMES seguida do
 * nome completo em maiúsculas, sem acentos e com "_" entre as palavras
 * (ex.: "José da Silva Júnior" → "EXAMES_JOSE_DA_SILVA_JUNIOR.pdf").
 */
function nomeArquivoExames(candidatoNome) {
  var limpo = semAcentos(limparNomeDrive(candidatoNome))
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpo) throw new Error('"candidatoNome" é obrigatório.');
  return 'EXAMES_' + limpo.replace(/ /g, '_') + '.pdf';
}

/**
 * Nome livre na pasta: o primeiro envio fica "EXAMES_NOME.pdf" e os seguintes
 * ganham sufixo ("EXAMES_NOME_2.pdf", "_3"...) — um candidato pode entregar os
 * exames em mais de um PDF, e nenhum envio anterior é sobrescrito.
 */
function nomeArquivoExamesLivre(pasta, candidatoNome) {
  var base = nomeArquivoExames(candidatoNome).replace(/\.pdf$/i, '');
  var nome = base + '.pdf';
  for (var n = 2; pasta.getFilesByName(nome).hasNext() && n <= 50; n++) {
    nome = base + '_' + n + '.pdf';
  }
  return nome;
}

/**
 * action=salvarExamesCandidato (POST): { idToken, ano, nomeConcurso, candidatoId, candidatoNome, pdfBase64, mimeType }
 * — guarda o PDF dos exames na pasta do candidato (dentro de CANDIDATOS, mesma lógica dos termos e das
 * solicitações) com o nome EXAMES_NOME_DO_CANDIDATO.pdf. Devolve { fileId, url, nomeArquivo }; a transcrição
 * dos laudos é feita pelo app (Firebase AI Logic), em paralelo ao envio.
 */
function apiSalvarExamesCandidato(corpo) {
  exigirUsuarioFirebase(corpo);
  var candidatoId = limparNomeDrive(corpo.candidatoId);
  var candidatoNome = limparNomeDrive(corpo.candidatoNome);
  if (!candidatoId) throw new Error('"candidatoId" (matrícula do candidato) é obrigatório.');
  if (!candidatoNome) throw new Error('"candidatoNome" é obrigatório.');
  if (!corpo.pdfBase64) throw new Error('"pdfBase64" é obrigatório.');

  var pastas = garantirEstruturaConcurso(corpo.ano, corpo.nomeConcurso);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var pastaCandidato, nomeArquivo;
  try {
    pastaCandidato = obterOuCriarSubpasta(pastas.candidatos, candidatoNome);
    nomeArquivo = nomeArquivoExamesLivre(pastaCandidato, candidatoNome);
  } finally {
    lock.releaseLock();
  }

  var arquivo = criarPdfNaPasta(pastaCandidato, nomeArquivo, corpo.pdfBase64);
  return {
    fileId: arquivo.getId(),
    url: urlVisualizacaoDrive(arquivo.getId()),
    nomeArquivo: nomeArquivo
  };
}
