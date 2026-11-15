import { describe, expect, it } from 'vitest';
import {
  contarISPorDia, diasDisponiveisDoMes, estadoDoSlot, gradeDoMes, peritosLivresNoDia, proximaDataLivre, slotsLivresDoDia,
} from '../disponibilidadeAgenda';
import { chavesOcupadas, slotsDoTurno, type BloqueioAgenda, type ConfigAgenda } from '../inspecoes';

// 2026-11-16 é segunda-feira; 2026-11-17 terça; 2026-11-21/22 fim de semana.
const config: ConfigAgenda = {
  ana: { '1': { manha: true }, '3': { tarde: true } },
  bia: { '2': { manha: true, tarde: true } },
};
const vazio = { config, bloqueios: [] as BloqueioAgenda[], ocupados: new Set<string>() };
const ana = { uid: 'ana' };
const bia = { uid: 'bia' };

describe('slots livres do perito', () => {
  it('só os turnos configurados no dia da semana', () => {
    expect(slotsLivresDoDia('ana', '2026-11-16', config, [], new Set())).toEqual(slotsDoTurno('manha'));
    expect(slotsLivresDoDia('ana', '2026-11-17', config, [], new Set())).toEqual([]);
    expect(slotsLivresDoDia('bia', '2026-11-21', config, [], new Set())).toEqual([]);
  });
  it('bloqueio de turno e slot ocupado tiram horários', () => {
    const bloqueio: BloqueioAgenda = { id: 'b', data: '2026-11-16', turno: 'manha', peritoUid: 'ana', motivo: 'Férias' };
    expect(slotsLivresDoDia('ana', '2026-11-16', config, [bloqueio], new Set())).toEqual([]);
    const primeiro = slotsDoTurno('manha')[0];
    const ocupados = new Set(chavesOcupadas('ana', `2026-11-16T${primeiro}`, 20));
    expect(estadoDoSlot('ana', '2026-11-16', primeiro, true, [], ocupados)).toBe('ocupado');
    expect(slotsLivresDoDia('ana', '2026-11-16', config, [], ocupados)).not.toContain(primeiro);
  });
  it('bloqueio de todos os peritos ("*") atinge qualquer um', () => {
    const b: BloqueioAgenda = { id: 'x', data: '2026-11-17', turno: 'dia', peritoUid: '*', motivo: 'Feriado' };
    expect(peritosLivresNoDia([ana, bia], '2026-11-17', { ...vazio, bloqueios: [b] })).toEqual([]);
  });
});

describe('peritos e dias disponíveis do AMP', () => {
  it('peritos com horário livre no dia', () => {
    expect(peritosLivresNoDia([ana, bia], '2026-11-16', vazio)).toEqual([ana]);
    expect(peritosLivresNoDia([ana, bia], '2026-11-17', vazio)).toEqual([bia]);
    expect(peritosLivresNoDia([ana, bia], '2026-11-20', vazio)).toEqual([]);
  });
  it('dias do mês habilitados (seg, ter e qua), a partir do mínimo', () => {
    const dias = diasDisponiveisDoMes('2026-11-15', [ana, bia], vazio, '2026-11-15');
    expect([...dias].slice(0, 3)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    expect(dias.has('2026-11-10')).toBe(false);
    expect(dias.has('2026-11-19')).toBe(false);
    expect([...dias].every(d => d.startsWith('2026-11'))).toBe(true);
    expect(diasDisponiveisDoMes('2026-11-01', [], vazio).size).toBe(0);
  });
  it('próxima data livre', () => {
    expect(proximaDataLivre('2026-11-19', [ana, bia], vazio)).toBe('2026-11-23');
    expect(proximaDataLivre('2026-11-19', [bia], vazio)).toBe('2026-11-24');
    expect(proximaDataLivre('2026-11-19', [], vazio)).toBe('');
    expect(proximaDataLivre('2026-11-19', [{ uid: 'sem-turno' }], vazio, 30)).toBe('');
  });
});

describe('grade do mês', () => {
  it('começa na segunda e cobre o mês inteiro em semanas completas', () => {
    const g = gradeDoMes('2026-11-15');
    expect(g[0]).toBe('2026-10-26');
    expect(g.length % 7).toBe(0);
    expect(g).toContain('2026-11-30');
    expect(g.filter(d => d.startsWith('2026-11'))).toHaveLength(30);
  });
  it('fevereiro de 2027 cabe em 4 linhas, mas a grade tem no mínimo 5', () => {
    expect(gradeDoMes('2027-02-01')).toHaveLength(35);
  });
});

describe('contagem de IS agendadas por dia', () => {
  const lista = [
    { id: '1', amp: 'JRS', dataEntrevista: '2026-11-16T08:00', status: 'agendada' },
    { id: '2', amp: 'JRS', dataEntrevista: '2026-11-16T09:00', status: 'reagendada' },
    { id: '3', amp: 'MPI', dataEntrevista: '2026-11-16T08:00', status: 'agendada' },
    { id: '4', amp: 'JRS', dataEntrevista: '2026-11-17T08:00', status: 'cancelada' },
    { id: '5', amp: 'JRS', dataEntrevista: '', status: 'aberta' },
  ];
  it('conta por dia, ignorando canceladas e sem entrevista', () => {
    const m = contarISPorDia(lista);
    expect(m.get('2026-11-16')).toBe(3);
    expect(m.has('2026-11-17')).toBe(false);
  });
  it('filtra pelo AMP e ignora a IS reagendada', () => {
    expect(contarISPorDia(lista, { amp: 'JRS' }).get('2026-11-16')).toBe(2);
    expect(contarISPorDia(lista, { amp: 'JRS', ignorarId: '1' }).get('2026-11-16')).toBe(1);
    expect(contarISPorDia(lista, { amp: 'MPI' }).get('2026-11-16')).toBe(1);
  });
});
