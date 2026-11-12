// E-mail "Resultado de Inspeção de Saúde" (servidor/email/): template, pontuação das restrições, data naval e MIME.
import { describe, expect, it } from 'vitest';
import { renderizarTemplate, itensDeRestricoes, dataNaval, montarEmailResultado, emailValido, CONFIG_EMAIL_RESULTADO } from '../../servidor/email/resultadoIS';
import { montarMime } from '../../servidor/google/impressao';

const IS = {
  is: 1245271, finalidade: 'FIM VDF Fato Novo', inspecionado: '2SG-CO 07.3644.15 PAULO ANDRE DIAS DOS SANTOS',
  tis: '026.000.57079', dataLaudo: '2026-10-30', laudo: 'Apto para o SAM com restrições por 90 dias.',
  restricoes: 'Serviço Noturno; Movimentos repetitivos com sobrecarga do ombro direito; Carregar peso; Serviço Armado',
};

describe('renderizarTemplate', () => {
  it('escapa os valores e trata seções booleanas e listas', () => {
    const t = '<p>{{a}}</p>{{#mostra}}<b>sim</b>{{/mostra}}{{#esconde}}<i>não</i>{{/esconde}}<ul>{{#itens}}<li>{{item}}</li>{{/itens}}</ul>';
    expect(renderizarTemplate(t, { a: '<x> & "y"', mostra: true, esconde: false, itens: [{ item: 'A;' }, { item: 'B.' }] }))
      .toBe('<p>&lt;x&gt; &amp; &quot;y&quot;</p><b>sim</b><ul><li>A;</li><li>B.</li></ul>');
  });
  it('seção com lista dentro de seção booleana', () => {
    expect(renderizarTemplate('{{#tem}}[{{#l}}{{item}}{{/l}}]{{/tem}}', { tem: true, l: [{ item: 1 }, { item: 2 }] })).toBe('[12]');
    expect(renderizarTemplate('{{#tem}}[{{#l}}{{item}}{{/l}}]{{/tem}}', { tem: false, l: [] })).toBe('');
  });
});

describe('regras de texto', () => {
  it('restrições com a pontuação de enumeração ("X;" … "Y; e" … "Z.")', () => {
    expect(itensDeRestricoes(IS.restricoes)).toEqual([
      'Serviço Noturno;', 'Movimentos repetitivos com sobrecarga do ombro direito;', 'Carregar peso; e', 'Serviço Armado.',
    ]);
    expect(itensDeRestricoes('Embarque')).toEqual(['Embarque.']);
    expect(itensDeRestricoes('')).toEqual([]);
  });
  it('data naval DDMMMAAAA', () => {
    expect(dataNaval('2026-10-30')).toBe('30OUT2026');
    expect(dataNaval('')).toBe('');
  });
  it('validação do e-mail', () => {
    expect(emailValido('fulano@marinha.mil.br')).toBe(true);
    expect(emailValido('fulano@gmail.com')).toBe(true);
    expect(emailValido('a@b.com, c@d.com')).toBe(false);
    expect(emailValido('sem-arroba')).toBe(false);
  });
});

describe('montarEmailResultado', () => {
  const { assunto, html, texto } = montarEmailResultado(IS, 'EAMPE');

  it('preenche todos os placeholders, sem JavaScript', () => {
    expect(html).not.toMatch(/\{\{[#/]?\w+\}\}/);
    expect(html).not.toMatch(/<script|javascript:|\son\w+=/i);
    expect(html).toContain('2SG-CO 07.3644.15 PAULO ANDRE DIAS DOS SANTOS (EAMPE)');
    expect(html).toContain('<strong>IS FIM VDF Fato Novo</strong>');
    expect(html).toContain('30OUT2026');
    expect(html).toContain('026.000.57079');
    expect(html).toContain('Laudo: "Apto para o SAM com restrições por 90 dias."');
    expect(html).toContain('<li style="margin-bottom:4px">Carregar peso; e</li>');
    expect(html).toContain('em até 45 dias');
    expect(html).toContain(CONFIG_EMAIL_RESULTADO.logoRodapeUrl);
    expect(assunto).toBe('RESULTADO DE INSPEÇÃO DE SAÚDE');
    expect(texto).toContain('Laudo: "Apto para o SAM com restrições por 90 dias."');
  });

  it('sem restrições, o bloco some', () => {
    const r = montarEmailResultado({ ...IS, restricoes: '' });
    expect(r.html).not.toContain('Restrições:');
  });
});

describe('montarMime com cópia oculta e "responder para"', () => {
  it('inclui Bcc e Reply-To', () => {
    const mime = montarMime({ para: 'x@example.com', cco: 'jrs@example.com', responderPara: 'jrs@example.com', assunto: 'A', texto: 't', html: '<p>h</p>', nomeRemetente: 'JRS-HNRe' }, 'conta@example.com');
    expect(mime).toContain('Bcc: jrs@example.com');
    expect(mime).toContain('Reply-To: jrs@example.com');
    expect(mime).not.toContain('Cc:');
  });
});
