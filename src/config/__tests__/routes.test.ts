import { describe, expect, it } from 'vitest';
import {
  ALIASES, ROUTES, concursoPath, concursosDiaPath, destinoDoAlias, doencaPath, ehRotaPublica, pathForView,
  periciaMenorPath, viewForPath,
} from '../routes';
import type { NavItem } from '@/types';

describe('mapa de rotas (config/routes.ts)', () => {
  it('resolve as rotas principais para a página certa', () => {
    expect(viewForPath('/')).toBe('home');
    expect(viewForPath('/inspecoes')).toBe('inspecoes');
    expect(viewForPath('/pareceres')).toBe('pareceres');
    expect(viewForPath('/pericia-menor')).toBe('pericia-menor');
    expect(viewForPath('/pericia-menor/historico/12345678')).toBe('pericia-menor');
    expect(viewForPath('/mensagens')).toBe('mensagens');
    expect(viewForPath('/normas/dgpm-406')).toBe('dgpm406');
    expect(viewForPath('/extras/roteiro')).toBe('roteiro');
    expect(viewForPath('/usuarios')).toBe('usuarios');
  });

  it('rotas estáticas de /concursos vêm antes da dinâmica /concursos/:concursoId', () => {
    expect(viewForPath('/concursos/indices')).toBe('concursos');
    expect(viewForPath('/concursos/exames')).toBe('exames');
    expect(viewForPath('/concursos/dia/2026-10-31')).toBe('concursosJRS');
    expect(viewForPath('/concursos/CPAEAM-2026')).toBe('concursosJRS');
    expect(viewForPath('/concursos')).toBe('concursosJRS');
  });

  it('doenças aceitam id e índice de diagnóstico opcionais', () => {
    expect(viewForPath('/beneficios/doencas')).toBe('guide');
    expect(viewForPath('/beneficios/doencas/cegueira')).toBe('guide');
    expect(viewForPath('/beneficios/doencas/cegueira/2')).toBe('guide');
  });

  it('o endereço antigo /militares continua abrindo Inspecionados', () => {
    expect(viewForPath('/militares')).toBe('militares');
    expect(viewForPath('/inspecionados')).toBe('militares');
  });

  it('rota inexistente não resolve (cai na página "não encontrada")', () => {
    expect(viewForPath('/nao-existe')).toBeUndefined();
    expect(viewForPath('/inspecoes/x/y/z')).toBeUndefined();
  });

  it('o caminho base de cada página resolve de volta para a própria página', () => {
    const paginas = new Set<NavItem>(ROUTES.map(r => r.view));
    for (const view of paginas) {
      expect(viewForPath(pathForView(view)), `página "${view}"`).toBe(view);
    }
  });

  it('não há duas rotas com o mesmo padrão', () => {
    const padroes = ROUTES.map(r => r.path);
    expect(new Set(padroes).size).toBe(padroes.length);
  });

  it('os construtores de caminho geram URLs que resolvem para a página esperada', () => {
    expect(viewForPath(doencaPath('cegueira', 1))).toBe('guide');
    expect(viewForPath(concursoPath('CPAEAM-2026'))).toBe('concursosJRS');
    expect(viewForPath(concursosDiaPath('2026-10-31'))).toBe('concursosJRS');
    expect(viewForPath(periciaMenorPath('novo'))).toBe('pericia-menor');
    expect(periciaMenorPath('historico', 'A B')).toBe('/pericia-menor/historico/A%20B');
  });

  it('páginas públicas são reconhecidas e não fazem parte de ROUTES', () => {
    expect(ehRotaPublica('/publico/doencas')).toBe(true);
    expect(ehRotaPublica('/publico/doencas/cegueira/0')).toBe(true);
    expect(ehRotaPublica('/publico/portaria')).toBe(true);
    expect(ehRotaPublica('/inspecoes')).toBe(false);
    expect(viewForPath('/publico/doencas')).toBeUndefined();
  });
});

describe('aliases estáveis', () => {
  it('redirecionam para a rota canônica preservando os subníveis', () => {
    expect(destinoDoAlias('/doencas')).toBe('/beneficios/doencas');
    expect(destinoDoAlias('/doencas/cegueira/1')).toBe('/beneficios/doencas/cegueira/1');
    expect(destinoDoAlias('/estudo')).toBe('/extras/roteiro');
    expect(destinoDoAlias('/estudo/')).toBe('/extras/roteiro');
    expect(destinoDoAlias('/exames')).toBe('/concursos/exames');
    expect(destinoDoAlias('/dgpm-406')).toBe('/normas/dgpm-406');
  });

  it('caminhos que não são alias não são tocados (inclusive as rotas atuais)', () => {
    expect(destinoDoAlias('/')).toBeUndefined();
    expect(destinoDoAlias('/pareceres')).toBeUndefined();
    expect(destinoDoAlias('/pericia-menor')).toBeUndefined();
    expect(destinoDoAlias('/concursos/exames')).toBeUndefined();
    expect(destinoDoAlias('/doencasXYZ')).toBeUndefined();
  });

  it('todo alias aponta para uma rota existente e não colide com uma rota atual', () => {
    for (const a of ALIASES) {
      expect(viewForPath(a.para), `destino de ${a.de}`).toBeDefined();
      expect(viewForPath(a.de), `${a.de} não pode ser rota própria`).toBeUndefined();
    }
  });

  it('não há alias duplicado', () => {
    expect(new Set(ALIASES.map(a => a.de)).size).toBe(ALIASES.length);
  });
});
