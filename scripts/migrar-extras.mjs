// Migração ÚNICA dos Vídeos e Infográficos da planilha (Apps Script, action=getExtras) para o
// Firebase: coleções "videos" (id = id do YouTube) e "infograficos" (imagem baixada do link da
// planilha e enviada ao Storage em infograficos/{id}.{ext}). Não sobrescreve o que já existe.
//
// Uso (credenciais do Admin SDK em GOOGLE_APPLICATION_CREDENTIALS):
//   node scripts/migrar-extras.mjs            # simulação
//   node scripts/migrar-extras.mjs --aplicar  # grava
import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const GAS_URL = 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec';
const BUCKET = 'jrs-app-web.firebasestorage.app';
const aplicar = process.argv.includes('--aplicar');

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
initializeApp({ credential: cert(serviceAccount), storageBucket: BUCKET });
const db = getFirestore();
const bucket = getStorage().bucket();

const youtubeId = (link) => link?.match(/(?:embed\/|v=|youtu\.be\/|shorts\/|live\/)([\w-]{11})/)?.[1] ?? null;
const formato = (raw = '') => { const l = raw.toLowerCase(); return l.includes('víd') || l.includes('vid') ? 'video' : l.includes('infogr') ? 'infografico' : null; };

const resp = await fetch(`${GAS_URL}?action=getExtras`);
const json = await resp.json();
if (!json.success || !Array.isArray(json.data)) throw new Error(json.message || 'Resposta inválida do Apps Script.');

for (const row of json.data) {
  const tipo = formato(row.format);
  const titulo = String(row.title || '').trim();
  if (tipo === 'video') {
    const id = youtubeId(row.link || '');
    if (!id) { console.log(`SEM ID      vídeo "${titulo}"`); continue; }
    const docRef = db.collection('videos').doc(id);
    if ((await docRef.get()).exists) { console.log(`JÁ EXISTE   vídeo ${id}`); continue; }
    if (!aplicar) { console.log(`(simulação) vídeo ${id} "${titulo}"`); continue; }
    await docRef.set({ youtubeId: id, titulo, thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, criadoPor: 'migração planilha', criadoEm: FieldValue.serverTimestamp() });
    console.log(`OK          vídeo ${id} "${titulo}"`);
  } else if (tipo === 'infografico') {
    if (!row.imageUrl) { console.log(`SEM IMAGEM  infográfico "${titulo}"`); continue; }
    const jaExiste = !(await db.collection('infograficos').where('titulo', '==', titulo).limit(1).get()).empty;
    if (jaExiste) { console.log(`JÁ EXISTE   infográfico "${titulo}"`); continue; }
    if (!aplicar) { console.log(`(simulação) infográfico "${titulo}" ← ${row.imageUrl}`); continue; }
    const img = await fetch(row.imageUrl, { redirect: 'follow' });
    const tipoMime = img.headers.get('content-type') || '';
    if (!img.ok || !tipoMime.startsWith('image/')) { console.log(`FALHOU      infográfico "${titulo}" (${img.status} ${tipoMime})`); continue; }
    const docRef = db.collection('infograficos').doc();
    const ext = tipoMime.split('/')[1].split(';')[0].replace('jpeg', 'jpg');
    const imagePath = `infograficos/${docRef.id}.${ext}`;
    const token = crypto.randomUUID();
    await bucket.file(imagePath).save(Buffer.from(await img.arrayBuffer()), { metadata: { contentType: tipoMime, metadata: { firebaseStorageDownloadTokens: token } } });
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(imagePath)}?alt=media&token=${token}`;
    await docRef.set({ titulo, imagePath, imageUrl, criadoPor: 'migração planilha', criadoEm: FieldValue.serverTimestamp() });
    console.log(`OK          infográfico "${titulo}" → ${imagePath}`);
  }
}
