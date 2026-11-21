#!/usr/bin/env node
// buscar-is.mjs — SOMENTE LEITURA. Puxa do Firestore do app JRS (projeto jrs-app-web) tudo o que
// a skill precisa para redigir uma IS: documento da IS, ficha do militar/inspecionado, PDFs já
// transcritos pela IA do app (inspecoes/{is}/exames) e entrevistas/anamneses (inspecoes/{is}/entrevistas).
// Uso: node buscar-is.mjs <numero-da-IS> [--json]
// Credencial: GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SA_B64 (ambiente em nuvem jrs-firebase).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

const CACHE = path.join(os.homedir(), '.cache', 'jrs-buscar-is');
const require = createRequire(path.join(CACHE, 'index.js'));
let admin;
try { admin = require('firebase-admin'); } catch {
  fs.mkdirSync(CACHE, { recursive: true });
  if (!fs.existsSync(path.join(CACHE, 'package.json'))) fs.writeFileSync(path.join(CACHE, 'package.json'), '{"private":true}');
  execSync('npm install --silent --no-audit --no-fund firebase-admin@12', { cwd: CACHE, stdio: 'ignore' });
  admin = require('firebase-admin');
}

const [, , isArg, flag] = process.argv;
const isId = String(isArg || '').replace(/\D/g, '');
if (!isId) { console.error('Uso: node buscar-is.mjs <numero-da-IS> [--json]'); process.exit(2); }

let cred;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS))
  cred = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
else if (process.env.FIREBASE_SA_B64) cred = JSON.parse(Buffer.from(process.env.FIREBASE_SA_B64, 'base64').toString('utf8'));
else { console.error('SEM CREDENCIAL: defina GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SA_B64 (ambiente jrs-firebase).'); process.exit(3); }
admin.initializeApp({ credential: admin.credential.cert(cred), projectId: cred.project_id || 'jrs-app-web' });
const db = admin.firestore();

// Campos operacionais (e-mails, agenda, slots) não interessam à redação.
const IGNORAR = /^(email|eventoAgenda|agendaSincronizada|peritoGmail|peritoUid|emailsDispensados|guias|slot|criadoPor|atualizadoPor)/;
const limpa = (o) => JSON.parse(JSON.stringify(o, (k, v) => {
  if (k && IGNORAR.test(k)) return undefined;
  if (v && typeof v === 'object' && typeof v._seconds === 'number') return new Date(v._seconds * 1000).toISOString().slice(0, 10);
  if (v === '' || v === null || (Array.isArray(v) && !v.length)) return undefined;
  return v;
}));

const snap = await db.doc(`inspecoes/${isId}`).get();
if (!snap.exists) { console.error(`IS ${isId} não encontrada em inspecoes/.`); process.exit(4); }
const is = limpa(snap.data());
const milSnap = is.inspecionadoId ? await db.doc(`militares/${is.inspecionadoId}`).get() : null;
const militar = milSnap?.exists ? limpa(milSnap.data()) : null;
const exames = (await db.collection(`inspecoes/${isId}/exames`).get()).docs
  .map(d => ({ id: d.id, ...limpa(d.data()) })).sort((a, b) => String(a.enviadoEm).localeCompare(String(b.enviadoEm)));
const entrevistas = (await db.collection(`inspecoes/${isId}/entrevistas`).get()).docs.map(d => ({ id: d.id, ...limpa(d.data()) }));
// Outras IS do mesmo inspecionado (histórico pericial), só o essencial.
const historico = is.inspecionadoId ? (await db.collection('inspecoes').where('inspecionadoId', '==', is.inspecionadoId).get()).docs
  .filter(d => d.id !== isId).map(d => { const x = d.data(); return { is: d.id, dataAbertura: x.dataAbertura, finalidade: x.finalidade, status: x.status, dataLaudo: x.dataLaudo, laudo: x.laudo, restricoes: x.restricoes, tis: x.tis }; })
  .sort((a, b) => String(b.dataAbertura).localeCompare(String(a.dataAbertura))) : [];

const out = { is, militar, exames, entrevistas, historico };
if (flag === '--json') { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

const bloco = (t, o) => `## ${t}\n\n\`\`\`json\n${JSON.stringify(o, null, 2)}\n\`\`\`\n`;
let md = `# Dados do app JRS — IS ${isId}\n\n`;
const { laudo, laudosFinalidades, ...isResto } = is;
md += bloco('Inspeção de Saúde', isResto);
if (laudo || laudosFinalidades) md += `## Laudo já registrado no app\n\n${laudosFinalidades ? laudosFinalidades.map(l => `**${l.finalidade}:** ${l.laudo}`).join('\n\n') : laudo}\n\n`;
md += militar ? bloco('Inspecionado (militares/' + is.inspecionadoId + ')', militar) : '## Inspecionado\n\n(ficha não encontrada)\n\n';
md += `## Documentos em PDF transcritos pelo app (${exames.length})\n\n`;
exames.forEach((e, i) => {
  md += `### PDF ${i + 1} — ${e.nomeArquivo || e.id} (${e.classificacao || 'sem classificação'}; enviado ${e.enviadoEm || '?'})${e.textoIncompleto ? ' ⚠️ TEXTO POSSIVELMENTE INCOMPLETO' : ''}\n\n`;
  (e.itens || []).forEach(it => {
    md += `**[${it.tipo}] ${it.titulo || ''}** — data: ${it.data || 'n/c'}; emissor: ${it.emissor || 'n/c'}${it.exameMinimo ? `; exame mínimo: ${it.exameMinimo}` : ''}\n\n${it.texto || ''}\n\n`;
    if (it.valores?.length) md += it.valores.map(v => `- ${v.nome}: ${v.valor}${v.referencia ? ` (ref.: ${v.referencia})` : ''}`).join('\n') + '\n\n';
  });
});
md += `## Entrevistas / anamneses (${entrevistas.length})\n\n`;
entrevistas.forEach(e => { md += bloco(`Entrevista ${e.id}`, e); });
md += historico.length ? bloco('Histórico de outras IS do inspecionado', historico) : '## Histórico de outras IS do inspecionado\n\n(nenhuma)\n';
console.log(md);
