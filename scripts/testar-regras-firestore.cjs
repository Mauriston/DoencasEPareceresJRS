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
// Entrevistas gravadas da IS (inspecoes/{id}/entrevistas/{eid}): só a junta (Admin e user_medicos).
const ENT = 'inspecoes/9001/entrevistas/e1';
const entNova = {
  isId: '9001', finalidade: 'Atestado de Origem', situacao: 'aguardando_envio',
  participantes: [{ nome: 'CT A', papel: 'perito' }, { nome: 'SG B', papel: 'inspecionado' }],
  consentimento: { uid: 'u1', nome: 'CT A', em: 'x' }, criadoPor: { uid: 'u1', nome: 'CT A', em: 'x' },
};
const entPronta = { ...entNova, situacao: 'pronta', transcricao: [{ falante: 'F1', inicioSeg: 0, fimSeg: 1, texto: 'x' }], mapaFalantes: { F1: 'CT A' }, anamnese: { resumoExecutivo: 'x' } };
const creEnt = (nome, perfil, patch, esperado) => ({ nome, tc: {
  expectation: esperado,
  request: { auth: { uid: 'u1' }, path: `${DB}/${ENT}`, method: 'create', resource: { data: { ...entNova, ...patch } } },
  functionMocks: mocks(perfil),
} });
const reqEnt = (nome, perfil, method, esperado) => ({ nome, tc: {
  expectation: esperado,
  request: { auth: { uid: 'u1' }, path: `${DB}/${ENT}`, method },
  resource: { data: entPronta }, functionMocks: mocks(perfil),
} });
// Exames da IS (inspecoes/{id}/exames/{eid}): a equipe envia e apaga enquanto a IS não está finalizada.
const EXA = 'inspecoes/9001/exames/x1';
const exaNovo = { caminho: 'inspecoes/9001/exames/x1.pdf', nomeArquivo: 'rm.pdf', itens: [], enviadoPor: { uid: 'u1', usuario: 'ct' } };
const mocksExa = (perfil, situacao) => [...mocks(perfil), { function: 'get', args: [{ exactValue: `${DB}/inspecoes/9001` }], result: { value: { data: { situacao } } } }];
const exa = (nome, perfil, method, situacao, esperado, patch = {}) => ({ nome, tc: {
  expectation: esperado,
  request: { auth: { uid: 'u1' }, path: `${DB}/${EXA}`, method, ...(method === 'create' ? { resource: { data: { ...exaNovo, ...patch } } } : {}) },
  ...(method === 'create' ? {} : { resource: { data: exaNovo } }),
  functionMocks: mocksExa(perfil, situacao),
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
  // user_medicos_geral (demais médicos do HNRe): só Perícia Menor.
  cre('Médico Geral registra perícia menor', 'user_medicos_geral', 'periciasMenores/p1', 'ALLOW'),
  { nome: 'Médico registra perícia menor como perito de outro', tc: { expectation: 'DENY',
    request: { auth: { uid: 'u1' }, path: `${DB}/periciasMenores/p2`, method: 'create', resource: { data: { ...base, criadoPor: 'u1', peritoUid: 'u2' } } },
    functionMocks: mocks('user_medicos') } },
  { nome: 'Admin registra perícia menor com outro perito responsável', tc: { expectation: 'ALLOW',
    request: { auth: { uid: 'u1' }, path: `${DB}/periciasMenores/p3`, method: 'create', resource: { data: { ...base, criadoPor: 'u1', peritoUid: 'u2' } } },
    functionMocks: mocks('admin') } },
  { nome: 'Perícia menor com criadoPor de outro usuário', tc: { expectation: 'DENY',
    request: { auth: { uid: 'u1' }, path: `${DB}/periciasMenores/p4`, method: 'create', resource: { data: { ...base, criadoPor: 'u9', peritoUid: 'u1' } } },
    functionMocks: mocks('user_medicos') } },
  cre('Médico Geral cadastra militar (cadastro rápido da perícia)', 'user_medicos_geral', 'militares/12345678', 'ALLOW'),
  upd('Médico Geral define o Serviço do HNRe', 'user_medicos_geral', { servico_label: 'X (HNRe-00.0)' }, 'ALLOW', null, 'militares/12345678', { nome: 'X', servico_label: '' }),
  upd('Médico Geral altera nome do militar', 'user_medicos_geral', { nome: 'Y' }, 'DENY', null, 'militares/12345678', { nome: 'X', servico_label: '' }),
  cre('Médico Geral cria pedido de parecer', 'user_medicos_geral', 'pareceres/p1', 'DENY'),
  cre('Médico Geral cria IS', 'user_medicos_geral', 'inspecoes/9001', 'DENY'),
  cre('Médico Geral cria concurso', 'user_medicos_geral', 'concursos/c9', 'DENY'),
  cre('Admin grava a escala do SPA', 'admin', 'escalaSpa/2026-11-06', 'ALLOW'),
  cre('Médico grava a escala do SPA', 'user_medicos', 'escalaSpa/2026-11-06', 'DENY'),
  cre('Secretaria grava a escala do SPA', 'user_secretaria', 'escalaSpa/2026-11-06', 'DENY'),
  upd('Médico Geral altera Status de candidato', 'user_medicos_geral', { status: 'APTO' }, 'DENY'),
  // Refresh token da conta Google do servidor: nem o Admin lê ou grava pelo app (só o Admin SDK).
  cre('Admin grava segredo do servidor', 'admin', 'segredos_servidor/contaGoogle', 'DENY'),
  { nome: 'Admin lê segredo do servidor', tc: { expectation: 'DENY',
    request: { auth: { uid: 'u1' }, path: `${DB}/segredos_servidor/contaGoogle`, method: 'get' },
    resource: { data: { refreshToken: 'x' } }, functionMocks: mocks('admin') } },
  // Entrevistas gravadas: criação (o app só cria "aguardando_envio", em nome próprio, 2–4 participantes).
  creEnt('Médico JRS cria entrevista', 'user_medicos', {}, 'ALLOW'),
  creEnt('Admin cria entrevista', 'admin', {}, 'ALLOW'),
  creEnt('MPI cria entrevista', 'user_medicos_mpi', {}, 'DENY'),
  creEnt('Secretaria cria entrevista', 'user_secretaria', {}, 'DENY'),
  creEnt('Médico Geral cria entrevista', 'user_medicos_geral', {}, 'DENY'),
  creEnt('Médico cria entrevista já com transcrição', 'user_medicos', { transcricao: [] }, 'DENY'),
  creEnt('Médico cria entrevista com situação "pronta"', 'user_medicos', { situacao: 'pronta' }, 'DENY'),
  creEnt('Médico cria entrevista em nome de outro', 'user_medicos', { criadoPor: { uid: 'u2', nome: 'Y', em: 'x' } }, 'DENY'),
  creEnt('Médico cria entrevista de outra IS', 'user_medicos', { isId: '9002' }, 'DENY'),
  creEnt('Médico cria entrevista com 1 participante', 'user_medicos', { participantes: [{ nome: 'CT A', papel: 'perito' }] }, 'DENY'),
  creEnt('Médico cria entrevista com 5 participantes', 'user_medicos', { participantes: [1, 2, 3, 4, 5].map(i => ({ nome: `P${i}`, papel: 'outro' })) }, 'DENY'),
  // Revisão: só os campos editáveis pelo app.
  upd('Médico confirma falantes', 'user_medicos', { mapaFalantes: { F1: 'SG B' }, falantesConfirmados: true }, 'ALLOW', null, ENT, entPronta),
  upd('Admin edita a anamnese', 'admin', { anamneseEditada: { resumoExecutivo: 'y' }, editadoPor: { uid: 'u1', nome: 'A', em: 'x' } }, 'ALLOW', null, ENT, entPronta),
  upd('Médico marca como revisada', 'user_medicos', { revisada: { uid: 'u1', nome: 'A', em: 'x' } }, 'ALLOW', null, ENT, entPronta),
  upd('Médico grava transcrição pelo app', 'user_medicos', { transcricao: [] }, 'DENY', null, ENT, entPronta),
  upd('Médico muda a situação pelo app', 'user_medicos', { situacao: 'erro' }, 'DENY', null, ENT, entPronta),
  upd('Admin troca a anamnese da IA pelo app', 'admin', { anamnese: { resumoExecutivo: 'y' } }, 'DENY', null, ENT, entPronta),
  upd('MPI marca como revisada', 'user_medicos_mpi', { revisada: { uid: 'u1', nome: 'A', em: 'x' } }, 'DENY', null, ENT, entPronta),
  upd('Secretaria edita a anamnese', 'user_secretaria', { anamneseEditada: {} }, 'DENY', null, ENT, entPronta),
  upd('Médico Geral confirma falantes', 'user_medicos_geral', { falantesConfirmados: true }, 'DENY', null, ENT, entPronta),
  // Leitura: toda a junta lê qualquer entrevista; os demais perfis, nenhuma.
  reqEnt('Médico JRS lê entrevista', 'user_medicos', 'get', 'ALLOW'),
  reqEnt('Admin lê entrevista', 'admin', 'get', 'ALLOW'),
  reqEnt('MPI lê entrevista', 'user_medicos_mpi', 'get', 'DENY'),
  reqEnt('Secretaria lê entrevista', 'user_secretaria', 'get', 'DENY'),
  reqEnt('Médico Geral lê entrevista', 'user_medicos_geral', 'get', 'DENY'),
  reqEnt('Médico apaga entrevista', 'user_medicos', 'delete', 'DENY'),
  reqEnt('Admin apaga entrevista', 'admin', 'delete', 'ALLOW'),
  exa('Secretaria envia exame (IS em andamento)', 'user_secretaria', 'create', 'andamento', 'ALLOW'),
  exa('MPI envia exame (IS aberta)', 'user_medicos_mpi', 'create', 'aberta', 'ALLOW'),
  exa('Médico envia exame em IS finalizada', 'user_medicos', 'create', 'finalizada', 'DENY'),
  exa('Médico Geral envia exame', 'user_medicos_geral', 'create', 'andamento', 'DENY'),
  exa('Exame em nome de outro usuário', 'user_medicos', 'create', 'andamento', 'DENY', { enviadoPor: { uid: 'u2', usuario: 'x' } }),
  exa('Exame com caminho de outra IS', 'user_medicos', 'create', 'andamento', 'DENY', { caminho: 'inspecoes/9002/exames/x1.pdf' }),
  exa('Médico apaga exame (IS em andamento)', 'user_medicos', 'delete', 'andamento', 'ALLOW'),
  exa('Apagar exame de IS finalizada', 'admin', 'delete', 'finalizada', 'DENY'),
  exa('Médico Geral lê exame', 'user_medicos_geral', 'get', 'andamento', 'DENY'),
  exa('Alterar exame', 'admin', 'update', 'andamento', 'DENY', {}),
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
