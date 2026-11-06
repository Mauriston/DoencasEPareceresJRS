import { describe, it, expect } from 'vitest';
import { limitarDias, periciasNaJanela, saldoAcumulado, mascaraDataBR } from '../periciaMenorRegras';

describe('limitarDias', () => {
  it('limita a 20 e avisa', () => {
    expect(limitarDias('25', 20)).toEqual({ valor: '20', cortado: true });
    expect(limitarDias('7 dias', 20)).toEqual({ valor: '7', cortado: false });
    expect(limitarDias('45')).toEqual({ valor: '45', cortado: false });
    expect(limitarDias('0', 20)).toEqual({ valor: '1', cortado: false });
    expect(limitarDias('', 20)).toEqual({ valor: '', cortado: false });
  });
});

describe('acúmulo de 30 dias', () => {
  const hoje = '2026-11-20';
  const lista = [
    { dataTermino: '2026-11-25', tempoHomologado: 10 }, // vigente
    { dataTermino: '2026-11-10', tempoHomologado: 5 },  // concluída há 10 dias: conta
    { dataTermino: '2026-11-09', tempoHomologado: 8 },  // há 11 dias: não conta
  ];
  it('considera vigentes e concluídas há até 10 dias', () => {
    expect(periciasNaJanela(lista, hoje)).toHaveLength(2);
    expect(saldoAcumulado(lista, hoje)).toEqual({ usados: 15, restante: 15, quantidade: 2 });
  });
  it('sem histórico, cabem 30', () => {
    expect(saldoAcumulado([], hoje)).toEqual({ usados: 0, restante: 30, quantidade: 0 });
  });
});

describe('mascaraDataBR', () => {
  it('formata enquanto digita', () => {
    expect(mascaraDataBR('0711')).toBe('07/11');
    expect(mascaraDataBR('07112026')).toBe('07/11/2026');
    expect(mascaraDataBR('07/11/20261')).toBe('07/11/2026');
  });
});
