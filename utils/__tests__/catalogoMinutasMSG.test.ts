import { describe, it, expect } from 'vitest';
import { CATALOGO_MINUTAS_MSG, placeholdersCatalogoDesconhecidos, minutaCatalogoComPadrao } from '../catalogoMinutasMSG';
import { REGRAS_BENEFICIOS, minutaBeneficios, frasesLaudoMilitarInativo } from '../minutasBeneficiosPadrao';

describe('catálogo das 23 minutas MSG', () => {
  it('tem 23 minutas numeradas e agrupadas (1-5, 6-10, 11-23)', () => {
    expect(CATALOGO_MINUTAS_MSG.map(m => m.n)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
    for (const m of CATALOGO_MINUTAS_MSG) expect(m.grupo).toBe(m.n <= 5 ? 'gerais' : m.n <= 10 ? 'ao' : 'beneficios');
  });
  it('padrões só usam placeholders conhecidos e têm texto', () => {
    for (const m of CATALOGO_MINUTAS_MSG) {
      expect(m.padrao.texto.length).toBeGreaterThan(20);
      for (const v of Object.values(m.padrao)) expect(placeholdersCatalogoDesconhecidos(v), `minuta ${m.n}`).toEqual([]);
    }
  });
  it('minutas de Benefícios seguem o padrão: abertura, ALFA com TIS e BRAVO com DS-1A', () => {
    for (const m of CATALOGO_MINUTAS_MSG.filter(x => x.n >= 12 && x.n <= 23 && x.n !== 19)) {
      expect(m.padrao.assunto).toBe('RESULTADO DE IS FIM CONCESSÃO DE BENEFÍCIOS - {{inspecionado}}');
      expect(m.padrao.texto).toContain('IS FIM Concessão de Benefícios');
      expect(m.padrao.texto).toMatch(/ALFA - exarou o seguinte laudo: “.+”, ACD TIS nº \{\{tis\}\}; e/);
      expect(m.padrao.texto).toContain('{{ds1a}}');
    }
  });
  it('campo salvo vale; vazio volta ao padrão', () => {
    const m = CATALOGO_MINUTAS_MSG[3];
    expect(minutaCatalogoComPadrao(m, { assunto: '  ', texto: 'X' })).toEqual({ ...m.padrao, texto: 'X' });
  });
});

describe('padrão dos Benefícios', () => {
  it('cada beneficiário aponta para minutas do catálogo no grupo Benefícios', () => {
    for (const r of REGRAS_BENEFICIOS) for (const n of [r.minutaNao, r.minutaSim]) expect(CATALOGO_MINUTAS_MSG.find(m => m.n === n)?.grupo).toBe('beneficios');
  });
  it('destinatários batem com as minutas do catálogo', () => {
    for (const r of REGRAS_BENEFICIOS) {
      const nao = minutaBeneficios(r.beneficiario, false);
      const m = CATALOGO_MINUTAS_MSG.find(x => x.n === nao.minuta)!;
      expect(m.padrao.para).toBe(nao.para);
      expect(m.padrao.info).toBe(nao.info);
    }
  });
  it('militar inativo enquadrado usa a minuta 19 (auxílio-invalidez)', () => {
    expect(minutaBeneficios('militar_inativo', true).minuta).toBe(19);
    expect(minutaBeneficios('pensionista', true).minuta).toBe(16);
  });
  it('frases do laudo do militar inativo entram conforme os flags', () => {
    expect(frasesLaudoMilitarInativo({})).toBe('');
    expect(frasesLaudoMilitarInativo({ doencaGrave: true, invalidez: true })).toBe('(Não foi verificada doença grave especificada em Lei na presente data.) (Não está inválido na presente data.)');
  });
});
