import { describe, it, expect } from 'vitest';
import { htmlTermoRecurso, htmlTermoCientificacao, htmlTermoRecursoComCientificacao } from '../../servidor/documentos/termosConcurso';
import { dataMilitar, esc } from '../../servidor/documentos/layoutOficial';

const base = { candidatoId: '123456-7', candidatoNome: 'FULANO DE TAL', nomeConcurso: 'CPACN2026' };

describe('layout oficial', () => {
  it('data militar DDMMMAAAA no fuso de Recife', () => {
    expect(dataMilitar(new Date('2026-11-07T15:00:00Z'))).toBe('07NOV2026');
    // 01h UTC de 08/11 ainda é 07/11 em Recife (UTC-3)
    expect(dataMilitar(new Date('2026-11-08T01:00:00Z'))).toBe('07NOV2026');
  });
  it('escapa HTML dos campos', () => {
    expect(esc('<b>"x" & \'y\'</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
  });
});

describe('Termo de Recurso', () => {
  const d = { ...base, dataLaudo: '05NOV2026', nomeUsuario: 'MAURISTON', postoGraduacao: 'CT (Md)', cargo: 'Presidente', dataEmissao: '07NOV2026' };
  it('preenche os campos e o texto do template', () => {
    const h = htmlTermoRecurso(d);
    expect(h).toContain('TERMO DE RECONHECIMENTO DE RECURSO - INSPEÇÃO DE SAÚDE PARA INGRESSO');
    expect(h).toContain('FULANO DE TAL, candidato ao concurso CPACN2026, nº de inscrição 123456-7, DECLARO');
    expect(h).toContain('<b>05NOV2026</b>');
    expect(h).toContain('JRS/HNRe - Recife, PE, 07NOV2026');
    expect(h.match(/class="pagina"/g)).toHaveLength(1);
  });
  it('não deixa HTML do nome passar', () => {
    expect(htmlTermoRecurso({ ...d, candidatoNome: '<script>x</script>' })).not.toContain('<script>x</script>');
  });
  it('com cientificação: duas páginas, a 2ª com Inapto marcado', () => {
    const h = htmlTermoRecursoComCientificacao(d);
    expect(h.match(/class="pagina"/g)).toHaveLength(2);
    expect(h).toContain('<span class="b">( <b>X</b> )  Inapto</span>');
  });
});

describe('Termo de Cientificação', () => {
  it('marca só a opção do status, em negrito', () => {
    const apto = htmlTermoCientificacao({ ...base, status: 'APTO' });
    expect(apto).toContain('<span class="b">( <b>X</b> )   Apto</span>');
    expect(apto).toContain('<span class="">( <b></b> )  Inapto</span>');
    const idm = htmlTermoCientificacao({ ...base, status: 'INSUF DOCUMENTAL' });
    expect(idm).toContain('idm b"><span class="tab">( <b>X</b> ) </span>Impossibilitado');
    expect(idm).toContain('<span class="">( <b></b> )   Apto</span>');
  });
});
