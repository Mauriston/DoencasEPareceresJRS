import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../authService', () => ({ obterIdToken: vi.fn(async () => 'token-de-teste') }));

import { ApiError, chamarScript, chamarServidor, extrairEnvelopeScript } from '../apiClient';
import { obterIdToken } from '../authService';

const resposta = (corpo: unknown, status = 200) =>
  new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status });

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(obterIdToken).mockClear();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(obterIdToken).mockResolvedValue('token-de-teste');
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('extrairEnvelopeScript', () => {
  it('envelope padrão: devolve "dados" ou lança o "erro"', () => {
    expect(extrairEnvelopeScript({ sucesso: true, dados: { url: 'x' } })).toEqual({ url: 'x' });
    expect(() => extrairEnvelopeScript({ sucesso: false, erro: 'Falhou' })).toThrow('Falhou');
  });

  it('envelope legado do Gemini: "data", ou o corpo sem "success"', () => {
    expect(extrairEnvelopeScript({ success: true, data: { cid: 'M54.5' } })).toEqual({ cid: 'M54.5' });
    expect(extrairEnvelopeScript({ success: true, minuta: 'm', docUrl: 'u' })).toEqual({ minuta: 'm', docUrl: 'u' });
    expect(() => extrairEnvelopeScript({ success: false, message: 'Erro X' })).toThrow('Erro X');
  });

  it('classifica recusas de sessão e de perfil em erros tipados', () => {
    const sessao = (() => { try { extrairEnvelopeScript({ sucesso: false, erro: 'Sessão inválida ou expirada. Entre novamente no app.' }); } catch (e) { return e as ApiError; } })();
    expect(sessao?.codigo).toBe('nao_autenticado');
    const perfil = (() => { try { extrairEnvelopeScript({ sucesso: false, erro: 'Acesso negado: seu perfil não tem permissão para esta operação.' }); } catch (e) { return e as ApiError; } })();
    expect(perfil?.codigo).toBe('sem_permissao');
  });

  it('corpo fora de qualquer envelope é resposta inválida', () => {
    expect(() => extrairEnvelopeScript('<html>')).toThrow(ApiError);
    expect(() => extrairEnvelopeScript({ qualquer: 1 })).toThrow(ApiError);
  });
});

describe('chamarScript', () => {
  it('envia ação, idToken e dados em text/plain (sem preflight) e devolve "dados"', async () => {
    fetchMock.mockResolvedValue(resposta({ sucesso: true, dados: { pdfBase64: 'abc' } }));
    const d = await chamarScript<{ pdfBase64: string }>('gerarTermoRecurso', { candidatoId: '1' });
    expect(d.pdfBase64).toBe('abc');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('text/plain;charset=utf-8');
    expect(JSON.parse(init.body)).toEqual({ action: 'gerarTermoRecurso', idToken: 'token-de-teste', candidatoId: '1' });
  });

  it('sem sessão não chama o servidor', async () => {
    vi.mocked(obterIdToken).mockResolvedValue(null);
    await expect(chamarScript('x')).rejects.toMatchObject({ codigo: 'nao_autenticado' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha de rede vira ApiError "rede" com a mensagem pedida', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(chamarScript('x', {}, { mensagemRede: 'Sem rede.' })).rejects.toMatchObject({ codigo: 'rede', message: 'Sem rede.' });
  });

  it('resposta que não é JSON vira "resposta_invalida"', async () => {
    fetchMock.mockResolvedValue(resposta('<html>erro</html>'));
    await expect(chamarScript('x')).rejects.toMatchObject({ codigo: 'resposta_invalida' });
  });

  it('estoura o timeout com AbortController', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((_ok, falha) => {
      init.signal!.addEventListener('abort', () => falha(new DOMException('abortado', 'AbortError')));
    }));
    const promessa = chamarScript('x', {}, { timeoutMs: 1000 });
    const verificacao = expect(promessa).rejects.toMatchObject({ codigo: 'timeout' });
    await vi.advanceTimersByTimeAsync(1001);
    await verificacao;
  });
});

describe('chamarServidor', () => {
  it('envia JSON com Authorization Bearer e devolve o corpo', async () => {
    fetchMock.mockResolvedValue(resposta({ success: true, token: 't' }));
    const r = await chamarServidor<{ token: string }>('/api/auth/handoff-token', { a: 1 });
    expect(r.token).toBe('t');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/handoff-token$/);
    expect(init.headers.Authorization).toBe('Bearer token-de-teste');
    expect(JSON.parse(init.body)).toEqual({ a: 1 });
  });

  it('rota pública não envia token', async () => {
    fetchMock.mockResolvedValue(resposta({ success: true }));
    await chamarServidor('/api/auth/resolver-nip', { nip: '1' }, { autenticar: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(obterIdToken).not.toHaveBeenCalled();
  });

  it('mapeia 401, 403 e recusas de negócio para códigos tipados', async () => {
    fetchMock.mockResolvedValueOnce(resposta({ success: false, error: 'Token ausente.' }, 401));
    await expect(chamarServidor('/api/x')).rejects.toMatchObject({ codigo: 'nao_autenticado', status: 401, message: 'Token ausente.' });
    fetchMock.mockResolvedValueOnce(resposta({ success: false, error: 'Apenas o Admin.' }, 403));
    await expect(chamarServidor('/api/x')).rejects.toMatchObject({ codigo: 'sem_permissao', status: 403 });
    fetchMock.mockResolvedValueOnce(resposta({ success: false, error: 'NIP não encontrado.' }, 404));
    await expect(chamarServidor('/api/x')).rejects.toMatchObject({ codigo: 'negocio', message: 'NIP não encontrado.' });
  });
});
