import { describe, expect, it } from 'vitest';
import {
  bloqueioNoDia, cabeNoTurno, chaveSlot, chavesOcupadas, diasEntre, duracaoDoGrupo, slotsCobertos, slotsDoTurno,
  statusEfetivoIS, tisValido, turnoDoSlot,
} from '../inspecoes';
import { cpfValido, extrairNomeInspecionado, formatCelular, formatNip } from '../format';

describe('prazos das IS', () => {
  it('conta dias corridos', () => {
    expect(diasEntre('2026-10-01', '2026-10-31')).toBe(30);
    expect(diasEntre('', '2026-10-31')).toBe(0);
  });
  it('aberta sem entrevista vira "atrasada" após 7 dias (60 em Benefícios)', () => {
    const base = { status: 'aberta' as const, dataAbertura: '2026-10-20' };
    expect(statusEfetivoIS(base, '2026-10-27')).toBe('aberta');
    expect(statusEfetivoIS(base, '2026-10-28')).toBe('atrasada');
    expect(statusEfetivoIS({ ...base, grupoFinalidade: 'Benefícios' }, '2026-10-28')).toBe('aberta');
    expect(statusEfetivoIS({ ...base, dataEntrevista: '2026-11-01T08:00' }, '2026-12-01')).toBe('aberta');
  });
});

describe('agenda', () => {
  it('slots de 20 min por turno', () => {
    expect(slotsDoTurno('manha')[0]).toBe('07:30');
    expect(turnoDoSlot('13:20')).toBe('tarde');
    expect(turnoDoSlot('12:30')).toBeNull();
  });
  it('a duração depende do grupo da finalidade', () => {
    expect(duracaoDoGrupo('Benefícios')).toBe(60);
    expect(duracaoDoGrupo('Verificações e Términos')).toBe(30);
    expect(duracaoDoGrupo('Outra')).toBe(20);
  });
  it('a IS ocupa todos os slots que toca e precisa caber no turno', () => {
    expect(slotsCobertos('08:00', 60)).toEqual(['08:00', '08:20', '08:40']);
    expect(cabeNoTurno('11:20', 60)).toBe(false);
    expect(cabeNoTurno('11:00', 60)).toBe(true);
    expect(chaveSlot('p1', '2026-11-03T08:00')).toBe('p1__2026-11-03T08-00');
    expect(chavesOcupadas('p1', '2026-11-03T08:00', 30)).toEqual(['p1__2026-11-03T08-00', 'p1__2026-11-03T08-20']);
  });
  it('bloqueio de período vale do início ao fim', () => {
    const b = { data: '2026-11-03', dataFim: '2026-11-05' };
    expect(bloqueioNoDia(b, '2026-11-04')).toBe(true);
    expect(bloqueioNoDia(b, '2026-11-06')).toBe(false);
  });
  it('valida o Nº do TIS', () => {
    expect(tisValido('026.000.123')).toBe(true);
    expect(tisValido('026.001.123')).toBe(false);
  });
});

describe('formatação', () => {
  it('NIP, celular e nome do inspecionado', () => {
    expect(formatNip('12345678')).toBe('12.3456.78');
    expect(formatCelular('81987654321')).toBe('(81) 98765-4321');
    expect(extrairNomeInspecionado('CT (Md) 12.3456.78 FULANO DE TAL')).toBe('FULANO DE TAL');
  });
  it('dígitos verificadores do CPF', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
  });
});
