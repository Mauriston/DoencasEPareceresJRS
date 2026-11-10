import { describe, expect, it, vi, afterEach } from 'vitest';
import { dentroDoIntervalo, intervaloDoPeriodo, rotuloDoPeriodo, ultimoDiaDoMes } from '../periodos';
import { agruparAgendaIS, passaNoPeriodo } from '../agendaIS';

// 2026-11-10 é uma terça-feira.
const HOJE = '2026-11-10';

describe('intervaloDoPeriodo', () => {
  it('hoje', () => expect(intervaloDoPeriodo('hoje', HOJE)).toEqual({ inicio: HOJE, fim: HOJE }));
  it('semana de segunda a domingo', () => {
    expect(intervaloDoPeriodo('semana', HOJE)).toEqual({ inicio: '2026-11-09', fim: '2026-11-15' });
    // Domingo pertence à semana que começou na segunda anterior.
    expect(intervaloDoPeriodo('semana', '2026-11-15')).toEqual({ inicio: '2026-11-09', fim: '2026-11-15' });
    expect(intervaloDoPeriodo('semana', '2026-11-09')).toEqual({ inicio: '2026-11-09', fim: '2026-11-15' });
    // Semana que cruza o ano.
    expect(intervaloDoPeriodo('semana', '2026-12-31')).toEqual({ inicio: '2026-12-28', fim: '2027-01-03' });
  });
  it('mês', () => {
    expect(intervaloDoPeriodo('mes', HOJE)).toEqual({ inicio: '2026-11-01', fim: '2026-11-30' });
    expect(intervaloDoPeriodo('mes', '2028-02-15')).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' });
    expect(intervaloDoPeriodo('mes', '2026-02-01')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' });
  });
  it('trimestre civil', () => {
    expect(intervaloDoPeriodo('trimestre', HOJE)).toEqual({ inicio: '2026-10-01', fim: '2026-12-31' });
    expect(intervaloDoPeriodo('trimestre', '2026-01-01')).toEqual({ inicio: '2026-01-01', fim: '2026-03-31' });
    expect(intervaloDoPeriodo('trimestre', '2026-06-30')).toEqual({ inicio: '2026-04-01', fim: '2026-06-30' });
    expect(intervaloDoPeriodo('trimestre', '2026-07-01')).toEqual({ inicio: '2026-07-01', fim: '2026-09-30' });
  });
  it('semestre civil', () => {
    expect(intervaloDoPeriodo('semestre', HOJE)).toEqual({ inicio: '2026-07-01', fim: '2026-12-31' });
    expect(intervaloDoPeriodo('semestre', '2026-06-30')).toEqual({ inicio: '2026-01-01', fim: '2026-06-30' });
  });
  it('ano', () => expect(intervaloDoPeriodo('ano', HOJE)).toEqual({ inicio: '2026-01-01', fim: '2026-12-31' }));
  it('customizado: ordena as pontas, ponta vazia fica em aberto e, sem datas, vale o mês', () => {
    expect(intervaloDoPeriodo('custom', HOJE, { inicio: '2026-11-20', fim: '2026-11-05' })).toEqual({ inicio: '2026-11-05', fim: '2026-11-20' });
    expect(intervaloDoPeriodo('custom', HOJE, { inicio: '2026-11-20' })).toEqual({ inicio: '2026-11-20', fim: '9999-12-31' });
    expect(intervaloDoPeriodo('custom', HOJE, { fim: '2026-11-20' })).toEqual({ inicio: '0000-01-01', fim: '2026-11-20' });
    expect(intervaloDoPeriodo('custom', HOJE, {})).toEqual({ inicio: '2026-11-01', fim: '2026-11-30' });
  });
});

describe('hoje padrão (hojeISO, fuso local de Recife)', () => {
  afterEach(() => { vi.useRealTimers(); });
  it('usa a data local quando "hoje" não é informado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 23, 30)); // 10/11/2026 23:30 no horário local
    expect(intervaloDoPeriodo('hoje')).toEqual({ inicio: '2026-11-10', fim: '2026-11-10' });
  });
});

describe('utilidades', () => {
  it('último dia do mês', () => {
    expect(ultimoDiaDoMes(2026, 2)).toBe(28);
    expect(ultimoDiaDoMes(2024, 2)).toBe(29);
    expect(ultimoDiaDoMes(2026, 12)).toBe(31);
  });
  it('dentroDoIntervalo aceita data com hora', () => {
    const i = { inicio: '2026-11-01', fim: '2026-11-30' };
    expect(dentroDoIntervalo('2026-11-30T15:40', i)).toBe(true);
    expect(dentroDoIntervalo('2026-12-01T08:00', i)).toBe(false);
    expect(dentroDoIntervalo('2026-11-01', i)).toBe(true);
  });
  it('rótulo do período', () => {
    expect(rotuloDoPeriodo('mes')).toBe('Este mês');
    expect(rotuloDoPeriodo('custom', {})).toBe('Customizado');
    expect(rotuloDoPeriodo('custom', { inicio: '2026-11-10', fim: '2026-11-20' })).toBe('10/11 – 20/11/2026');
    expect(rotuloDoPeriodo('custom', { inicio: '2026-12-10', fim: '2027-01-20' })).toBe('10/12/2026 – 20/01/2027');
    expect(rotuloDoPeriodo('custom', { inicio: '2026-11-10', fim: '2026-11-10' })).toBe('10/11/2026');
    expect(rotuloDoPeriodo('custom', { inicio: '2026-11-10' })).toBe('A partir de 10/11/2026');
  });
});

describe('agenda das IS', () => {
  const is = (n: number, dataEntrevista = '', dataAbertura = '2026-11-01') => ({ is: n, dataAbertura, dataEntrevista });
  it('não agendadas no topo; dias crescentes; dentro do dia pela hora', () => {
    const grupos = agruparAgendaIS([
      is(1, '2026-11-12T09:00'), is(2), is(3, '2026-11-10T13:00'), is(4, '2026-11-10T08:00'), is(5, '', '2026-10-01'),
    ]);
    expect(grupos.map(g => g.data)).toEqual([null, '2026-11-10', '2026-11-12']);
    expect(grupos[0].itens.map(i => i.is)).toEqual([5, 2]);
    expect(grupos[1].itens.map(i => i.is)).toEqual([4, 3]);
  });
  it('sem IS não agendadas não há o grupo do topo', () => {
    expect(agruparAgendaIS([is(1, '2026-11-12T09:00')]).map(g => g.data)).toEqual(['2026-11-12']);
    expect(agruparAgendaIS([])).toEqual([]);
  });
  it('o período só filtra as IS com data de entrevista', () => {
    const mes = { inicio: '2026-11-01', fim: '2026-11-30' };
    expect(passaNoPeriodo({ dataEntrevista: '' }, mes)).toBe(true);
    expect(passaNoPeriodo({ dataEntrevista: '2026-11-15T08:00' }, mes)).toBe(true);
    expect(passaNoPeriodo({ dataEntrevista: '2026-12-01T08:00' }, mes)).toBe(false);
  });
});
