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
// Médico da JRS: acessa Inspeções, Pareceres e Perícia Menor (a Secretaria não vê Pareceres nem Perícia Menor).
export const MEDICO = { uid: 'e2e-med', usuario: 'CT TESTE MEDICO', nome: 'TESTE MEDICO', nip: '33.3333.33', perfil: 'user_medicos' };
// Registros semeados das telas de Inspeções, Pareceres e Perícia Menor. Dados fictícios.
export const INSPECIONADO = { nip: '44444444', texto: '1T (IM) 44.4444.44 PACIENTE DE TESTE', nome: 'PACIENTE DE TESTE' };
export const IS_E2E = { numero: 9001, finalidade: 'Controle Trienal' };
export const PARECER_E2E = { id: 'parecer-e2e', especialidade: 'Ortopedia' };
export const PERICIA_E2E = { id: 'pericia-e2e', cid: 'M54.5 - Dor lombar baixa' };

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
  for (const u of [MPI, SECRETARIA, MEDICO]) {
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

export const semearTelas = async () => {
  const db = getFirestore(initializeApp({ projectId: 'demo-jrs' }, 'telas'));
  const agora = new Date();
  await db.doc(`inspecoes/${IS_E2E.numero}`).set({
    is: IS_E2E.numero, dataAbertura: HOJE, dataEntrevista: '', finalidade: IS_E2E.finalidade, grupoFinalidade: 'Verificações e Términos', amp: 'JRS',
    peritoUid: '', peritoNome: '', peritoGmail: '', inspecionadoId: INSPECIONADO.nip, inspecionado: INSPECIONADO.texto,
    situacao: 'aberta', status: 'aberta', dataLaudo: '', laudo: '', observacoes: '', restricoes: '', tis: '', ds1a: '',
    criadoPor: MEDICO.usuario, criadoEm: agora,
  });
  await db.doc(`pareceres/${PARECER_E2E.id}`).set({
    militarId: INSPECIONADO.nip, inspecionado: INSPECIONADO.texto, especialidade: PARECER_E2E.especialidade, finalidade: IS_E2E.finalidade,
    historico: 'Histórico fictício do E2E.', quesitos: ['Quesito 1 do E2E?'], pdfUrl: '', status: 'solicitado',
    solicitanteUid: MEDICO.uid, solicitanteNome: MEDICO.nome, solicitanteUsuario: MEDICO.usuario, solicitantePosto: 'CT', criadoEm: agora,
  });
  await db.doc(`periciasMenores/${PERICIA_E2E.id}`).set({
    militarId: INSPECIONADO.nip, inspecionado: INSPECIONADO.texto, om: 'HNRe', cid: PERICIA_E2E.cid, dispensas: [],
    dataAtestado: HOJE, tempoAtestado: 3, tempoHomologado: 3, dataTermino: iso(new Date(Date.now() + 2 * 86_400_000)), vdf: false,
    peritoUsuario: MEDICO.usuario, peritoNome: MEDICO.nome, peritoUid: MEDICO.uid, pdfUrl: '', criadoEm: agora,
  });
};
