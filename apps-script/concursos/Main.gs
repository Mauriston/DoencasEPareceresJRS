/**
 * Main.gs
 * Ponto de entrada do aplicativo da web.
 */

var VERSAO_SCRIPT = '2026-10-31.2';
var ACOES_POST_PRINCIPAL = ['extrair_dados_atestado', 'gerarMinutaMensagem'];

function doPost(e) {
  var acaoBruta = '';
  var corpoBruto = {};
  try {
    corpoBruto = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    acaoBruta = String(corpoBruto.action || '');
  } catch (erroPeek) { /* tratado abaixo */ }
  if (ACOES_POST_PRINCIPAL.indexOf(acaoBruta) !== -1) {
    try {
      autorizarAcao_(corpoBruto);
    } catch (erroAcesso) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: erroAcesso.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return doPostPrincipal(e);
  }

  return apiResponder(function() {
    var corpo = {};
    try {
      corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (erroJson) {
      throw new Error('Corpo da requisição não é um JSON válido.');
    }

    if (corpo.action === 'versao') return { versao: VERSAO_SCRIPT };
    
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
    if (corpo.action === 'extrairMensagemConcurso') return apiExtrairMensagemConcurso(corpo);
    if (corpo.action === 'salvarExamesCandidato') return apiSalvarExamesCandidato(corpo);
    if (corpo.action === 'sincronizarEventoIS') return apiSincronizarEventoIS(corpo);
    if (corpo.action === 'sincronizarEventosConcursos') return apiSincronizarEventosConcursos(corpo);
    if (corpo.action === 'sincronizarEventoBloqueio') return apiSincronizarEventoBloqueio(corpo);
    throw new Error('Ação POST desconhecida: "' + corpo.action + '".');
  });
}

function doPostPrincipal(e) {
  if (!e) e = { postData: { contents: "{}" } };
  
  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload.action === "extrair_dados_atestado") {
      return extrairDadosAtestado(payload);
    }

    if (payload.action === "gerarMinutaMensagem") {
      return gerarMinutaMensagem(payload);
    }

    throw new Error("Ação não reconhecida.");

  } catch (err) {
    logSeguro_('doPostPrincipal', err);
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: err.toString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
