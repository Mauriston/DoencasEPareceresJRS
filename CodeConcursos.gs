/**
 * CodeConcursos.gs — Backend (Apps Script) do menu "Concursos" do app
 * DoencasEPareceresJRS.
 *
 * Este é o código-fonte de um projeto Apps Script STANDALONE dedicado
 * (não é o mesmo projeto de Code.gs, que já tem seu próprio doGet/doPost
 * para Usuarios/Pareceres/etc.), implantado como aplicativo da web e
 * consumido por components/ConcursosJRS.tsx (GAS_URL_CONCURSOS).
 *
 * Não acessa a planilha deste app: lê e escreve diretamente na
 * planilha "TEMPLATE CONCURSOS" (abas "candidatosDataBase" e
 * "candidatos"), via SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS) —
 * nunca getActiveSpreadsheet()/getUi(), que não funcionam numa
 * requisição HTTP sem sessão de UI do Sheets.
 *
 * A aba "Principal" daquela planilha NÃO é escrita por este script —
 * candidatosDataBase/candidatos são a fonte de verdade também aqui.
 *
 * Implantação: no editor deste projeto, Implantar → Nova implantação →
 * Aplicativo da web, "Executar como: Eu", "Quem pode acessar: Qualquer
 * pessoa". Colar a URL ".../exec" gerada em GAS_URL_CONCURSOS
 * (components/ConcursosJRS.tsx).
 */

var SPREADSHEET_ID_CONCURSOS = '1stQCDN7Wbr7fBtEowAc2jeQoh7yYFbpw9SnMLa54nHY';

/**
 * Texto do "Laudo" (candidatosDataBase, coluna I) correspondente a cada
 * status válido.
 */
var MAPA_LAUDO_POR_STATUS = {
  'APTO': 'Apto para Ingresso',
  'INAPTO': 'Inapto para Ingresso',
  'FALTOU': 'IS não concluída por não comparecimento',
  'INSUF DOCUMENTAL': 'IS não concluída por Insuficiência Documental Médica'
};

/**
 * Ponto de entrada GET do aplicativo da web. Roteia pela query string
 * "action".
 */
function doGet(e) {
  return apiResponder(function() {
    var action = e && e.parameter ? e.parameter.action : '';
    if (action === 'listarCandidatos') return apiListarCandidatos();
    throw new Error('Ação GET desconhecida: "' + action + '".');
  });
}

/**
 * Ponto de entrada POST do aplicativo da web. Espera um corpo JSON com
 * a propriedade "action".
 */
function doPost(e) {
  return apiResponder(function() {
    var corpo = {};
    try {
      corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (erroJson) {
      throw new Error('Corpo da requisição não é um JSON válido.');
    }

    var action = corpo.action;
    if (action === 'atualizarCandidato') return apiAtualizarCandidato(corpo);
    if (action === 'criarCandidato') return apiCriarCandidato(corpo);
    if (action === 'gerarTermoRecurso') return apiGerarTermoRecurso(corpo);
    throw new Error('Ação POST desconhecida: "' + action + '".');
  });
}

/**
 * Executa "fn", empacota o retorno em { sucesso: true, dados } ou,
 * em caso de erro, { sucesso: false, erro: mensagem }, e devolve como
 * JSON (ContentService), formato esperado pelo front-end.
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

/**
 * Formata uma data (objeto Date) para "DD/MM/AAAA", ou string vazia se
 * não for uma data válida.
 */
function formatarDataSimples(data) {
  if (!data || Object.prototype.toString.call(data) !== '[object Date]' || isNaN(data.getTime())) return '';
  var dia = String(data.getDate()).padStart(2, '0');
  var mes = String(data.getMonth() + 1).padStart(2, '0');
  var ano = data.getFullYear();
  return dia + '/' + mes + '/' + ano;
}

/**
 * Lê os pares {id, nome} das colunas A e B da aba "candidatos" (a
 * partir da linha 2), ignorando linhas sem ID.
 */
function lerParesIdNome(aba) {
  var ultimaLinha = aba.getLastRow();
  var pares = [];
  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, 2).getValues().forEach(function(linha) {
      var id = String(linha[0]).trim();
      var nome = String(linha[1]).trim();
      if (id) pares.push({ id: id, nome: nome });
    });
  }
  return pares;
}

/**
 * Localiza a linha (índice 1-based) do candidato de "id" na aba
 * "candidatosDataBase", ou -1 se não encontrado.
 */
function localizarLinhaCandidatosDataBasePorId(aba, id) {
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return -1;

  var ids = aba.getRange(2, 1, ultimaLinha - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) return i + 2;
  }
  return -1;
}

