// Regras puras da Administração (utils/administracao.ts).
import { describe, expect, it } from 'vitest';
import { DEFAULT_FEATURE_PERMISSIONS, DEFAULT_PAGE_PERMISSIONS, FEATURE_DEFS, PAGE_DEFS } from '../../config/permissions';
import {
  AREAS, alternarFuncao, alternarPagina, diferencasPermissoes, diferencasTurnos, paginaLigada, partirRotulo,
  resumoPermissoes, semAcessoHa, ultimoAcessoRelativo, type Matriz,
} from '../administracao';

const matriz = (): Matriz => JSON.parse(JSON.stringify({ pages: DEFAULT_PAGE_PERMISSIONS, features: DEFAULT_FEATURE_PERMISSIONS }));

describe('permissões por área', () => {
  it('todas as páginas e funções aparecem uma vez', () => {
    const paginas = AREAS.flatMap(a => a.paginas.map(p => p.id));
    expect(new Set(paginas).size).toBe(PAGE_DEFS.length);
    const funcoes = AREAS.flatMap(a => a.paginas.flatMap(p => p.funcoes.map(f => f.id)));
    expect(new Set(funcoes).size).toBe(FEATURE_DEFS.length);
  });

  it('separa o rótulo da explicação entre parênteses', () => {
    expect(partirRotulo('Cancelar IS (menu ⋮ da IS)')).toEqual({ rotulo: 'Cancelar IS', ajuda: 'Menu ⋮ da IS' });
    expect(partirRotulo('Reagendar candidato')).toEqual({ rotulo: 'Reagendar candidato', ajuda: '' });
  });

  it('desligar a página desliga as funções dela', () => {
    const m = alternarPagina(matriz(), 'inspecoes', 'user_secretaria', false);
    expect(m.pages.inspecoes.user_secretaria).toBe(false);
    expect(m.features['inspecoes.cadastrar'].user_secretaria).toBe(false);
    expect(m.features['inspecoes.cadastrar'].user_medicos).toBe(true);
  });

  it('Perícia Menor liga/desliga as duas abas', () => {
    const m = alternarPagina(matriz(), 'pericia-menor', 'user_medicos', false);
    expect(paginaLigada(m, 'pericia-menor', 'user_medicos')).toBe(false);
    expect(m.features['pericia-menor.historico'].user_medicos).toBe(false);
  });

  it('diferença e resumo com o impacto', () => {
    const salvo = matriz();
    const r = alternarFuncao(salvo, 'inspecoes.cadastrar', 'user_medicos', false);
    const d = diferencasPermissoes(salvo, r);
    expect(d).toHaveLength(1);
    expect(d[0].rotulo).toBe('Inspeções de Saúde › Cadastrar nova IS');
    expect(resumoPermissoes(d, { user_medicos: 8 })).toBe('1 alteração em User Médicos: Inspeções de Saúde › Cadastrar nova IS desligado · afeta 8 usuários');
    expect(diferencasPermissoes(salvo, salvo)).toHaveLength(0);
  });
});

describe('último acesso', () => {
  const agora = new Date(2026, 10, 14, 14, 40);
  it('texto relativo', () => {
    expect(ultimoAcessoRelativo(null, agora)).toBe('nunca');
    expect(ultimoAcessoRelativo(new Date(2026, 10, 14, 14, 39), agora)).toBe('agora');
    expect(ultimoAcessoRelativo(new Date(2026, 10, 14, 14, 28), agora)).toBe('há 12 min');
    expect(ultimoAcessoRelativo(new Date(2026, 10, 14, 11, 20), agora)).toBe('hoje 11:20');
    expect(ultimoAcessoRelativo(new Date(2026, 10, 13, 9, 0), agora)).toBe('ontem');
    expect(ultimoAcessoRelativo(new Date(2026, 10, 5, 9, 0), agora)).toBe('há 9 dias');
  });
  it('sem acesso há 30 dias', () => {
    expect(semAcessoHa(null, 30, agora)).toBe(true);
    expect(semAcessoHa(new Date(2026, 9, 1), 30, agora)).toBe(true);
    expect(semAcessoHa(new Date(2026, 10, 1), 30, agora)).toBe(false);
  });
});

describe('turnos', () => {
  it('lista só o que mudou', () => {
    const d = diferencasTurnos({ a: { '1': { manha: true } } }, { a: { '1': { manha: true, tarde: true } }, b: { '2': { manha: false } } });
    expect(d).toEqual([{ uid: 'a', dia: '1', turno: 'tarde', depois: true }]);
  });
});
