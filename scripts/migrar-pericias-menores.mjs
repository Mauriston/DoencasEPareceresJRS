// Carrega o histórico de perícias menores (scripts/pericias-menores.json, exportado da aba
// "Pericia_Menor" da planilha) na coleção "periciasMenores" do Firestore, ligando cada perícia ao
// militar pelo NIP que consta no INSPECIONADO (militarId = NIP só dígitos). Quando o texto não traz
// o NIP, procura o militar pelo nome na coleção "militares" (aceita só uma correspondência única).
// Id do documento = "planilha-LINHA": rodar de novo não duplica (use --sobrescrever para regravar).
// A DATA_TERMINO é recalculada (DATA_ATESTADO + TEMPO_HOMOLOG - 1) e conferida com a da planilha.
//
// Uso (credenciais padrão do Google, ex.: GOOGLE_APPLICATION_CREDENTIALS):
//   node scripts/migrar-pericias-menores.mjs            # simulação
//   node scripts/migrar-pericias-menores.mjs --aplicar  # grava
import fs from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const aplicar = process.argv.includes('--aplicar');
const sobrescrever = process.argv.includes('--sobrescrever');
const linhas = JSON.parse(fs.readFileSync(new URL('./pericias-menores.json', import.meta.url), 'utf8'));

const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const isoDeBR = (br) => { const [d, m, a] = br.split('/'); return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
const dias = (t) => parseInt(String(t).replace(/\D/g, ''), 10) || 0;
const terminoDe = (iso, n) => { const [a, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(a, m - 1, d + n - 1)); return t.toISOString().slice(0, 10); };

// Linhas cujo texto da planilha não casa com a base (erro de digitação no nome): linha → NIP (id).
// Linha 5: "JÚLIO MANNUEL TAVARES DNIZ" = CT (RM2-T) 19.0925.47 JÚLIO MANNUEL TAVARES DINIZ (EAMPE).
const ASSOCIACOES_MANUAIS = { 5: '19092547' };

const db = getFirestore(initializeApp({ credential: applicationDefault(), projectId: 'jrs-app-web' }));
const militares = (await db.collection('militares').get()).docs.map(d => ({ id: d.id, ...d.data() }));

for (const r of linhas) {
  const id = `planilha-${r.linha}`;
  const nip = (r.INSPECIONADO.match(/\d{2}\.\d{4}\.\d{2}/) || [''])[0].replace(/\D/g, '');
  let militar = militares.find(m => m.id === (ASSOCIACOES_MANUAIS[r.linha] ?? nip));
  if (!militar && !ASSOCIACOES_MANUAIS[r.linha]) {
    // Sem NIP (ou NIP fora da base): tenta pelo nome completo, só se houver uma correspondência.
    const nome = semAcento(nip ? r.INSPECIONADO.split(/\d{2}\.\d{4}\.\d{2}/)[1] : r.INSPECIONADO.replace(/^\S+(\s\([^)]*\))?\s/, ''));
    const achados = militares.filter(m => semAcento(m.nome) === nome);
    if (achados.length === 1) militar = achados[0];
  }

  const dataAtestado = isoDeBR(r.DATA_ATESTADO);
  const tempoHomologado = dias(r.TEMPO_HOMOLOG);
  const dataTermino = terminoDe(dataAtestado, tempoHomologado);
  const terminoPlanilha = isoDeBR(r.DATA_TERMINO);
  const [dr, mr, ar] = r.DATA.split('/').map(Number);
  const doc = {
    militarId: militar?.id ?? nip,
    inspecionado: militar?.inspecionado ?? r.INSPECIONADO,
    om: r.OM,
    ...(r.SERVICO && r.OM.trim().toUpperCase() === 'HNRE' ? { servico: r.SERVICO } : {}),
    cid: r.CID,
    dispensas: r.DISPENSAS.split(',').map(s => s.trim()).filter(Boolean),
    dataAtestado,
    tempoAtestado: dias(r.TEMPO_ATESTADO),
    tempoHomologado,
    dataTermino,
    vdf: String(r.VDF).toUpperCase() === 'TRUE',
    peritoUsuario: r.PERITO,
    peritoNome: r.PERITO,
    peritoUid: '',
    pdfUrl: r.ARQUIVO,
    criadoEm: Timestamp.fromDate(new Date(ar, mr - 1, dr, 12)),
    migradoDaPlanilha: true,
  };

  const avisos = [];
  if (!militar) avisos.push(nip ? `NIP ${nip} fora da base "militares"` : 'sem NIP e sem correspondência única por nome');
  if (dataTermino !== terminoPlanilha) avisos.push(`DATA_TERMINO da planilha (${terminoPlanilha}) difere da calculada (${dataTermino})`);
  const situacao = `${id}  ${doc.inspecionado}  militarId=${doc.militarId || '—'}${avisos.length ? `  ⚠ ${avisos.join('; ')}` : ''}`;

  const ref = db.collection('periciasMenores').doc(id);
  if ((await ref.get()).exists && !sobrescrever) { console.log(`JÁ EXISTE   ${situacao}`); continue; }
  if (!aplicar) { console.log(`(simulação) ${situacao}`); continue; }
  await ref.set({ ...doc, importadoEm: FieldValue.serverTimestamp() });
  console.log(`OK          ${situacao}`);
}
