// Script de carga ÚNICA, reutilizável: envia ao Firebase Storage (projeto
// jrs-app-web) os PDFs dos anexos da DGPM-406 (pasta do Drive
// 1CP9Vsw8DKWOa1Y0E-eQmSx7HLxJ0gAbV) e, opcionalmente, o PDF da Portaria
// GM-MD nº 3.551/2021.
//
// Anexos:   dgpm406/anexos/anexo-<letra>.pdf (ex.: ANEXO-AB_... -> anexo-ab.pdf)
// Portaria: dgpm406/portaria-gm-md-3551-2021.pdf
//
// Uso: npx tsx scripts/upload-dgpm406-anexos-storage.ts <pasta-anexos> [portaria.pdf]
//
// Usa o Admin SDK com a service account da sessão (GOOGLE_APPLICATION_CREDENTIALS),
// então ignora storage.rules.
import fs from 'fs';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8'));
initializeApp({ credential: cert(serviceAccount), storageBucket: 'jrs-app-web.firebasestorage.app' });
const bucket = getStorage().bucket();

const [pasta, portaria] = process.argv.slice(2);
if (!pasta) { console.error('Informe a pasta com os PDFs dos anexos.'); process.exit(1); }

const enviar = async (origem: string, destino: string) => {
  await bucket.upload(origem, { destination: destino, metadata: { contentType: 'application/pdf' } });
  console.log(`OK ${path.basename(origem)} -> ${destino}`);
};

(async () => {
  for (const arquivo of fs.readdirSync(pasta).sort()) {
    const m = arquivo.match(/^ANEXO-([A-Z0-9]+)/i);
    if (!m || !arquivo.toLowerCase().endsWith('.pdf')) continue;
    await enviar(path.join(pasta, arquivo), `dgpm406/anexos/anexo-${m[1].toLowerCase()}.pdf`);
  }
  if (portaria) await enviar(portaria, 'dgpm406/portaria-gm-md-3551-2021.pdf');
})().catch(e => { console.error(e); process.exit(1); });
