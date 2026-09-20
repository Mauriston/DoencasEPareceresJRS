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
 * planilha "TEMPLATE CONCURSOS" (abas "candidatos", "candidatosDataBase",
 * "mensagens" e "agendamentos"), via
 * SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS) — nunca
 * getActiveSpreadsheet()/getUi(), que não funcionam numa requisição
 * HTTP sem sessão de UI do Sheets.
 *
 * A aba "Principal" daquela planilha NÃO é escrita por este script —
 * candidatosDataBase/candidatos/mensagens/agendamentos são a fonte de
 * verdade também aqui; a tela CRUD web é um front-end alternativo à
 * Principal, cobrindo o mesmo fluxo: upload da mensagem inicial →
 * agendamento → edição de Status/Observações/Nº TIS → Termo de Recurso
 * → minuta de resultados.
 *
 * Implantação: no editor deste projeto, Implantar → Nova implantação →
 * Aplicativo da web, "Executar como: Eu", "Quem pode acessar: Qualquer
 * pessoa". Colar a URL ".../exec" gerada em GAS_URL_CONCURSOS
 * (components/ConcursosJRS.tsx). Como o script usa Drive/Docs além de
 * Sheets, a primeira execução pode pedir autorização adicional dessas
 * permissões.
 */

var SPREADSHEET_ID_CONCURSOS = '1stQCDN7Wbr7fBtEowAc2jeQoh7yYFbpw9SnMLa54nHY';
var ID_PASTA_TERMOS = '1_dJV8HP1WFXa5lSV-p0V0N22_YXWIRDa';
var ID_TEMPLATE_TERMO_RECURSO = '1CpgsInQSHnx_ji6NBfAiKmRmbfczKYW-M0QO4LZllgc';

var NOMES_DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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


// =========================================================================
// ROTEAMENTO DA API WEB
// =========================================================================

/**
 * Ponto de entrada GET do aplicativo da web. Roteia pela query string
 * "action".
 */
