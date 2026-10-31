/**
 * ParecerController.gs
 * Gera pedidos de parecer e salva no Drive.
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

function apiGerarPedidoParecer(corpo) {
  var campo = function(nome) { return String((corpo && corpo[nome]) || '').trim(); };
  ['inspecionado', 'especialidade', 'finalidade', 'historico'].forEach(function(nome) {
    if (!campo(nome)) throw new Error('"' + nome + '" é obrigatório.');
  });
  var quesitos = (corpo.quesitos || []).map(function(q) { return String(q).trim(); }).filter(Boolean);
  if (!quesitos.length) throw new Error('Informe ao menos um quesito.');
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
