// Aba Emails da Ficha: corpo gravado (limites), HTML seguro para o iframe e junção com o histórico antigo das IS.
import { describe, expect, it } from 'vitest';
import {
  CSP_EMAIL, LIMITE_HTML_BYTES, LIMITE_TEXTO_CHARS, emailsDaFicha, enxugarHtml, horaDoEnvio, htmlSeguroParaIframe, isoDoEnvio,
  nipsValidos, prepararCorpoParaRegistro, resumoDestinatarios, rotuloDoEnvioFicha, type EmailEnviado,
} from '../emailsEnviados';
import type { RegistroEmailIS } from '../registroEmailsIS';

// 15/11/2026 22:30 em Recife (UTC−3) = 16/11 01:30 UTC.
const T = Date.UTC(2026, 10, 16, 1, 30);

describe('corpo gravado', () => {
  it('guarda HTML e texto pequenos como vieram (sem scripts)', () => {
    const c = prepararCorpoParaRegistro('<p>Oi</p><script>alert(1)</script>', 'Oi');
    expect(c).toEqual({ html: '<p>Oi</p>', texto: 'Oi' });
  });
  it('tira imagens embutidas grandes (data:) e mantém as pequenas', () => {
    const grande = `data:image/png;base64,${'A'.repeat(5000)}`;
    expect(enxugarHtml(`<img src="${grande}">`)).toBe('<img src="">');
    expect(enxugarHtml('<img src="data:image/png;base64,AAAA">')).toBe('<img src="data:image/png;base64,AAAA">');
  });
  it('omite o HTML acima do limite (não corta ao meio) e corta o texto', () => {
    const c = prepararCorpoParaRegistro(`<p>${'é'.repeat(LIMITE_HTML_BYTES / 2 + 10)}</p>`, 'x'.repeat(LIMITE_TEXTO_CHARS + 5));
    expect(c.html).toBeUndefined();
    expect(c.htmlOmitido).toBe('tamanho');
    expect(c.texto).toHaveLength(LIMITE_TEXTO_CHARS);
    expect(c.textoCortado).toBe(true);
  });
  it('sem nada, corpo vazio', () => {
    expect(prepararCorpoParaRegistro()).toEqual({});
  });
  it('NIPs só com dígitos, sem vazios e sem repetir', () => {
    expect(nipsValidos(['12.3456.78', '12345678', '', null, undefined, '87654321'])).toEqual(['12345678', '87654321']);
  });
});

describe('HTML para o iframe', () => {
  it('põe a CSP e o base target no <head> existente', () => {
    const h = htmlSeguroParaIframe('<html><head><title>x</title></head><body>a</body></html>');
    expect(h).toContain(`<head><meta http-equiv="Content-Security-Policy" content="${CSP_EMAIL}"><base target="_blank"><title>`);
  });
  it('fragmento sem <head> vira documento completo', () => {
    const h = htmlSeguroParaIframe('<p>a</p>');
    expect(h.startsWith('<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy"')).toBe(true);
    expect(h).toContain('<body><p>a</p></body>');
  });
  it('remove scripts e manipuladores de evento', () => {
    const h = htmlSeguroParaIframe('<img src="x" onerror="alert(1)"><a href="#" onClick=\'x()\'>l</a><SCRIPT src="y"></SCRIPT>');
    expect(h).not.toMatch(/onerror|onclick|<script/i);
    expect(h).toContain('<img src="x">');
  });
  it('a CSP não deixa script nem conexão', () => {
    expect(CSP_EMAIL).toContain("default-src 'none'");
    expect(CSP_EMAIL).not.toContain('script-src');
  });
});

describe('itens da aba', () => {
  const enviado = (id: string, ms: number, extra: Partial<EmailEnviado> = {}): EmailEnviado & { id: string } => ({
    id, tipo: 'resultadoIS', assunto: 'RESULTADO', para: ['a@x.com'], cc: ['c@x.com'], nips: ['12345678'], isIds: ['10'],
    temConteudo: true, enviadoEmMs: ms, enviadoPor: { uid: 'u1', usuario: 'sec.fulana', nome: 'Fulana' }, ...extra,
  });
  const reg = (id: string, ms: number, extra: Partial<RegistroEmailIS> = {}): RegistroEmailIS & { id: string } => ({
    id, tipo: 'agendamentoIS', assunto: 'AGENDAMENTO', para: ['a@x.com'], cc: [], enviadoEmMs: ms,
    enviadoPor: { uid: 'u2', usuario: 'sec.beltrana' }, ...extra,
  });

  it('com conteúdo + registros antigos + campos antigos, do mais recente; sem repetir o que aponta para o conteúdo', () => {
    const itens = emailsDaFicha(
      [enviado('E1', T), enviado('E2', T - 1000, { tipo: 'impressaoParecer', isIds: [], temConteudo: false })],
      [
        { is: { id: '10', is: 501 }, registros: [reg('r1', T, { tipo: 'resultadoIS', conteudoId: 'E1' }), reg('r2', T - 5000)] },
        { is: { id: '11', is: 502, emailNacEnviadoEm: { toMillis: () => T - 9000 } }, registros: [] },
      ],
    );
    expect(itens.map(i => i.id)).toEqual(['E1', 'E2', '10:r2', '11:legado-nac']);
    expect(itens[0]).toMatchObject({ rotulo: 'Resultado da IS', numerosIS: [501], conteudoId: 'E1', cc: ['c@x.com'], nomeUsuario: 'Fulana', legado: false });
    expect(itens[1]).toMatchObject({ rotulo: 'Pedido de impressão do parecer', numerosIS: [], conteudoId: undefined });
    expect(itens[2]).toMatchObject({ numerosIS: [501], usuario: 'sec.beltrana', legado: false });
    expect(itens[2].conteudoId).toBeUndefined();
    expect(itens[3]).toMatchObject({ tipo: 'nac', legado: true, numerosIS: [502] });
  });
  it('registro com conteudoId cujo envio não veio (sem leitura) continua listado', () => {
    const itens = emailsDaFicha([], [{ is: { id: '10', is: 501 }, registros: [reg('r1', T, { conteudoId: 'E9' })] }]);
    expect(itens.map(i => i.id)).toEqual(['10:r1']);
  });
  it('lote: só as IS deste inspecionado entram em numerosIS', () => {
    const [i] = emailsDaFicha([enviado('E1', T, { tipo: 'nac', isIds: ['10', '99'] })], [{ is: { id: '10', is: 501 }, registros: [] }]);
    expect(i.numerosIS).toEqual([501]);
  });
  it('rótulos, datas e destinatários', () => {
    expect(rotuloDoEnvioFicha('agendaIS')).toBe('IS agendadas do dia (interno)');
    expect(rotuloDoEnvioFicha('agendamentoGeral', 'reagendamento')).toBe('Agendamento · reagendamento');
    expect(isoDoEnvio(T)).toBe('2026-11-15');
    expect(horaDoEnvio(T)).toBe('22:30');
    expect(isoDoEnvio(0)).toBe('');
    expect(resumoDestinatarios([])).toBe('destinatários da configuração');
    expect(resumoDestinatarios(['a@x'])).toBe('a@x');
    expect(resumoDestinatarios(['a@x', 'b@x', 'c@x'])).toBe('a@x e mais 2');
  });
});
