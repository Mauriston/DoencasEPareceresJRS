/**
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
