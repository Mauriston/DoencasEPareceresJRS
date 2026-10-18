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
 *  - ler a mensagem administrativa (PDF) com o Gemini e devolver os dados
 *    estruturados em JSON.
 *
 * Propriedades do script (Configurações do projeto → Propriedades do script):
 *   GEMINI_API_KEY — chave da API Gemini (usada em "extrairMensagemConcurso").
 * As ações que escrevem no Drive ou usam o Gemini exigem o token de login do
 * Firebase ("idToken") — ver "exigirUsuarioFirebase".
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
var ID_TEMPLATE_SOLICITACAO_PARECER = '16KIcTgceHNdbTNRe8UeYPjJXn4r_d450Xy61conLO3Q';
var ID_TEMPLATE_PEDIDO_PARECER = '1jE-3VQ8G2t4JQJ5B7ydedq6oupvsXwo7aPX_AVttMEM';
var ID_TEMPLATE_SOLICITACAO_EXAMES = '1SSAzdWANvfQJx7Sip2-NbqDGAM0cgpVD6Q4Ci9UhGqQ';

/** Pasta raiz CONCURSOS (drive compartilhado): dentro dela ficam as pastas por ano. */
var ID_PASTA_RAIZ_CONCURSOS = '1eBTehJDTOPjsgOeP3DjWKbE-iXdIKGos';
/** Chave de API web do projeto Firebase (pública, a mesma de firebase-applet-config.json): só serve para validar o idToken. */
var FIREBASE_API_KEY = 'AIzaSyAWBYm6iGQNQXeC5DO038lMSruxpRjoX2c';
var MODELO_GEMINI = 'gemini-2.5-flash';

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
    if (corpo.action === 'gerarPedidoParecer') return apiGerarPedidoParecer(corpo);
    if (corpo.action === 'gerarSolicitacaoExames') return apiGerarSolicitacaoExames(corpo);
    if (corpo.action === 'criarEstruturaConcurso') return apiCriarEstruturaConcurso(corpo);
    if (corpo.action === 'salvarMensagemPdf') return apiSalvarMensagemPdf(corpo);
    if (corpo.action === 'salvarPdfCandidato') return apiSalvarPdfCandidato(corpo);
    if (corpo.action === 'removerArquivoDrive') return apiRemoverArquivoDrive(corpo);
    if (corpo.action === 'extrairMensagemConcurso') return apiExtrairMensagemConcurso(corpo);
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

/**
 * Valida o token de login do Firebase enviado pelo app ("idToken") e devolve o uid.
 * Só as ações que gravam no Drive ou consomem o Gemini passam por aqui.
 */
