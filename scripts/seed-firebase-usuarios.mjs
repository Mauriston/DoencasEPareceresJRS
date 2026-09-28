// Script de migração ÚNICA: cria no projeto Firebase (jrs-app-web) as contas
// de Authentication + os documentos Firestore dos 6 usuários que hoje existem
// na aba "Usuarios" da planilha do Google Sheets.
//
// Uso (uma única vez, depois de ativar Firestore + Authentication/E-mail-senha
// no projeto jrs-app-web e de o firebase-applet-config.json já apontar para ele):
//   1. No console do Firebase, publique TEMPORARIAMENTE em Firestore > Regras:
//        allow read, write: if true;
//      (necessário só porque o 1º usuário criado é admin e as regras
//      definitivas de firestore.rules exigem que já exista um admin para
//      autorizar a criação de outro usuário — problema clássico de
//      "bootstrap" de permissões.)
//   2. node scripts/seed-firebase-usuarios.mjs
//   3. Publique de volta o conteúdo definitivo de firestore.rules.
//
// Todos os usuários recebem senha inicial = NIP (somente dígitos) e
// senhaTemporaria=true, para serem orientados a trocar a senha no 1º acesso
// — exatamente como o fluxo de "Admin cria usuário" do app. Este script pode
// ser apagado com segurança depois de rodado (não é usado pelo app).
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const EMAIL_DOMAIN = 'jrs-hnre.internal';
const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
const usuarioToEmail = (usuario) => `${slugify(usuario)}@${EMAIL_DOMAIN}`;
const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

// Dados extraídos da aba "Usuarios" da planilha (Sheets) em 28/09/2026.
const USUARIOS = [
  {
    usuario: 'CT MAURISTON',
    postoGraduacao: 'Capitão-Tenente (Md)',
    cargo: 'Presidente',
    nome: 'MAURISTON RENAN MARTINS SILVA',
    nip: '13.0450.24',
    crmPe: '20674',
    rqe: '16460',
    email: 'mauriston.martins@marinha.mil.br',
    // Corrigido o domínio (a planilha tem um erro de digitação: "oncoortopedia.cpom").
    gmail: 'mauriston@oncoortopedia.com',
    celular: '(81) 98654-1187',
    perfil: 'admin',
    ativo: true,
    imageProfile: 'https://i.imgur.com/oTJDbCX.jpeg',
  },
  {
    usuario: 'CT JÚLIO CÉSAR',
    postoGraduacao: 'Capitão-Tenente (RM2-Md)',
    cargo: 'Membro',
    nome: 'JÚLIO CÉSAR XAVIER FILHO',
    nip: '19.0270.36',
    crmPe: '27502',
    rqe: '16262',
    email: 'julio.xavier@marinha.mil.br',
    gmail: 'juliocesarxavierfilho@gmail.com',
    celular: '(81) 99293-1840',
    perfil: 'user_medicos',
    ativo: true,
    imageProfile: 'https://i.imgur.com/35A5f7O.jpeg',
  },
  {
    usuario: '1T MÔNICA VIRGÍNIA',
    postoGraduacao: 'Primeiro-Tenente (Md)',
    cargo: 'Membro',
    nome: 'MÔNICA VIRGÍNIA SOLANO BRITO MARINHO',
    nip: '16.0236.84',
    crmPe: '24407',
    rqe: '3956',
    email: 'monica.virginia@marinha.mil.br',
    gmail: 'monicavsbrito@gmail.com',
    celular: '(84) 99664-7300',
    perfil: 'user_medicos',
    ativo: true,
    imageProfile: 'https://i.imgur.com/bbtHwam.jpeg',
  },
  {
    usuario: '2T CASSUNDÉ',
    postoGraduacao: 'Segundo-Tenente (RM2-Md)',
    cargo: 'MPI/HNRe',
    nome: 'DANIEL MIRANDA CASSUNDÉ FILHO',
    nip: '26.0227.29',
    crmPe: '40418',
    rqe: '',
    email: 'daniel.cassunde@marinha.mil.br',
    gmail: 'danielmcassunde@gmail.com',
    celular: '(81) 98202-5433',
    perfil: 'user_secretaria',
    ativo: true,
    imageProfile: 'https://i.imgur.com/SgedgT8.jpeg',
  },
  {
    usuario: '1SG-EF DAYVISON',
    postoGraduacao: '1º Sargento-EF',
    cargo: 'Secretário JRS/HNRe',
    nome: 'DAYVISON RUBEM DA SILVA',
    nip: '05.0343.37',
    crmPe: '',
    rqe: '',
    email: 'dayvison.rubem@marinha.mil.br',
    gmail: 'dayvisonrubem@gmail.com',
    celular: '(81) 97901-5858',
    perfil: 'user_secretaria',
    ativo: true,
    imageProfile: '',
  },
  {
    usuario: '1T OLIVEIRA',
    postoGraduacao: 'Primeiro-Tenente (RM2-Md)',
    cargo: 'MPI/HNRe',
    nome: 'DANIEL OLIVEIRA ARAÚJO',
    nip: '25.0031.27',
    crmPe: '38277',
    rqe: '',
    email: 'daniel.oliveira@marinha.mil.br',
    gmail: 'daniel.oliveira.araujo1@gmail.com',
    celular: '(81) 99724-2097',
    perfil: 'user_medicos',
    // Na planilha esse usuário está com a coluna "ativo" em branco (inativo).
    ativo: false,
    imageProfile: 'https://i.imgur.com/7tborlD.jpeg',
  },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  for (const { usuario, ...perfil } of USUARIOS) {
    const email = usuarioToEmail(usuario);
    const senhaInicial = onlyDigits(perfil.nip);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senhaInicial);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        usuario,
        ...perfil,
        senhaTemporaria: true,
      });
      console.log(`OK  ${usuario} -> uid=${cred.user.uid} (login: ${email})`);
    } catch (err) {
      console.error(`ERRO ${usuario}:`, err.code || err.message);
    }
  }

  await signOut(auth);
  console.log('\nConcluído. Cada usuário pode entrar com o login de sempre e senha = NIP (só números).');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