function doGet(e) {
  return apiResponder(function() {
    var action = e && e.parameter ? e.parameter.action : '';
    if (action === 'listarCandidatos') return apiListarCandidatos();
    if (action === 'obterContextoAgendamento') return apiObterContextoAgendamento();
    if (action === 'gerarMinutaResultados') return apiGerarMinutaResultados();
    if (action === 'listarDatasAgendamento') return apiListarDatasAgendamento();
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
    if (action === 'processarMensagemPDF') return apiProcessarMensagemPDF(corpo);
    if (action === 'verificarViabilidadeAgendamento') return apiVerificarViabilidadeAgendamento(corpo);
    if (action === 'confirmarAgendamento') return apiConfirmarAgendamento(corpo);
    if (action === 'reagendarCandidato') return apiReagendarCandidato(corpo);
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


// =========================================================================
// UTILITÁRIOS DE FORMATAÇÃO E TEXTO (mesmas convenções do projeto
// TEMPLATE CONCURSOS / Código.gs)
// =========================================================================

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
 * Formata uma data no padrão militar sem separadores: ddMMMaaaa (ex.:
 * 14AGO2026). Aceita Date ou string "DD/MM/AAAA"; usa hoje se vazio.
 */
function formatarDataMilitar(dataOrig) {
  var d;
  if (!dataOrig) {
    d = new Date();
  } else if (Object.prototype.toString.call(dataOrig) === '[object Date]') {
    d = dataOrig;
  } else {
    var partes = String(dataOrig).split('/');
    d = partes.length === 3 ? new Date(partes[2], partes[1] - 1, partes[0]) : new Date(dataOrig);
  }
  if (isNaN(d.getTime())) return String(dataOrig);

  var meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var dia = String(d.getDate()).padStart(2, '0');
  return dia + meses[d.getMonth()] + d.getFullYear();
}

/**
 * Aplica a pontuação padrão de listas nas minutas: item do meio
 * termina em ";", penúltimo em "; e", último em "." (ou sem pontuação,
 * no modo "eco", usado na lista de recursos que já termina em "BT").
 */
function aplicarPontuacao(lista, isEcho) {
  if (!lista || lista.length === 0) return [];
  var listaFormatada = [];
  for (var i = 0; i < lista.length; i++) {
    var item = lista[i];
    if (i === lista.length - 1) listaFormatada.push(isEcho ? item : item + '.');
    else if (i === lista.length - 2) listaFormatada.push(item + '; e');
    else listaFormatada.push(item + ';');
  }
  return listaFormatada;
}

/**
 * Número cardinal por extenso em pt-BR, maiúsculo (suporta 1 a 999).
 */
function numeroCardinalExtenso(n) {
  var unidades = ['', 'UM', 'DOIS', 'TRÊS', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO', 'NOVE'];
  var dezA19 = ['DEZ', 'ONZE', 'DOZE', 'TREZE', 'QUATORZE', 'QUINZE', 'DEZESSEIS', 'DEZESSETE', 'DEZOITO', 'DEZENOVE'];
  var dezenas = ['', '', 'VINTE', 'TRINTA', 'QUARENTA', 'CINQUENTA', 'SESSENTA', 'SETENTA', 'OITENTA', 'NOVENTA'];
  var centenas = ['', 'CENTO', 'DUZENTOS', 'TREZENTOS', 'QUATROCENTOS', 'QUINHENTOS', 'SEISCENTOS', 'SETECENTOS', 'OITOCENTOS', 'NOVECENTOS'];

  if (n < 10) return unidades[n];
  if (n < 20) return dezA19[n - 10];
  if (n < 100) {
    var d = Math.floor(n / 10);
    var u = n % 10;
    return dezenas[d] + (u > 0 ? ' E ' + unidades[u] : '');
  }
  if (n === 100) return 'CEM';
  if (n < 1000) {
    var c = Math.floor(n / 100);
    var resto = n % 100;
    return centenas[c] + (resto > 0 ? ' E ' + numeroCardinalExtenso(resto) : '');
  }
  return String(n);
}

/**
 * Marcador numérico usado nas listas das mensagens navais: "UNO" para 1,
 * cardinal por extenso normal para os demais.
 */
function numeroItemLista(n) {
  return n === 1 ? 'UNO' : numeroCardinalExtenso(n);
}


// =========================================================================
// LEITURA/ESCRITA DE "candidatos" e "candidatosDataBase"
// =========================================================================

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
 * action=listarDatasAgendamento (GET): lista as datas ativas (coluna
 * "ativa" = TRUE) da aba "agendamentos" — as datas efetivamente
 * configuradas na última confirmação de agendamento — cada uma com a
 * quantidade de candidatos já agendados nela (contagem sobre
 * "candidatosDataBase.dataAgendamento"). Usado pelo front-end para
 * destacar os dias disponíveis no calendário de reagendamento e no
 * filtro por data.
 */
function apiListarDatasAgendamento() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  var aba = ss.getSheetByName('agendamentos');
  if (!aba) throw new Error('Aba "agendamentos" não encontrada.');

  var ultimaLinha = aba.getLastRow();
  var datas = [];
  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, 3).getValues().forEach(function(linha) {
      if (linha[0] instanceof Date && !isNaN(linha[0].getTime()) && linha[2] === true) {
        datas.push({ data: linha[0], diaSemana: String(linha[1]).trim() });
      }
    });
  }
  datas.sort(function(a, b) { return a.data.getTime() - b.data.getTime(); });

  var contagem = contarAgendadosPorData(ss);

  return datas.map(function(d) {
    var chave = formatarChaveData(d.data);
    return {
      data: chave,
      dataFormatada: formatarDataSimples(d.data),
      diaSemana: d.diaSemana,
      quantidadeAgendados: contagem[chave] || 0
    };
  });
}

/**
 * Conta, para cada data (chave "AAAA-MM-DD"), quantos candidatos de
 * "candidatosDataBase" têm essa "dataAgendamento".
 */
function contarAgendadosPorData(ss) {
  var aba = ss.getSheetByName('candidatosDataBase');
  if (!aba) throw new Error('Aba "candidatosDataBase" não encontrada.');

  var ultimaLinha = aba.getLastRow();
  var contagem = {};
  if (ultimaLinha < 2) return contagem;

  aba.getRange(2, 2, ultimaLinha - 1, 1).getValues().forEach(function(linha) {
    if (linha[0] instanceof Date && !isNaN(linha[0].getTime())) {
      var chave = formatarChaveData(linha[0]);
      contagem[chave] = (contagem[chave] || 0) + 1;
    }
  });
  return contagem;
}

/**
 * action=reagendarCandidato (POST): { id, data (AAAA-MM-DD) } —
 * reagenda um candidato para uma nova data já configurada em
 * "agendamentos", limpando o resultado anterior (finalizado, Laudo,
 * Data do Laudo) e marcando o Status como "Reagendado". Não passa
 * pelo MAPA_LAUDO_POR_STATUS (não é um laudo). Não grava nada na aba
 * "Principal".
 */
function apiReagendarCandidato(corpo) {
  var id = String((corpo && corpo.id) || '').trim();
  var dataStr = String((corpo && corpo.data) || '').trim();
  if (!id) throw new Error('"id" é obrigatório.');
  if (!dataStr) throw new Error('"data" é obrigatório.');

  var partes = dataStr.split('-');
  if (partes.length !== 3) throw new Error('"data" deve estar no formato AAAA-MM-DD.');
  var novaData = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10), 12, 0, 0);
  if (isNaN(novaData.getTime())) throw new Error('"data" inválida.');

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  var abaDataBase = ss.getSheetByName('candidatosDataBase');
  var abaCandidatos = ss.getSheetByName('candidatos');
  if (!abaDataBase) throw new Error('Aba "candidatosDataBase" não encontrada.');
  if (!abaCandidatos) throw new Error('Aba "candidatos" não encontrada.');

  var linhaDataBase = localizarLinhaCandidatosDataBasePorId(abaDataBase, id);
  if (linhaDataBase === -1) throw new Error('Candidato com matrícula "' + id + '" não encontrado.');

  abaDataBase.getRange(linhaDataBase, 2).setValue(novaData);
  abaDataBase.getRange(linhaDataBase, 4).setValue('Reagendado');
  abaDataBase.getRange(linhaDataBase, 6).setValue(false);
  abaDataBase.getRange(linhaDataBase, 8).setValue('');
  abaDataBase.getRange(linhaDataBase, 9).setValue('');

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

  var subPasta = DriveApp.getFolderById(ID_PASTA_TERMOS);
  var nomeArquivoPdf = "Termo Recurso " + candidato + ".pdf";
  var arquivosExistentes = subPasta.getFilesByName(nomeArquivoPdf);
  var arquivoPdf;

  if (arquivosExistentes.hasNext()) {
    arquivoPdf = arquivosExistentes.next();
  } else {
    var dataHojeFormatada = formatarDataSimples(new Date());

    var docCopia = DriveApp.getFileById(ID_TEMPLATE_TERMO_RECURSO).makeCopy("Temp_Recurso_" + candidato);
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


// =========================================================================
// UPLOAD E EXTRAÇÃO DA MENSAGEM ADMINISTRATIVA (PDF) — mesma lógica de
// processarArquivoMensagem() em Código.gs, headless (sem UI).
// =========================================================================

/**
 * action=processarMensagemPDF (POST): { base64Data, nomeArquivo,
 * mimeType } — salva o PDF na subpasta "Mensagens" (mesma pasta da
 * planilha), extrai o texto (Drive OCR), o cabeçalho SIGAD-MB, os
 * candidatos e o período de agendamento (JRS), e grava tudo em
 * "candidatos", "candidatosDataBase", "mensagens" e "agendamentos".
 * Retorna um resumo do processamento.
 */
function apiProcessarMensagemPDF(corpo) {
  var base64Data = corpo && corpo.base64Data;
  if (!base64Data) throw new Error('"base64Data" é obrigatório.');

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);

  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, corpo.mimeType || 'application/pdf', corpo.nomeArquivo || ('mensagem_' + new Date().getTime() + '.pdf'));

  var pastaMensagens = obterPastaMensagens(ss);
  var arquivoPdf = pastaMensagens.createFile(blob);

  return processarArquivoMensagem(ss, arquivoPdf);
}