function exigirUsuarioFirebase(corpo) {
  var idToken = String((corpo && corpo.idToken) || '');
  if (!idToken) throw new Error('Sessão não identificada. Entre novamente no app.');
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

/** URL de download direto de um arquivo do Drive. */
function urlDownloadDrive(idArquivo) {
  return 'https://drive.google.com/uc?export=download&id=' + idArquivo;
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
 * {tipoDocumento}_{candidatoId}_{AAAAMMDD-HHMMSS}.pdf. Devolve a URL de download direto.
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
  return { fileId: arquivo.getId(), url: urlDownloadDrive(arquivo.getId()) };
}

/** Verdadeiro se o arquivo está em algum lugar sob a pasta raiz dos concursos (limite de profundidade por segurança). */
function estaSobRaizConcursos(arquivo) {
  var fila = [arquivo];
  for (var nivel = 0; nivel < 8 && fila.length; nivel++) {
    var proxima = [];
    for (var i = 0; i < fila.length; i++) {
      var pais = fila[i].getParents();
      while (pais.hasNext()) {
        var pai = pais.next();
        if (pai.getId() === ID_PASTA_RAIZ_CONCURSOS) return true;
        proxima.push(pai);
      }
    }
    fila = proxima;
  }
  return false;
}

/**
 * action=removerArquivoDrive (POST): { idToken, fileId } — manda para a lixeira um PDF de concurso que perdeu o sentido
 * (ex.: termo apagado ao mudar o Status). Só mexe em arquivos que estão sob a pasta raiz CONCURSOS.
 */
function apiRemoverArquivoDrive(corpo) {
  exigirUsuarioFirebase(corpo);
  var fileId = String(corpo.fileId || '').trim();
  if (!fileId) throw new Error('"fileId" é obrigatório.');
  var arquivo;
  try { arquivo = DriveApp.getFileById(fileId); } catch (e) { return { removido: false }; }
  if (!estaSobRaizConcursos(arquivo)) throw new Error('Arquivo fora da pasta de concursos.');
  arquivo.setTrashed(true);
  return { removido: true };
}

// =========================================================================
// GEMINI — leitura da mensagem administrativa (PDF)
// =========================================================================

var PROMPT_MENSAGEM_CONCURSO = [
  'Você lê mensagens administrativas navais (SIGAD-MB) em PDF sobre concursos/processos seletivos e extrai os dados.',
  'Responda estritamente em JSON válido, com exatamente estas chaves:',
  '- "dataHora": o código Data-Hora (DTG) da mensagem, formato <R|P><DDHHMM>Z/<MÊS>/<ANO>, ex.: "R181644Z/SET/2026".',
  '- "remetente": o conteúdo do campo "De:" (ex.: "HOSRCF").',
  '- "destinatario": o conteúdo do campo "Para:".',
  '- "info": o conteúdo do campo "Info:" (string vazia se não houver).',
  '- "assunto": o conteúdo do campo "Assunto:".',
  '- "texto": a transcrição fiel e completa do corpo da mensagem (campo "Texto:"), sem cabeçalho de página nem rodapé; preserve os parágrafos com quebras de linha.',
  '- "nomeConcurso": o identificador curto do concurso no assunto, no formato SIGLA/ANO (ex.: "CP-CAP/2026"); se não houver, use o assunto inteiro.',
  '- "mensagemDeAgendamento": true se os candidatos aparecem agrupados por data de comparecimento/agendamento (uma data por grupo); false se é só uma lista de apresentação.',
  '- "periodoJRS": objeto { "inicio": "AAAA-MM-DD", "fim": "AAAA-MM-DD" } com o período em que a JRS fará as inspeções (trecho como "03AGO a 14SET2026 (JRS)"), ou null se não constar.',
  '- "candidatos": lista, na ordem da mensagem, de objetos { "matricula": "000000-0", "nome": "NOME COMPLETO EM MAIÚSCULAS", "dataAgendamento": "AAAA-MM-DD" }. A matrícula tem 5 a 7 dígitos, hífen e um dígito verificador. "dataAgendamento" só se a mensagem agendar o candidato numa data; senão, string vazia. Não inclua militares que não sejam candidatos.',
  'Não invente dados: use string vazia (ou null/lista vazia) quando a informação não estiver no documento.'
].join('\n');

/**
 * action=extrairMensagemConcurso (POST): { idToken, pdfBase64, mimeType } — o Gemini lê a mensagem (PDF ou imagem)
 * e devolve os dados estruturados (ver PROMPT_MENSAGEM_CONCURSO). Exige GEMINI_API_KEY nas propriedades do script.
 */
function apiExtrairMensagemConcurso(corpo) {
  exigirUsuarioFirebase(corpo);
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nas propriedades do projeto Apps Script.');
  if (!corpo.pdfBase64) throw new Error('"pdfBase64" é obrigatório.');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODELO_GEMINI + ':generateContent?key=' + apiKey;
  var requisicao = {
    contents: [{
      parts: [
        { text: PROMPT_MENSAGEM_CONCURSO },
        { inline_data: { mime_type: corpo.mimeType || 'application/pdf', data: corpo.pdfBase64 } }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 }
  };
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requisicao),
    muteHttpExceptions: true
  });
  var json;
  try { json = JSON.parse(resp.getContentText()); } catch (e) { throw new Error('Resposta inválida da API Gemini.'); }
  if (json.error) throw new Error('Erro na API Gemini: ' + json.error.message);

  try {
    var texto = json.candidates[0].content.parts[0].text;
    return JSON.parse(texto);
  } catch (e) {
    throw new Error('O Gemini não conseguiu estruturar os dados da mensagem. Confira se o PDF está legível.');
  }
}
