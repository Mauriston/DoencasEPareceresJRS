// Ficheiro: scripts/testar-regras-firestore.cjs
// Testa o comportamento de firestore.rules (sem publicar nada) no simulador da API
// Firebase Rules (projects.test): cada caso simula um perfil fazendo uma gravação e
// confere se a regra permite (ALLOW) ou nega (DENY). Os get()/exists() das regras
// (perfil em usuarios/{uid} e a matriz config/permissoes) são simulados por caso.
//
// Uso: GOOGLE_APPLICATION_CREDENTIALS=<chave da service account> node scripts/testar-regras-firestore.cjs
// (papel necessário: "Firebase Rules Admin" ou "Firebase Rules Viewer"). Roda no CI antes
// de publicar as regras (.github/workflows/deploy-firestore-rules.yml); sai com erro se algum
// caso falhar.
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const PROJETO = process.env.FIREBASE_PROJECT_ID || 'jrs-app-web';
const DB = '/databases/(default)/documents';
const base = { nome: 'X', status: '', observacoes: '', numTIS: '', finalizado: false, dataAgendamento: '2026-11-03', examesQtd: 0 };
const mocks = (perfil, permissoes) => [
  { function: 'get', args: [{ exactValue: `${DB}/usuarios/u1` }], result: { value: { data: { perfil } } } },
  { function: 'exists', args: [{ exactValue: `${DB}/config/permissoes` }], result: { value: !!permissoes } },
  ...(permissoes ? [{ function: 'get', args: [{ exactValue: `${DB}/config/permissoes` }], result: { value: { data: { features: permissoes } } } }] : []),
];
const upd = (nome, perfil, patch, esperado, perm, path = 'concursos/c1/candidatos/m1', atual = base) => ({
  nome, tc: {
    expectation: esperado,
    request: { auth: { uid: 'u1' }, path: `${DB}/${path}`, method: 'update', resource: { data: { ...atual, ...patch } } },
    resource: { data: atual },
    functionMocks: mocks(perfil, perm),
  },
});
const cre = (nome, perfil, path, esperado) => ({ nome, tc: {
  expectation: esperado,
  request: { auth: { uid: 'u1' }, path: `${DB}/${path}`, method: 'create', resource: { data: base } },
  functionMocks: mocks(perfil),
} });
const casos = [
  upd('MPI grava triagem', 'user_medicos_mpi', { triagem: { altura: '1,75' } }, 'ALLOW'),
  upd('Médico JRS grava triagem', 'user_medicos', { triagem: { altura: '1,75' } }, 'DENY'),
  upd('Secretaria grava triagem', 'user_secretaria', { triagem: { altura: '1,75' } }, 'DENY'),
  upd('Médico altera Status/TIS', 'user_medicos', { status: 'APTO', numTIS: '1', finalizado: true }, 'ALLOW'),
  upd('Secretaria altera Status (padrão: não pode)', 'user_secretaria', { status: 'APTO' }, 'DENY'),
  upd('Secretaria altera Status com permissão dada pelo Admin', 'user_secretaria', { status: 'APTO' }, 'ALLOW', { 'concursosJRS.editarDadosTabela': { user_secretaria: true } }),
  upd('Médico altera Status com permissão retirada pelo Admin', 'user_medicos', { status: 'APTO' }, 'DENY', { 'concursosJRS.editarDadosTabela': { user_medicos: false } }),
  upd('Secretaria reagenda', 'user_secretaria', { dataAgendamento: '2026-11-10', status: 'Reagendado' }, 'ALLOW'),
  upd('Secretaria reagenda sem mudar a data (status forjado)', 'user_secretaria', { status: 'Reagendado' }, 'DENY'),
  upd('Médico gera Pedido de Parecer', 'user_medicos', { solicitacoesParecer: [{ url: 'u' }], status: 'Pendente', observacoes: 'SOLICITADO' }, 'ALLOW'),
  upd('Médico sem editar tabela muda status via grupo de solicitação', 'user_medicos', { status: 'APTO', observacoes: 'x' }, 'DENY', { 'concursosJRS.editarDadosTabela': { user_medicos: false } }),
  upd('Médico confirma agendamento (só data)', 'user_medicos', { dataAgendamento: '2026-11-12' }, 'ALLOW'),
  upd('Médico reagenda (padrão: não pode)', 'user_medicos', { dataAgendamento: '2026-11-10', status: 'Reagendado' }, 'DENY'),
  upd('Secretaria envia exames', 'user_secretaria', { examesQtd: 3, examesPdfUrls: ['u'], examesEnviadoEm: 'x' }, 'ALLOW'),
  upd('Secretaria gera termo de cientificação', 'user_secretaria', { termoCientificacaoUrl: 'u' }, 'ALLOW'),
  upd('Médico mistura Status e triagem', 'user_medicos_mpi', { status: 'APTO', triagem: {} }, 'DENY'),
  upd('Admin limpa IS', 'admin', { status: '', numTIS: '', examesQtd: 0, triagem: null }, 'ALLOW'),
  upd('Médico muda status do concurso', 'user_medicos', { status: 'encerrado' }, 'DENY', null, 'concursos/c1', { nome: 'C', status: 'em_andamento', totalCandidatos: 1 }),
  upd('Admin muda status do concurso', 'admin', { status: 'encerrado' }, 'ALLOW', null, 'concursos/c1', { nome: 'C', status: 'em_andamento', totalCandidatos: 1 }),
  upd('Médico atualiza totalCandidatos', 'user_medicos', { totalCandidatos: 2 }, 'ALLOW', null, 'concursos/c1', { nome: 'C', status: 'em_andamento', totalCandidatos: 1 }),
  cre('Médico adiciona candidato', 'user_medicos', 'concursos/c1/candidatos/m2', 'ALLOW'),
  cre('Secretaria adiciona candidato', 'user_secretaria', 'concursos/c1/candidatos/m2', 'DENY'),
  cre('Secretaria cria concurso', 'user_secretaria', 'concursos/c9', 'DENY'),
  cre('Médico cria concurso', 'user_medicos', 'concursos/c9', 'ALLOW'),
  cre('Secretaria envia PDF de exames (subcoleção)', 'user_secretaria', 'concursos/c1/candidatos/m1/exames/e1', 'ALLOW'),
];
(async () => {
  const c = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();
  const content = require('fs').readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  const r = (await c.request({ url: `https://firebaserules.googleapis.com/v1/projects/${PROJETO}:test`, method: 'POST',
    data: { source: { files: [{ name: 'firestore.rules', content }] }, testSuite: { testCases: casos.map(x => x.tc) } } })).data;
  if (r.issues?.some(i => i.severity === 'ERROR')) { console.error('Erro de compilação:', JSON.stringify(r.issues)); process.exit(1); }
  let falhas = 0;
  r.testResults.forEach((t, i) => {
    const ok = t.state === 'SUCCESS';
    if (!ok) falhas++;
    console.log(`${ok ? 'OK  ' : 'FALHA'} ${casos[i].nome}${ok ? '' : ' → ' + JSON.stringify(t.debugMessages || t.errorPosition || '')}`);
  });
  console.log(`\n${casos.length - falhas}/${casos.length} casos como esperado`);
  if (falhas) process.exit(1);
})().catch(e => { console.error('ERR', e.response?.status, JSON.stringify(e.response?.data || e.message).slice(0, 800)); process.exit(1); });
