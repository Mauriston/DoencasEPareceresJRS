// Ficheiro: public/firebase-messaging-sw.js
// Service worker das notificações push (Firebase Cloud Messaging). Recebe os
// avisos enviados pelo backend (server.ts, /api/notificacoes/evento) mesmo com
// o app fechado e os exibe; o toque na notificação abre o app no link do
// aviso (webpush.fcmOptions.link). A configuração pública do Firebase chega
// pela query string do registro (ver services/notificacoesPush.ts), para não
// duplicar firebase-applet-config.json aqui. A versão do SDK acompanha a do
// pacote "firebase" do package.json.
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

// Mensagens com "notification" são exibidas pelo próprio SDK.
firebase.messaging();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
