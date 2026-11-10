import { describe, it, expect } from 'vitest';
import { podeArrastarIS, abertasNaoAgendadas, abertaAtrasada, finalidadeSemGrupo, nomeCurtoInspecionado, rotuloDiasEmAberto, semanasUteisDoMes, ehISDeConcurso } from '../calendarioIS';
import type { StatusIS } from '../inspecoes';

describe('podeArrastarIS', () => {
  const base = { status: 'agendada' as StatusIS, situacao: 'andamento', dataEntrevista: '2026-11-12T08:00', laudo: '', tis: '', ds1a: '', finalidade: 'Controle Trienal', grupoFinalidade: 'Verificações e Términos' };
  it('agendada sem laudo, TIS nem DS-1a: arrasta', () => {
    expect(podeArrastarIS(base)).toBe(true);
    expect(podeArrastarIS({ ...base, status: 'reagendada' })).toBe(true);
    expect(podeArrastarIS({ ...base, status: 'parecer_solicitado' })).toBe(true);
  });
  it('com laudo, TIS ou DS-1a: não arrasta', () => {
    expect(podeArrastarIS({ ...base, laudo: 'Apto' })).toBe(false);
    expect(podeArrastarIS({ ...base, tis: '026.000.1' })).toBe(false);
    expect(podeArrastarIS({ ...base, ds1a: 'x' })).toBe(false);
    expect(podeArrastarIS({ ...base, laudo: '   ' })).toBe(true);
  });
  it('faltou, cancelada, finalizada, sem entrevista ou de concurso: não arrasta', () => {
    expect(podeArrastarIS({ ...base, status: 'faltou' })).toBe(false);
    expect(podeArrastarIS({ ...base, status: 'cancelada' })).toBe(false);
    expect(podeArrastarIS({ ...base, status: 'tis_assinado' })).toBe(false);
    expect(podeArrastarIS({ ...base, situacao: 'finalizada' })).toBe(false);
    expect(podeArrastarIS({ ...base, dataEntrevista: '' })).toBe(false);
    expect(podeArrastarIS({ ...base, finalidade: 'Concurso público (CP-CEM)' })).toBe(false);
    expect(ehISDeConcurso({ grupoFinalidade: 'Concursos' })).toBe(true);
  });
});

describe('abertasNaoAgendadas', () => {
  const is = (id: string, n: number, dataAbertura: string, extra: Record<string, unknown> = {}) => ({ id, is: n, status: 'aberta' as StatusIS, dataAbertura, dataEntrevista: '', ...extra });
  it('só abertas sem entrevista, das com mais dias em aberto para as mais novas (empate pelo nº)', () => {
    const lista = [
      is('a', 10, '2026-11-09'),
      is('b', 11, '2026-10-01'),
      is('c', 9, '2026-11-09'),
      is('d', 12, '2026-10-01', { dataEntrevista: '2026-11-12T08:00' }),
      is('e', 13, '2026-09-01', { status: 'agendada' }),
    ];
    expect(abertasNaoAgendadas(lista, '2026-11-10').map(i => i.id)).toEqual(['b', 'c', 'a']);
  });
  it('atrasada conforme o prazo do grupo', () => {
    expect(abertaAtrasada(is('a', 1, '2026-11-01'), '2026-11-10')).toBe(true);
    expect(abertaAtrasada(is('a', 1, '2026-11-01', { grupoFinalidade: 'Benefícios' }), '2026-11-10')).toBe(false);
    expect(abertaAtrasada(is('a', 1, '2026-11-05'), '2026-11-10')).toBe(false);
  });
});

describe('textos do cartão', () => {
  it('finalidade sem o grupo', () => {
    expect(finalidadeSemGrupo('Benefícios — Reforma', 'Benefícios')).toBe('Reforma');
    expect(finalidadeSemGrupo('Benefícios: Reforma', 'Benefícios')).toBe('Reforma');
    expect(finalidadeSemGrupo('Controle Trienal', 'Verificações e Términos')).toBe('Controle Trienal');
    expect(finalidadeSemGrupo('Benefícios', 'Benefícios')).toBe('Benefícios');
  });
  it('nome curto e dias', () => {
    expect(nomeCurtoInspecionado('1T (IM) 44.4444.44 PACIENTE DE TESTE')).toBe('PACIENTE DE TESTE');
    expect(nomeCurtoInspecionado('SEM NIP')).toBe('SEM NIP');
    expect(rotuloDiasEmAberto(1)).toBe('1 dia');
    expect(rotuloDiasEmAberto(0)).toBe('0 dias');
  });
});

describe('semanasUteisDoMes', () => {
  it('novembro/2026 (começa num domingo): semanas seg–sex, sem fim de semana', () => {
    const s = semanasUteisDoMes('2026-11-10');
    expect(s.every(sem => sem.length === 5)).toBe(true);
    expect(s[0]).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
    expect(s).toHaveLength(5);
    // 1º/11 é domingo: a primeira semana não tem dia útil de novembro e cai fora.
    expect(s.flat()).not.toContain('2026-10-30');
  });
  it('mês que começa no sábado não abre com semana vazia', () => {
    // agosto/2026 começa num sábado
    const s = semanasUteisDoMes('2026-08-15');
    expect(s[0][0]).toBe('2026-08-03');
    expect(s.at(-1)).toEqual(['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
  });
  it('todos os dias da grade são seg–sex', () => {
    semanasUteisDoMes('2026-02-01').flat().forEach(d => { const w = new Date(`${d}T12:00`).getDay(); expect(w >= 1 && w <= 5).toBe(true); });
  });
});
