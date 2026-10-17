// Redefine a senha de todos os usuários (exceto o preservado) para a senha
// inicial padrão e marca senhaTemporaria=true (o app volta a orientar a troca).
//
// Uso (credenciais padrão do Google, ex.: GOOGLE_APPLICATION_CREDENTIALS):
//   node scripts/resetar-senhas-iniciais.mjs            # simulação (não altera nada)
//   node scripts/resetar-senhas-iniciais.mjs --aplicar  # aplica
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const SENHA_INICIAL = '123456';
const PRESERVAR = new Set(['CT MAURISTON']);
const aplicar = process.argv.includes('--aplicar');

const app = initializeApp({ credential: applicationDefault(), projectId: 'jrs-app-web' });
const auth = getAuth(app);
const db = getFirestore(app);

const snap = await db.collection('usuarios').get();
let alterados = 0;
for (const d of snap.docs) {
  const { usuario } = d.data();
  if (PRESERVAR.has(String(usuario).toUpperCase())) { console.log(`PRESERVADO  ${usuario}`); continue; }
  if (!aplicar) { console.log(`(simulação) ${usuario} → senha ${SENHA_INICIAL}`); continue; }
  try {
    await auth.updateUser(d.id, { password: SENHA_INICIAL });
    await d.ref.update({ senhaTemporaria: true });
    alterados++;
    console.log(`OK          ${usuario}`);
  } catch (err) {
    console.error(`ERRO        ${usuario}: ${err.code || err.message}`);
  }
}
console.log(aplicar ? `\nConcluído: ${alterados} senha(s) redefinida(s).` : '\nSimulação concluída. Rode com --aplicar para efetivar.');
