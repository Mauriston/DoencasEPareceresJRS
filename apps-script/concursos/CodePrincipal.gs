/**
 * CodePrincipal.gs — minuta de mensagem de IS (página Mensagens).
 *
 * A minuta é gerada no app pelo Gemini (Firebase AI Logic, services/geminiAI.ts); aqui só se guarda o
 * texto como Google Doc na pasta de minutas do Drive.
 *
 * action=salvarMinutaMensagem (POST): { idToken, minuta } → { docUrl }.
 */
var ID_PASTA_MINUTAS = '1q_Pw_mbjYKvyJvBr-PGmV9pK7YiBZOKv';

function apiSalvarMinutaMensagem(corpo) {
  exigirUsuarioFirebase(corpo);
  var minuta = String(corpo.minuta || '').trim();
  if (!minuta) throw new Error('"minuta" é obrigatória.');
  if (minuta.length > 100000) throw new Error('Minuta longa demais.');

  var pasta = DriveApp.getFolderById(ID_PASTA_MINUTAS);
  var dataHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  var doc = DocumentApp.create('Minuta IS - ' + dataHora);
  doc.getBody().setText(minuta);
  doc.saveAndClose();
  var arquivo = DriveApp.getFileById(doc.getId());
  pasta.addFile(arquivo);
  DriveApp.getRootFolder().removeFile(arquivo);
  return { docUrl: doc.getUrl() };
}
