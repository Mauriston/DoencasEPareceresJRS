import { describe, it, expect } from 'vitest';
import { docSolicitacaoParecer, docSolicitacaoExames } from '../../servidor/documentos/solicitacoesConcurso';
import { docPedidoParecer, dataPorExtenso, listaQuesitos } from '../../servidor/documentos/pedidoParecer';

const ass = { nomeUsuario: 'MAURISTON', postoGraduacao: 'CT (Md)', cargo: 'Presidente', crmPe: '20674' };
const cand = { candidatoId: '123456-7', candidatoNome: 'FULANO', nomeConcurso: 'CPACN2026', dataEmissao: '07NOV2026' };

describe('Solicitação de Parecer (concursos)', () => {
  const d = docSolicitacaoParecer({ ...cand, ...ass, especialidade: 'ORTOPEDIA', historico: 'Linha 1\nLinha <2>' });
  it('preenche campos, quesitos fixos e assinatura no rodapé', () => {
    expect(d.html).toContain('SOLICITAÇÃO DE PARECER MÉDICO ASSISTENCIAL');
    expect(d.html).toContain('Ingresso no CPACN2026');
    expect(d.html).toContain('Linha 1\nLinha &lt;2&gt;');
    expect(d.html).toContain('Qual o prognóstico atual?');
    expect(d.sobreposicao).toContain('Recife, PE, 07NOV2026');
    expect(d.sobreposicao).toContain('CRM-PE: 20674');
    expect(d.margens.esq).toBeCloseTo(85.04);
  });
});

describe('Solicitação de Exames (concursos)', () => {
  const d = docSolicitacaoExames({ ...cand, ...ass, exames: 'Hemograma\nEAS' });
  it('lista os exames em duas colunas e assina no corpo, sem sigilo', () => {
    expect(d.html).toContain('Hemograma\nEAS');
    expect(d.html).toContain('column-count: 2');
    expect(d.html).toContain('Recife, PE, 07NOV2026');
    expect(d.sobreposicao).toBeUndefined();
  });
});

describe('Pedido de Parecer (página Pareceres)', () => {
  it('quesitos numerados, com subitens recuados (como o Apps Script)', () => {
    expect(listaQuesitos(['Há queixas?\nA) Dor\n  B) Limitação', '', 'Prognóstico?'])).toBe('1. Há queixas?\n    A) Dor\n    B) Limitação\n2. Prognóstico?');
  });
  it('data por extenso com 1º', () => {
    expect(dataPorExtenso(new Date('2026-10-01T15:00:00Z'))).toBe('1º de outubro de 2026');
    expect(dataPorExtenso(new Date('2026-11-07T15:00:00Z'))).toBe('7 de novembro de 2026');
  });
  it('folha de resposta em página nova e numeração no rodapé', () => {
    const d = docPedidoParecer({ ...ass, inspecionado: '1T FULANO', especialidade: 'ORTOPEDIA', finalidade: 'VDF', historico: 'H', quesitos: ['Q1'], dataEmissao: '7 de novembro de 2026' });
    expect(d.html).toContain('SOLICITAÇÃO DE PARECER MÉDICO ASSISTENCIAL À ORTOPEDIA');
    expect(d.html).toContain('Recife, PE, 7 de novembro de 2026.');
    expect(d.html).toContain('class="quebra"');
    expect(d.html.match(/<i style="top:/g)).toHaveLength(30);
    expect(d.sobreposicao).toContain('class="pageNumber"');
    expect(d.sobreposicao).toContain('class="totalPages"');
  });
});
