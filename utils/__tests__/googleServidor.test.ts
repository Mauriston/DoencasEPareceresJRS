// Partes puras da conta Google do servidor (servidor/google/): e-mail MIME, regras de texto e agenda.
import { describe, expect, it } from 'vitest';
import { montarMime, agradecimentoDe, limparNome, idDoDrive, URL_STORAGE_LEGADO } from '../../servidor/google/impressao';
import { idEvento, convidadosDoEvento } from '../../servidor/google/agenda';

const decodificarParte = (mime: string, tipo: string) => {
  const i = mime.indexOf(`Content-Type: ${tipo}`);
  const corpo = mime.slice(mime.indexOf('\r\n\r\n', i) + 4).split('\r\n--')[0];
  return Buffer.from(corpo.replace(/\r\n/g, ''), 'base64');
};

describe('montarMime', () => {
  const mime = montarMime({
    para: 'impressao@example.com', cc: 'a@example.com,b@example.com', assunto: 'TERMO DE RECURSO INAPTIDÃO - JOSÉ',
    texto: 'Giorginis,\n\nObrigado!', html: '<p>Giorginis,</p>', nomeRemetente: 'CT MAURISTON',
    anexo: { nome: 'TERMO_JOSÉ.pdf', bytes: Buffer.from('%PDF-1.7 teste') },
  }, 'jrs@example.com');

  it('cabeçalhos: remetente com nome, destinatários e assunto em UTF-8', () => {
    expect(mime).toContain(`From: =?UTF-8?B?${Buffer.from('CT MAURISTON').toString('base64')}?= <jrs@example.com>`);
    expect(mime).toContain('To: impressao@example.com');
    expect(mime).toContain('Cc: a@example.com,b@example.com');
    expect(mime).toContain(`Subject: =?UTF-8?B?${Buffer.from('TERMO DE RECURSO INAPTIDÃO - JOSÉ', 'utf8').toString('base64')}?=`);
  });

  it('texto, HTML e PDF anexo decodificam de volta', () => {
    expect(decodificarParte(mime, 'text/plain').toString('utf8')).toBe('Giorginis,\n\nObrigado!');
    expect(decodificarParte(mime, 'text/html').toString('utf8')).toBe('<p>Giorginis,</p>');
    expect(decodificarParte(mime, 'application/pdf').toString()).toBe('%PDF-1.7 teste');
    expect(mime).toContain('Content-Disposition: attachment;');
  });

  it('linhas do MIME com no máximo 998 caracteres', () => {
    expect(mime.split('\r\n').every(l => l.length <= 998)).toBe(true);
  });
});

describe('regras de texto do e-mail', () => {
  it('"Obrigada!" só para a 1T Mônica Virgínia (com ou sem acento)', () => {
    expect(agradecimentoDe('1T MÔNICA VIRGÍNIA')).toBe('Obrigada!');
    expect(agradecimentoDe('1T Monica')).toBe('Obrigada!');
    expect(agradecimentoDe('CT MAURISTON')).toBe('Obrigado!');
  });
  it('limparNome tira controles e barras e junta espaços', () => {
    expect(limparNome(' CT\n MAURISTON / JRS ')).toBe('CT MAURISTON JRS');
  });
  it('idDoDrive e URL antiga do Storage', () => {
    expect(idDoDrive('https://drive.google.com/file/d/1AbC-_9/view')).toBe('1AbC-_9');
    expect(idDoDrive('https://example.com/x.pdf')).toBeNull();
    expect(URL_STORAGE_LEGADO.test('https://firebasestorage.googleapis.com/v0/b/jrs-app-web.firebasestorage.app/o/x.pdf?alt=media&token=t')).toBe(true);
    expect(URL_STORAGE_LEGADO.test('https://firebasestorage.googleapis.com/v0/b/outro-projeto.appspot.com/o/x.pdf')).toBe(false);
  });
});

describe('agenda', () => {
  it('idEvento converte o id do CalendarApp para o da Calendar API', () => {
    expect(idEvento('abc123@google.com')).toBe('abc123');
    expect(idEvento('abc123')).toBe('abc123');
    expect(idEvento(undefined)).toBe('');
  });
  it('convidadosDoEvento mantém a resposta de quem já estava e tira quem saiu', () => {
    const atuais = [{ email: 'Perito@Gmail.com', responseStatus: 'accepted' }, { email: 'saiu@gmail.com', responseStatus: 'declined' }];
    expect(convidadosDoEvento(['perito@gmail.com', 'novo@gmail.com'], atuais)).toEqual([
      { email: 'Perito@Gmail.com', responseStatus: 'accepted' },
      { email: 'novo@gmail.com' },
    ]);
  });
});