/**
 * Retorna (criando se necessário) a subpasta "Mensagens" na mesma
 * pasta onde está a planilha "TEMPLATE CONCURSOS".
 */
function obterPastaMensagens(ss) {
  var arquivoPlanilha = DriveApp.getFileById(ss.getId());
  var pais = arquivoPlanilha.getParents();
  var pastaPai = pais.hasNext() ? pais.next() : DriveApp.getRootFolder();

  var subPastas = pastaPai.getFoldersByName('Mensagens');
  if (subPastas.hasNext()) return subPastas.next();

  return pastaPai.createFolder('Mensagens');
}

/**
 * Núcleo do processamento: recebe o arquivo PDF já salvo no Drive,
 * extrai o texto, o cabeçalho, os candidatos e o período de
 * agendamento da JRS, e grava tudo nas abas correspondentes. Retorna
 * um resumo estruturado (em vez do HTML usado pelo fluxo da planilha).
 */
function processarArquivoMensagem(ss, arquivoPdf) {
  var textoMensagem = limparRuidoPaginacao(extrairTextoPdf(arquivoPdf));
  var dadosMsg = extrairCabecalhoMensagem(textoMensagem);

  if (!dadosMsg.dataHora) {
    throw new Error('Não foi possível localizar o código Data-Hora (ID único) da mensagem no PDF.');
  }

  var candidatos = extrairCandidatos(dadosMsg.texto || textoMensagem);
  dadosMsg.texto = normalizarTextoComCandidatos(dadosMsg.texto, candidatos);

  var novosExaminee = 0;
  if (candidatos.length) {
    var resultadoExaminee = gravarExaminee(ss, candidatos);
    novosExaminee = resultadoExaminee.novos;
    gravarExamineeDataBase(ss, resultadoExaminee.listaOrdenada);
  }
  gravarMensagem(ss, dadosMsg, arquivoPdf.getUrl());

  var periodoJRS = extrairPeriodoJRS(dadosMsg.texto || textoMensagem);
  var periodoInfo;
  var diasUteisCount = 0;
  if (periodoJRS) {
    var diasUteis = calcularDiasUteis(periodoJRS.inicio, periodoJRS.fim);
    diasUteisCount = diasUteis.length;
    gravarDatasAgendamento(ss, diasUteis);
    periodoInfo = formatarDataSimples(periodoJRS.inicio) + ' à ' + formatarDataSimples(periodoJRS.fim) +
      ' (' + diasUteis.length + ' dias úteis).';
  } else {
    periodoInfo = 'não identificado no texto da mensagem.';
  }

  return {
    dataHora: dadosMsg.dataHora,
    candidatosNaMensagem: candidatos.length,
    novosCandidatos: novosExaminee,
    periodoInfo: periodoInfo,
    diasUteisDisponiveis: diasUteisCount
  };
}

/**
 * Converte o PDF para Google Docs (com OCR) via serviço avançado Drive
 * apenas para extrair o texto, e depois descarta a cópia temporária.
 */
function extrairTextoPdf(arquivoPdf) {
  var blob = arquivoPdf.getBlob();
  var recurso = {
    name: 'OCR_TEMP_' + new Date().getTime(),
    mimeType: MimeType.GOOGLE_DOCS
  };

  var arquivoConvertido = Drive.Files.create(recurso, blob, { ocrLanguage: 'pt' });

  try {
    var doc = DocumentApp.openById(arquivoConvertido.id);
    return doc.getBody().getText();
  } finally {
    DriveApp.getFileById(arquivoConvertido.id).setTrashed(true);
  }
}

/**
 * Remove ruído de paginação do texto extraído do PDF: a marca d'água
 * repetida "HNRe - 02.2" e os rodapés "Página X de Y".
 */
