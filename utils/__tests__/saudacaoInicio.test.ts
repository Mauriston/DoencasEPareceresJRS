import { describe, expect, it } from 'vitest';
import { nomeDeGuerra, saudacaoDoMomento, saudacaoInicio } from '../saudacaoInicio';

describe('saudação da Início', () => {
  it('nome de guerra sem posto nem quadro', () => {
    expect(nomeDeGuerra('2T PAES')).toBe('PAES');
    expect(nomeDeGuerra('CT (Md) MAURISTON')).toBe('MAURISTON');
    expect(nomeDeGuerra('GM (RM2-S) Fulano')).toBe('FULANO');
    expect(nomeDeGuerra('OLIVEIRA')).toBe('OLIVEIRA');
    expect(nomeDeGuerra('')).toBe('');
  });
  it('dia útil pelo horário; sábado, domingo e feriado têm saudação própria', () => {
    expect(saudacaoDoMomento(new Date(2026, 10, 19, 9))).toBe('bom dia'); // quinta
    expect(saudacaoDoMomento(new Date(2026, 10, 19, 14))).toBe('boa tarde');
    expect(saudacaoDoMomento(new Date(2026, 10, 19, 21))).toBe('boa noite');
    expect(saudacaoDoMomento(new Date(2026, 10, 21, 10))).toBe('bom sábado');
    expect(saudacaoDoMomento(new Date(2026, 10, 22, 10))).toBe('bom domingo');
    expect(saudacaoDoMomento(new Date(2026, 8, 7, 10))).toBe('bom feriado'); // 7 de setembro
  });
  it('monta a frase', () => {
    expect(saudacaoInicio('2T PAES', new Date(2026, 10, 19, 21))).toBe('PAES, boa noite!');
    expect(saudacaoInicio('', new Date(2026, 10, 19, 9))).toBe('Bom dia!');
  });
});
