import { describe, it, expect } from 'vitest';
import {
  normalizarTexto, formaCanonica, rotuloECanonico, normalizarNip, nipValido, formatarNip,
  lerBooleano, comoBooleano, dataCivilISO, dataCivilParaBR, parseTimestamp, timestampISO, hojeISO,
  inteiroEmFaixa, diasInteiro, novoId,
} from '../dados';

describe('strings', () => {
  it('normaliza espaços e forma canônica', () => {
    expect(normalizarTexto('  Ação   Médica ')).toBe('Ação Médica');
    expect(normalizarTexto(null)).toBe('');
    expect(formaCanonica(' AÇÃO  Médica ')).toBe('acao medica');
    expect(rotuloECanonico(' Pós-Op ')).toEqual({ rotulo: 'Pós-Op', canonico: 'pos-op' });
  });
});

describe('NIP', () => {
  it('só dígitos, preserva zeros', () => {
    expect(normalizarNip('01.2345.67')).toBe('01234567');
    expect(normalizarNip(' 00012345 ')).toBe('00012345');
    expect(normalizarNip(1234567)).toBe('01234567');
    expect(normalizarNip(undefined)).toBe('');
    expect(nipValido('01.2345.67')).toBe(true);
    expect(nipValido('123')).toBe(false);
    expect(formatarNip('01234567')).toBe('01.2345.67');
    expect(formatarNip('abc')).toBe('abc');
  });
});

describe('booleanos', () => {
  it('lê legados e persiste boolean', () => {
    for (const v of ['SIM', 'sim', 'TRUE', 'true', 'Verdadeiro', '1', 1, true]) expect(lerBooleano(v)).toBe(true);
    for (const v of ['NÃO', 'nao', 'FALSE', 'falso', '0', 0, false, '', null, undefined]) expect(lerBooleano(v)).toBe(false);
    expect(lerBooleano('talvez')).toBeNull();
    expect(lerBooleano(2)).toBeNull();
    expect(comoBooleano('talvez')).toBe(false);
    expect(comoBooleano('talvez', true)).toBe(true);
    expect(comoBooleano('SIM')).toBe(true);
  });
});

describe('datas civis', () => {
  it('aceita ISO e dd/mm/aaaa reais', () => {
    expect(dataCivilISO('2026-10-31')).toBe('2026-10-31');
    expect(dataCivilISO('31/10/2026')).toBe('2026-10-31');
    expect(dataCivilISO('1/2/2026')).toBe('2026-02-01');
    expect(dataCivilISO('29/02/2028')).toBe('2028-02-29');
  });
  it('rejeita inexistentes e ambíguas', () => {
    expect(dataCivilISO('29/02/2026')).toBeNull();
    expect(dataCivilISO('2026-13-01')).toBeNull();
    expect(dataCivilISO('10/31/26')).toBeNull();
    expect(dataCivilISO('')).toBeNull();
    expect(dataCivilISO(42)).toBeNull();
  });
  it('Date e timestamp usam o fuso de Recife (UTC-3)', () => {
    expect(dataCivilISO(new Date('2026-11-01T01:00:00Z'))).toBe('2026-10-31');
    expect(dataCivilISO('2026-11-01T01:00:00Z')).toBe('2026-10-31');
    expect(hojeISO(new Date('2026-11-01T02:59:00Z'))).toBe('2026-10-31');
    expect(dataCivilParaBR('2026-10-31')).toBe('31/10/2026');
    expect(dataCivilParaBR('x')).toBe('');
  });
});

describe('timestamps', () => {
  it('serializa com offset -03:00', () => {
    expect(timestampISO(new Date('2026-10-31T12:30:15Z'))).toBe('2026-10-31T09:30:15-03:00');
    expect(timestampISO(new Date('2026-01-01T02:00:00Z'))).toBe('2025-12-31T23:00:00-03:00');
  });
  it('parse sem ambiguidade', () => {
    expect(parseTimestamp('2026-10-31T09:30:15-03:00')?.toISOString()).toBe('2026-10-31T12:30:15.000Z');
    expect(parseTimestamp('2026-10-31T12:30:15Z')?.toISOString()).toBe('2026-10-31T12:30:15.000Z');
    expect(parseTimestamp('2026-10-31T09:30')?.toISOString()).toBe('2026-10-31T12:30:00.000Z');
    expect(parseTimestamp('2026-10-31 09:30:00')?.toISOString()).toBe('2026-10-31T12:30:00.000Z');
    expect(parseTimestamp('31/10/2026 09:30')?.toISOString()).toBe('2026-10-31T12:30:00.000Z');
    expect(parseTimestamp('31/10/2026')?.toISOString()).toBe('2026-10-31T03:00:00.000Z');
    expect(parseTimestamp('31/02/2026')).toBeNull();
    expect(parseTimestamp('2026-10-31T25:00')).toBeNull();
    expect(parseTimestamp('ontem')).toBeNull();
  });
  it('ida e volta', () => {
    const d = new Date('2026-10-31T12:30:15Z');
    expect(parseTimestamp(timestampISO(d))?.getTime()).toBe(d.getTime());
  });
});

describe('inteiros', () => {
  it('valida sinal e faixa', () => {
    expect(inteiroEmFaixa('12')).toBe(12);
    expect(inteiroEmFaixa('-3')).toBe(-3);
    expect(inteiroEmFaixa(' +4 ')).toBe(4);
    expect(inteiroEmFaixa('1.5')).toBeNull();
    expect(inteiroEmFaixa(1.5)).toBeNull();
    expect(inteiroEmFaixa('abc')).toBeNull();
    expect(inteiroEmFaixa('')).toBeNull();
    expect(inteiroEmFaixa(NaN)).toBeNull();
    expect(inteiroEmFaixa(11, 0, 10)).toBeNull();
    expect(diasInteiro('30')).toBe(30);
    expect(diasInteiro('-1')).toBeNull();
    expect(diasInteiro(40000)).toBeNull();
  });
});

describe('ids', () => {
  it('gera UUID v4 distintos', () => {
    const a = novoId(), b = novoId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
