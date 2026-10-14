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
 *   {{DATA_HOJE}} {{nomeUsuario}} {{postoGraduacao}} {{cargo}}
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
    DATA_HOJE: formatarDataSimples(new Date()),
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
