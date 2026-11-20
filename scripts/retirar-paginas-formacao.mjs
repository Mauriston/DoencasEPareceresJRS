// Ficheiro: scripts/retirar-paginas-formacao.mjs
// Apaga em definitivo os dados das páginas retiradas do app (20/11/2026): Casos Periciais,
// Infográficos e Roteiro JRS (esta última não guardava dados).
//  - Firestore: coleções `casos_periciais_resultados` e `infograficos`; em `visualizacoesExtras`,
//    os registros com tipo "infografico"; em `config/permissoes`, as chaves casos/infograficos/roteiro.
//  - Storage: tudo em `infograficos/`.
// Uso: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/retirar-paginas-formacao.mjs [--executar]
// Sem --executar só lista o que seria apagado.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const executar = process.argv.includes('--executar');
const app = initializeApp({ credential: applicationDefault(), projectId: 'jrs-app-web', storageBucket: 'jrs-app-web.firebasestorage.app' });
const db = getFirestore(app);
const PAGINAS = ['casos', 'infograficos', 'roteiro'];

const apagarDocs = async (rotulo, docs) => {
  console.log(`${rotulo}: ${docs.length} documento(s)`);
  if (!executar) return;
  for (let i = 0; i < docs.length; i += 400) {
    const lote = db.batch();
    docs.slice(i, i + 400).forEach(d => lote.delete(d.ref));
    await lote.commit();
  }
};

await apagarDocs('casos_periciais_resultados', (await db.collection('casos_periciais_resultados').get()).docs);
await apagarDocs('infograficos', (await db.collection('infograficos').get()).docs);
await apagarDocs('visualizacoesExtras (infografico)', (await db.collection('visualizacoesExtras').where('tipo', '==', 'infografico').get()).docs);

const refPerm = db.doc('config/permissoes');
const perm = (await refPerm.get()).data();
if (perm) {
  const limpar = obj => { if (!obj || typeof obj !== 'object') return false; let mudou = false; for (const k of PAGINAS) if (k in obj) { delete obj[k]; mudou = true; } for (const v of Object.values(obj)) if (v && typeof v === 'object') mudou = limpar(v) || mudou; return mudou; };
  const mudou = limpar(perm);
  console.log(`config/permissoes: ${mudou ? 'chaves das páginas retiradas encontradas' : 'nada a remover'}`);
  if (executar && mudou) await refPerm.set(perm);
}

const [arquivos] = await getStorage(app).bucket().getFiles({ prefix: 'infograficos/' });
console.log(`Storage infograficos/: ${arquivos.length} arquivo(s)`);
if (executar) for (const f of arquivos) await f.delete();

console.log(executar ? 'Concluído.' : 'Simulação. Rode com --executar para apagar.');
