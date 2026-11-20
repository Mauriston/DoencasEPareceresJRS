// Ficheiro: utils/pwa.ts
// Detecção de dispositivo/navegador e do estado do tutorial "adicionar o
// ícone do app à tela inicial" (ver components/InstallAppTutorial.tsx).

export type PlataformaTutorial = 'iphone-safari' | 'ios-topo' | 'android';

const LS_TUTORIAL_CONCLUIDO = 'jrs_pwa_tutorial_concluido';

const ua = (): string => (typeof navigator !== 'undefined' ? navigator.userAgent : '');

export const isIOS = (): boolean =>
  /iPhone|iPad|iPod/i.test(ua()) ||
  (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Celular/tablet (onde "Adicionar à Tela de Início" existe), não largura de tela. */
export const isMobileDevice = (): boolean => /Android/i.test(ua()) || isIOS();

/** App já aberto a partir do ícone da tela inicial (modo standalone). */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
};

export const detectarPlataformaTutorial = (): PlataformaTutorial => {
  if (!isIOS()) return 'android';
  const isIphone = /iPhone|iPod/i.test(ua());
  const isSafari = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua());
  // iPhone + Safari: botão Compartilhar na barra inferior. iPad e outros
  // navegadores no iOS: Compartilhar fica na barra superior.
  return isIphone && isSafari ? 'iphone-safari' : 'ios-topo';
};

export const tutorialConcluidoLocal = (): boolean => {
  try { return localStorage.getItem(LS_TUTORIAL_CONCLUIDO) === '1'; } catch { return false; }
};

export const marcarTutorialConcluidoLocal = (): void => {
  try { localStorage.setItem(LS_TUTORIAL_CONCLUIDO, '1'); } catch { /* modo privado */ }
};

/** Exibição automática do diálogo "adicionar à tela de início": nos 3 primeiros acessos de cada usuário. */
export const MAX_EXIBICOES_AVISO_PWA = 3;

/**
 * O diálogo abre sozinho neste acesso? Não, se o usuário já o viu 3 vezes (contador no perfil), se já concluiu
 * o tutorial / disse que já instalou, se o app já está aberto pelo ícone ou se já abriu nesta sessão do navegador.
 */
export const deveExibirAvisoPwa = (o: { exibicoes?: number; concluido?: boolean; standalone: boolean; jaNestaSessao: boolean }): boolean =>
  !o.standalone && !o.concluido && !o.jaNestaSessao && (Number(o.exibicoes) || 0) < MAX_EXIBICOES_AVISO_PWA;

const chaveSessaoAvisoPwa = (uid: string) => `jrs_pwa_aviso_sessao_${uid}`;
export const avisoPwaJaNestaSessao = (uid: string): boolean => {
  try { return sessionStorage.getItem(chaveSessaoAvisoPwa(uid)) === '1'; } catch { return false; }
};
export const marcarAvisoPwaNestaSessao = (uid: string): void => {
  try { sessionStorage.setItem(chaveSessaoAvisoPwa(uid), '1'); } catch { /* modo privado */ }
};

/** URL pública do app (raiz, respeitando o base do Vite, ex.: /DoencasEPareceresJRS/). */
export const urlDoApp = (): string => `${window.location.origin}${import.meta.env.BASE_URL}`;
