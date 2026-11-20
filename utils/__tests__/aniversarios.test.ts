import { describe, expect, it } from 'vitest';
import { aniversariantesDoMes, hojeEmRecife, linkWhatsAppParabens, mensagemParabens, nomeSemPosto } from '../aniversarios';

const p = (usuario: string, dataNascimento?: string, extra = {}) => ({ id: usuario, usuario, dataNascimento, ...extra });

describe('aniversarios', () => {
  it('tira o posto do login', () => {
    expect(nomeSemPosto('CT JÚLIO CÉSAR')).toBe('JÚLIO CÉSAR');
    expect(nomeSemPosto('1SG-EF DAYVISON')).toBe('DAYVISON');
  });

  it('lista os aniversariantes ativos do mês, por dia, com idade e o de hoje', () => {
    const lista = aniversariantesDoMes([
      p('1T COSTA', '1998-09-08'),
      p('CT JÚLIO CÉSAR', '1985-09-13'),
      p('CT LUZ', '1985-09-09'),
      p('2T X', '1990-10-01'),
      p('2T Y', '1990-09-02', { ativo: false }),
      p('2T Z'),
    ], '2026-09-09');
    expect(lista.map(a => [a.pessoa.usuario, a.dia, a.idade, a.ehHoje])).toEqual([
      ['1T COSTA', 8, 28, false],
      ['CT LUZ', 9, 41, true],
      ['CT JÚLIO CÉSAR', 13, 41, false],
    ]);
  });

  it('29/02 cai em 28/02 em ano não bissexto', () => {
    expect(aniversariantesDoMes([p('A B', '2000-02-29')], '2027-02-28')[0]).toMatchObject({ dia: 28, ehHoje: true });
  });

  it('monta a mensagem e o link do WhatsApp', () => {
    expect(mensagemParabens('1T COSTA', 28)).toBe('*COSTA, PARABÉNS!*\n\nQue você tenha outros _28 anos_ de muita saúde e felicidade! Aproveite bastante o seu dia! 🥂\n\nFA! Mauriston.');
    expect(linkWhatsAppParabens('(81) 99999-0000', '1T COSTA', 28)).toMatch(/^https:\/\/wa\.me\/5581999990000\?text=\*COSTA%2C/);
    expect(linkWhatsAppParabens('', '1T COSTA', 28)).toBeNull();
  });

  it('data de hoje em Recife', () => {
    expect(hojeEmRecife(new Date('2026-11-21T02:00:00Z'))).toBe('2026-11-20');
  });
});

describe('mensagem livre', () => {
  it('só o cabeçalho e o campo para o texto', async () => {
    const { mensagemParabensLivre } = await import('../aniversarios');
    expect(mensagemParabensLivre('CT JÚLIO CÉSAR')).toBe('*JÚLIO CÉSAR, PARABÉNS!*\n\n_[escreva aqui a sua mensagem para JÚLIO CÉSAR]_');
  });
});

describe('proximosAniversarios', () => {
  it('os 4 próximos a partir de hoje, atravessando o ano', async () => {
    const { proximosAniversarios } = await import('../aniversarios');
    const ps = [
      { id: 'a', usuario: 'CT A', dataNascimento: '1990-11-20' },
      { id: 'b', usuario: 'CT B', dataNascimento: '1990-11-19' },
      { id: 'c', usuario: 'CT C', dataNascimento: '1990-12-26' },
      { id: 'd', usuario: 'CT D', dataNascimento: '1990-01-24' },
      { id: 'e', usuario: 'CT E', dataNascimento: '1990-03-02' },
      { id: 'f', usuario: 'CT F', dataNascimento: '1990-11-28' },
    ];
    expect(proximosAniversarios(ps, '2026-11-20').map(x => [x.pessoa.id, x.data, x.idade, x.dias])).toEqual([
      ['a', '2026-11-20', 36, 0],
      ['f', '2026-11-28', 36, 8],
      ['c', '2026-12-26', 36, 36],
      ['d', '2027-01-24', 37, 65],
    ]);
  });
});
