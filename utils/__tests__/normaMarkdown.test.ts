import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { acharOcorrencias, idItem, paraCaixaDeFrase, renderizarNorma } from '../normaMarkdown';
import {
  DOENCAS_PORTARIA, doencaDoQuadro, idDaSecao, idTituloPortaria, portariaPathSecao,
  secaoDaDoenca, semTituloPrincipal, separarCabecalhoDou,
} from '../portaria';

describe('idDaSecao', () => {
  it('deriva o id do nome do arquivo, sem o prefixo numérico', () => {
    expect(idDaSecao('01-alienacao-mental')).toBe('alienacao-mental');
    expect(idDaSecao('../content/portaria-3551-2021/02-cardiopatia-grave.md')).toBe('cardiopatia-grave');
    expect(idDaSecao('00-preliminares.md')).toBe('preliminares');
    expect(idDaSecao('99-disposicoes-finais.md')).toBe('disposicoes-finais');
    expect(idDaSecao('C:\\x\\05-Estados Avançados.md')).toBe('estados-avancados');
  });

  it('todas as 17 doenças têm arquivo, e os ids batem com os arquivos', () => {
    const ids = readdirSync('content/portaria-3551-2021').filter(f => f.endsWith('.md')).sort().map(idDaSecao);
    expect(ids[0]).toBe('preliminares');
    expect(ids.at(-1)).toBe('disposicoes-finais');
    expect(ids.slice(1, -1)).toEqual(DOENCAS_PORTARIA.map(d => d.secao));
  });
});

describe('estrutura da Portaria', () => {
  it('liga Doenças de Lei, quadro sinóptico e caminhos com ?secao=', () => {
    expect(secaoDaDoenca('cardiopatia_grave')).toBe('cardiopatia-grave');
    expect(secaoDaDoenca('inexistente')).toBeUndefined();
    expect(doencaDoQuadro(' Cardiopatia Grave ')?.secao).toBe('cardiopatia-grave');
    expect(portariaPathSecao('/beneficios/portaria')).toBe('/beneficios/portaria');
    expect(portariaPathSecao('/beneficios/portaria', 'cardiopatia-grave', '4.2')).toBe('/beneficios/portaria?secao=cardiopatia-grave&item=4.2');
    expect(idTituloPortaria('CAPÍTULO IV')).toBe('capitulo-iv');
    expect(idTituloPortaria('Quadro sinóptico de patologias')).toBe('quadro-sinoptico');
  });

  it('separa o cabeçalho do DOU e tira o h1 da doença', () => {
    const { cabecalho, resto } = separarCabecalhoDou(readFileSync('content/portaria-3551-2021/00-preliminares.md', 'utf8'));
    expect(cabecalho).toMatchObject({ publicadoEm: '31/08/2021', edicao: '165', secao: '1', pagina: '13', orgao: 'Ministério da Defesa/Gabinete do Ministro' });
    expect(resto.startsWith('## PORTARIA')).toBe(true);
    expect(resto).not.toContain('CAPÍTULO IV');
    expect(semTituloPrincipal('# CEGUEIRA\n\n## 7. Perícia')).toBe('## 7. Perícia');
  });
});