/**
 * Grava novos candidatos na aba "candidatos" (colunas id e candidato) e
 * reordena TODAS as linhas (novas e já existentes) em ordem alfabética
 * crescente pelo nome. Retorna a quantidade de novos candidatos e a
 * lista completa já ordenada.
 */
function gravarExaminee(ss, candidatos) {
  var aba = ss.getSheetByName('candidatos');
  if (!aba) throw new Error('Aba "candidatos" não encontrada.');

  var existentes = lerParesIdNome(aba);
  var idsExistentes = {};
  existentes.forEach(function(c) { idsExistentes[c.id] = true; });

  var novos = 0;
  candidatos.forEach(function(c) {
    if (!idsExistentes[c.id]) {
      existentes.push({ id: c.id, nome: c.nome });
      idsExistentes[c.id] = true;
      novos++;
    }
  });

  existentes.sort(function(a, b) {
    return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
  });

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, 2).clearContent();
  }
  if (existentes.length > 0) {
    var linhas = existentes.map(function(c) { return [c.id, c.nome]; });
    aba.getRange(2, 1, linhas.length, 2).setValues(linhas);
  }

  return { novos: novos, listaOrdenada: existentes };
}

/**
 * Reescreve a coluna id da aba "candidatosDataBase" seguindo a mesma
 * ordem de "listaOrdenada" (já ordenada por gravarExaminee),
 * preservando os dados das demais colunas de candidatos já existentes
 * e deixando em branco as colunas de candidatos novos.
 */
function gravarExamineeDataBase(ss, listaOrdenada) {
  var aba = ss.getSheetByName('candidatosDataBase');
  if (!aba) throw new Error('Aba "candidatosDataBase" não encontrada.');

  // id + 10 colunas de dados (dataAgendamento, reagendamento, status,
  // Observações, finalizado, recurso, dataLaudo, Laudo, nº TIS,
  // termoRecursoUrl)
  var NUM_COLUNAS = 11;
  var ultimaLinha = aba.getLastRow();
  var dadosPorId = {};

  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, NUM_COLUNAS).getValues().forEach(function(linha) {
      var id = String(linha[0]).trim();
      if (id) dadosPorId[id] = linha.slice(1);
    });
  }

  var idsNaLista = {};
  var linhasFinais = listaOrdenada.map(function(c) {
    idsNaLista[c.id] = true;
    if (dadosPorId[c.id]) {
      return [c.id].concat(dadosPorId[c.id]);
    }
    return [c.id].concat(new Array(NUM_COLUNAS - 1).fill(''));
  });

  // Preserva (ao final) qualquer ID com dados que não esteja na lista de
  // "candidatos", em vez de descartar silenciosamente.
  Object.keys(dadosPorId).forEach(function(id) {
    if (!idsNaLista[id]) {
      linhasFinais.push([id].concat(dadosPorId[id]));
    }
  });

  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, NUM_COLUNAS).clearContent();
  }
  if (linhasFinais.length > 0) {
    aba.getRange(2, 1, linhasFinais.length, NUM_COLUNAS).setValues(linhasFinais);
  }
}

/**
 * Gera o Termo de Cientificação de Recurso para um único candidato
 * (identificado por "id"), buscando os dados em "candidatos" e
 * "candidatosDataBase" de "ss". Reaproveita um arquivo já existente na
 * pasta de Termos em vez de duplicá-lo. Ao final, marca a caixa de
 * seleção "recurso" como VERDADEIRO e grava a URL do PDF em
 * "termoRecursoUrl". Lança Error em caso de problema; retorna
 * { candidato, url }.
 */
