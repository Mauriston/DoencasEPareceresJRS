// Ficheiro: utils/disponibilidadeAgenda.ts
// Regras puras da disponibilidade da agenda das IS, usadas no campo "Data Entrevista" (cadastro e
// agendamento): estado de cada slot de 20 min de um perito (turno configurado pelo Admin, bloqueios e
// slots já ocupados por outras IS), os horários livres do dia, os peritos do AMP com horário livre num
// dia, os dias do mês que podem ser escolhidos e a contagem de IS já agendadas por dia.
import {
  TURNOS, slotsDoTurno, ehDiaUtil, peritoAtendeNoTurno, bloqueioAtinge, chaveSlot, slotsCobertos, cabeNoTurno,
  DURACAO_SLOT_MIN, somarDias, inicioDaSemana, inicioDoMes, dataDeEntrevista,
  type BloqueioAgenda, type ConfigAgenda, type EstadoSlot,
} from './inspecoes';

/** Estado de um horário (hh:mm) de início de entrevista para o perito no dia. */
export const estadoDoSlot = (
  peritoUid: string, data: string, hhmm: string, turnoAtende: boolean,
  bloqueios: BloqueioAgenda[], ocupados: Set<string>, duracao: number = DURACAO_SLOT_MIN,
): EstadoSlot => {
  if (!turnoAtende) return 'fora';
  // A entrevista (20, 30 ou 60 min) ocupa os slots que toca; todos precisam estar livres e dentro do turno.
  if (!cabeNoTurno(hhmm, duracao)) return 'nao_cabe';
  const cobertos = slotsCobertos(hhmm, duracao);
  if (cobertos.some(h => bloqueios.some(b => bloqueioAtinge(b, peritoUid, data, h)))) return 'bloqueado';
  if (cobertos.some(h => ocupados.has(chaveSlot(peritoUid, `${data}T${h}`)))) return 'ocupado';
  return 'livre';
};

/** Horários (hh:mm) livres de um perito num dia: turno configurado, sem bloqueio e sem outra IS. */
export const slotsLivresDoDia = (peritoUid: string, data: string, config: ConfigAgenda, bloqueios: BloqueioAgenda[], ocupados: Set<string>, duracao: number = DURACAO_SLOT_MIN): string[] => {
  if (!ehDiaUtil(data)) return [];
  return TURNOS.flatMap(t => {
    const atende = peritoAtendeNoTurno(config, peritoUid, data, t.id);
    return slotsDoTurno(t.id).filter(h => estadoDoSlot(peritoUid, data, h, atende, bloqueios, ocupados, duracao) === 'livre');
  });
};

/** Dados da agenda usados no cálculo de disponibilidade. */
export interface AgendaDisponibilidade {
  config: ConfigAgenda;
  bloqueios: BloqueioAgenda[];
  /** Chaves de slot ocupadas por outras IS (ver ocupadosDe). */
  ocupados: Set<string>;
  /** Duração da entrevista em minutos (20, 30 ou 60). */
  duracao?: number;
}

/** Peritos (dentre os candidatos, já filtrados pelo AMP) com algum horário livre no dia. */
export const peritosLivresNoDia = <P extends { uid: string }>(candidatos: P[], data: string, agenda: AgendaDisponibilidade): P[] =>
  candidatos.filter(p => slotsLivresDoDia(p.uid, data, agenda.config, agenda.bloqueios, agenda.ocupados, agenda.duracao).length > 0);

/** Dias (AAAA-MM-DD) da grade do mês: semanas de segunda a domingo; 5 ou 6 semanas conforme o mês. */
export const gradeDoMes = (mes: string): string[] => {
  const m = inicioDoMes(mes);
  const inicio = inicioDaSemana(m);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => somarDias(inicio, w * 7 + d)))
    .filter((s, i) => i < 5 || s.some(d => d.slice(0, 7) === m.slice(0, 7)))
    .flat();
};

/** Dias do mês (só os do próprio mês, a partir de `minimo` se informado) em que algum candidato tem horário livre. */
export const diasDisponiveisDoMes = (
  mes: string, candidatos: { uid: string }[], agenda: AgendaDisponibilidade, minimo?: string,
): Set<string> => {
  const prefixo = mes.slice(0, 7);
  const dias = new Set<string>();
  for (let d = inicioDoMes(mes); d.slice(0, 7) === prefixo; d = somarDias(d, 1)) {
    if (minimo && d < minimo) continue;
    if (peritosLivresNoDia(candidatos, d, agenda).length > 0) dias.add(d);
  }
  return dias;
};

/** Primeira data (a partir de `inicio`, até `limiteDias` dias) com horário livre para algum candidato; '' se nenhuma. */
export const proximaDataLivre = (inicio: string, candidatos: { uid: string }[], agenda: AgendaDisponibilidade, limiteDias = 180): string => {
  if (candidatos.length === 0) return '';
  for (let i = 0; i < limiteDias; i++) {
    const d = somarDias(inicio, i);
    if (peritosLivresNoDia(candidatos, d, agenda).length > 0) return d;
  }
  return '';
};

interface IsAgendada { id: string; amp: string; dataEntrevista: string; status: string }

/** Quantas IS (não canceladas) já estão agendadas em cada dia; só as do AMP informado e sem a IS `ignorarId`. */
export const contarISPorDia = (inspecoes: IsAgendada[], opcoes: { amp?: string; ignorarId?: string } = {}): Map<string, number> => {
  const m = new Map<string, number>();
  inspecoes.forEach(i => {
    if (!i.dataEntrevista || i.status === 'cancelada' || i.id === opcoes.ignorarId) return;
    if (opcoes.amp && i.amp !== opcoes.amp) return;
    const d = dataDeEntrevista(i.dataEntrevista);
    m.set(d, (m.get(d) ?? 0) + 1);
  });
  return m;
};
