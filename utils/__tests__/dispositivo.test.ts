import { describe, it, expect } from 'vitest';
import { podeGravarNoDispositivo, ehDispositivoMovel, type AmbienteDispositivo } from '../dispositivo';

const base: AmbienteDispositivo = {
  temGetUserMedia: true, temMediaRecorder: true, userAgent: '', platform: '', maxTouchPoints: 0, ponteiroGrosso: true,
};
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const UA_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

describe('podeGravarNoDispositivo', () => {
  it('iPhone com as APIs e toque: pode', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_IPHONE, platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
  });

  it('Android: pode', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_ANDROID, platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(true);
  });

  it('userAgentData.mobile verdadeiro basta como aparelho móvel', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_WIN, uaDataMobile: true })).toBe(true);
  });

  it('iPad que se apresenta como MacIntel com toque múltiplo: pode', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_MAC, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
  });

  it('Mac de verdade (MacIntel sem toque): não pode', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_MAC, platform: 'MacIntel', maxTouchPoints: 0, ponteiroGrosso: false })).toBe(false);
    expect(ehDispositivoMovel({ ...base, userAgent: UA_MAC, platform: 'MacIntel', maxTouchPoints: 1 })).toBe(false);
  });

  it('desktop Windows com janela estreita (sem UA móvel): não pode, mesmo com ponteiro grosso', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_WIN, platform: 'Win32', uaDataMobile: false })).toBe(false);
  });

  it('celular sem MediaRecorder: não pode', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_IPHONE, temMediaRecorder: false })).toBe(false);
  });

  it('celular sem getUserMedia (ex.: página sem HTTPS): não pode', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_ANDROID, temGetUserMedia: false })).toBe(false);
  });

  it('UA móvel mas ponteiro fino (emulação no desktop com mouse): não pode', () => {
    expect(podeGravarNoDispositivo({ ...base, userAgent: UA_ANDROID, ponteiroGrosso: false })).toBe(false);
  });

  it('fora do navegador (ambiente padrão no Node): não pode', () => {
    expect(podeGravarNoDispositivo()).toBe(false);
  });
});