function limparRuidoPaginacao(texto) {
  var limpo = texto
    .replace(/HNRe\s*-?\s*0?2\.2/gi, ' ')
    .replace(/P[áa]gina\s+\d+\s+de\s+\d+/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return limpo.trim();
}

/**
 * Extrai os campos do cabeçalho da mensagem SIGAD-MB (Data-Hora, De,
 * Para, Info, Assunto e o corpo do Texto).
 */
function extrairCabecalhoMensagem(texto) {
  var extrair = function(padrao) {
    var m = texto.match(padrao);
    return m ? m[1].trim() : '';
  };

  var dataHora = extrair(/Data-Hora\s*[\r\n]+\s*([^\r\n]+)/i);
  var sender = extrair(/\bDe:\s*([^\r\n]+)/i);
  var recipient = extrair(/\bPara:\s*([^\r\n]+)/i);
  var info = extrair(/\bInfo:\s*([^\r\n]+)/i);
  var subject = extrair(/\bAssunto:\s*([^\r\n]+)/i);

  var mTexto = texto.match(/\bTexto:\s*([\s\S]*?)(?:\r?\n\s*Tr[âa]mite:|\r?\n\s*Prazo para Transmiss|$)/i);
  var corpoTexto = mTexto ? mTexto[1].trim() : '';

  var purpose = /candidatos\s+abaixo\s+relacionados/i.test(corpoTexto)
    ? 'Apresentação e IS'
    : 'Outros';

  return {
    dataHora: dataHora,
    sender: sender,
    recipient: recipient,
    info: info,
    subject: subject,
    texto: corpoTexto,
    purpose: purpose
  };
}

/**
 * Extrai a lista de candidatos do corpo da mensagem: itens em lista não
 * enumerada, precedidos por matrícula no formato 000000-0. Tolerante ao
 * layout em colunas do PDF (corta cada item no próximo código de
 * matrícula, não na quebra de linha).
 */
function extrairCandidatos(texto) {
  var inicio = texto.search(/candidatos\s+abaixo\s+relacionados/i);
  var fim = texto.search(/\bDOIS\s*[-–—]/i);
  var trecho = texto.substring(
    inicio >= 0 ? inicio : 0,
    fim >= 0 ? fim : texto.length
  );

  var candidatos = [];
  var regexItem = /(\d{6}-\d)\s+([\s\S]+?)(?=\d{6}-\d|$)/g;
  var m;

  while ((m = regexItem.exec(trecho)) !== null) {
    var id = m[1];
    var nome = m[2]
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/-\s*$/, '')
      .trim()
      .replace(/;\s*e$/i, '')
      .replace(/[;.]$/, '')
      .trim();
    if (nome) candidatos.push({ id: id, nome: nome });
  }

  return candidatos;
}

/**
 * Reconstrói o bloco de candidatos dentro do texto da mensagem usando a
 * lista já corretamente separada (um candidato por linha).
 */
function normalizarTextoComCandidatos(texto, candidatos) {
  if (!texto || !candidatos || candidatos.length === 0) return texto;

  var inicio = texto.search(/candidatos\s+abaixo\s+relacionados/i);
  var fim = texto.search(/\bDOIS\s*[-–—]/i);
  if (inicio < 0 || fim < 0 || fim <= inicio) return texto;

  var fimIntroducao = texto.indexOf(':', inicio);
  if (fimIntroducao < 0 || fimIntroducao >= fim) return texto;

  var antes = texto.substring(0, fimIntroducao + 1);
  var depois = texto.substring(fim);

  var linhas = candidatos.map(function(c) { return '- ' + c.id + ' ' + c.nome; });
  var blocoCandidatos = aplicarPontuacao(linhas, false).join('\n');

  return antes + '\n' + blocoCandidatos + '\n' + depois;
}

/**
 * Insere o registro da mensagem na primeira linha de dados da aba
 * "mensagens" (logo abaixo do cabeçalho), usando a Data-Hora como ID
 * único.
 */
function gravarMensagem(ss, dadosMsg, urlArquivo) {
  var aba = ss.getSheetByName('mensagens');
  if (!aba) throw new Error('Aba "mensagens" não encontrada.');

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha >= 2) {
    var idsExistentes = {};
    aba.getRange(2, 1, ultimaLinha - 1, 1).getValues().forEach(function(linha) {
      var id = String(linha[0]).trim();
      if (id) idsExistentes[id] = true;
    });
    if (idsExistentes[dadosMsg.dataHora]) {
      throw new Error('Já existe uma mensagem registrada com o ID "' + dadosMsg.dataHora + '".');
    }
  }

  aba.insertRowBefore(2);
  aba.getRange(2, 1, 1, 8).setValues([[
    dadosMsg.dataHora,
    urlArquivo,
    dadosMsg.purpose,
    dadosMsg.sender,
    dadosMsg.recipient,
    dadosMsg.info,
    dadosMsg.subject,
    dadosMsg.texto
  ]]);
}

/**
 * Extrai o período de agendamento da JRS no texto da mensagem, no
 * padrão "03AGO a 14SET2026 (JRS)".
 */
function extrairPeriodoJRS(texto) {
  var meses = {
    'JAN': 0, 'FEV': 1, 'MAR': 2, 'ABR': 3, 'MAI': 4, 'JUN': 5,
    'JUL': 6, 'AGO': 7, 'SET': 8, 'OUT': 9, 'NOV': 10, 'DEZ': 11
  };

  var regex = /(\d{1,2})\s*([A-ZÇ]{3})\s*(\d{4})?\s*a\s*(\d{1,2})\s*([A-ZÇ]{3})\s*(\d{4})\s*\(\s*JRS\s*\)/i;
  var m = texto.match(regex);
  if (!m) return null;

  var mesIni = meses[m[2].toUpperCase()];
  var mesFim = meses[m[5].toUpperCase()];
  if (mesIni === undefined || mesFim === undefined) return null;

  var diaIni = parseInt(m[1], 10);
  var diaFim = parseInt(m[4], 10);
  var anoFim = parseInt(m[6], 10);
  var anoIni = m[3] ? parseInt(m[3], 10) : anoFim;

  return {
    inicio: new Date(anoIni, mesIni, diaIni),
    fim: new Date(anoFim, mesFim, diaFim)
  };
}

/**
 * Calcula a data da Páscoa (Domingo) para um determinado ano, pelo
 * algoritmo Anônimo Gregoriano (Meeus/Jones/Butcher).
 */