function gerarPdfTermoRecurso(ss, id) {
  var abaCandidatos = ss.getSheetByName('candidatos');
  var abaDataBase = ss.getSheetByName('candidatosDataBase');
  if (!abaCandidatos || !abaDataBase) throw new Error('Abas "candidatos"/"candidatosDataBase" não encontradas.');

  var mapaNomes = {};
  lerParesIdNome(abaCandidatos).forEach(function(c) { mapaNomes[c.id] = c.nome; });
  var candidato = mapaNomes[id];
  if (!candidato) {
    throw new Error('Candidato com matrícula "' + id + '" não encontrado em "candidatos". Termo não gerado.');
  }

  var linhaDataBase = localizarLinhaCandidatosDataBasePorId(abaDataBase, id);
  if (linhaDataBase === -1) {
    throw new Error('Candidato com matrícula "' + id + '" não encontrado em "candidatosDataBase". Termo não gerado.');
  }

  var dadosDataBase = abaDataBase.getRange(linhaDataBase, 1, 1, 11).getValues()[0];
  var dataLaudo = formatarDataSimples(dadosDataBase[7]); // coluna H: dataLaudo

  var idPastaPai = '1_dJV8HP1WFXa5lSV-p0V0N22_YXWIRDa';
  var subPasta = DriveApp.getFolderById(idPastaPai);

  var nomeArquivoPdf = "Termo Recurso " + candidato + ".pdf";
  var arquivosExistentes = subPasta.getFilesByName(nomeArquivoPdf);
  var arquivoPdf;

  if (arquivosExistentes.hasNext()) {
    arquivoPdf = arquivosExistentes.next();
  } else {
    var idTemplate = '1CpgsInQSHnx_ji6NBfAiKmRmbfczKYW-M0QO4LZllgc';
    var dataHojeFormatada = formatarDataSimples(new Date());

    var docCopia = DriveApp.getFileById(idTemplate).makeCopy("Temp_Recurso_" + candidato);
    var docAberto = DocumentApp.openById(docCopia.getId());
    var body = docAberto.getBody();

    body.replaceText("\\{\\{Candidato\\}\\}", candidato);
    body.replaceText("\\{\\{Data Laudo\\}\\}", dataLaudo);
    body.replaceText("\\{\\{DATA_HOJE\\}\\}", dataHojeFormatada);

    docAberto.saveAndClose();

    var pdfBlob = docCopia.getAs("application/pdf");
    pdfBlob.setName(nomeArquivoPdf);
    arquivoPdf = subPasta.createFile(pdfBlob);

    docCopia.setTrashed(true);
  }

  abaDataBase.getRange(linhaDataBase, 7).setValue(true);
  abaDataBase.getRange(linhaDataBase, 11).setValue(arquivoPdf.getUrl());

  return { candidato: candidato, url: arquivoPdf.getUrl() };
}

/**
 * Converte uma linha de "candidatosDataBase" (11 colunas) + o nome (de
 * "candidatos") no objeto usado pelo front-end do CRUD.
 */
function linhaCandidatoParaApi(id, nome, linha) {
  return {
    id: id,
    nome: nome,
    dataAgendamento: formatarDataSimples(linha[1]),
    status: String(linha[3] || '').trim(),
    observacoes: String(linha[4] || '').trim(),
    finalizado: linha[5] === true,
    recurso: linha[6] === true,
    dataLaudo: formatarDataSimples(linha[7]),
    laudo: String(linha[8] || '').trim(),
    numTIS: String(linha[9] || '').trim(),
    termoRecursoUrl: String(linha[10] || '').trim()
  };
}

/**
 * action=listarCandidatos (GET): retorna todos os candidatos de
 * "candidatosDataBase" (com o nome de "candidatos" anexado) — o
 * equivalente em dados à tabela "principal" da aba Principal.
 */
function apiListarCandidatos() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  var abaDataBase = ss.getSheetByName('candidatosDataBase');
  var abaCandidatos = ss.getSheetByName('candidatos');
  if (!abaDataBase) throw new Error('Aba "candidatosDataBase" não encontrada.');
  if (!abaCandidatos) throw new Error('Aba "candidatos" não encontrada.');

  var mapaNomes = {};
  lerParesIdNome(abaCandidatos).forEach(function(c) { mapaNomes[c.id] = c.nome; });

  var ultimaLinha = abaDataBase.getLastRow();
  if (ultimaLinha < 2) return [];

  var candidatos = [];
  abaDataBase.getRange(2, 1, ultimaLinha - 1, 11).getValues().forEach(function(linha) {
    var id = String(linha[0]).trim();
    if (!id) return;
    candidatos.push(linhaCandidatoParaApi(id, mapaNomes[id] || '', linha));
  });

  return candidatos;
}

/**
 * action=atualizarCandidato (POST): { id, status?, observacoes?,
 * numTIS? } — cada campo presente no corpo é atualizado; campos
 * ausentes (undefined) não são tocados. Selecionar um status válido
 * (APTO/INAPTO/FALTOU/INSUF DOCUMENTAL) marca "finalizado", grava
 * "dataLaudo" = hoje e "Laudo" conforme MAPA_LAUDO_POR_STATUS;
 * "Pendente" ou célula vazia limpam esses três campos. Sem diálogos —
 * a confirmação de Status=INAPTO e a oferta de gerar o Termo de
 * Recurso ficam a cargo do front-end (confirm() do navegador),
 * chamando action=gerarTermoRecurso à parte quando confirmado. Retorna
 * o candidato atualizado.
 */
