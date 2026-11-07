// Ficheiro: utils/dispositivo.ts
// Detecção do aparelho que pode GRAVAR a entrevista da IS (ver config/entrevistas.ts): a gravação é
// feita só no celular — os PCs do HNRe não têm microfone. Exige as APIs de captura (getUserMedia +
// MediaRecorder), um aparelho móvel de fato e ponteiro "grosso" (toque). A largura da tela, sozinha,
// não basta: uma janela estreita no desktop não é um celular.

/** O que a detecção lê do navegador (injetável nos testes). */
export interface AmbienteDispositivo {
  temGetUserMedia: boolean;
  temMediaRecorder: boolean;
  userAgent: string;
  /** navigator.userAgentData.mobile (Chromium); undefined onde não existe. */
  uaDataMobile?: boolean;
  platform: string;
  maxTouchPoints: number;
  /** Resultado de matchMedia('(pointer: coarse)').matches. */
  ponteiroGrosso: boolean;
}

/** Lê o ambiente do navegador atual (tudo falso fora do navegador). */
export const ambienteAtual = (): AmbienteDispositivo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { temGetUserMedia: false, temMediaRecorder: false, userAgent: '', platform: '', maxTouchPoints: 0, ponteiroGrosso: false };
  }
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  let ponteiroGrosso = false;
  try { ponteiroGrosso = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches; } catch { /* sem matchMedia */ }
  return {
    temGetUserMedia: typeof nav.mediaDevices?.getUserMedia === 'function',
    temMediaRecorder: typeof (window as any).MediaRecorder === 'function',
    userAgent: nav.userAgent || '',
    uaDataMobile: nav.userAgentData?.mobile,
    platform: nav.platform || '',
    maxTouchPoints: nav.maxTouchPoints || 0,
    ponteiroGrosso,
  };
};

/** Aparelho móvel: userAgentData.mobile, UA de Android/iPhone/iPod ou iPad que se apresenta como Mac. */
export const ehDispositivoMovel = (a: AmbienteDispositivo): boolean => {
  if (a.uaDataMobile === true) return true;
  if (/Android|iPhone|iPod/i.test(a.userAgent)) return true;
  // iPadOS 13+ se apresenta como "MacIntel"; o toque múltiplo o diferencia de um Mac.
  if (/iPad/i.test(a.userAgent)) return true;
  if (a.platform === 'MacIntel' && a.maxTouchPoints > 1) return true;
  return false;
};

/** Verdadeiro só quando este aparelho pode gravar a entrevista (celular/tablet com microfone e MediaRecorder). */
export const podeGravarNoDispositivo = (ambiente: AmbienteDispositivo = ambienteAtual()): boolean =>
  ambiente.temGetUserMedia && ambiente.temMediaRecorder && ehDispositivoMovel(ambiente) && ambiente.ponteiroGrosso;