function calcularPascoa(ano) {
  var a = ano % 19;
  var b = Math.floor(ano / 100);
  var c = ano % 100;
  var d = Math.floor(b / 4);
  var e = b % 4;
  var f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3);
  var h = (19 * a + b - d - g + 15) % 30;
  var i = Math.floor(c / 4);
  var k = c % 4;
  var l = (32 + 2 * e + 2 * i - h - k) % 7;
  var m = Math.floor((a + 11 * h + 22 * l) / 451);
  var mes = Math.floor((h + l - 7 * m + 114) / 31);
  var dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/**
 * Retorna a lista de feriados nacionais de um ano (fixos + móveis
 * calculados a partir da Páscoa).
 */
function obterFeriadosNacionais(ano) {
  var feriados = [];

  var somarDias = function(data, dias) {
    var d = new Date(data.getTime());
    d.setDate(d.getDate() + dias);
    return d;
  };

  var fixos = [
    [0, 1], [3, 21], [4, 1], [8, 7], [9, 12],
    [10, 2], [10, 15], [10, 20], [11, 25]
  ];
  fixos.forEach(function(f) {
    feriados.push(new Date(ano, f[0], f[1]));
  });

  var pascoa = calcularPascoa(ano);
  feriados.push(somarDias(pascoa, -48));
  feriados.push(somarDias(pascoa, -47));
  feriados.push(somarDias(pascoa, -46));
  feriados.push(somarDias(pascoa, -2));
  feriados.push(pascoa);
  feriados.push(somarDias(pascoa, 60));

  return feriados;
}

/**
 * Formata uma data como chave "AAAA-MM-DD", independente de fuso
 * horário.
 */
function formatarChaveData(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/**
 * Calcula os dias úteis (segunda a sexta) entre duas datas (inclusive),
 * excluindo feriados nacionais.
 */
function calcularDiasUteis(dataInicial, dataFinal) {
  var dias = [];
  var mapaFeriadosPorAno = {};

  var atual = new Date(dataInicial.getFullYear(), dataInicial.getMonth(), dataInicial.getDate());
  var fim = new Date(dataFinal.getFullYear(), dataFinal.getMonth(), dataFinal.getDate());

  while (atual.getTime() <= fim.getTime()) {
    var ano = atual.getFullYear();
    if (!mapaFeriadosPorAno[ano]) {
      mapaFeriadosPorAno[ano] = {};
      obterFeriadosNacionais(ano).forEach(function(d) {
        mapaFeriadosPorAno[ano][formatarChaveData(d)] = true;
      });
    }

    var diaSemana = atual.getDay();
    var eFeriado = !!mapaFeriadosPorAno[ano][formatarChaveData(atual)];

    if (diaSemana !== 0 && diaSemana !== 6 && !eFeriado) {
      dias.push(new Date(atual.getTime()));
    }

    atual.setDate(atual.getDate() + 1);
  }

  return dias;
}

/**
 * Grava as datas úteis calculadas na aba "agendamentos", preservando o
 * status "ativa" de datas já existentes e sem duplicar datas.
 */
function gravarDatasAgendamento(ss, diasUteis) {
  var aba = ss.getSheetByName('agendamentos');
  if (!aba) throw new Error('Aba "agendamentos" não encontrada.');

  var ultimaLinha = aba.getLastRow();
  var mapaAtivo = {};

  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, 3).getValues().forEach(function(linha) {
      var data = linha[0];
      if (data instanceof Date && !isNaN(data.getTime())) {
        mapaAtivo[formatarChaveData(data)] = linha[2] === true;
      }
    });
  }

  diasUteis.forEach(function(d) {
    var chave = formatarChaveData(d);
    if (!(chave in mapaAtivo)) mapaAtivo[chave] = false;
  });

  var chaves = Object.keys(mapaAtivo).sort();

  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, 2).clearContent();
    aba.getRange(2, 3, ultimaLinha - 1, 1).clearContent();
  }

  if (chaves.length > 0) {
    var linhasDataDia = chaves.map(function(chave) {
      var p = chave.split('-');
      var data = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
      return [data, NOMES_DIAS_SEMANA[data.getDay()]];
    });
    var linhasAtivo = chaves.map(function(chave) {
      return [mapaAtivo[chave]];
    });

    aba.getRange(2, 1, linhasDataDia.length, 2).setValues(linhasDataDia);
    aba.getRange(2, 3, linhasAtivo.length, 1).setValues(linhasAtivo);
  }
}


// =========================================================================
// AGENDAMENTO DE INSPEÇÕES DE SAÚDE (IS)
// =========================================================================

/**
 * Lista os candidatos de "candidatosDataBase" que ainda não têm uma
 * data em "dataAgendamento", com o nome anexado.
 */
function listarCandidatosPendentesAgendamento(ss) {
  var abaDataBase = ss.getSheetByName('candidatosDataBase');
  var abaExaminee = ss.getSheetByName('candidatos');
  if (!abaDataBase) throw new Error('Aba "candidatosDataBase" não encontrada.');
  if (!abaExaminee) throw new Error('Aba "candidatos" não encontrada.');

  var mapaNomes = {};
  lerParesIdNome(abaExaminee).forEach(function(c) { mapaNomes[c.id] = c.nome; });

  var ultimaLinha = abaDataBase.getLastRow();
  if (ultimaLinha < 2) return [];

  var pendentes = [];
  abaDataBase.getRange(2, 1, ultimaLinha - 1, 2).getValues().forEach(function(linha) {
    var id = String(linha[0]).trim();
    var jaAgendado = linha[1] instanceof Date && !isNaN(linha[1].getTime());
    if (id && !jaAgendado) {
      pendentes.push({ id: id, nome: mapaNomes[id] || '' });
    }
  });

  return pendentes;
}

/**
 * Lista as datas presentes em "agendamentos", em ordem crescente.
 */
