import { describe, it, expect } from 'vitest';
import { idadeEmAnos } from '../format';

describe('idadeEmAnos', () => {
  it('conta anos completos até a data de referência', () => {
    expect(idadeEmAnos('1988-03-15', '2026-11-12')).toBe(38);
    expect(idadeEmAnos('1988-11-12', '2026-11-12')).toBe(38);
    expect(idadeEmAnos('1988-11-13', '2026-11-12')).toBe(37);
  });
  it('sem data, data inválida ou futura → null', () => {
    expect(idadeEmAnos(undefined)).toBeNull();
    expect(idadeEmAnos('15/03/1988')).toBeNull();
    expect(idadeEmAnos('2030-01-01', '2026-11-12')).toBeNull();
  });
});
