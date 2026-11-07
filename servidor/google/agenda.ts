// Ficheiro: servidor/google/agenda.ts
// Sincronização com a agenda "JRS/HNRe" do Google Agenda pelo servidor (Calendar API, conta Google da
// JRS), no lugar do CalendarApp do Apps Script. Mesmas regras:
//  - entrevista de IS: evento com o perito convidado, amarelo (verde quando finalizada), lembrete 12 h antes;
//  - bloqueio de período: evento de dia inteiro, cinza;
//  - dias de concurso: um evento por dia (07:30–12:00), todos os usuários ativos convidados, vermelho
//    (verde quando encerrado), marcado com a chave "{concursoId}|{data}" — sincronização idempotente.
// Os ids gravados pelo Apps Script ("abc@google.com") continuam valendo: o sufixo é removido.
import type { Firestore } from 'firebase-admin/firestore';
import { googleFetch, ErroContaGoogle } from './contaGoogle';
import { limparNome } from './impressao';

export const ID_AGENDA = process.env.ID_AGENDA_JRS_HNRE || 'c_b103c034ba38b68e447b1ea6ab97b0da658878ebc7daa7535d612f9f7eaed762@group.calendar.google.com';
const FUSO = 'America/Recife';
/** Cores do Google Agenda (iguais às do CalendarApp.EventColor). */
const COR = { verde: '10', amarelo: '5', vermelho: '11', cinza: '8' } as const;
const LEMBRETE_12H = { useDefault: false, overrides: [{ method: 'popup', minutes: 720 }] };

const base = () => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(ID_AGENDA)}/events`;
/** Id da Calendar API a partir do id do CalendarApp ("abc@google.com" → "abc"). */
export const idEvento = (id: unknown): string => String(id || '').replace(/@google\.com$/, '').trim();

const emails = (lista: unknown): string[] => {
  const out: string[] = [];
  (Array.isArray(lista) ? lista : []).forEach(e => {
    const l = String(e || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l) && !out.includes(l)) out.push(l);
  });
  return out;
};

/** Convidados do evento: mantém a resposta (sim/não/talvez) de quem já estava; entra quem é novo, sai quem saiu. */
export const convidadosDoEvento = (desejados: string[], atuais: any[] = []) =>
  desejados.map(email => atuais.find(a => String(a?.email || '').toLowerCase() === email) || { email });

const dataValida = (d: unknown): string => {
  const s = String(d || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ErroContaGoogle('falha', 'Data do evento inválida.');
  return s;
};
const hora = (h: unknown): string => {
  const s = String(h || '');
  if (!/^\d{1,2}:\d{2}$/.test(s)) throw new ErroContaGoogle('falha', 'Hora do evento inválida.');
  return s.padStart(5, '0');
};
const quando = (data: string, hhmm: string) => ({ dateTime: `${data}T${hhmm}:00`, timeZone: FUSO });
const diaSeguinte = (data: string) => { const d = new Date(`${data}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

const obter = async (db: Firestore, id: string): Promise<any | null> => {
  if (!id) return null;
  const r = await googleFetch(db, `${base()}/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  const ev: any = await r.json();
  return ev.status === 'cancelled' ? null : ev;
};
const apagar = async (db: Firestore, id: string) => { if (id) await googleFetch(db, `${base()}/${encodeURIComponent(id)}?sendUpdates=none`, { method: 'DELETE' }); };
const criar = async (db: Firestore, ev: object, convidar: boolean) =>
  (await (await googleFetch(db, `${base()}?sendUpdates=${convidar ? 'all' : 'none'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) })).json()) as any;
const atualizar = async (db: Firestore, id: string, ev: object) =>
  (await (await googleFetch(db, `${base()}/${encodeURIComponent(id)}?sendUpdates=none`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) })).json()) as any;

/** Entrevista de IS: cria, atualiza ou remove. Devolve { eventoId }. */
export const sincronizarEventoIS = async (db: Firestore, b: any): Promise<{ eventoId: string }> => {
  const id = idEvento(b.eventoId);
  const existente = await obter(db, id);
  if (b.remover) { if (existente) await apagar(db, id); return { eventoId: '' }; }
  const titulo = limparNome(b.titulo);
  if (!titulo) throw new ErroContaGoogle('falha', '"titulo" é obrigatório.');
  const data = dataValida(b.data);
  const ev = {
    summary: titulo, description: String(b.descricao || ''),
    start: quando(data, hora(b.horaInicio)), end: quando(data, hora(b.horaFim)),
    attendees: convidadosDoEvento(emails(b.convidados), existente?.attendees),
    colorId: b.situacao === 'finalizada' ? COR.verde : COR.amarelo, reminders: LEMBRETE_12H,
  };
  if (!existente) return { eventoId: (await criar(db, ev, true)).id };
  await atualizar(db, id, ev);
  return { eventoId: id };
};

