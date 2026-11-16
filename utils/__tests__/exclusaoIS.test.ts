import { describe, expect, it } from 'vitest';
import { caminhoPdfParecer, motivoNaoExcluir, prefixosStorageIS } from '../exclusaoIS';
import { featurePermitida } from '../../config/permissoesPadrao';

describe('exclusão da IS', () => {
  it('Admin exclui qualquer IS; com a função, só IS não finalizada', () => {
    expect(motivoNaoExcluir({ perfil: 'admin', temFuncao: true, situacao: 'finalizada' })).toBe('');
    expect(motivoNaoExcluir({ perfil: 'user_secretaria', temFuncao: true, situacao: 'andamento' })).toBe('');
    expect(motivoNaoExcluir({ perfil: 'user_secretaria', temFuncao: true, situacao: 'finalizada' })).toMatch(/finalizada/);
    expect(motivoNaoExcluir({ perfil: 'user_medicos', temFuncao: false, situacao: 'andamento' })).toMatch(/permissão/);
  });
  it('padrão da função inspecoes.excluir: Admin e Secretaria', () => {
    expect(featurePermitida(null, 'inspecoes.excluir', 'user_secretaria')).toBe(true);
    expect(featurePermitida(null, 'inspecoes.excluir', 'user_medicos')).toBe(false);
    expect(featurePermitida(null, 'inspecoes.excluir', 'admin')).toBe(true);
    expect(featurePermitida({ features: { 'inspecoes.excluir': { user_medicos: true } } }, 'inspecoes.excluir', 'user_medicos')).toBe(true);
  });
  it('padrões de Reabrir (Admin e Secretaria) e Gravar entrevista (só Admin)', () => {
    expect(featurePermitida(null, 'inspecoes.reabrir', 'user_secretaria')).toBe(true);
    expect(featurePermitida(null, 'inspecoes.reabrir', 'user_medicos')).toBe(false);
    expect(featurePermitida(null, 'inspecoes.gravarEntrevista', 'user_medicos')).toBe(false);
    expect(featurePermitida(null, 'inspecoes.gravarEntrevista', 'admin')).toBe(true);
  });
  it('caminhos do Storage', () => {
    expect(prefixosStorageIS('1312')).toEqual(['inspecoes/1312/', 'entrevistas/1312/']);
    expect(caminhoPdfParecer('abc')).toBe('pareceres/abc.pdf');
  });
});