function listarDatasDisponiveis(ss) {
  var aba = ss.getSheetByName('agendamentos');
  if (!aba) throw new Error('Aba "agendamentos" não encontrada.');

  var ultimaLinha = aba.getLastRow();
  var datas = [];

  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, 2).getValues().forEach(function(linha) {
      if (linha[0] instanceof Date && !isNaN(linha[0].getTime())) {
        datas.push({ data: linha[0], diaSemana: String(linha[1]).trim() });
      }
    });
  }

  datas.sort(function(a, b) { return a.data.getTime() - b.data.getTime(); });
  return datas;
}

/**
 * Marca "ativa" (coluna C de "agendamentos") como TRUE para as datas
 * cujo dia da semana está entre os selecionados, e FALSE para as
 * demais.
 */
function ativarDatasPorDiaSemana(ss, diasSemanaSelecionados) {
  var aba = ss.getSheetByName('agendamentos');
  if (!aba) throw new Error('Aba "agendamentos" não encontrada.');

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return;

  var diasSemanaColuna = aba.getRange(2, 2, ultimaLinha - 1, 1).getValues();
  var valoresAtivo = diasSemanaColuna.map(function(linha) {
    return [diasSemanaSelecionados.indexOf(String(linha[0]).trim()) !== -1];
  });

  aba.getRange(2, 3, valoresAtivo.length, 1).setValues(valoresAtivo);
}

/**
 * Distribui os candidatos (na ordem recebida) pelas datas disponíveis,
 * preenchendo cada data até "quantidadePorDia" antes de passar para a
 * próxima, na ordem cronológica.
 */
function distribuirCandidatosNasDatas(candidatos, datas, quantidadePorDia) {
  var resultado = [];
  var indice = 0;

  for (var i = 0; i < datas.length && indice < candidatos.length; i++) {
    var grupo = candidatos.slice(indice, indice + quantidadePorDia);
    if (grupo.length === 0) break;
    resultado.push({ data: datas[i].data, diaSemana: datas[i].diaSemana, candidatos: grupo });
    indice += grupo.length;
  }

  return resultado;
}

/**
 * action=obterContextoAgendamento (GET): resumo para a tela de
 * configuração do agendamento (total pendente, período, dias úteis
 * disponíveis).
 */
function apiObterContextoAgendamento() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  var pendentes = listarCandidatosPendentesAgendamento(ss);
  var datas = listarDatasDisponiveis(ss);

  return {
    totalPendentes: pendentes.length,
    periodoInicio: datas.length ? formatarDataSimples(datas[0].data) : '',
    periodoFim: datas.length ? formatarDataSimples(datas[datas.length - 1].data) : '',
    diasUteisDisponiveis: datas.length
  };
}

/**
 * action=verificarViabilidadeAgendamento (POST): { quantidadePorDia,
 * diasSemanaSelecionados } — mesma lógica da planilha: marca os dias
 * da semana ativos, calcula se a capacidade é suficiente e, se for,
 * retorna a distribuição completa (sem gravar nada ainda).
 */
function apiVerificarViabilidadeAgendamento(corpo) {
  var quantidadePorDia = parseInt(corpo && corpo.quantidadePorDia, 10);
  var diasSemanaSelecionados = (corpo && corpo.diasSemanaSelecionados) || [];

  if (!quantidadePorDia || quantidadePorDia < 1) {
    throw new Error('Informe uma quantidade válida de IS por dia (mínimo 1).');
  }
  if (!diasSemanaSelecionados.length) {
    throw new Error('Selecione ao menos um dia da semana.');
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  ativarDatasPorDiaSemana(ss, diasSemanaSelecionados);

  var candidatos = listarCandidatosPendentesAgendamento(ss);
  if (candidatos.length === 0) {
    return { viavel: false, mensagem: 'Não há candidatos pendentes de agendamento.' };
  }

  var datas = listarDatasDisponiveis(ss).filter(function(d) {
    return diasSemanaSelecionados.indexOf(d.diaSemana) !== -1;
  });
  if (datas.length === 0) {
    return { viavel: false, mensagem: 'Nenhuma das datas disponíveis em "agendamentos" cai nos dias da semana selecionados.' };
  }

  var capacidadeTotal = datas.length * quantidadePorDia;
  if (capacidadeTotal < candidatos.length) {
    var qtdePorDiaSugerida = Math.ceil(candidatos.length / datas.length);
    var diasNecessariosSugeridos = Math.ceil(candidatos.length / quantidadePorDia);
    var mensagem = 'Com ' + quantidadePorDia + ' IS/dia em ' + datas.length + ' dia(s) disponível(is), ' +
      'cabem apenas ' + capacidadeTotal + ' candidatos, mas há ' + candidatos.length + ' pendentes.<br><br>' +
      'Sugestões: aumente para pelo menos <b>' + qtdePorDiaSugerida + ' IS por dia</b> (mantendo os mesmos dias da semana), ' +
      'ou selecione dias da semana suficientes para ter ao menos <b>' + diasNecessariosSugeridos + ' data(s) disponível(is)</b> ' +
      '(mantendo ' + quantidadePorDia + ' IS por dia).';
    return { viavel: false, mensagem: mensagem };
  }

  var agendamento = distribuirCandidatosNasDatas(candidatos, datas, quantidadePorDia);

  return {
    viavel: true,
    agendamento: agendamento.map(function(item) {
      return {
        dataFormatada: formatarDataSimples(item.data),
        diaSemana: item.diaSemana,
        candidatos: item.candidatos.map(function(c) { return c.nome; })
      };
    })
  };
}

/**
 * action=confirmarAgendamento (POST): { quantidadePorDia,
 * diasSemanaSelecionados } — recalcula a mesma distribuição
 * (determinística, iguais parâmetros já validados em
 * verificarViabilidadeAgendamento), grava a data de cada candidato em
 * "candidatosDataBase.dataAgendamento" e retorna a minuta da mensagem
 * de agendamento já formatada. Não grava nada na aba "Principal".
 */
function apiConfirmarAgendamento(corpo) {
  var quantidadePorDia = parseInt(corpo && corpo.quantidadePorDia, 10);
  var diasSemanaSelecionados = (corpo && corpo.diasSemanaSelecionados) || [];

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);
  var candidatos = listarCandidatosPendentesAgendamento(ss);
  var datas = listarDatasDisponiveis(ss).filter(function(d) {
    return diasSemanaSelecionados.indexOf(d.diaSemana) !== -1;
  });

  var agendamento = distribuirCandidatosNasDatas(candidatos, datas, quantidadePorDia);
  if (agendamento.length === 0) {
    throw new Error('Nenhum agendamento para confirmar. Verifique as datas novamente.');
  }

  gravarDatasAgendamentoCandidatos(ss, agendamento);

  return { minuta: gerarTextoMinutaAgendamento(ss, agendamento) };
}

