/**
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
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo) && convidados.indexOf(limpo) === -1) convidados.push(limpo);
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
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo) && convidados.indexOf(limpo) === -1) convidados.push(limpo);
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
