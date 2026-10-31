import { describe, it, expect, vi } from 'vitest';
import { mascararSensivel, descreverErro, logErroSeguro } from '../logSeguro';
import { higienizarParaIA, base64ValidoParaIA, MAX_PROMPT_IA } from '../minimizacaoIA';

describe('logSeguro', () => {
  it('mascara NIP, CPF, e-mail e tokens', () => {
    const s = mascararSensivel('NIP 01.2345.67 ou 01234567, cpf 123.456.789-09, a@b.com, Bearer abc.def-123, ?key=SEGREDO&x=1');
    expect(s).not.toMatch(/01\.2345|01234567|123\.456|a@b\.com|abc\.def|SEGREDO/);
    expect(s).toContain('[nip]');
    expect(s).toContain('[cpf]');
  });
  it('descreve erro só com código e mensagem curta', () => {
    const e: any = new Error('falha para 01234567 ' + 'x'.repeat(500));
    e.code = 'auth/foo'; e.body = { nome: 'FULANO' };
    const d = descreverErro(e);
    expect(d.codigo).toBe('auth/foo');
    expect(d.mensagem.length).toBeLessThanOrEqual(200);
    expect(JSON.stringify(d)).not.toMatch(/FULANO|01234567/);
  });
  it('logErroSeguro não repassa o objeto do erro', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logErroSeguro('Teste', Object.assign(new Error('boom'), { body: 'SECRETO' }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);
    expect(String(spy.mock.calls[0][0])).not.toContain('SECRETO');
    spy.mockRestore();
  });
});

describe('minimizacaoIA', () => {
  it('higieniza e trunca', () => {
    const t = higienizarParaIA('Paciente 01.2345.67 fone (81) 99999-8888 a@b.com ' + 'y'.repeat(3000));
    expect(t.length).toBeLessThanOrEqual(MAX_PROMPT_IA);
    expect(t).not.toMatch(/01\.2345|99999|a@b/);
  });
  it('valida base64', () => {
    expect(base64ValidoParaIA('QUJD')).toBe(true);
    expect(base64ValidoParaIA('')).toBe(false);
    expect(base64ValidoParaIA('<script>')).toBe(false);
    expect(base64ValidoParaIA(undefined)).toBe(false);
  });
});
