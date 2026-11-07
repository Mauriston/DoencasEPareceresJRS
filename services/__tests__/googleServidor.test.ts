import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../authService', () => ({ obterIdToken: vi.fn(async () => 'token-de-teste') }));

import { chamarGoogle, deveUsarReserva, _reiniciarReserva } from '../googleServidor';
import { ApiError } from '../apiClient';

const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
const fetchMock = vi.fn();

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); _reiniciarReserva(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('chamarGoogle (servidor com o Apps Script de reserva)', () => {
  it('usa o servidor quando a conta Google está autorizada (sem o campo success)', async () => {
    fetchMock.mockResolvedValueOnce(resposta({ success: true, eventoId: 'abc' }));
    expect(await chamarGoogle('/api/agenda/evento-is', 'sincronizarEventoIS', { titulo: 't' })).toEqual({ eventoId: 'abc' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/agenda/evento-is');
  });

  it('503 "google_indisponivel": manda a mesma ação ao Apps Script e pula o servidor nos próximos 10 min', async () => {
    fetchMock
      .mockResolvedValueOnce(resposta({ success: false, codigo: 'google_indisponivel', error: 'não autorizada' }, 503))
      .mockResolvedValueOnce(resposta({ sucesso: true, dados: { eventoId: 'gas' } }))
      .mockResolvedValueOnce(resposta({ sucesso: true, dados: { eventoId: 'gas2' } }));
    expect(await chamarGoogle('/api/agenda/evento-is', 'sincronizarEventoIS', { titulo: 't' })).toEqual({ eventoId: 'gas' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ action: 'sincronizarEventoIS', titulo: 't' });
    expect(await chamarGoogle('/api/agenda/evento-is', 'sincronizarEventoIS', {})).toEqual({ eventoId: 'gas2' });
    expect(fetchMock).toHaveBeenCalledTimes(3); // o segundo pedido foi direto ao Apps Script
  });

  it('outros erros do servidor não caem na reserva (evita e-mail em dobro)', async () => {
    fetchMock.mockResolvedValueOnce(resposta({ success: false, error: 'O PDF não está na pasta PARECERES.' }, 400));
    await expect(chamarGoogle('/api/impressao/parecer', 'enviarParecerImpressao', {})).rejects.toThrow('PARECERES');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deveUsarReserva: só 503 e 404', () => {
    expect(deveUsarReserva(new ApiError('negocio', 'x', 503))).toBe(true);
    expect(deveUsarReserva(new ApiError('resposta_invalida', 'x', 404))).toBe(true);
    expect(deveUsarReserva(new ApiError('negocio', 'x', 500))).toBe(false);
    expect(deveUsarReserva(new ApiError('rede', 'x'))).toBe(false);
    expect(deveUsarReserva(new Error('x'))).toBe(false);
  });
});