/** Bloqueio de período: evento de dia inteiro cinza (dataInicio..dataFim inclusive), ou remoção. */
export const sincronizarEventoBloqueio = async (db: Firestore, b: any): Promise<{ eventoId: string }> => {
  if (b.remover) { const id = idEvento(b.eventoId); if (await obter(db, id)) await apagar(db, id); return { eventoId: '' }; }
  const titulo = limparNome(b.titulo);
  if (!titulo) throw new ErroContaGoogle('falha', '"titulo" é obrigatório.');
  const inicio = dataValida(b.dataInicio);
  const fim = dataValida(b.dataFim);
  if (fim < inicio) throw new ErroContaGoogle('falha', 'A data de término é anterior à de início.');
  const ev = { summary: titulo, start: { date: inicio }, end: { date: diaSeguinte(fim) }, colorId: COR.cinza };
  return { eventoId: (await criar(db, ev, false)).id };
};

// Uma sincronização de concursos por vez nesta instância (o Apps Script usava LockService).
let filaConcursos: Promise<unknown> = Promise.resolve();

/** Dias de concurso: cria o que falta, atualiza o que mudou e remove os dias que sumiram (só dos concursos ativos). */
export const sincronizarEventosConcursos = (db: Firestore, b: any): Promise<{ criados: number; atualizados: number; removidos: number }> => {
  const tarefa = filaConcursos.then(() => sincronizarConcursos(db, b));
  filaConcursos = tarefa.catch(() => undefined);
  return tarefa;
};

const chaveDe = (ev: any): string => ev?.extendedProperties?.shared?.jrsConcurso || ev?.extendedProperties?.private?.jrsConcurso || '';
const concursoDe = (ev: any): string => ev?.extendedProperties?.shared?.jrsConcursoId || ev?.extendedProperties?.private?.jrsConcursoId || '';

const sincronizarConcursos = async (db: Firestore, b: any) => {
  const convidados = emails(b.convidados);
  const dias: any[] = Array.isArray(b.dias) ? b.dias : [];
  const ativos: string[] = (Array.isArray(b.concursosAtivos) ? b.concursosAtivos : []).map(String);
  const desejados = new Map<string, any>(dias.map(d => [String(d.chave), d]));

  // Janela de busca: de 400 dias atrás a 500 dias à frente, ampliada para cobrir todos os dias pedidos.
  let ini = new Date(Date.now() - 400 * 86400000), fimJanela = new Date(Date.now() + 500 * 86400000);
  dias.forEach(d => { const t = new Date(`${dataValida(d.data)}T12:00:00Z`); if (t < ini) ini = t; if (t > fimJanela) fimJanela = new Date(t.getTime() + 86400000); });

  const existentes = new Map<string, any>();
  let removidos = 0, criados = 0, atualizados = 0;
  let pagina = '';
  do {
    const q = new URLSearchParams({ timeMin: ini.toISOString(), timeMax: fimJanela.toISOString(), singleEvents: 'true', maxResults: '2500', ...(pagina ? { pageToken: pagina } : {}) });
    const j: any = await (await googleFetch(db, `${base()}?${q}`)).json();
    for (const ev of j.items || []) {
      const chave = chaveDe(ev);
      if (!chave) continue;
      if (existentes.has(chave)) { await apagar(db, ev.id); removidos++; continue; } // repetido
      existentes.set(chave, ev);
    }
    pagina = j.nextPageToken || '';
  } while (pagina);

  for (const [chave, d] of desejados) {
    const data = dataValida(d.data);
    const ev = {
      summary: String(d.titulo), description: String(d.descricao || ''),
      start: quando(data, '07:30'), end: quando(data, '12:00'),
      attendees: convidadosDoEvento(convidados, existentes.get(chave)?.attendees),
      colorId: d.encerrado ? COR.verde : COR.vermelho, reminders: LEMBRETE_12H,
      extendedProperties: { shared: { jrsConcurso: chave, jrsConcursoId: String(d.concursoId) } },
    };
    const atual = existentes.get(chave);
    if (atual) { await atualizar(db, atual.id, ev); atualizados++; } else { await criar(db, ev, true); criados++; }
  }
  for (const [chave, ev] of existentes) {
    if (desejados.has(chave) || !ativos.includes(concursoDe(ev))) continue;
    await apagar(db, ev.id); removidos++;
  }
  return { criados, atualizados, removidos };
};
