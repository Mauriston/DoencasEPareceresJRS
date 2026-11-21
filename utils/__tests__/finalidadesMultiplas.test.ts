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

import fs from 'node:fs';
import path from 'node:path';
import { acharFinalidades } from '../importacaoIS';
import { FINALIDADES_COMPOSTAS, GRUPO_COMPOSTAS } from '../finalidadesCompostas';
import type { GrupoFinalidadeIS } from '../corposQuadros';

const grupos: GrupoFinalidadeIS[] = [
  ...(JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/finalidadesIS.json'), 'utf8')) as { grupos: GrupoFinalidadeIS[] }).grupos,
  { grupo: GRUPO_COMPOSTAS, finalidades: FINALIDADES_COMPOSTAS },
];

describe('finalidades do SINAIS', () => {
  it('Benefícios: prefixo "BENEFÍCIO:" e várias finalidades separadas por vírgula', () => {
    const r = acharFinalidades('BENEFÍCIO: PREEXISTÊNCIA DE DOENÇA ESPECIFICADA EM LEI , ISENÇÃO DE PAGAMENTO DE IMPOSTO DE RENDA', grupos);
    expect(r.map(f => f.finalidade)).toEqual(['Preexistência de doença especificada em lei', 'Isenção de pagamento de imposto de renda']);
    expect(r.every(f => f.grupo === 'Benefícios')).toBe(true);
  });
  it('Benefícios: variantes "- CIVIL" e "- MILITAR" do SINAIS', () => {
    expect(acharFinalidades('BENEFÍCIO - ISENÇÃO DE PAGAMENTO DE IMPOSTO DE RENDA CIVIL', grupos)[0]?.finalidade).toBe('Isenção de pagamento de imposto de renda civil');
    expect(acharFinalidades('BENEFÍCIO - AUXÍLIO-INVALIDEZ DE MILITAR INATIVO', grupos)[0]?.finalidade).toBe('Auxílio-invalidez de militar inativo');
  });
  it('composta: uma finalidade, regras de Verificações e Términos, um laudo por parte', () => {
    const r = acharFinalidades('DEIXAR O SAM / VDF OU TR OU TI', grupos);
    expect(r).toEqual([{ finalidade: 'Deixar o SAM / VDF ou TR ou TI', grupo: 'Verificações e Términos', amp: 'JRS' }]);
    expect(laudosDaIS({ finalidade: 'Engajamento / Deixar o SMI / VDF ou TR' }).map(l => l.finalidade)).toEqual(['Engajamento', 'Deixar o SMI', 'VDF ou TR']);
  });
});
