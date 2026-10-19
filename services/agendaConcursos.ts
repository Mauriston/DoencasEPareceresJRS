// Ficheiro: services/agendaConcursos.ts
// Dias de concurso na agenda das Inspeções de Saúde. Cada dia em que há candidatos agendados de um concurso
// "Em andamento" ou "Em breve" vira UM evento que ocupa o turno da manhã inteiro (07:30–12:00) e bloqueia os
// horários do turno para todos os peritos. No app, o cartão é vermelho (verde quando o dia é encerrado) e leva à
// tabela do concurso; no Google Agenda "JRS/HNRe" o evento tem o mesmo padrão (ver CodeConcursos.gs, ação
// "sincronizarEventosConcursos"): descrição com os nomes dos candidatos do dia ("- NOME"), todos os usuários ativos do appweb
// convidados pelo Gmail (com convite por e-mail) e notificação 12 h antes.
//
// "Dia encerrado" = todos os candidatos agendados naquele dia estão finalizados (IS concluída com TIS).
import { observarConcursos, observarCandidatos, type CandidatoRecord } from './firestoreConcursos';
import { chamarScript } from './driveConcursos';
import { listUsuarios } from './firestoreUsuarios';
import { NOME_AGENDA_GOOGLE } from './agendaGoogleIS';
import type { BloqueioAgenda } from '../utils/inspecoes';

export interface DiaConcurso {
  /** "{concursoId}|{AAAA-MM-DD}" — chave única do dia (a mesma usada na tag do evento do Google Agenda). */
  chave: string;
  concursoId: string;
  nome: string;
  /** AAAA-MM-DD */
  data: string;
  total: number;
  candidatos: { id: string; nome: string; finalizado: boolean }[];
  encerrado: boolean;
}

/** "CPAEAM/2026 - 12 candidatos" */
export const tituloDiaConcurso = (d: Pick<DiaConcurso, 'nome' | 'total'>): string =>
  `${d.nome} - ${d.total} candidato${d.total !== 1 ? 's' : ''}`;

const montarDias = (estado: Map<string, { nome: string; candidatos: CandidatoRecord[] | null }>): DiaConcurso[] => {
  const dias: DiaConcurso[] = [];
  estado.forEach((e, concursoId) => {
    const porData = new Map<string, CandidatoRecord[]>();
    (e.candidatos ?? []).forEach(c => { if (c.dataAgendamento) porData.set(c.dataAgendamento, [...(porData.get(c.dataAgendamento) ?? []), c]); });
    porData.forEach((lista, data) => {
      const candidatos = lista
        .map(c => ({ id: c.id, nome: c.nome, finalizado: c.finalizado }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
      dias.push({ chave: `${concursoId}|${data}`, concursoId, nome: e.nome, data, total: candidatos.length, candidatos, encerrado: candidatos.every(c => c.finalizado) });
    });
  });
  return dias.sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome, 'pt-BR'));
};

/**
 * Observa, em tempo real, os dias agendados dos concursos Em andamento e Em breve. Só emite quando os candidatos de
 * TODOS os concursos ativos já chegaram — um estado parcial faria a sincronização com o Google Agenda apagar eventos.
 */
export const observarDiasConcursos = (onData: (dias: DiaConcurso[], concursosAtivos: string[]) => void, onError?: (e: Error) => void): (() => void) => {
  const estado = new Map<string, { nome: string; candidatos: CandidatoRecord[] | null }>();
  const assinaturas = new Map<string, () => void>();
  const emitir = () => {
    if ([...estado.values()].some(e => e.candidatos === null)) return;
    onData(montarDias(estado), [...estado.keys()]);
  };
  const parar = observarConcursos(lista => {
    const ativos = lista.filter(c => c.status === 'em_andamento' || c.status === 'em_breve');
    const ids = new Set(ativos.map(c => c.id));
    assinaturas.forEach((cancelar, id) => { if (!ids.has(id)) { cancelar(); assinaturas.delete(id); estado.delete(id); } });
    ativos.forEach(c => {
      const atual = estado.get(c.id);
      estado.set(c.id, { nome: c.nome, candidatos: atual?.candidatos ?? null });
      if (!assinaturas.has(c.id)) {
        assinaturas.set(c.id, observarCandidatos(c.id, candidatos => {
          const e = estado.get(c.id);
          if (e) { e.candidatos = candidatos; emitir(); }
        }, onError));
      }
    });
    emitir();
  }, onError);
  return () => { parar(); assinaturas.forEach(c => c()); assinaturas.clear(); };
};

/** Dias de concurso como bloqueios da agenda: o turno da manhã inteiro, para todos os peritos. */
export const bloqueiosDeConcursos = (dias: DiaConcurso[]): BloqueioAgenda[] =>
  dias.map(d => ({ id: `concurso-${d.chave}`, data: d.data, turno: 'manha', peritoUid: '*', motivo: tituloDiaConcurso(d) }));

export const ehBloqueioDeConcurso = (b: Pick<BloqueioAgenda, 'id'>): boolean => b.id.startsWith('concurso-');

/** E-mails Google (Gmail) de todos os usuários ativos do appweb: convidados dos eventos de concurso. */
export const carregarConvidadosAgenda = async (): Promise<string[]> => {
  const usuarios = await listUsuarios();
  const emails = usuarios
    .filter(u => u.ativo)
    .map(u => (u.gmail || '').trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  return Array.from(new Set(emails)).sort();
};

/** Assinatura curta do conteúdo que vai para o Google Agenda (para só sincronizar quando algo mudou). */
export const assinaturaDias = (dias: DiaConcurso[], concursosAtivos: string[], convidados: string[] = []): string => {
  const texto = JSON.stringify([concursosAtivos.slice().sort(), convidados, dias.map(d => [d.chave, d.nome, d.encerrado, d.candidatos.map(c => `${c.id}:${c.nome}`)])]);
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return `${dias.length}.${(h >>> 0).toString(36)}`;
};

const escaparHtml = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Envia ao Google Agenda "JRS/HNRe" os dias de concurso (cria, atualiza e remove eventos conforme o caso). */
export const sincronizarConcursosNaAgenda = (dias: DiaConcurso[], concursosAtivos: string[], convidados: string[]) =>
  chamarScript<{ criados: number; atualizados: number; removidos: number }>('sincronizarEventosConcursos', {
    agenda: NOME_AGENDA_GOOGLE,
    concursosAtivos,
    // Todos os usuários ativos do appweb (Gmail) são convidados, com convite por e-mail; a notificação de 12 h é aplicada no script.
    convidados,
    dias: dias.map(d => ({
      chave: d.chave, concursoId: d.concursoId, data: d.data, encerrado: d.encerrado,
      titulo: `${d.encerrado ? '✅ ' : ''}${tituloDiaConcurso(d)}`,
      // Lista não numerada (marcadores) só com os nomes dos candidatos do dia; o Google Agenda renderiza o HTML da descrição.
      descricao: `<ul>${d.candidatos.map(c => `<li>${escaparHtml(c.nome)}</li>`).join('')}</ul>`,
    })),
  });
