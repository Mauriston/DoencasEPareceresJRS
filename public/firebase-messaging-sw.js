// Ficheiro: public/firebase-messaging-sw.js
// Service worker das notificações push (Firebase Cloud Messaging). Recebe os
// avisos enviados pelo backend (server.ts, enviarPush) mesmo com o app fechado
// e os exibe; o toque na notificação abre o app no link do aviso
// (webpush.fcmOptions.link = APP_URL?notif=<id>#<rota do HashRouter>). Com o
// app já aberto, foca a janela e manda a rota para ela (App.tsx navega).
// A configuração pública do Firebase chega pela query string do registro (ver services/notificacoesPush.ts), para não
// duplicar firebase-applet-config.json aqui. O SDK é autohospedado: o vite.config.ts copia
// firebase-app-compat.js e firebase-messaging-compat.js do pacote "firebase" (node_modules) para
// firebase-sdk/ no build e os serve no dev — a versão sempre acompanha a do package.json, sem CDN.
importScripts('firebase-sdk/firebase-app-compat.js');
importScripts('firebase-sdk/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

// Toque na notificação — registrado ANTES de firebase.messaging() para tratar
// também as exibidas pelo SDK (data.FCM_MSG): o SDK só foca a janela aberta,
// sem ir à rota do aviso. As exibidas pelo próprio app em primeiro plano
// (onMessage, services/notificacoesPush.ts) trazem o link em data.link.
const linkDoClique = notification => {
  const data = notification.data || {};
  const fcm = data.FCM_MSG;
  if (fcm) return (fcm.fcmOptions && fcm.fcmOptions.link) || (fcm.notification && fcm.notification.click_action) || self.registration.scope;
  return data.link || null;
};

const abrirNoApp = async link => {
  const url = new URL(link, self.registration.scope);
  if (url.origin === self.location.origin) {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const janela = janelas.find(c => c.url.startsWith(self.registration.scope));
    if (janela) {
      // Mesma janela (no iPhone, o app instalado): foca e a página navega pelo HashRouter.
      try { await janela.focus(); } catch (e) { /* sem foco: ainda assim navega */ }
      janela.postMessage({ tipo: 'jrs-notificacao-clicada', link: url.href });
      return;
    }
  }
  await self.clients.openWindow(url.href);
};

self.addEventListener('notificationclick', event => {
  if (event.action) return;
  const link = linkDoClique(event.notification);
  if (!link) return;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(abrirNoApp(link));
});

// Mensagens com "notification" são exibidas pelo próprio SDK.
firebase.messaging();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
