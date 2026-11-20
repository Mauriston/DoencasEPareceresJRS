import { describe, it, expect } from 'vitest';
import { codigoCidDaPericia, especialidadePorCapitulo } from '../especialidadePericia';

describe('especialidadePorCapitulo', () => {
  it.each([
    ['M545', 'Ortopedia'], ['F32', 'Psiquiatria'], ['G432', 'Neurologia'], ['O200', 'Gineco-Obstetrícia'],
    ['H10', 'Oftalmologia'], ['H66', 'Otorrino'], ['I10', 'Cardiologia'], ['C50', 'Oncologia'],
    ['K40', 'Cirurgia Geral'], ['A09', 'Clínica Médica'], ['S62', 'Ortopedia'],
  ])('%s → %s', (c, e) => expect(especialidadePorCapitulo(c)).toBe(e));
  it('lê o código do rótulo antigo', () => expect(codigoCidDaPericia({ cid: 'M54.5 - Dor lombar baixa' })).toBe('M545'));
});
