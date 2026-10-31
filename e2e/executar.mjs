// Ficheiro: e2e/executar.mjs
// Roda dentro de `firebase emulators:exec` (ver "test:e2e" no package.json): semeia os
// emuladores, sobe o app (server.ts + Vite) apontando para eles, roda os testes de e2e/ e
// derruba o servidor no fim.
import { spawn } from 'node:child_process';
import { semear } from './dados.mjs';

const PORTA = 3100;
const ambiente = {
  ...process.env,
  PORT: String(PORTA),
  NODE_ENV: 'development',
  FIREBASE_PROJECT_ID: 'demo-jrs',
  GCLOUD_PROJECT: 'demo-jrs',
  VITE_FIREBASE_EMULATORS: '1',
  ALLOWED_ORIGIN: `http://127.0.0.1:${PORTA}`,
};
Object.assign(process.env, { GCLOUD_PROJECT: 'demo-jrs' });

await semear();

// Grupo de processos próprio (detached): no fim, derruba o npx e o tsx que ele abriu.
const servidor = spawn('npx', ['tsx', 'server.ts'], { env: ambiente, stdio: ['ignore', 'inherit', 'inherit'], detached: true });
const derrubarServidor = () => { try { process.kill(-servidor.pid, 'SIGTERM'); } catch { /* já saiu */ } };
const url = `http://127.0.0.1:${PORTA}/DoencasEPareceresJRS/`;
for (let i = 0; ; i++) {
  try { if ((await fetch(url)).ok) break; } catch { /* ainda subindo */ }
  if (i > 120) { derrubarServidor(); throw new Error('O servidor do app não subiu em 60 s.'); }
  await new Promise(r => setTimeout(r, 500));
}

const testes = spawn(process.execPath, ['--test', '--test-concurrency=1', 'e2e/fluxos.test.mjs'], { env: { ...process.env, E2E_BASE_URL: url }, stdio: 'inherit' });
const codigo = await new Promise(r => testes.on('exit', r));
derrubarServidor();
process.exit(codigo ?? 1);
