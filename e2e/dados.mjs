// Ficheiro: e2e/dados.mjs
// Dados dos testes E2E, gravados nos emuladores do Firebase (nunca na produção) pelo
// Admin SDK: dois usuários (MPI e Secretaria) e um concurso com um candidato agendado
// para hoje e outro atrasado.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const SENHA = 'senha-e2e-123';
export const MPI = { uid: 'e2e-mpi', usuario: 'CT TESTE MPI', nome: 'TESTE MPI', nip: '11.1111.11', perfil: 'user_medicos_mpi' };
export const SECRETARIA = { uid: 'e2e-sec', usuario: '1SG TESTE SEC', nome: 'TESTE SECRETARIA', nip: '22.2222.22', perfil: 'user_secretaria' };
export const CONCURSO = { id: 'E2E-2026', nome: 'E2E/2026' };

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const HOJE = iso(new Date());
export const ATRASADA = iso(new Date(Date.now() - 3 * 86_400_000));

// Mesmo e-mail sintético de services/firebaseAuth.ts (usuarioToEmail).
const email = (usuario) => `${usuario.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase()}@jrs-hnre.internal`;

const candidato = (nome, dataAgendamento) => ({
  nome, dataAgendamento, status: '', observacoes: '', finalizado: false, recurso: false, dataLaudo: '', laudo: '', numTIS: '',
  termoRecursoUrl: '', termoCientificacaoUrl: '', solicitacoesParecer: [], solicitacoesExames: [],
  examesQtd: 0, examesPdfUrls: [], examesEnviadoEm: '',
});

export const semear = async () => {
  const app = initializeApp({ projectId: 'demo-jrs' });
  const auth = getAuth(app);
  const db = getFirestore(app);
  for (const u of [MPI, SECRETARIA]) {
    await auth.createUser({ uid: u.uid, email: email(u.usuario), password: SENHA }).catch(e => { if (e.code !== 'auth/uid-already-exists') throw e; });
    await db.doc(`usuarios/${u.uid}`).set({
      usuario: u.usuario, nome: u.nome, nip: u.nip, perfil: u.perfil, ativo: true, postoGraduacao: '', cargo: '',
      crmPe: '', rqe: '', email: '', gmail: '', celular: '', imageProfile: '', senhaTemporaria: false, pwaTutorialConcluido: true,
    });
    await db.doc(`usuarios_publicos/${u.uid}`).set({ usuario: u.usuario, ativo: true });
  }
  await db.doc(`concursos/${CONCURSO.id}`).set({
    nome: CONCURSO.nome, status: 'em_andamento', dataHoraMensagemInicial: '', assuntoMensagemInicial: '',
    periodoInicioISO: '', periodoFimISO: '', totalCandidatos: 2, criadoEm: new Date().toISOString(),
  });
  await db.doc(`concursos/${CONCURSO.id}/candidatos/1001`).set(candidato('CANDIDATO DE HOJE', HOJE));
  await db.doc(`concursos/${CONCURSO.id}/candidatos/1002`).set(candidato('CANDIDATO ATRASADO', ATRASADA));
};
