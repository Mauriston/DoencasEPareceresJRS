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
 * Implantação: no editor deste projeto, Implantar → Nova implantação →
 * Aplicativo da web, "Executar como: Eu", "Quem pode acessar: Qualquer
 * pessoa". Colar a URL ".../exec" gerada em GAS_URL_TERMO_RECURSO
 * (components/ConcursosJRS.tsx). Como o script usa Docs/Drive só para
 * copiar e exportar o template (nunca grava nada no Drive do usuário além
 * de uma cópia temporária, descartada ao final), a primeira execução pode
 * pedir autorização dessas permissões.
 */

var ID_TEMPLATE_TERMO_RECURSO = '1CpgsInQSHnx_ji6NBfAiKmRmbfczKYW-M0QO4LZllgc';

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
 * action=gerarTermoRecurso (POST): { candidato, dataLaudo } — gera o PDF
 * do Termo de Cientificação de Recurso a partir do template Google Docs,
 * preenchendo os placeholders, e devolve o conteúdo em base64. Não lê nem
 * grava nada em planilhas ou pastas do Drive do usuário: a cópia do
 * template é sempre temporária e descartada ao final.
 */
function apiGerarTermoRecurso(corpo) {
  var candidato = String((corpo && corpo.candidato) || '').trim();
  var dataLaudo = String((corpo && corpo.dataLaudo) || '').trim();
  if (!candidato) throw new Error('"candidato" é obrigatório.');

  var dataHojeFormatada = formatarDataSimples(new Date());

  var docCopia = DriveApp.getFileById(ID_TEMPLATE_TERMO_RECURSO).makeCopy('Temp_Recurso_' + candidato);
  try {
    var docAberto = DocumentApp.openById(docCopia.getId());
    var body = docAberto.getBody();

    body.replaceText('\\{\\{Candidato\\}\\}', candidato);
    body.replaceText('\\{\\{Data Laudo\\}\\}', dataLaudo);
    body.replaceText('\\{\\{DATA_HOJE\\}\\}', dataHojeFormatada);

    docAberto.saveAndClose();

    var pdfBlob = docCopia.getAs('application/pdf');
    var base64 = Utilities.base64Encode(pdfBlob.getBytes());

    return { candidato: candidato, pdfBase64: base64 };
  } finally {
    docCopia.setTrashed(true);
  }
}
