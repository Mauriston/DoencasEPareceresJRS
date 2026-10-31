/**
 * DocumentService.gs
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
      body.replaceText('\{\{' + chave + '\}\}', valores[chave]);
    });

    docAberto.saveAndClose();

    var pdfBlob = docCopia.getAs('application/pdf');
    var base64 = Utilities.base64Encode(pdfBlob.getBytes());

    return { candidatoId: candidatoId, pdfBase64: base64 };
  } finally {
    docCopia.setTrashed(true);
  }
}

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

    var achado = body.findText('\{\{' + marcadorEscolhido + '\}\}');
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
      body.replaceText('\{\{' + marcador + '\}\}', marcador === marcadorEscolhido ? 'X' : '');
    });
    Object.keys(valores).forEach(function(chave) {
      body.replaceText('\{\{' + chave + '\}\}', valores[chave]);
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

function gerarPdfDeTemplate(idTemplate, nomeTemp, valores) {
  var docCopia = DriveApp.getFileById(idTemplate).makeCopy(nomeTemp);
  try {
    var docAberto = DocumentApp.openById(docCopia.getId());
    var partes = [docAberto.getBody(), docAberto.getHeader(), docAberto.getFooter()].filter(function(p) { return p; });
    Object.keys(valores).forEach(function(chave) {
      var padrao = '\{\{' + chave + '\}\}';
      var texto = String(valores[chave]).replace(/\$/g, '\\$');
      partes.forEach(function(parte) { parte.replaceText(padrao, texto); });
    });
    docAberto.saveAndClose();
    return Utilities.base64Encode(docCopia.getAs('application/pdf').getBytes());
  } finally {
    docCopia.setTrashed(true);
  }
}

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

function apiCriarEstruturaConcurso(corpo) {
  exigirUsuarioFirebase(corpo);
  var pastas = garantirEstruturaConcurso(corpo.ano, corpo.nomeConcurso);
  return { pastaId: pastas.concurso.getId() };
}

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

function nomeArquivoExames(candidatoNome) {
  var limpo = semAcentos(limparNomeDrive(candidatoNome))
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpo) throw new Error('"candidatoNome" é obrigatório.');
  return 'EXAMES_' + limpo.replace(/ /g, '_') + '.pdf';
}

function apiSalvarExamesCandidato(corpo) {
  exigirUsuarioFirebase(corpo);
  var pastas = garantirEstruturaConcurso(corpo.ano, corpo.nomeConcurso);
  var candidatoNome = limparNomeDrive(corpo.candidatoNome);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var pastaCandidato;
  try {
    pastaCandidato = obterOuCriarSubpasta(pastas.candidatos, candidatoNome);
  } finally {
    lock.releaseLock();
  }
  
  var nomeArq = nomeArquivoExamesLivre(pastaCandidato, candidatoNome);
  var arquivo = criarPdfNaPasta(pastaCandidato, nomeArq, corpo.pdfBase64);

  var retorno = { fileId: arquivo.getId(), url: urlVisualizacaoDrive(arquivo.getId()), nomeArquivo: nomeArq };
  try {
    retorno.dados = extrairExamesComGemini(corpo.pdfBase64, corpo.mimeType);
  } catch (e) {
    retorno.erroExtracao = e.message;
  }
  return retorno;
}

function nomeArquivoExamesLivre(pasta, candidatoNome) {
  var base = nomeArquivoExames(candidatoNome).replace(/\.pdf$/i, '');
  var nome = base + '.pdf';
  for (var n = 2; pasta.getFilesByName(nome).hasNext() && n <= 50; n++) {
    nome = base + '_' + n + '.pdf';
  }
  return nome;
}

function obterOuCriarSubpasta(pai, nome) {
  var achadas = pai.getFoldersByName(nome);
  return achadas.hasNext() ? achadas.next() : pai.createFolder(nome);
}

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

function urlVisualizacaoDrive(idArquivo) {
  return 'https://drive.google.com/file/d/' + idArquivo + '/view';
}

function criarPdfNaPasta(pasta, nomeArquivo, pdfBase64) {
  if (!pdfBase64) throw new Error('"pdfBase64" é obrigatório.');
  var blob = Utilities.newBlob(Utilities.base64Decode(pdfBase64), 'application/pdf', nomeArquivo);
  return pasta.createFile(blob);
}

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
