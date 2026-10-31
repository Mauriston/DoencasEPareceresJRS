const fs = require('fs');
const path = require('path');

const dir = '/Users/mauristonmartins/Projetos/DoencasEPareceresJRS/apps-script/concursos';
const codeConcursos = fs.readFileSync(path.join(dir, 'CodeConcursos.gs'), 'utf8');
const codePrincipal = fs.readFileSync(path.join(dir, 'CodePrincipal.gs'), 'utf8');

// A simple way is to define what goes where based on keywords or function names.
// Or I can just write the content of the new files explicitly here.

const files = {
  'Main.gs': `/**
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
`,

  'Config.gs': `/**
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
`,

  'AuthController.gs': `/**
 * AuthController.gs
 * Controle de acesso, auditoria e validação de token do Firebase.
 */

var USUARIO_VALIDADO_ = null;

function logAcesso_(evento, acao, uid, perfil, motivo) {
  Logger.log(JSON.stringify({ evento: evento, acao: String(acao || '').substring(0, 60), uid: uid || '', perfil: perfil || '', motivo: motivo || '' }));
}

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
  try { json = JSON.parse(resp.getContentText()); } catch (e) { }
  if (resp.getResponseCode() !== 200 || !json.users || !json.users.length) {
    throw new Error('Sessão inválida ou expirada. Entre novamente no app.');
  }
  USUARIO_VALIDADO_ = { idToken: idToken, uid: json.users[0].localId };
  return json.users[0].localId;
}
`,

  'ParecerController.gs': `/**
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
    var linhas = q.split(/\\r?\\n/);
    return (i + 1) + '. ' + linhas[0] + linhas.slice(1).map(function(l) { return '\\n    ' + l.trim(); }).join('');
  }).join('\\n');
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
  var especialidade = limparNomeDrive(semAcentos(corpo.especialidade)).replace(/[\\\\/]+/g, '-');
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
  var idDrive = /drive\\.google\\.com\\/file\\/d\\/([\\w-]+)/.exec(pdfUrl);
  if (idDrive) {
    var arquivo = DriveApp.getFileById(idDrive[1]);
    if (!estaSobPasta(arquivo, ID_PASTA_PARECERES)) throw new Error('O PDF não está na pasta PARECERES.');
    blob = arquivo.getBlob();
  } else if (/^https:\\/\\/firebasestorage\\.googleapis\\.com\\/v0\\/b\\/jrs-app-web\\.firebasestorage\\.app\\//.test(pdfUrl)) {
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
    body: 'Giorginis,\\n\\nPor favor, imprimir este documento em frente e verso colorido.\\n\\nObrigado!\\n\\n' + remetente,
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
`,

  'PericiaMenorController.gs': `/**
 * PericiaMenorController.gs
 */

function extrairDadosAtestado(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Aviso: GEMINI_API_KEY não configurada nas propriedades do Google Apps Script.");

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  
  const requestBody = {
    "contents": [{
      "parts": [
        {
          "text": "Extraia os seguintes 4 dados da imagem do atestado médico:\\n1) nomeMilitar (o nome completo do paciente)\\n2) dataAtestado (no formato YYYY-MM-DD)\\n3) tempoAtestado (apenas o número de dias)\\n4) cid (apenas o código principal, ex: M54.5).\\nResponda estritamente num formato JSON válido com as chaves exatas 'nomeMilitar', 'dataAtestado', 'tempoAtestado', 'cid'."
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": payload.base64Image
          }
        }
      ]
    }],
    "generationConfig": {
      "responseMimeType": "application/json"
    }
  };

  const jsonResponse = chamarGemini(url, requestBody);

  try {
    const geminiText = jsonResponse.candidates[0].content.parts[0].text;
    const extractedData = JSON.parse(geminiText); 
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: extractedData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (parseError) {
    throw new Error("O Gemini não conseguiu estruturar os dados. Tente uma foto mais clara.");
  }
}
`,

  'MensagemController.gs': `/**
 * MensagemController.gs
 */

function gerarMinutaMensagem(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada nas propriedades do script.");

  const MINUTA_PROMPT = \`# OBJETIVO

Você é um assistente especializado em gerar minutas de mensagens de conclusão de Inspeção de Saúde (IS) da Marinha do Brasil a partir da análise direta de imagens anexadas.

Você NÃO receberá planilhas. Extraia as informações exclusivamente das imagens fornecidas.

---

# ENTRADA

Serão fornecidas uma ou mais Inspeções de Saúde. Cada IS será composta SEMPRE por 2 imagens:

## Imagem 1 — Dados da inspeção
Extrair: Nome, NIP, Sexo, Situação, Posto, Corpo, Especialidade, Quadro, OM, Junta, Finalidade, Data do Laudo, TIS, Código DS-1A.

## Imagem 2 — Resultado da inspeção
Extrair: Laudo, Restrições, Tempo (das restrições, quando houver).

---

# REGRAS DE EXTRAÇÃO
1. Ler diretamente o texto presente nas imagens.
2. Não solicitar confirmação dos dados.
3. Não inventar informações ausentes.
4. Se algum campo estiver ilegível, informar exatamente qual campo não pôde ser identificado.
5. Preservar integralmente o texto do laudo encontrado na imagem — não corrigir, resumir ou reescrever.
6. Quando o campo OM for "HNRE" (em qualquer variação de maiúsculas/minúsculas), escrever na minuta sempre como "HNRe".
7. O campo Junta aparece logo no início da primeira imagem e identifica a junta médica responsável. Valores possíveis: "JRS/HNRe", "MPI/HNRe CASSUNDÉ" ou "MPI/HNRe MAURISTON". Nas minutas, escrever SEMPRE com a grafia "HNRe" (nunca "HNRE"), independentemente de como apareça na imagem.

---

# NORMALIZAÇÃO DE DATAS
Converter a Data do Laudo para DDMMMAAAA.
Exemplos: 2026-06-18 → 18JUN2026 | 2025-10-15 → 15OUT2025
Meses: JAN FEV MAR ABR MAI JUN JUL AGO SET OUT NOV DEZ

---

# MAPEAMENTO DE DESTINATÁRIOS (PARA e INFO)
Usando a Finalidade e o início do Laudo (ignorando período de restrições para fins de mapeamento), determine PARA e INFO conforme o JSON:

[{"FINALIDADE":"Benefícios (Dependentes de Militares da ativa)","RESULTADO":"Any","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Cursos e Estágios","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Cursos e Estágios","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Demissão a pedido / Ex offício","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Demissão a pedido / Ex offício","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Engajamento ou Reengajamento","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Engajamento ou Reengajamento","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Fins de Justiça (Inclui MP e APM)","RESULTADO":"Any","PARA":"OM do militar","INFO":"ComDN"},
{"FINALIDADE":"Junta de Saúde de Recurso (JSR)","RESULTADO":"Any","PARA":"OM do militar","INFO":"CPESFN, DPMM, DSM"},
{"FINALIDADE":"Licença para Tratamento de Saúde Pessoal (LTSP)","RESULTADO":"Any","PARA":"OM do militar","INFO":"DSM"},
{"FINALIDADE":"Matrícula em Cursos ou Estágios","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Matrícula em Cursos ou Estágios","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Missão no Exterior (Igual a 6 meses)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Missão no Exterior (Igual a 6 meses)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Missão no Exterior (Maior que 6 meses)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Missão no Exterior (Maior que 6 meses)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Movimentação (Com mudança de sede)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Movimentação (Com mudança de sede)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Movimentação (Sem mudança de sede)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Movimentação (Sem mudança de sede)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Navegação (Missões no mar)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Navegação (Missões no mar)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Para Permanência e Trânsito (PPT)","RESULTADO":"Any","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Passagem para a Inatividade","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Passagem para a Inatividade","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Prática de Educação Física e Esportes (TAF)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Prática de Educação Física e Esportes (TAF)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Promoção (Acesso na hierarquia)","RESULTADO":"Apto","PARA":"OM do militar","INFO":""},
{"FINALIDADE":"Promoção (Acesso na hierarquia)","RESULTADO":"Inapto","PARA":"OM do militar","INFO":"DPMM, DSM"},
{"FINALIDADE":"Revisão de IS","RESULTADO":"Any","PARA":"OM do militar","INFO":"DSM"},
{"FINALIDADE":"Término de LTSP","RESULTADO":"Apto (Qualquer variação)","PARA":"OM do militar","INFO":"DSM"},
{"FINALIDADE":"Término de LTSP","RESULTADO":"Inapto (Qualquer variação)","PARA":"OM do militar","INFO":"DSM"}]

A regra de cruzamento funciona assim:
- Compare a FINALIDADE extraída com a coluna FINALIDADE.
- Compare o início do Laudo (ex: se é Apto, Inapto, etc) com a coluna RESULTADO. "Any" significa que qualquer laudo para aquela finalidade tem o mesmo destinatário.
- Substitua a expressão "OM do militar" pelo valor extraído no campo OM.
- A saída PARA deve ser exata. A saída INFO também, podendo ficar em branco.

---

# GERAÇÃO DO ASSUNTO
O ASSUNTO da mensagem será sempre:
"INSPECAO DE SAUDE"

---

# FORMATAÇÃO DO TEXTO DA MENSAGEM
A mensagem gerada (campo TEXTO) deve seguir rigorosamente o padrão abaixo, sem markdown de negrito e usando tabulações adequadas:

A(O) [JUNTA MEDICA] EM SESSAO DE [DATA DO LAUDO - DDMMMAAAA], EXAROU O SEGUINTE PARECER NO TERMO DE INSEPCAO DE SAUDE NR [TIS]:
NIP: [NIP]
POSTO/GRAD: [POSTO] [CORPO] [QUADRO] [ESPECIALIDADE]
NOME: [NOME DO MILITAR]
OM: [OM]
FINALIDADE: [FINALIDADE DA IS]
PARECER: [TEXTO DO LAUDO] [RESTRIÇÕES, SE HOUVER]
CODIGO DO DIAGNOSTICO: [CODIGO DS-1A, SE HOUVER]

Se houver restrições e tempo de restrição, eles devem aparecer logo após o texto do Laudo na linha "PARECER".
Se não houver Código do Diagnóstico, a respectiva linha deve ser ocultada.

---

# REGRAS DE SAÍDA FINAL
A sua resposta DEVE conter a seguinte estrutura para cada IS analisada:

PARA: [DESTINATÁRIO PARA CALCULADO]
INFO: [DESTINATÁRIOS INFO CALCULADOS]
ASSUNTO: INSPECAO DE SAUDE
TEXTO:
[INSERIR O TEXTO FORMATADO AQUI]

Caso haja mais de uma IS no mesmo envio (mais de um par de imagens), separe a minuta de cada uma por três traços ("---").\`

  var parts = [{ text: MINUTA_PROMPT }];
  for (var imgIdx = 0; imgIdx < payload.images.length; imgIdx++) {
    parts.push({
      inline_data: {
        mime_type: payload.images[imgIdx].mimeType || 'image/jpeg',
        data: payload.images[imgIdx].data
      }
    });
  }

  const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  const geminiBody = { contents: [{ parts: parts }] };
  const geminiJson = chamarGemini(geminiUrl, geminiBody);

  const minuta = geminiJson.candidates[0].content.parts[0].text;

  const minutaFolder = DriveApp.getFolderById('1q_Pw_mbjYKvyJvBr-PGmV9pK7YiBZOKv');
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  const docTitle = "Minuta IS - " + dateStr;
  const doc = DocumentApp.create(docTitle);
  const body = doc.getBody();
  body.setText(minuta);
  doc.saveAndClose();
  const docFile = DriveApp.getFileById(doc.getId());
  minutaFolder.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    minuta: minuta,
    docUrl: doc.getUrl()
  })).setMimeType(ContentService.MimeType.JSON);
}

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
].join('\\n');

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
  var json = chamarGemini(url, requisicao);

  try {
    var texto = json.candidates[0].content.parts[0].text;
    return JSON.parse(texto);
  } catch (e) {
    throw new Error('O Gemini não conseguiu estruturar os dados da mensagem. Confira se o PDF está legível.');
  }
}

function apiSalvarMensagemPdf(corpo) {
  exigirUsuarioFirebase(corpo);
  var pastas = garantirEstruturaConcurso(corpo.ano, corpo.nomeConcurso);
  var original = limparNomeDrive(corpo.nomeArquivo).replace(/\\.pdf$/i, '') || 'mensagem';
  var arquivo = criarPdfNaPasta(pastas.mensagens, Date.now() + '_' + original + '.pdf', corpo.pdfBase64);
  return { fileId: arquivo.getId(), url: urlVisualizacaoDrive(arquivo.getId()) };
}
`,

  'MilitarRepository.gs': `/**
 * MilitarRepository.gs
 * Repository classes if needed later. Currently empty due to Firestore migration.
 */
`,

  'LookupRepository.gs': `/**
 * LookupRepository.gs
 * Lookup lists if needed later. Currently empty due to Firestore migration.
 */
`,

  'DocumentService.gs': `/**
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

function gerarPdfDeTemplate(idTemplate, nomeTemp, valores) {
  var docCopia = DriveApp.getFileById(idTemplate).makeCopy(nomeTemp);
  try {
    var docAberto = DocumentApp.openById(docCopia.getId());
    var partes = [docAberto.getBody(), docAberto.getHeader(), docAberto.getFooter()].filter(function(p) { return p; });
    Object.keys(valores).forEach(function(chave) {
      var padrao = '\\{\\{' + chave + '\\}\\}';
      var texto = String(valores[chave]).replace(/\\$/g, '\\\\$');
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

  var idDrive = /drive\\.google\\.com\\/file\\/d\\/([\\w-]+)/.exec(pdfUrl);
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
    body: 'Giorginis,\\n\\nSeguem os termos do candidato INAPTO ao ' + nomeConcurso + ' ' + idCandidato + candidato +
      ' para impressão e coleta de assinaturas.\\n\\n' + agradecimento + '\\n\\n' + remetente,
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

  var idDrive = /drive\\.google\\.com\\/file\\/d\\/([\\w-]+)/.exec(pdfUrl);
  if (!idDrive) throw new Error('Endereço do PDF não reconhecido.');
  var arquivo = DriveApp.getFileById(idDrive[1]);
  if (!estaSobPasta(arquivo, ID_PASTA_RAIZ_CONCURSOS)) throw new Error('O PDF não está na pasta CONCURSOS.');

  var agradecimento = agradecimentoDe(remetente);
  garantirCotaEmail();
  MailApp.sendEmail({
    to: EMAIL_IMPRESSAO,
    cc: EMAILS_COPIA_TERMO_RECURSO,
    subject: 'IMPRIMIR - SOLICITAÇÃO DE ' + tipo,
    body: 'Giorginis,\\n\\nPor favor, imprimir apenas na frente e colorido.\\n\\n' + agradecimento + '\\n\\n' + remetente,
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
    .replace(/\\s+/g, ' ')
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
  var base = nomeArquivoExames(candidatoNome).replace(/\\.pdf$/i, '');
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
  var anoTexto = String(ano || '').replace(/\\D/g, '') || Utilities.formatDate(new Date(), 'America/Recife', 'yyyy');

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
`,

  'GeminiService.gs': `/**
 * GeminiService.gs
 */

function chamarGemini(url, requisicao) {
  var esperas = [2000, 4000];
  for (var tentativa = 0; ; tentativa++) {
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(requisicao),
      muteHttpExceptions: true
    });
    var codigo = resp.getResponseCode();
    if ((codigo === 429 || codigo === 500 || codigo === 503) && tentativa < esperas.length) {
      Utilities.sleep(esperas[tentativa]);
      continue;
    }
    var json;
    try { json = JSON.parse(resp.getContentText()); } catch (e) { throw new Error('Resposta inválida da API Gemini (HTTP ' + codigo + ').'); }
    if (codigo === 429) throw new Error('Limite de uso da IA (Gemini) atingido. Tente novamente em alguns minutos.');
    if (codigo === 500 || codigo === 503) throw new Error('A IA (Gemini) está indisponível no momento. Tente novamente em alguns minutos.');
    if (json.error) throw new Error('Erro na API Gemini: ' + json.error.message);
    return json;
  }
}

var PROMPT_EXAMES_CANDIDATO = [
  'Você transcreve, na íntegra, os exames de um candidato de concurso da Marinha do Brasil a partir de um PDF (em geral escaneado), para a Inspeção de Saúde da Junta Regular de Saúde.',
  'Responda estritamente em JSON válido, com exatamente estas chaves de primeiro nível: "paciente", "exames" e "observacoes".',
  '',
  'REGRAS GERAIS',
  '- Transcreva TODOS os laudos do documento: um objeto do array "exames" por exame ou por grupo de exames (ver AGRUPAMENTO).',
  '- Despreze textos fúteis de cabeçalho e de rodapé: numeração de páginas ("Página 1 de 4"), endereço, telefone, e-mail, site e redes sociais da clínica ou do laboratório, código de barras, protocolo de conferência na internet, avisos do tipo "laudo sem valor sem assinatura" e afins.',
  '- NÃO transcreva a Folha de Anamnese Dirigida (Anexo W / DS-8), em geral a primeira página.',
  '- Transcreva em texto puro: sem markdown, sem negrito, sem tabelas e sem numerar as listas do laudo. Preserve as quebras de linha e as linhas em branco do original.',
  '- Não invente dados: use string vazia (ou lista vazia) quando a informação não estiver no documento.',
  '',
  'CAMPOS DE CADA EXAME',
  '- "categoria": exatamente uma destas: "hemograma", "eas", "bioquimica", "betaHcg", "vdrl", "antiHiv", "imagem", "colpocitologia", "ecg", "toxicologico", "outro".',
  '- "nome": título do bloco em MAIÚSCULAS e sem acentos (ex.: "HEMOGRAMA COMPLETO", "EAS", "BIOQUIMICA", "BETA-HCG", "VDRL", "ANTI-HIV 1+2 (QUIMIOLUMINESCENCIA)", "RADIOGRAFIA DE TORAX", "USG DE MAMAS", "USG TRANSVAGINAL", "COLPOCITOLOGIA ONCOTICA", "ELETROCARDIOGRAMA", "EXAME TOXICOLOGICO").',
  '- "paciente": nome do paciente como consta naquele laudo.',
  '- "emissor": nome do profissional que assina o laudo, com o título (Dr., Dra., Biomed., Farm. etc.).',
  '- "conselho": conselho de classe e número (ex.: "CRM-PE 20674", "CRBio-5 012345", "CRF-PE 7890"); acrescente o RQE quando houver.',
  '- "data": data do laudo em DD/MM/AAAA.',
  '- "itens": lista de { "nome": "...", "valor": "..." } — só para "hemograma", "eas" e "bioquimica"; nos demais, lista vazia.',
  '- "resultado": resultado curto — só para "betaHcg", "vdrl" e "antiHiv" (ex.: "Nao reagente", "Negativo", "Inferior a 1,20 mUI/mL"); nos demais, string vazia.',
  '- "texto": o laudo na íntegra — para "imagem", "colpocitologia", "ecg", "toxicologico" e "outro"; nos exames de valores, string vazia.',
  '',
  'VALORES (hemograma, EAS e bioquímica)',
  '- Cada analito é um item separado, com APENAS o valor, SEM unidade de medida e sem o valor de referência.',
  '- Plaquetas em milhares (209, nunca 209.000).',
  '- Hemograma: hemácias, hemoglobina, hematócrito, VCM, HCM, CHCM, RDW, leucócitos, basófilos, eosinófilos, mielócitos, metamielócitos, bastões, segmentados, linfócitos, monócitos e plaquetas. Mielócitos, metamielócitos e bastões que não constem do laudo entram com valor "0".',
  '- EAS (urina): densidade, pH, proteínas, glicose, corpos cetônicos, hemoglobina, nitrito, urobilinogênio, bilirrubinas, leucócitos, hemácias, células epiteliais, cilindros, cristais, muco e flora bacteriana.',
  '- Bioquímica: glicemia de jejum, ureia, creatinina, colesterol total e frações (HDL, LDL, VLDL), triglicerídeos, TGO e TGP.',
  '',
  'AGRUPAMENTO',
  '- Hemograma, EAS e bioquímica formam UM ÚNICO objeto cada, com todos os seus analitos em "itens".',
  '- Se o mesmo analito aparecer em laudos de datas diferentes, use o valor MAIS RECENTE; e use "emissor", "conselho" e "data" do laudo mais recente do grupo.',
  '- Beta-HCG, VDRL e anti-HIV são objetos próprios, um para cada, com o "resultado". No anti-HIV, informe o método no "nome".',
  '- Exames de imagem (radiografia de tórax, USG de mamas, USG transvaginal ou pélvica), colpocitologia oncótica, eletrocardiograma e exame toxicológico: um objeto por exame, com o laudo em "texto".',
  '- Exame toxicológico: inclua no "texto" o número do laudo, o material, o comprimento da amostra, a janela de detecção, o método, a data da coleta e o resultado por classe de substância.',
  '- Qualquer exame fora dessa relação entra com categoria "outro" e o laudo integral em "texto".',
  '',
  'OUTRAS CHAVES',
  '- "paciente": objeto { "nome": "NOME COMPLETO EM MAIÚSCULAS", "dataNascimento": "DD/MM/AAAA", "cpf": "", "identidade": "" } com o nome e a data de nascimento do candidato. Minimização de dados: deixe "cpf" e "identidade" SEMPRE vazios, mesmo que constem no documento.',
  '- "observacoes": lista de avisos curtos para conferência humana — valores fora da referência do laboratório, carimbo ou registro pouco legível (diga a leitura feita), páginas faltando, divergência de nome ou de data de nascimento entre os laudos. Lista vazia se não houver.',
].join('\\n');

function extrairExamesComGemini(pdfBase64, mimeType) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nas propriedades do projeto Apps Script.');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODELO_GEMINI + ':generateContent?key=' + apiKey;
  var requisicao = {
    contents: [{
      parts: [
        { text: PROMPT_EXAMES_CANDIDATO },
        { inline_data: { mime_type: mimeType || 'application/pdf', data: pdfBase64 } }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 65536 }
  };
  var json;
  try {
    json = chamarGemini(url, requisicao);
  } catch (erroFetch) {
    if (/Timeout|tempo/i.test(erroFetch.message)) {
      throw new Error('A leitura dos exames não terminou em tempo (' + erroFetch.message + '). Divida os exames em dois PDFs e envie um por vez.');
    }
    throw erroFetch;
  }

  var candidato = json.candidates && json.candidates[0];
  if (candidato && candidato.finishReason === 'MAX_TOKENS') {
    throw new Error('A transcrição ficou longa demais e foi cortada. Envie os exames em dois PDFs menores.');
  }
  try {
    return JSON.parse(candidato.content.parts[0].text);
  } catch (e) {
    throw new Error('O Gemini não conseguiu estruturar os exames. Confira se o PDF está legível.');
  }
}
`,

  'MailService.gs': `/**
 * MailService.gs
 */

function garantirCotaEmail() {
  if (MailApp.getRemainingDailyQuota() < 1) {
    throw new Error('Cota diária de e-mails do Apps Script esgotada. O documento está salvo: imprima pela fila de documentos ou envie amanhã.');
  }
}

function agradecer(remetente) {
  return /MONICA/.test(semAcentos(remetente).toUpperCase()) ? 'Obrigada!' : 'Obrigado!';
}

function agradecer(remetente) {
  return agradecimentoDe(remetente);
}

function agradecimentoDe(remetente) {
  return /MONICA/.test(semAcentos(remetente).toUpperCase()) ? 'Obrigada!' : 'Obrigado!';
}

function escaparHtml(texto) {
  return String(texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var EMAIL_IMPRESSAO = 'giorginis@marinha.mil.br';
var EMAILS_COPIA_TERMO_RECURSO = 'dayvison.rubem@marinha.mil.br,brunelly.cavalcanti@marinha.mil.br';
`,

  'ResponseUtils.gs': `/**
 * ResponseUtils.gs
 */

function logSeguro_(contexto, erro) {
  var msg = String((erro && erro.message) || erro || '')
    .replace(/eyJ[\\w-]{10,}\\.[\\w-]{10,}\\.[\\w-]{5,}/g, '[token]')
    .replace(/([?&](?:key|token|idToken)=)[^&\\s"']+/gi, '$1[oculto]')
    .replace(/[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+/g, '[email]')
    .replace(/\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b/g, '[cpf]')
    .replace(/\\b\\d{2}\\.\\d{4}\\.\\d{2}\\b/g, '[nip]')
    .replace(/\\b\\d{8}\\b/g, '[nip]')
    .replace(/[A-Za-z0-9+\\/=_-]{120,}/g, '[dados-longos]')
    .substring(0, 200);
  Logger.log(contexto + ': ' + msg);
}

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

function formatarDataSimples(data) {
  if (!data || Object.prototype.toString.call(data) !== '[object Date]' || isNaN(data.getTime())) return '';
  var dia = String(data.getDate()).padStart(2, '0');
  var mes = String(data.getMonth() + 1).padStart(2, '0');
  return dia + '/' + mes + '/' + data.getFullYear();
}

function formatarDataMilitar(data) {
  if (!data || Object.prototype.toString.call(data) !== '[object Date]' || isNaN(data.getTime())) return '';
  var meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var dia = String(data.getDate()).padStart(2, '0');
  return dia + meses[data.getMonth()] + data.getFullYear();
}

function formatarDataPorExtenso(data) {
  var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var dia = Number(Utilities.formatDate(data, 'America/Recife', 'd'));
  var mes = Number(Utilities.formatDate(data, 'America/Recife', 'M'));
  var ano = Utilities.formatDate(data, 'America/Recife', 'yyyy');
  return (dia === 1 ? '1º' : String(dia)) + ' de ' + meses[mes - 1] + ' de ' + ano;
}

function limparNomeDrive(nome) {
  return String(nome || '').replace(/[\\r\\n\\t]+/g, ' ').replace(/\\s+/g, ' ').trim();
}

function semAcentos(texto) {
  return String(texto || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
}
`,

  'CalendarService.gs': `/**
 * CalendarService.gs
 */
function dataHoraAgenda(data, hhmm) {
  var d = String(data || '').split('-');
  var h = String(hhmm || '').split(':');
  if (d.length !== 3 || h.length < 2) throw new Error('Data ou hora do evento inválida.');
  return new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]), Number(h[0]), Number(h[1]), 0);
}

function autorizarAgenda() {
  var agenda = CalendarApp.getCalendarById(ID_AGENDA_JRS_HNRE);
  if (!agenda) throw new Error('Agenda JRS/HNRe não encontrada para esta conta.');
  Logger.log('Agenda OK: ' + agenda.getName());
  return agenda.getName();
}

function abrirAgendaJrs(corpo) {
  var agenda = null;
  try { agenda = CalendarApp.getCalendarById(ID_AGENDA_JRS_HNRE); } catch (erroAgenda) { agenda = null; }
  if (!agenda) {
    var nomeAgenda = String(corpo.agenda || 'JRS/HNRe');
    var agendas = CalendarApp.getOwnedCalendarsByName(nomeAgenda);
    if (!agendas.length) agendas = CalendarApp.getCalendarsByName(nomeAgenda);
    if (agendas.length) agenda = agendas[0];
  }
  if (!agenda) throw new Error('Agenda JRS/HNRe não encontrada: a conta que implantou o script precisa ser dona da agenda ou tê-la na lista de agendas (Google Agenda > Outras agendas).');
  return agenda;
}

function aplicarNotificacaoPadrao(evento) {
  evento.removeAllReminders();
  evento.addPopupReminder(720);
}

function aplicarCorEventoIS(evento, situacao) {
  if (situacao === 'finalizada') evento.setColor(CalendarApp.EventColor.GREEN);
  else evento.setColor(CalendarApp.EventColor.YELLOW);
}

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
    if (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(limpo) && convidados.indexOf(limpo) === -1) convidados.push(limpo);
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
  var fimExclusivo = new Date(fimInclusivo.getFullYear(), fimInclusivo.getMonth(), fimInclusivo.getDate() + 1);
  var evento = agenda.createAllDayEvent(titulo, inicio, fimExclusivo);
  evento.setColor(CalendarApp.EventColor.GRAY);
  return { eventoId: evento.getId() };
}

function apiSincronizarEventosConcursos(corpo) {
  exigirUsuarioFirebase(corpo);
  var agenda = abrirAgendaJrs(corpo);
  var convidados = [];
  (corpo.convidados || []).forEach(function(email) {
    var limpo = String(email || '').trim().toLowerCase();
    if (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(limpo) && convidados.indexOf(limpo) === -1) convidados.push(limpo);
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
      aplicarNotificacaoPadrao(ev);
    });

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
`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, filename), content);
}

// Remove the old files
if (fs.existsSync(path.join(dir, 'CodeConcursos.gs'))) {
  fs.unlinkSync(path.join(dir, 'CodeConcursos.gs'));
}
if (fs.existsSync(path.join(dir, 'CodePrincipal.gs'))) {
  fs.unlinkSync(path.join(dir, 'CodePrincipal.gs'));
}

console.log("Local files generated successfully.");
