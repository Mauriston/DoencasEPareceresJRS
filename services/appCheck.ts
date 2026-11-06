// Ficheiro: services/appCheck.ts
// Firebase App Check com reCAPTCHA Enterprise: prova que as chamadas vêm do nosso app. É exigido
// (ENFORCED) pelo Firebase AI Logic (leitura do atestado, services/atestadoIA.ts); Firestore,
// Storage e Auth recebem o token mas, por ora, não o exigem.
// A chave de site é pública (vai no HTML de qualquer forma). Os domínios autorizados dela ficam no
// console do Google Cloud (Segurança > reCAPTCHA): precisam incluir o domínio do app publicado.
// Em desenvolvimento local, defina VITE_APPCHECK_DEBUG_TOKEN (token de depuração registrado em
// Firebase > App Check > Apps > Gerenciar tokens de depuração).
import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Chave "app-jrs-hnre" (Google Cloud > Segurança > Fraud Defense), domínio mauriston.github.io.
export const RECAPTCHA_ENTERPRISE_SITE_KEY = '6LdtjBMuAAAAADcsZuWXKZS2PU8MMvV0tA2z5-K3';

export const iniciarAppCheck = (app: FirebaseApp): void => {
  if (typeof window === 'undefined') return;
  const tokenDepuracao = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined;
  if (tokenDepuracao) (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = tokenDepuracao;
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Já iniciado (recarga a quente do Vite) ou indisponível: o app segue; só o AI Logic depende dele.
  }
};
