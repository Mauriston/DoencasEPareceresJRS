// Regras puras das guias de exames da IS (utils/guiasExames.ts).
import { describe, expect, it } from 'vitest';
import { examesDasGuias, finalidadeTemExamesMinimos, GRUPOS_GUIA, idadeEm, paginasDasGuias } from '../guiasExames';

const exames = (f: string, sexo: 'Masculino' | 'Feminino', idade: number, grupo: string) =>
  examesDasGuias(f, sexo, idade).find(g => g.grupo === grupo)?.exames ?? [];

describe('examesDasGuias', () => {
  it('Controle trienal, masculino de 45 anos: grupos na ordem das páginas', () => {
    const g = examesDasGuias('Controle trienal', 'Masculino', 45);
    expect(g.map(x => x.grupo)).toEqual(['Exames laboratoriais', 'Avaliações', 'Exames de imagem', 'Outros exames']);
    expect(g[0].exames).toEqual([
      'Anti-HIV', 'Colesterol total e frações', 'Creatinina', 'EAS', 'Glicemia de jejum', 'Hemograma completo',
      'PSA total', 'Transaminases', 'Triglicerídeos', 'VDRL',
    ]);
    // Sem Biometria e Oftalmologia geral; sem o laudo ginecológico (feminino).
    expect(g[1].exames).toEqual(['Audiometria', 'Exame odontológico geral']);
    expect(g[2].exames).toEqual(['Radiografia de tórax PA e perfil']);
    expect(g[3].exames).toEqual(['Eletrocardiograma com 12 derivações']);
  });

  it('feminino: laudo ginecológico, colpocitologia e mamografia só a partir dos 40', () => {
    expect(exames('Controle trienal', 'Feminino', 39, 'Avaliações')).toEqual([
      'Audiometria', 'Exame odontológico geral', 'Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista',
    ]);
    expect(exames('Controle trienal', 'Feminino', 39, 'Exames de imagem')).toEqual(['Radiografia de tórax PA e perfil']);
    expect(exames('Controle trienal', 'Feminino', 40, 'Exames de imagem')).toEqual(['Mamografia', 'Radiografia de tórax PA e perfil']);
    expect(exames('Controle trienal', 'Feminino', 40, 'Outros exames')).toEqual(['Colpocitologia oncótica', 'Eletrocardiograma com 12 derivações']);
    expect(exames('Controle trienal', 'Feminino', 50, 'Exames laboratoriais')).not.toContain('PSA total');
  });

  it('idade mínima: colesterol e triglicerídeos ≥ 30; PSA ≥ 40', () => {
    const aos29 = exames('Controle trienal', 'Masculino', 29, 'Exames laboratoriais');
    expect(aos29).not.toContain('Colesterol total e frações');
    expect(aos29).not.toContain('Triglicerídeos');
    expect(aos29).not.toContain('PSA total');
    const aos30 = exames('Controle trienal', 'Masculino', 30, 'Exames laboratoriais');
    expect(aos30).toContain('Colesterol total e frações');
    expect(aos30).not.toContain('PSA total');
    expect(exames('Controle trienal', 'Masculino', NaN, 'Exames laboratoriais')).not.toContain('Colesterol total e frações');
  });

  it('exclui o toxicológico, abrevia o TIG e ordena os laboratoriais ignorando acento', () => {
    const lab = exames('Missão Antártica', 'Feminino', 35, 'Exames laboratoriais');
    expect(lab.some(e => /toxicol/i.test(e))).toBe(false);
    expect(lab).toContain('TIG');
    expect(lab.some(e => /Imunológico/.test(e))).toBe(false);
    expect(lab[0]).toBe('Ácido úrico');
    expect(lab).toEqual([...lab].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })));
    expect(lab.indexOf('Parasitológico das fezes')).toBeLessThan(lab.indexOf('Provas de atividade reumática'));
  });

  it('Oftalmologia Especial vem depois do odontológico e antes do laudo ginecológico', () => {
    expect(exames('Serviço com explosivos', 'Feminino', 30, 'Avaliações')).toEqual([
      'Audiometria', 'Exame odontológico geral', 'Oftalmologia Especial',
      'Laudo detalhado do exame físico ginecológico e de mamas emitido por especialista',
    ]);
  });

  it('casa a finalidade com quebra de linha no JSON (limparNome) e sem diferença de acento/caixa', () => {
    expect(examesDasGuias('Ingresso SAM / SMV (oriundos do meio civil)', 'Masculino', 20).length).toBeGreaterThan(0);
    expect(examesDasGuias('controle  TRIENAL', 'Masculino', 20).length).toBeGreaterThan(0);
  });

  it('finalidade desconhecida ou só com toxicológico: sem guias', () => {
    expect(examesDasGuias('Verificação de Deficiência Funcional', 'Masculino', 40)).toEqual([]);
    expect(examesDasGuias('IS para conclusão de Curso de Formação', 'Masculino', 40)).toEqual([]);
  });
});

describe('finalidadeTemExamesMinimos', () => {
  it('true para finalidades com exames que geram guia', () => {
    expect(finalidadeTemExamesMinimos('Controle trienal')).toBe(true);
    expect(finalidadeTemExamesMinimos('Missão no exterior (< 3m c/ trienal OK)')).toBe(true);
  });
  it('false sem exames mínimos ou só com toxicológico', () => {
    expect(finalidadeTemExamesMinimos('Término de incapacidade')).toBe(false);
    expect(finalidadeTemExamesMinimos('IS inopinada de avaliação toxicológica preventiva direcionada')).toBe(false);
    expect(finalidadeTemExamesMinimos('')).toBe(false);
  });
});

describe('idadeEm', () => {
  it('anos completos', () => {
    expect(idadeEm('1986-11-15', '2026-11-15')).toBe(40);
    expect(idadeEm('1986-11-16', '2026-11-15')).toBe(39);
    expect(idadeEm('1986-12-01', '2026-11-15')).toBe(39);
  });
  it('data inválida → NaN', () => {
    expect(idadeEm('', '2026-11-15')).toBeNaN();
    expect(idadeEm('15/11/1986', '2026-11-15')).toBeNaN();
    expect(idadeEm('2030-01-01', '2026-11-15')).toBeNaN();
  });
});

describe('paginasDasGuias', () => {
  it('uma página dos laboratoriais e uma por exame nos demais grupos', () => {
    const p = paginasDasGuias(examesDasGuias('Serviço com explosivos', 'Feminino', 45));
    expect(p[0].tipo).toBe('laboratoriais');
    expect(p.map(x => x.tipo).slice(1, 5)).toEqual(['audiometria', 'odontologico', 'oftalmologiaEspecial', 'ginecologico']);
    expect(p.slice(5).every(x => x.tipo === 'exame' && x.exames.length === 1)).toBe(true);
    expect(GRUPOS_GUIA[0]).toBe('Exames laboratoriais');
  });
});