/**
 * Grava, para cada candidato agendado, a data escolhida na coluna
 * "dataAgendamento" de "candidatosDataBase".
 */
function gravarDatasAgendamentoCandidatos(ss, agendamento) {
  var aba = ss.getSheetByName('candidatosDataBase');
  if (!aba) throw new Error('Aba "candidatosDataBase" não encontrada.');

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return;

  var mapaLinhaPorId = {};
  aba.getRange(2, 1, ultimaLinha - 1, 1).getValues().forEach(function(linha, indice) {
    var id = String(linha[0]).trim();
    if (id) mapaLinhaPorId[id] = indice + 2;
  });

  agendamento.forEach(function(item) {
    item.candidatos.forEach(function(c) {
      var linha = mapaLinhaPorId[c.id];
      if (linha) aba.getRange(linha, 2).setValue(item.data);
    });
  });
}

/**
 * Gera o texto da minuta da MENSAGEM DE AGENDAMENTO da IS, no mesmo
 * padrão usado pela planilha.
 */
function gerarTextoMinutaAgendamento(ss, agendamento) {
  var dadosMsgInicial = obterDadosMensagemInicial(ss);
  var dataHoraInicial = dadosMsgInicial ? dadosMsgInicial.dataHora : 'R-000000Z/MMM/AAAA';
  var nomeConcurso = dadosMsgInicial ? extrairNomeConcurso(dadosMsgInicial.subject) : 'NÃO INFORMADO';

  var linhas = [];
  linhas.push(dataHoraInicial + ', PTC:');
  linhas.push('');
  linhas.push('ALFA - As IS de Ingresso dos Candidatos a ' + nomeConcurso + ' estão agendadas conforme:');
  linhas.push('');

  agendamento.forEach(function(item, indice) {
    var marcador = numeroItemLista(indice + 1);
    linhas.push(marcador + ' - ' + formatarDataDDMMMAAAA(item.data) + ' às 7h30:');

    var itensCandidatos = item.candidatos.map(function(c) {
      return '- ' + c.id + ' ' + c.nome;
    });
    linhas.push(aplicarPontuacao(itensCandidatos, false).join('\n'));
    linhas.push('');
  });

  linhas.push('BRAVO - CFM o item 3.1.2 da DGPM-406 (9ª Revisão), Os candidatos que não comparecerem das respectivas datas de agendamentos de suas IS ou não apresentarem a totalidade dos exames previstos no edital do certame da data agendada, terão suas IS concluídas e assinadas tempestivamente com laudos, respectivamente, de "faltou" ou "Insuficiência Documental Médica" BT');

  return linhas.join('\n');
}

/**
 * Formata uma data no padrão militar sem separadores: ddMMMaaaa (ex.:
 * 14AGO2026).
 */
function formatarDataDDMMMAAAA(data) {
  var meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var dia = String(data.getDate()).padStart(2, '0');
  var mes = meses[data.getMonth()];
  var ano = data.getFullYear();
  return dia + mes + ano;
}

/**
 * Localiza, na aba "mensagens", a mensagem mais recente com propósito
 * "Apresentação e IS", retornando seu ID (Data-Hora) e o Assunto.
 */
function obterDadosMensagemInicial(ss) {
  var aba = ss.getSheetByName('mensagens');
  if (!aba) throw new Error('Aba "mensagens" não encontrada.');

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return null;

  var dados = aba.getRange(2, 1, ultimaLinha - 1, 7).getValues();
  for (var i = 0; i < dados.length; i++) {
    if (String(dados[i][2]).trim() === 'Apresentação e IS') {
      return { dataHora: String(dados[i][0]).trim(), subject: String(dados[i][6]).trim() };
    }
  }

  return null;
}

/**
 * Extrai o identificador do concurso (ex.: "CPAEAM/2026") do Assunto da
 * mensagem, no padrão "SIGLA/AAAA".
 */
function extrairNomeConcurso(subject) {
  var m = subject.match(/([A-ZÇ]{2,10}\/\d{4})/);
  return m ? m[1] : subject;
}


// =========================================================================
// MENSAGEM FINAL DE RESULTADOS DA IS
// =========================================================================

/**
 * Lista os candidatos de "candidatosDataBase" cuja coluna "finalizado"
 * ainda não está marcada, com o nome anexado.
 */
