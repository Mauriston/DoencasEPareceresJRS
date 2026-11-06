import { describe, it, expect } from 'vitest';
import { emailInstitucionalValido } from '../emails';

describe('emailInstitucionalValido', () => {
  it('aceita vazio e @marinha.mil.br', () => {
    expect(emailInstitucionalValido('')).toBe(true);
    expect(emailInstitucionalValido(undefined)).toBe(true);
    expect(emailInstitucionalValido(' Fulano.Tal@Marinha.mil.br ')).toBe(true);
  });
  it('recusa outros domínios', () => {
    expect(emailInstitucionalValido('pablocpf@2tail.com')).toBe(false);
    expect(emailInstitucionalValido('fulano@gmail.com')).toBe(false);
    expect(emailInstitucionalValido('fulano@marinha.mil.br.com')).toBe(false);
    expect(emailInstitucionalValido('@marinha.mil.br')).toBe(false);
  });
});
