// Ficheiro: public/firebase-messaging-sw.js
// Service worker das notificações push (Firebase Cloud Messaging). Recebe os
// avisos enviados pelo backend (server.ts, /api/notificacoes/evento) mesmo com
// o app fechado e os exibe; o toque na notificação abre o app no link do
// aviso (webpush.fcmOptions.link). A configuração pública do Firebase chega
// pela query string do registro (ver services/notificacoesPush.ts), para não
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

// Mensagens com "notification" são exibidas pelo próprio SDK.
firebase.messaging();

// Notificações exibidas pelo próprio app com ele aberto (onMessage, ver
// services/notificacoesPush.ts) não passam pelo SDK: o clique abre o link delas.
self.addEventListener('notificationclick', event => {
  const link = event.notification.data && event.notification.data.link;
  if (!link || (event.notification.data && event.notification.data.FCM_MSG)) return;
  event.notification.close();
  event.waitUntil(self.clients.openWindow(link));
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
