import { describe, expect, it } from 'vitest';
import { ehMinhaPericia, erroJustificativaExclusao, podeExcluirPericia } from '../exclusaoPericia';

describe('exclusão de perícia menor', () => {
  const p = { peritoUid: 'med1', criadoPor: 'adm' };
  it('Admin exclui qualquer uma; médico só a sua (perito ou quem registrou)', () => {
    expect(podeExcluirPericia(p, { uid: 'adm', perfil: 'admin' })).toBe(true);
    expect(podeExcluirPericia(p, { uid: 'outro', perfil: 'admin' })).toBe(true);
    expect(podeExcluirPericia(p, { uid: 'med1', perfil: 'user_medicos' })).toBe(true);
    expect(podeExcluirPericia({ peritoUid: 'x', criadoPor: 'med2' }, { uid: 'med2', perfil: 'user_medicos_geral' })).toBe(true);
    expect(podeExcluirPericia(p, { uid: 'med3', perfil: 'user_medicos' })).toBe(false);
    expect(podeExcluirPericia(p, null)).toBe(false);
  });
  it('justificativa obrigatória (≥ 10 caracteres) fora do Admin', () => {
    expect(erroJustificativaExclusao('', 'admin')).toBe('');
    expect(erroJustificativaExclusao('', 'user_medicos')).toMatch(/justificativa/);
    expect(erroJustificativaExclusao('  curto   ', 'user_medicos')).toMatch(/10/);
    expect(erroJustificativaExclusao('Registro em duplicidade', 'user_medicos')).toBe('');
  });
  it('"Minhas" = perito responsável', () => {
    expect(ehMinhaPericia(p, 'med1')).toBe(true);
    expect(ehMinhaPericia(p, 'adm')).toBe(false);
    expect(ehMinhaPericia(p, undefined)).toBe(false);
  });
});
