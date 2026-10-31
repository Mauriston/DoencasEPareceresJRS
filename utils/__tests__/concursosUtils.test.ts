import { describe, expect, it } from 'vitest';
import {
  aplicarPontuacao, calcularDiasUteis, candidatoEstaFinalizado, distribuirCandidatosNasDatas, extrairNomeConcurso,
  formatarChaveData, formatarDataMilitar, isAtrasada, numeroItemLista, paraDataBR, paraDataISO, parseCsvGenerico,
} from '../concursosUtils';

describe('finalização da IS', () => {
  it('exige status com laudo e Nº TIS', () => {
    expect(candidatoEstaFinalizado('APTO', '026.000.1')).toBe(true);
    expect(candidatoEstaFinalizado('APTO', '')).toBe(false);
    expect(candidatoEstaFinalizado('Pendente', '026.000.1')).toBe(false);
  });
  it('Inapto e IDM também exigem Observações', () => {
    expect(candidatoEstaFinalizado('INAPTO', '026.000.1', '')).toBe(false);
    expect(candidatoEstaFinalizado('INAPTO', '026.000.1', 'R62.8')).toBe(true);
    expect(candidatoEstaFinalizado('INSUF DOCUMENTAL', '026.000.1', 'EAS')).toBe(true);
  });
});

describe('IS atrasada', () => {
  it('agendada antes de hoje e não finalizada', () => {
    expect(isAtrasada({ dataAgendamento: '2026-10-30', finalizado: false }, '2026-10-31')).toBe(true);
    expect(isAtrasada({ dataAgendamento: '2026-10-30', finalizado: true }, '2026-10-31')).toBe(false);
    expect(isAtrasada({ dataAgendamento: '2026-10-31', finalizado: false }, '2026-10-31')).toBe(false);
    expect(isAtrasada({ dataAgendamento: '', finalizado: false }, '2026-10-31')).toBe(false);
  });
});

describe('datas', () => {
  it('formata a data militar e a chave AAAA-MM-DD', () => {
    expect(formatarDataMilitar(new Date(2026, 9, 13))).toBe('13OUT2026');
    expect(formatarChaveData(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('converte entre DD/MM/AAAA e AAAA-MM-DD', () => {
    expect(paraDataISO('5/1/2026')).toBe('2026-01-05');
    expect(paraDataISO('2026-01-05')).toBe('2026-01-05');
    expect(paraDataBR('2026-01-05')).toBe('05/01/2026');
  });
  it('dias úteis pulam fim de semana e feriados nacionais', () => {
    // 02/11/2026 (segunda) é Finados; 07–08/11 é fim de semana.
    const dias = calcularDiasUteis(new Date(2026, 10, 2), new Date(2026, 10, 9)).map(formatarChaveData);
    expect(dias).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09']);
  });
});

describe('agendamento e minutas', () => {
  it('distribui os candidatos pelas datas, enchendo cada dia antes do próximo', () => {
    const cands = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, nome: id }));
    const datas = [{ data: '2026-11-03', diaSemana: 'Terça' }, { data: '2026-11-04', diaSemana: 'Quarta' }, { data: '2026-11-05', diaSemana: 'Quinta' }];
    const r = distribuirCandidatosNasDatas(cands, datas, 2);
    expect(r.map(g => g.candidatos.map(c => c.id))).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });
  it('pontua listas: ";", "; e" e "."', () => {
    expect(aplicarPontuacao(['A', 'B', 'C'], false)).toEqual(['A;', 'B; e', 'C.']);
    expect(aplicarPontuacao(['A'], true)).toEqual(['A']);
  });
  it('numera itens por extenso (UNO, DOIS...)', () => {
    expect(numeroItemLista(1)).toBe('UNO');
    expect(numeroItemLista(2)).toBe('DOIS');
  });
  it('extrai o identificador do concurso do assunto', () => {
    expect(extrairNomeConcurso('IS DE INGRESSO - CPAEAM/2026 - AGENDAMENTO')).toBe('CPAEAM/2026');
  });
});

describe('CSV', () => {
  it('respeita aspas, vírgulas e quebras de linha internas', () => {
    expect(parseCsvGenerico('a,b\n"x, y","linha1\nlinha2"\n\n')).toEqual([['a', 'b'], ['x, y', 'linha1\nlinha2']]);
  });
});
