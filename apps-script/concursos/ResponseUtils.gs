/**
 * ResponseUtils.gs
 */

var correlationId_ = null;

/** Obtém ou gera um ID de correlação para a execução atual. */
function getCorrelationId_() {
  if (!correlationId_) {
    correlationId_ = Utilities.getUuid().split('-')[0]; // Usa a primeira parte do UUID
  }
  return correlationId_;
}

function logSeguro_(contexto, erro) {
  var id = getCorrelationId_();
  var msg = String((erro && erro.message) || erro || '')
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g, '[token]')
    .replace(/([?&](?:key|token|idToken)=)[^&\s"']+/gi, '$1[oculto]')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\b\d{2}\.\d{4}\.\d{2}\b/g, '[nip]')
    .replace(/\b\d{8}\b/g, '[nip]')
    .replace(/[A-Za-z0-9+\/=_-]{120,}/g, '[dados-longos]')
    .substring(0, 200);
  Logger.log('[' + id + '] ' + contexto + ': ' + msg);
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
  return String(nome || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function semAcentos(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