function listarCandidatosNaoFinalizados(ss) {
  var abaDataBase = ss.getSheetByName('candidatosDataBase');
  var abaCandidatos = ss.getSheetByName('candidatos');
  if (!abaDataBase) throw new Error('Aba "candidatosDataBase" não encontrada.');
  if (!abaCandidatos) throw new Error('Aba "candidatos" não encontrada.');

  var mapaNomes = {};
  lerParesIdNome(abaCandidatos).forEach(function(c) { mapaNomes[c.id] = c.nome; });

  var pendentes = [];
  var ultimaLinha = abaDataBase.getLastRow();
  if (ultimaLinha < 2) return pendentes;

  abaDataBase.getRange(2, 1, ultimaLinha - 1, 6).getValues().forEach(function(linha) {
    var id = String(linha[0]).trim();
    if (!id) return;
    var finalizado = linha[5] === true;
    if (!finalizado) pendentes.push({ id: id, nome: mapaNomes[id] || '' });
  });

  return pendentes;
}

/**
 * Agrupa todos os candidatos de "candidatosDataBase" pelo valor da
 * coluna "status" (APTO/INAPTO/FALTOU/INSUF DOCUMENTAL — "Pendente" ou
 * vazio não entram em nenhum grupo), e monta a lista de candidatos com
 * recurso (coluna "recurso"). Retorna também o total de candidatos
 * cadastrados.
 */
function obterCandidatosPorStatus(ss) {
  var abaDataBase = ss.getSheetByName('candidatosDataBase');
  var abaCandidatos = ss.getSheetByName('candidatos');
  if (!abaDataBase) throw new Error('Aba "candidatosDataBase" não encontrada.');
  if (!abaCandidatos) throw new Error('Aba "candidatos" não encontrada.');

  var mapaNomes = {};
  lerParesIdNome(abaCandidatos).forEach(function(c) { mapaNomes[c.id] = c.nome; });

  var resultado = { total: 0, aptos: [], inaptos: [], faltosos: [], idm: [], recursos: [] };

  var ultimaLinha = abaDataBase.getLastRow();
  if (ultimaLinha < 2) return resultado;

  abaDataBase.getRange(2, 1, ultimaLinha - 1, 11).getValues().forEach(function(linha) {
    var id = String(linha[0]).trim();
    if (!id) return;
    resultado.total++;

    var nome = mapaNomes[id] || '';
    var status = String(linha[3]).trim().toUpperCase();
    var recurso = linha[6] === true;
    var dataLaudo = linha[7];
    var item = '- ' + id + '  ' + nome;

    if (status === 'APTO') resultado.aptos.push(item);
    else if (status === 'INAPTO') resultado.inaptos.push(item);
    else if (status === 'FALTOU') resultado.faltosos.push(item);
    else if (status === 'INSUF DOCUMENTAL') resultado.idm.push(item);

    if (recurso) {
      resultado.recursos.push('- Em ' + formatarDataMilitar(dataLaudo) + ': ' + id + '  ' + nome);
    }
  });

  return resultado;
}

/**
 * action=gerarMinutaResultados (GET): bloqueia (retorna { bloqueado:
 * true, pendentes }) se houver candidato não finalizado; senão monta e
 * retorna a minuta da MENSAGEM DE RESULTADOS DA IS.
 */
function apiGerarMinutaResultados() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_CONCURSOS);

  var pendentes = listarCandidatosNaoFinalizados(ss);
  if (pendentes.length > 0) {
    return { bloqueado: true, pendentes: pendentes };
  }

  var dadosMsgInicial = obterDadosMensagemInicial(ss);
  var dataHoraInicial = dadosMsgInicial ? dadosMsgInicial.dataHora : 'R-000000Z/MMM/AAAA';
  var nomeConcurso = dadosMsgInicial ? extrairNomeConcurso(dadosMsgInicial.subject) : 'NÃO INFORMADO';

  var candidatosPorStatus = obterCandidatosPorStatus(ss);

  var aptos = aplicarPontuacao(candidatosPorStatus.aptos, false);
  var inaptos = aplicarPontuacao(candidatosPorStatus.inaptos, false);
  var faltosos = aplicarPontuacao(candidatosPorStatus.faltosos, false);
  var idm = aplicarPontuacao(candidatosPorStatus.idm, false);
  var recursos = aplicarPontuacao(candidatosPorStatus.recursos, true);

  var texto = [];
  texto.push(dataHoraInicial + ', PTC que JRS/HNRe concluiu em ' + formatarDataMilitar(new Date()) + ' as IS dos ' + candidatosPorStatus.total + ' candidatos APS FIM Ingresso no ' + nomeConcurso + ' CFM os resultados abaixo relacionados:');
  texto.push('');

  texto.push('ALFA - Candidatos considerados "Aptos para Ingresso" (total: ' + aptos.length + '):');
  if (aptos.length > 0) texto.push(aptos.join('\n'));
  texto.push('');

  texto.push('BRAVO - Candidatos considerados "Inaptos para Ingresso" (total: ' + inaptos.length + '):');
  if (inaptos.length > 0) texto.push(inaptos.join('\n'));
  texto.push('');

  texto.push('CHARLIE - Candidatos com IS não concluídas por não comparecimento (total: ' + faltosos.length + '):');
  if (faltosos.length > 0) texto.push(faltosos.join('\n'));
  texto.push('');

  texto.push('DELTA - Candidatos com IS não concluídas por Insuficiência Documental Médica (total: ' + idm.length + '):');
  if (idm.length > 0) texto.push(idm.join('\n'));
  texto.push('');

  texto.push('ECHO - Candidatos que interpuseram recurso junto à JSD/COM3ºDN através da assinatura do Termo de Reconhecimento de Recurso (total: ' + recursos.length + '):');
  if (recursos.length > 0) {
    texto.push(recursos.join('\n') + ' BT');
  } else {
    texto.push('(total: 0) BT');
  }

  return { bloqueado: false, minuta: texto.join('\n') };
}
