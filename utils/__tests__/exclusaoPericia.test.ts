import { describe, expect, it } from 'vitest';
import { dataTerminoPericia, ehMinhaPericia, erroJustificativaExclusao, patchEdicaoPericia, podeExcluirPericia } from '../exclusaoPericia';

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

describe('edição de perícia menor', () => {
  const base = { cid: 'M545 - Dor lombar baixa', cidCodigo: 'm545', dispensas: ['TODAS AS ATIVIDADES'], dataAtestado: '2026-11-10', tempoAtestado: 5, tempoHomologado: 5, homologacao: false, medicoEmissor: 'X', crmEmissor: 'Y', vdf: false };
  it('recalcula o término e limpa o emissor fora da homologação', () => {
    const r = patchEdicaoPericia(base, false);
    expect(r.erro).toBeUndefined();
    expect(r.patch).toMatchObject({ dataTermino: '2026-11-14', cidCodigo: 'M545', medicoEmissor: '', crmEmissor: '' });
  });
  it('só o Admin troca o perito', () => {
    expect(patchEdicaoPericia({ ...base, peritoUid: 'p2' }, false).patch).not.toHaveProperty('peritoUid');
    expect(patchEdicaoPericia({ ...base, peritoUid: 'p2' }, true).patch).toMatchObject({ peritoUid: 'p2' });
  });
  it('recusa dados inválidos', () => {
    expect(patchEdicaoPericia({ ...base, dataAtestado: '10/11/2026' }, true).erro).toMatch(/Data/);
    expect(patchEdicaoPericia({ ...base, dispensas: [] }, true).erro).toMatch(/dispensa/);
    expect(patchEdicaoPericia({ ...base, tempoHomologado: 0 }, true).erro).toMatch(/tempo/);
  });
  it('término: o dia do atestado é o 1º', () => {
    expect(dataTerminoPericia('2026-11-30', 2)).toBe('2026-12-01');
  });
});
