import { describe, it, expect } from 'vitest';
import { juntarFinalidades, finalidadesDaIS, alternarFinalidade, alinharLaudos, laudoComposto, laudosDaIS } from '../finalidadesMultiplas';

describe('finalidades múltiplas', () => {
  it('junta com " / " e lê docs antigos sem dividir', () => {
    expect(juntarFinalidades(['Engajamento', 'Deixar o SMI'])).toBe('Engajamento / Deixar o SMI');
    expect(finalidadesDaIS({ finalidade: 'Ingresso SAM / SMV' })).toEqual(['Ingresso SAM / SMV']);
    expect(finalidadesDaIS({ finalidade: 'A / B', finalidades: ['A', 'B'] })).toEqual(['A', 'B']);
  });
  it('alterna finalidade', () => {
    expect(alternarFinalidade(['A'], 'B')).toEqual(['A', 'B']);
    expect(alternarFinalidade(['A', 'B'], 'A')).toEqual(['B']);
  });
  it('laudo composto só com todos os laudos', () => {
    const l = alinharLaudos(['A', 'B'], [{ finalidade: 'A', laudo: 'x' }, { finalidade: 'C', laudo: 'z' }]);
    expect(l).toEqual([{ finalidade: 'A', laudo: 'x' }, { finalidade: 'B', laudo: '' }]);
    expect(laudoComposto(l)).toBe('');
    expect(laudoComposto([{ finalidade: 'a', laudo: 'x' }, { finalidade: 'b', laudo: 'y' }])).toBe('A: x\n\nB: y');
    expect(laudoComposto([{ finalidade: 'a', laudo: ' x ' }])).toBe('x');
  });
  it('doc antigo com uma finalidade usa o laudo existente', () => {
    expect(laudosDaIS({ finalidade: 'A', laudo: 'apto' })).toEqual([{ finalidade: 'A', laudo: 'apto' }]);
  });
});
