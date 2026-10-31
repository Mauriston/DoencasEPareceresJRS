/**
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