function apiAtualizarCandidato(corpo) {
  var id = String((corpo && corpo.id) || '').trim();
  if (!id) throw new Error('"id" é obrigatório.');

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  var abaDataBase = ss.getSheetByName('candidatosDataBase');
  var abaCandidatos = ss.getSheetByName('candidatos');
  if (!abaDataBase) throw new Error('Aba "candidatosDataBase" não encontrada.');
  if (!abaCandidatos) throw new Error('Aba "candidatos" não encontrada.');

  var linhaDataBase = localizarLinhaCandidatosDataBasePorId(abaDataBase, id);
  if (linhaDataBase === -1) throw new Error('Candidato com matrícula "' + id + '" não encontrado.');

  if (corpo.observacoes !== undefined) {
    abaDataBase.getRange(linhaDataBase, 5).setValue(corpo.observacoes || '');
  }

  if (corpo.numTIS !== undefined) {
    abaDataBase.getRange(linhaDataBase, 10).setValue(corpo.numTIS || '');
  }

  if (corpo.status !== undefined) {
    var novoValor = String(corpo.status || '').trim().toUpperCase();

    if (!novoValor) {
      abaDataBase.getRange(linhaDataBase, 4).setValue('');
      abaDataBase.getRange(linhaDataBase, 6).setValue(false);
      abaDataBase.getRange(linhaDataBase, 8).setValue('');
      abaDataBase.getRange(linhaDataBase, 9).setValue('');
    } else if (novoValor === 'PENDENTE') {
      abaDataBase.getRange(linhaDataBase, 4).setValue('Pendente');
      abaDataBase.getRange(linhaDataBase, 6).setValue(false);
      abaDataBase.getRange(linhaDataBase, 8).setValue('');
      abaDataBase.getRange(linhaDataBase, 9).setValue('');
    } else {
      var laudoTexto = MAPA_LAUDO_POR_STATUS[novoValor];
      if (!laudoTexto) throw new Error('Status inválido: "' + corpo.status + '".');

      var hoje = new Date();
      hoje.setHours(12, 0, 0, 0);

      abaDataBase.getRange(linhaDataBase, 4).setValue(novoValor);
      abaDataBase.getRange(linhaDataBase, 6).setValue(true);
      abaDataBase.getRange(linhaDataBase, 8).setValue(hoje);
      abaDataBase.getRange(linhaDataBase, 9).setValue(laudoTexto);
    }
  }

  var mapaNomes = {};
  lerParesIdNome(abaCandidatos).forEach(function(c) { mapaNomes[c.id] = c.nome; });
  var linhaAtualizada = abaDataBase.getRange(linhaDataBase, 1, 1, 11).getValues()[0];
  return linhaCandidatoParaApi(id, mapaNomes[id] || '', linhaAtualizada);
}

/**
 * action=criarCandidato (POST): { id, nome } — cadastra um novo
 * candidato em "candidatos" (reordenando alfabeticamente) e
 * "candidatosDataBase". Não grava nada na aba "Principal".
 */
function apiCriarCandidato(corpo) {
  var id = String((corpo && corpo.id) || '').trim();
  var nome = String((corpo && corpo.nome) || '').trim();
  if (!id) throw new Error('"id" é obrigatório.');
  if (!nome) throw new Error('"nome" é obrigatório.');

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  var abaCandidatos = ss.getSheetByName('candidatos');
  var abaDataBase = ss.getSheetByName('candidatosDataBase');
  if (!abaCandidatos) throw new Error('Aba "candidatos" não encontrada.');
  if (!abaDataBase) throw new Error('Aba "candidatosDataBase" não encontrada.');

  var existentes = lerParesIdNome(abaCandidatos);
  if (existentes.some(function(c) { return c.id === id; })) {
    throw new Error('Já existe um candidato com a matrícula "' + id + '".');
  }

  var resultadoExaminee = gravarExaminee(ss, [{ id: id, nome: nome }]);
  gravarExamineeDataBase(ss, resultadoExaminee.listaOrdenada);

  var linhaDataBase = localizarLinhaCandidatosDataBasePorId(abaDataBase, id);
  var linha = abaDataBase.getRange(linhaDataBase, 1, 1, 11).getValues()[0];
  return linhaCandidatoParaApi(id, nome, linha);
}

/**
 * action=gerarTermoRecurso (POST): { id } — gera (ou reaproveita) o
 * Termo de Cientificação de Recurso do candidato. Chamada pelo
 * front-end somente depois que o usuário confirmar (no navegador) as
 * duas perguntas: "Registrar como inapto?" seguido de "Gerar o Termo?".
 */
function apiGerarTermoRecurso(corpo) {
  var id = String((corpo && corpo.id) || '').trim();
  if (!id) throw new Error('"id" é obrigatório.');

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  return gerarPdfTermoRecurso(ss, id);
}
