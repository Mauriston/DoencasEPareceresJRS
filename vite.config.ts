import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// SDK do Firebase usado pelo service worker das notificações (public/firebase-messaging-sw.js):
// autohospedado, copiado de node_modules (a versão acompanha a do pacote "firebase") para
// <base>/firebase-sdk/ no build e servido do mesmo lugar no `npm run dev` — sem CDN (gstatic).
const SDK_SW = ['firebase-app-compat.js', 'firebase-messaging-compat.js'];
const sdkDoServiceWorker = (base: string): Plugin => ({
    name: 'sdk-firebase-service-worker',
    configureServer(server) {
        server.middlewares.use(`${base}firebase-sdk`, (req, res, next) => {
            const arquivo = SDK_SW.find(f => req.url?.split('?')[0] === `/${f}`);
            if (!arquivo) return next();
            res.setHeader('Content-Type', 'text/javascript');
            res.end(fs.readFileSync(path.resolve(__dirname, 'node_modules/firebase', arquivo)));
        });
    },
    generateBundle() {
        for (const f of SDK_SW) {
            this.emitFile({ type: 'asset', fileName: `firebase-sdk/${f}`, source: fs.readFileSync(path.resolve(__dirname, 'node_modules/firebase', f)) });
        }
    },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        base: '/DoencasEPareceresJRS/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), sdkDoServiceWorker('/DoencasEPareceresJRS/')],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});