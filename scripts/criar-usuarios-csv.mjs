// Ficheiro: scripts/criar-usuarios-csv.mjs
// Cria em lote contas de usuário do app (Firebase Authentication + usuarios/{uid} + usuarios_publicos/{uid})
// a partir de um CSV no formato da planilha de usuários:
//   nip,perfil,postoGraduacao,cargo,nomeCompleto,usuario,crmPe,rqe,email,gmail,Celular,imgUrl
// Faz o mesmo que "Novo usuário" em Usuários (Admin): login = "usuario" (e-mail sintético
// <slug>@jrs-hnre.internal), senha inicial informada e senhaTemporaria=true (o app pede a troca).
// Usuário cujo login já existe é pulado (nunca sobrescreve conta ou perfil).
//
// Uso: GOOGLE_APPLICATION_CREDENTIALS=<chave da service account> \
//        node scripts/criar-usuarios-csv.mjs <arquivo.csv> <senhaInicial> [--aplicar]
// Sem --aplicar, só mostra o que seria feito.
import fs from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [arquivo, senha, flag] = process.argv.slice(2);
if (!arquivo || !senha) { console.error('Uso: node scripts/criar-usuarios-csv.mjs <arquivo.csv> <senhaInicial> [--aplicar]'); process.exit(1); }
if (senha.length < 6) { console.error('A senha inicial precisa ter ao menos 6 caracteres.'); process.exit(1); }
const aplicar = flag === '--aplicar';
const PERFIS = ['admin', 'user_medicos', 'user_secretaria', 'user_medicos_mpi', 'user_medicos_geral'];

const slugify = v => v.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
const emailSintetico = usuario => `${slugify(usuario)}@jrs-hnre.internal`;
const digitos = v => String(v || '').replace(/\D/g, '');

// CSV simples (aspas opcionais, separador vírgula).
const parseCsv = texto => {
  const linhas = []; let campo = ''; let linha = []; let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) { if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c; }
    else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter(l => l.some(v => v.trim()));
};

const tabela = parseCsv(fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, ''));
const cab = tabela[0].map(c => c.trim().toLowerCase());
const col = nome => cab.indexOf(nome.toLowerCase());
for (const c of ['nip', 'perfil', 'postoGraduacao', 'cargo', 'nomeCompleto', 'usuario']) {
  if (col(c) < 0) { console.error(`Coluna "${c}" ausente no CSV.`); process.exit(1); }
}
const val = (l, nome) => (col(nome) >= 0 ? (l[col(nome)] ?? '').trim() : '');

initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

let criados = 0, pulados = 0, erros = 0;
for (const l of tabela.slice(1)) {
  const usuario = val(l, 'usuario').replace(/\s+/g, ' ');
  const perfil = val(l, 'perfil');
  if (!usuario || !PERFIS.includes(perfil)) { console.log(`ERRO  linha sem usuário ou com perfil inválido: ${usuario || '?'} (${perfil})`); erros++; continue; }
  const email = emailSintetico(usuario);
  const existente = await auth.getUserByEmail(email).catch(() => null);
  if (existente) { console.log(`PULA  ${usuario} — login já existe (uid ${existente.uid})`); pulados++; continue; }
  const doc = {
    usuario,
    postoGraduacao: val(l, 'postoGraduacao'),
    cargo: val(l, 'cargo'),
    nome: val(l, 'nomeCompleto').toUpperCase(),
    nip: val(l, 'nip'),
    crmPe: digitos(val(l, 'crmPe')),
    rqe: digitos(val(l, 'rqe')),
    email: val(l, 'email').toLowerCase(),
    gmail: val(l, 'gmail').toLowerCase(),
    celular: val(l, 'Celular') || val(l, 'celular'),
    perfil,
    ativo: true,
    imageProfile: val(l, 'imgUrl'),
    senhaTemporaria: true,
  };
  if (!aplicar) { console.log(`CRIA  ${usuario} <${email}> ${perfil} · ${doc.nome}`); criados++; continue; }
  try {
    const u = await auth.createUser({ email, password: senha, displayName: usuario });
    await db.collection('usuarios').doc(u.uid).set(doc);
    await db.collection('usuarios_publicos').doc(u.uid).set({ usuario, ativo: true });
    console.log(`OK    ${usuario} (uid ${u.uid})`);
    criados++;
  } catch (e) {
    console.log(`ERRO  ${usuario}: ${e.message}`);
    erros++;
  }
}
console.log(`\n${aplicar ? 'Criados' : 'A criar'}: ${criados} · já existentes: ${pulados} · erros: ${erros}${aplicar ? '' : '\n(simulação — rode com --aplicar para gravar)'}`);
if (erros) process.exit(1);
