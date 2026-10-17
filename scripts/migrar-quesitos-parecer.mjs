// Carrega os quesitos por especialidade (scripts/quesitos-parecer.json, exportados da aba
// "Quesitos - Modelo Parecer JRS") na coleção "quesitosParecer" do Firestore.
// Não sobrescreve especialidades que já existem (preserva edições do Admin no app),
// salvo com --sobrescrever.
//
// Uso (credenciais padrão do Google, ex.: GOOGLE_APPLICATION_CREDENTIALS):
//   node scripts/migrar-quesitos-parecer.mjs            # simulação
//   node scripts/migrar-quesitos-parecer.mjs --aplicar  # grava
import fs from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const aplicar = process.argv.includes('--aplicar');
const sobrescrever = process.argv.includes('--sobrescrever');
const dados = JSON.parse(fs.readFileSync(new URL('./quesitos-parecer.json', import.meta.url), 'utf8'));

const idDe = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const db = getFirestore(initializeApp({ credential: applicationDefault(), projectId: 'jrs-app-web' }));
for (const [especialidade, quesitos] of Object.entries(dados)) {
  const ref = db.collection('quesitosParecer').doc(idDe(especialidade));
  const existe = (await ref.get()).exists;
  if (existe && !sobrescrever) { console.log(`JÁ EXISTE   ${especialidade}`); continue; }
  if (!aplicar) { console.log(`(simulação) ${especialidade}: ${quesitos.length} quesitos`); continue; }
  await ref.set({ especialidade, quesitos, atualizadoEm: FieldValue.serverTimestamp() });
  console.log(`OK          ${especialidade}: ${quesitos.length} quesitos`);
}
