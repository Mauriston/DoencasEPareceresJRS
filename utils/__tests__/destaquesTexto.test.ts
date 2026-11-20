import { describe, expect, it } from 'vitest';
import { criarAncora, localizarAncora } from '../destaquesTexto';

describe('destaquesTexto', () => {
  const texto = 'Art. 1º O militar faz jus. Art. 2º O militar faz jus à ajuda de custo. Art. 3º Fim.';

  it('localiza o trecho e desempata ocorrências repetidas pelo contexto', () => {
    const i = texto.indexOf('O militar faz jus', 20);
    const a = criarAncora(texto, i, i + 'O militar faz jus'.length);
    expect(localizarAncora(texto, a)).toEqual([i, i + 17]);
    const j = texto.indexOf('O militar faz jus');
    expect(localizarAncora(texto, criarAncora(texto, j, j + 17))).toEqual([j, j + 17]);
  });

  it('continua achando o trecho se o texto em volta mudou um pouco', () => {
    const i = texto.indexOf('ajuda de custo');
    const a = criarAncora(texto, i, i + 14);
    const novo = texto.replace('Art. 3º Fim.', 'Art. 3º Texto novo.');
    expect(localizarAncora(novo, a)).toEqual([i, i + 14]);
  });

  it('órfã quando o trecho sumiu', () => {
    const i = texto.indexOf('ajuda de custo');
    const a = criarAncora(texto, i, i + 14);
    expect(localizarAncora(texto.replace('ajuda de custo', 'diária'), a)).toBeNull();
  });
});
