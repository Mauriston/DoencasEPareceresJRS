/**
 * CodeConcursos.gs — Backend (Apps Script) mínimo do menu "Concursos" do
 * app DoencasEPareceresJRS.
 *
 * Após a migração do backend de Concursos para o Firebase (Firestore +
 * Storage — ver services/firestoreConcursos.ts e
 * services/firebaseStorageConcursos.ts), este projeto Apps Script
 * STANDALONE deixou de ler/escrever qualquer planilha do Sheets: sua única
 * responsabilidade é gerar o PDF do Termo de Cientificação de Recurso a
 * partir do template Google Docs e devolvê-lo em base64, para o app fazer
 * o upload no Firebase Storage.
 *
 * Implantação: crie um projeto Apps Script STANDALONE (script.google.com →
 * Novo projeto; não atrelado a planilha nem ao Docs do template), cole este
 * arquivo e use Implantar → Nova implantação → Aplicativo da web, "Executar
 * como: Eu", "Quem pode acessar: Qualquer pessoa". Colar a URL ".../exec"
 * gerada em GAS_URL_TERMO_RECURSO
 * (components/ConcursosJRS.tsx). Como o script usa Docs/Drive só para
 * copiar e exportar o template (nunca grava nada no Drive do usuário além
 * de uma cópia temporária, descartada ao final), a primeira execução pode
 * pedir autorização dessas permissões.
 */

var ID_TEMPLATE_TERMO_RECURSO = '1gVSaakcQJBrFJnF4umFbI_cjR9abCXPjfOyfSUFKnRo';
var ID_TEMPLATE_TERMO_CIENTIFICACAO = '1uSdvvwxjPDkvGm7kjCrDGaGnPVF3_pDu4rN6C6tJFiI';
var ID_TEMPLATE_SOLICITACAO_PARECER = '1YW9-KBCafN1OFA4bSZZqiKLBmq-fubVElpzs3RCm_00';
var ID_TEMPLATE_SOLICITACAO_EXAMES = '1SSAzdWANvfQJx7Sip2-NbqDGAM0cgpVD6Q4Ci9UhGqQ';

/** Ponto de entrada POST do aplicativo da web. Espera um corpo JSON com a propriedade "action". */
function doPost(e) {
  return apiResponder(function() {
    var corpo = {};
    try {
      corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (erroJson) {
      throw new Error('Corpo da requisição não é um JSON válido.');
    }

    if (corpo.action === 'gerarTermoRecurso') return apiGerarTermoRecurso(corpo);
    if (corpo.action === 'gerarTermoCientificacao') return apiGerarTermoCientificacao(corpo);
    if (corpo.action === 'gerarSolicitacaoParecer') return apiGerarSolicitacaoParecer(corpo);
    if (corpo.action === 'gerarSolicitacaoExames') return apiGerarSolicitacaoExames(corpo);
    throw new Error('Ação POST desconhecida: "' + corpo.action + '".');
  });
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
 * "$" é escapado porque o replaceText trata "$1" como referência a grupo.
 */
function gerarPdfDeTemplate(idTemplate, nomeTemp, valores) {
  var docCopia = DriveApp.getFileById(idTemplate).makeCopy(nomeTemp);
  try {
    var docAberto = DocumentApp.openById(docCopia.getId());
    var body = docAberto.getBody();
    Object.keys(valores).forEach(function(chave) {
      body.replaceText('\\{\\{' + chave + '\\}\\}', String(valores[chave]).replace(/\$/g, '\\$'));
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