describe('renderizarNorma', () => {
  it('parágrafo **4.2.** vira número em coluna, com id, e as alíneas entram no corpo', () => {
    const html = renderizarNorma('**4.2.** São consideradas:\n\n- **a)** primeira;\n- **b)** segunda.\n\nOutro.', { prefixo: 'cardiopatia-grave' });
    expect(html).toContain('<div class="md-item" id="cardiopatia-grave--4.2"><span class="md-item-num">4.2.</span>');
    expect(html).toContain('<p>São consideradas:</p><ol class="md-alineas" type="a">');
    expect(html).toContain('<li><span class="md-alinea-marcador">a)</span><div class="md-alinea-corpo">primeira;</div></li>');
    expect(html).not.toContain('<strong>a)</strong>');
    expect(html).not.toContain('<ul>');
    // O parágrafo seguinte fica fora do item.
    expect(html.trim().endsWith('</div></div>\n<p>Outro.</p>')).toBe(true);
  });

  it('alíneas numéricas e "(a)" aninhadas, sem bolinha', () => {
    const html = renderizarNorma('- **a)** Teste:\n  - 1) um;\n  - 2) dois:\n    - (a) x;\n    - (b) y.');
    expect(html).toContain('<ol class="md-alineas" type="1">');
    expect(html).toContain('<span class="md-alinea-marcador">2)</span><div class="md-alinea-corpo">dois:');
    expect(html).toContain('<span class="md-alinea-marcador">(b)</span><div class="md-alinea-corpo">y.');
    expect(html).not.toContain('<ul>');
  });

  it('lista comum continua lista comum', () => {
    expect(renderizarNorma('- um\n- dois')).toContain('<ul>');
  });

  it('citação logo após o título vira o quadro Conceito, com o número do item', () => {
    const html = renderizarNorma('## 4. Conceituação\n\n> 4.1. Cardiopatia grave não é um diagnóstico.\n\n**44.** Exemplo:\n\n> "Laudo."', { prefixo: 'cg', deslocarTitulos: 1 });
    expect(html).toContain('<h3 id="cg--4">4. Conceituação</h3>');
    expect(html).toContain('<aside class="md-conceito" id="cg--4.1" aria-label="Conceito 4.1"><p class="md-conceito-rotulo">Conceito · 4.1</p><p>Cardiopatia grave não é');
    // Citação que não segue um título continua citação.
    expect(html).toContain('<blockquote>');
  });

  it('títulos em caixa de frase, com id, e tabela Sim/Não com link', () => {
    const md = '## CAPÍTULO II\n\n| Condição | Lei |\n| --- | --- |\n| Cegueira | Sim |\n| Pênfigo | Não |';
    const html = renderizarNorma(md, {
      caixaDeFrase: true,
      idTitulo: idTituloPortaria,
      tabelaSimNao: true,
      linkTabela: t => (t === 'Cegueira' ? { href: '#/p?secao=cegueira', secao: 'cegueira' } : undefined),
    });
    expect(html).toContain('<h2 id="capitulo-ii">Capítulo II</h2>');
    expect(html).toContain('<div class="md-tabela"');
    expect(html).toContain('<thead><tr><th scope="col">Condição</th>');
    expect(html).toContain('<a href="#/p?secao=cegueira" data-secao="cegueira">Cegueira</a>');
    expect(html).toContain('<span aria-hidden="true">✓</span><span class="sr-only">Sim</span>');
    expect(html).toContain('<span aria-hidden="true">—</span><span class="sr-only">Não</span>');
  });

  it('idItem sem prefixo', () => {
    expect(idItem(undefined, '6.3')).toBe('item-6.3');
  });
});

describe('paraCaixaDeFrase', () => {
  it('mantém siglas, nomes próprios e numerais romanos', () => {
    expect(paraCaixaDeFrase('PORTARIA GM-MD Nº 3.551, DE 26 DE AGOSTO DE 2021')).toBe('Portaria GM-MD nº 3.551, de 26 de agosto de 2021');
    expect(paraCaixaDeFrase('CAPÍTULO IV')).toBe('Capítulo IV');
    expect(paraCaixaDeFrase('DA MARINHA, DO EXÉRCITO E DOS AMP')).toBe('Da Marinha, do Exército e dos AMP');
    expect(paraCaixaDeFrase('Finalidade')).toBe('Finalidade');
  });
});

describe('acharOcorrencias', () => {
  it('ignora caixa e acento e devolve posições no texto original', () => {
    const t = 'Cardiopatia grave; CARDIOPATIA e cardiopatía';
    expect(acharOcorrencias(t, 'cardiopatia')).toEqual([[0, 11], [19, 30], [33, 44]]);
    expect(acharOcorrencias('Pênfigo', 'penf')).toEqual([[0, 4]]);
    expect(acharOcorrencias('abc', ' ')).toEqual([]);
  });
});
