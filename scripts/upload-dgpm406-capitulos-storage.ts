// Script de carga ÚNICA, reutilizável: envia ao Firebase Storage (projeto
// jrs-app-web) os PDFs dos capítulos da DGPM-406 baixados da pasta do Drive
// (id 1-9hsN-3QwwePdSw94teqGbBYeD07D0Jy), salvando-os em
// dgpm406/capitulos/capitulo-NN.pdf — caminho lido pelo app em
// services/firebaseStorageDgpm406.ts.
//
// Uso: npx tsx scripts/upload-dgpm406-capitulos-storage.ts <pasta-com-os-pdfs>
//   Cada arquivo deve começar com "CAP-<n>" (ex.: CAP-04_IS-POS-ADMISSIONAIS.pdf).
//
// Usa o Admin SDK com a service account já disponível na sessão
// (GOOGLE_APPLICATION_CREDENTIALS), então ignora storage.rules.
import fs from 'fs';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8'));
initializeApp({ credential: cert(serviceAccount), storageBucket: 'jrs-app-web.firebasestorage.app' });
const bucket = getStorage().bucket();

const pasta = process.argv[2];
if (!pasta) { console.error('Informe a pasta com os PDFs.'); process.exit(1); }

(async () => {
  for (const arquivo of fs.readdirSync(pasta).sort()) {
    const m = arquivo.match(/^CAP-0*(\d+)/i);
    if (!m || !arquivo.toLowerCase().endsWith('.pdf')) continue;
    const destino = `dgpm406/capitulos/capitulo-${m[1].padStart(2, '0')}.pdf`;
    await bucket.upload(path.join(pasta, arquivo), { destination: destino, metadata: { contentType: 'application/pdf' } });
    console.log(`OK ${arquivo} -> ${destino}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
