import { describe, expect, it } from 'vitest';
import { ACOES_NOTIFICAVEIS, ROTA_DA_PAGINA, acaoNotificavel, perfilExecuta, type AcaoNotificavel } from '../notificacoesAcoes';
import { DEFAULT_FEATURE_PERMISSIONS, DEFAULT_PAGE_PERMISSIONS } from '../permissoesPadrao';

const acoes = Object.entries(ACOES_NOTIFICAVEIS) as [string, AcaoNotificavel][];
const executaveis = (perfil: string, matriz = null) => acoes.filter(([, a]) => perfilExecuta(matriz, perfil, a)).map(([id]) => id);

describe('catálogo de ações notificáveis', () => {
  it('toda ação aponta para página e funcionalidade existentes e tem rota', () => {
    for (const [id, a] of acoes) {
      expect(ROTA_DA_PAGINA[a.pagina], id).toBeTruthy();
      expect(a.pagina === 'pericia-menor' || a.pagina in DEFAULT_PAGE_PERMISSIONS, id).toBe(true);
      if (a.feature) expect(DEFAULT_FEATURE_PERMISSIONS[a.feature], id).toBeTruthy();
      expect(a.soAdmin || a.feature || a.pagina, id).toBeTruthy();
    }
  });

  it('modelos só usam os marcadores do alvo da ação', () => {
    for (const [id, a] of acoes) {
      expect(a.texto.includes('{concurso}'), id).toBe(a.alvo === 'concurso');
      expect(a.texto.includes('{is}'), id).toBe(a.alvo === 'is');
      expect(a.texto.startsWith('{ator}'), id).toBe(true);
    }
  });

  it('ids fora do catálogo são recusados', () => {
    expect(acaoNotificavel('login')).toBeNull();
    expect(acaoNotificavel('toString')).toBeNull();
    expect(acaoNotificavel('is.cadastrada')).not.toBeNull();
  });
});

describe('destinatários por perfil (padrões da matriz)', () => {
  it('Admin é avisado de tudo', () => {
    expect(executaveis('admin')).toHaveLength(acoes.length);
  });

  it('user_medicos_geral só é avisado da Perícia Menor', () => {
    expect(executaveis('user_medicos_geral')).toEqual(['pericia.registrada']);
  });

  it('ações exclusivas do Admin não chegam a nenhum outro perfil', () => {
    for (const perfil of ['user_medicos', 'user_secretaria', 'user_medicos_mpi', 'user_medicos_geral']) {
      expect(executaveis(perfil).some(id => acaoNotificavel(id)?.soAdmin), perfil).toBe(false);
    }
  });

  it('Secretaria recebe reagendamento de concurso, mas não Pareceres nem Perícia Menor', () => {
    const lista = executaveis('user_secretaria');
    expect(lista).toContain('concurso.reagendado');
    expect(lista).not.toContain('parecer.gerado');
    expect(lista).not.toContain('pericia.registrada');
  });

  it('a matriz salva pelo Admin prevalece sobre o padrão', () => {
    const matriz = { features: { 'pericia-menor.novo': { user_medicos_geral: false } } };
    expect(perfilExecuta(matriz, 'user_medicos_geral', ACOES_NOTIFICAVEIS['pericia.registrada'])).toBe(false);
    const liberaPareceres = { pages: { pareceres: { user_secretaria: true } }, features: { 'pareceres.gerar': { user_secretaria: true } } };
    expect(perfilExecuta(liberaPareceres, 'user_secretaria', ACOES_NOTIFICAVEIS['parecer.gerado'])).toBe(true);
  });

  it('perfil desconhecido não recebe nada', () => {
    expect(executaveis('visitante')).toEqual([]);
  });
});
