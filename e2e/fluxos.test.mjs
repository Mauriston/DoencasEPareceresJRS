// Ficheiro: e2e/fluxos.test.mjs
// Fluxos críticos no navegador, contra o app real (server.ts + Vite) ligado aos emuladores do
// Firebase: página pública, login por NIP, item de IS atrasadas na Início, triagem pelo MPI
// (TRIAR → alertas → TRIADO), o que a Secretaria vê e as telas de Inspeções, Pareceres e Perícia Menor
// (carregamento, busca, detalhe, formulário de cadastro e permissões). Rodar com `npm run test:e2e`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { MPI, SECRETARIA, MEDICO, SENHA, CONCURSO, INSPECIONADO, IS_E2E, IS_AGENDADA_E2E, PARECER_E2E, PERICIA_E2E } from './dados.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3100/DoencasEPareceresJRS/';
let navegador;

before(async () => { navegador = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}); });
after(async () => { await navegador?.close(); });

const novaPagina = async () => {
  const contexto = await navegador.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR' });
  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(20_000);
  return pagina;
};

const entrar = async (pagina, usuario) => {
  await pagina.goto(BASE);
  // Splash do 1º acesso (contexto novo = aparelho novo): um toque leva ao formulário.
  await pagina.getByLabel('Toque para continuar').click({ timeout: 10_000 }).catch(() => { /* sem splash */ });
  await pagina.getByLabel('NIP').fill(usuario.nip.replace(/\D/g, ''));
  await pagina.getByLabel('Senha').fill(SENHA);
  await pagina.getByRole('button', { name: /entrar/i }).click();
  await pagina.getByText(/Bom dia|Boa tarde|Boa noite/).first().waitFor();
  // Aviso da triagem (MPI, 3 primeiros acessos): fecha para seguir.
  const entendi = pagina.getByRole('button', { name: 'Entendi' });
  // O aviso aparece um instante depois da saudação: espera um pouco em vez de testar só uma vez.
  await entendi.click({ timeout: 4_000 }).catch(() => { /* sem aviso para este perfil */ });
};

const abrirConcurso = async (pagina) => {
  await pagina.goto(`${BASE}#/concursos/${CONCURSO.id}`);
  await pagina.getByText('CANDIDATO DE HOJE').first().waitFor();
};

// Inspeções: a Tabela abre em "Em andamento" · "Este mês"; alterna as situações indicadas no dropdown de Situação.
const alternarSituacoes = async (pagina, nomes) => {
  await pagina.getByRole('button', { name: /^Situação:/ }).click();
  const painel = pagina.getByRole('dialog', { name: 'Situação' });
  for (const n of nomes) await painel.getByRole('checkbox', { name: new RegExp(`^${n}`) }).click();
  await pagina.keyboard.press('Escape');
  await painel.waitFor({ state: 'detached' });
};

test('página pública das Doenças de Lei abre sem login', async () => {
  const p = await novaPagina();
  await p.goto(`${BASE}#/publico/doencas`);
  await p.getByText(/Doenças/i).first().waitFor();
  assert.equal(await p.getByLabel('Senha').count(), 0);
  await p.context().close();
});

test('MPI entra pelo NIP e a Início mostra a IS de concurso atrasada', async () => {
  const p = await novaPagina();
  await entrar(p, MPI);
  await p.getByText('1 IS de concurso atrasada').waitFor();
  await p.context().close();
});

test('MPI faz a triagem: TRIAR só na IS de hoje, alertas e TRIADO', async () => {
  const p = await novaPagina();
  await entrar(p, MPI);
  await abrirConcurso(p);

  const linhaHoje = p.locator('tr', { hasText: 'CANDIDATO DE HOJE' });
  const linhaAtrasada = p.locator('tr', { hasText: 'CANDIDATO ATRASADO' });
  assert.equal(await linhaAtrasada.getByRole('button', { name: 'TRIAR' }).count(), 0, 'TRIAR não aparece na IS de outro dia');
  await linhaHoje.getByRole('button', { name: 'TRIAR' }).click();

  const dialogo = p.getByRole('dialog', { name: 'Triagem' });
  await dialogo.getByLabel('Altura').fill('152');
  assert.equal(await dialogo.getByLabel('Altura').inputValue(), '1,52', 'vírgula automática');
  await dialogo.getByLabel('Peso').fill('80');
  await dialogo.getByLabel('PAS').fill('120');
  await dialogo.getByLabel('PAD').fill('80');
  await dialogo.getByLabel('FC').fill('70');
  await dialogo.getByLabel('Snellen S/C').fill('20');
  await dialogo.getByLabel('Ishihara · erros').fill('0');
  assert.equal(await dialogo.getByLabel('IMC').inputValue(), '34,6');
  await dialogo.getByText(/2 alertas/).waitFor();
  await dialogo.getByText(/R62\.8/).waitFor();
  await dialogo.getByText(/E66\.9/).waitFor();
  await dialogo.getByRole('button', { name: 'Salvar triagem' }).click();

  const triado = linhaHoje.getByRole('button', { name: /TRIADO/ });
  await triado.waitFor();
  assert.match(await triado.innerText(), /2/, 'badge com os 2 alertas');

  // TRIADO abre a seção de triagem na barra lateral.
  await triado.click();
  await p.getByRole('region', { name: 'Triagem' }).getByText('1,52 m').waitFor();
  await p.context().close();
});

test('Secretaria não vê TRIAR nem TRIADO', async () => {
  const p = await novaPagina();
  await entrar(p, SECRETARIA);
  await abrirConcurso(p);
  assert.equal(await p.getByRole('button', { name: /^TRIA(R|DO)/ }).count(), 0);
  await p.context().close();
});

test('Inspeções: lista a IS semeada, filtra pela busca e abre o detalhe', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  await p.getByRole('heading', { name: 'Inspeções de Saúde' }).waitFor();
  await alternarSituacoes(p, ['Abertas']); // a IS semeada está aberta (não agendada)
  const abrir = p.getByRole('button', { name: `Abrir IS ${IS_E2E.numero}` });
  await abrir.waitFor();

  const busca = p.getByLabel('Buscar IS');
  await busca.fill('NADA-COM-ESSE-TEXTO');
  await p.getByText('Nenhuma IS encontrada').waitFor();
  await busca.fill(INSPECIONADO.nome);
  await abrir.waitFor();

  await abrir.click();
  const detalhe = p.getByRole('dialog', { name: `IS ${IS_E2E.numero}` });
  await detalhe.waitFor();
  await detalhe.getByText('Dados da IS').waitFor();
  await detalhe.getByText('Conclusão da IS').waitFor();
  // Sem select de Status e sem "Salvar alterações": a Conclusão grava sozinha.
  assert.equal(await detalhe.getByRole('button', { name: 'Salvar alterações' }).count(), 0);
  assert.equal(await detalhe.getByLabel('Status').count(), 0);
  // Nº do TIS e DS-1a ficam desabilitados sem Laudo.
  assert.equal(await detalhe.getByLabel('Nº do TIS').isDisabled(), true);
  assert.equal(await detalhe.getByLabel('DS-1a').isDisabled(), true);
  await detalhe.getByLabel('Observações').fill('Observação do E2E');
  await detalhe.getByLabel('Observações').blur();
  await detalhe.getByText('Salvo', { exact: true }).waitFor();
  await p.context().close();
});

test('Inspeções: Restrições (Verificações e Términos, sem laudo) — clicar seleciona e o × do chip remove', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  await alternarSituacoes(p, ['Abertas']);
  await p.getByRole('button', { name: `Abrir IS ${IS_E2E.numero}` }).click();
  const detalhe = p.getByRole('dialog', { name: `IS ${IS_E2E.numero}` });
  const campo = detalhe.getByRole('combobox', { name: 'Restrições' });
  await campo.click();
  const lista = detalhe.getByRole('listbox', { name: 'Restrições' });
  await lista.waitFor();
  assert.equal(await lista.getByRole('option', { name: 'TODAS AS ATIVIDADES' }).count(), 0, 'sem "TODAS AS ATIVIDADES"');
  await lista.getByRole('option', { name: 'Marchas', exact: true }).click();
  await detalhe.getByRole('button', { name: 'Remover Marchas' }).waitFor();
  assert.equal(await lista.getByRole('option', { name: 'Marchas', exact: true }).getAttribute('aria-selected'), 'true');
  // Digitar filtra; Enter alterna a opção ativa.
  await campo.fill('embar');
  assert.equal(await lista.getByRole('option').count(), 1);
  await campo.press('Enter');
  await detalhe.getByRole('button', { name: 'Remover Embarque' }).waitFor();
  await detalhe.getByText('Salvo', { exact: true }).waitFor();
  // O × do chip remove; Esc fecha só a lista.
  await detalhe.getByRole('button', { name: 'Remover Marchas' }).click();
  await detalhe.getByRole('button', { name: 'Remover Marchas' }).waitFor({ state: 'detached' });
  await campo.press('Escape');
  await lista.waitFor({ state: 'detached' });
  await detalhe.waitFor();
  // Backspace no campo vazio remove o último chip (deixa a IS como estava).
  await campo.press('Backspace');
  await detalhe.getByRole('button', { name: 'Remover Embarque' }).waitFor({ state: 'detached' });
  await p.context().close();
});

test('Inspeções: o menu da linha não tem mais "Ver detalhes" e a tabela não tem a coluna Entrevista', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  await alternarSituacoes(p, ['Abertas']);
  await p.getByRole('button', { name: `Abrir IS ${IS_E2E.numero}` }).waitFor();
  assert.equal(await p.getByRole('columnheader', { name: 'Entrevista' }).count(), 0);
  await p.locator(`button[aria-label="Ações da IS ${IS_E2E.numero}"]:visible`).first().click();
  await p.getByRole('menuitem').first().waitFor();
  assert.equal(await p.getByRole('menuitem', { name: 'Ver detalhes' }).count(), 0);
  await p.context().close();
});

test('Inspeções: "+ Abrir IS" abre o formulário que valida os campos obrigatórios sem gravar nada', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  await p.getByRole('button', { name: 'Abrir IS', exact: true }).click();
  const dialogo = p.getByRole('dialog', { name: 'Cadastrar IS' });
  await dialogo.getByRole('button', { name: 'Cadastrar IS' }).click();
  await dialogo.getByText('Informe o número da IS (somente dígitos).').waitFor();
  await dialogo.getByText('Escolha o inspecionado na lista.').waitFor();
  await dialogo.getByText('Selecione a finalidade.').waitFor();
  // Número já existente é recusado.
  await dialogo.getByLabel('Nº da IS').fill(String(IS_E2E.numero));
  await dialogo.getByRole('button', { name: 'Cadastrar IS' }).click();
  await dialogo.getByText(`Já existe a IS nº ${IS_E2E.numero}.`).waitFor();
  await p.context().close();
});

test('Inspeções: agenda com filtros de Situação (caixas + "Todas") e Período, botões só ícone e rich tooltip no calendário', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  const aberta = p.getByRole('button', { name: `Abrir IS ${IS_E2E.numero}` });
  const agendada = p.getByRole('button', { name: `Abrir IS ${IS_AGENDADA_E2E.numero}` });
  // Padrão: só "Em andamento" · "Este mês" — a agendada (hoje) aparece, a aberta não.
  await agendada.waitFor();
  assert.equal(await aberta.count(), 0);
  assert.equal(await p.getByText('Cadastre IS, agende as entrevistas').count(), 0);
  const botaoSituacao = p.getByRole('button', { name: /^Situação:/ });
  assert.equal(await botaoSituacao.getAttribute('aria-label'), 'Situação: Em andamento');
  assert.equal(await p.getByRole('button', { name: /^Período:/ }).getAttribute('aria-label'), 'Período: Este mês');
  // Agenda: o dia de hoje é o cabeçalho do grupo da IS agendada.
  await p.getByRole('rowheader', { name: /hoje/ }).waitFor();

  // "Todas" marca as três situações; a aberta (não agendada) vai para o grupo do topo.
  await botaoSituacao.click();
  const painel = p.getByRole('dialog', { name: 'Situação' });
  await painel.getByRole('checkbox', { name: 'Todas' }).click();
  for (const n of ['Abertas', 'Em andamento', 'Finalizadas']) assert.equal(await painel.getByRole('checkbox', { name: new RegExp(`^${n}`) }).isChecked(), true);
  await aberta.waitFor();
  await p.getByRole('rowheader', { name: /Não agendadas/ }).waitFor();
  // Desmarcar "Todas" limpa tudo.
  await painel.getByRole('checkbox', { name: 'Todas' }).click();
  await p.getByText('Selecione ao menos uma situação.').waitFor();
  await painel.getByRole('checkbox', { name: /^Abertas/ }).click();
  await p.keyboard.press('Escape');
  assert.equal(await botaoSituacao.getAttribute('aria-label'), 'Situação: Abertas');
  await aberta.waitFor();
  assert.equal(await agendada.count(), 0);
  await alternarSituacoes(p, ['Em andamento']);
  assert.equal(await botaoSituacao.getAttribute('aria-label'), 'Situação: 2 situações');
  await agendada.waitFor();

  // Período customizado no passado: some a agendada; a não agendada continua.
  await p.getByRole('button', { name: /^Período:/ }).click();
  const periodo = p.getByRole('dialog', { name: 'Período' });
  await periodo.getByRole('radio', { name: 'Customizado' }).check();
  await periodo.getByLabel('Início').fill('2000-01-01');
  await periodo.getByLabel('Fim').fill('2000-01-31');
  await periodo.getByRole('button', { name: 'Aplicar' }).click();
  await periodo.waitFor({ state: 'detached' });
  await agendada.waitFor({ state: 'detached' });
  await aberta.waitFor();
  // Hoje: a agendada volta.
  await p.getByRole('button', { name: /^Período:/ }).click();
  await periodo.getByRole('radio', { name: 'Hoje' }).click(); // escolher fecha o popover
  await periodo.waitFor({ state: 'detached' });
  await agendada.waitFor();

  // Calendário (ícone) abre em Mês; o hover numa IS mostra o rich tooltip.
  await p.getByRole('radio', { name: 'Calendário' }).click();
  await p.getByRole('radio', { name: 'Mês', checked: true }).waitFor();
  // Situação e Período só valem para a Tabela.
  assert.equal(await p.getByRole('button', { name: /^(Situação|Período):/ }).count(), 0);
  // Painel à esquerda: a IS aberta e não agendada vira um cartão (com "Agendar…"); o Mês só tem seg–sex.
  const painelAbertas = p.getByRole('complementary', { name: 'IS abertas aguardando agendamento' });
  await painelAbertas.getByRole('button', { name: new RegExp(`^IS ${IS_E2E.numero}: PACIENTE DE TESTE`) }).waitFor();
  await painelAbertas.getByRole('button', { name: new RegExp(`^Agendar IS ${IS_E2E.numero}`) }).waitFor();
  assert.equal(await p.getByText('sáb', { exact: true }).count(), 0);
  // A IS agendada é de hoje: no fim de semana ela não aparece no Mês (só dias úteis).
  if (![0, 6].includes(new Date().getDay())) {
    await p.getByRole('button', { name: /AGENDADO DE TESTE/ }).first().hover();
    const dica = p.getByRole('tooltip');
    await dica.waitFor();
    for (const t of ['Inspecionado', 'Finalidade', IS_AGENDADA_E2E.finalidade, 'Perito', MEDICO.usuario, 'Status', 'Agendada']) await dica.getByText(t, { exact: true }).waitFor();
    await p.mouse.move(5, 5);
    await dica.waitFor({ state: 'detached' });
    // Sem laudo/TIS/DS-1a: arrastável para remarcar.
    assert.equal(await p.getByRole('button', { name: /AGENDADO DE TESTE/ }).first().getAttribute('draggable'), 'true');
  }
  await p.context().close();
});

test('Pareceres: lista o pedido semeado, busca e abre o detalhe e o formulário "Novo parecer"', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/pareceres`);
  await p.getByRole('heading', { name: 'Pareceres' }).waitFor();
  const abrir = p.getByRole('button', { name: `Abrir detalhe do parecer de ${INSPECIONADO.nome}` });
  await abrir.waitFor();

  const busca = p.getByLabel('Buscar parecer');
  await busca.fill('NADA-COM-ESSE-TEXTO');
  await p.getByText('Nenhum resultado').waitFor();
  await busca.fill(INSPECIONADO.nip);
  await abrir.waitFor();
  await abrir.click();
  await p.getByRole('dialog', { name: 'Pedido de parecer' }).waitFor();
  await p.keyboard.press('Escape');

  // O botão "Novo parecer" abre o formulário (a geração do PDF depende do Apps Script e não roda no E2E).
  await p.getByRole('button', { name: 'Novo parecer' }).click();
  await p.getByRole('dialog', { name: 'Novo parecer' }).waitFor();
  await p.context().close();
});

test('Pareceres: a Secretaria não acessa a página (acesso negado)', async () => {
  const p = await novaPagina();
  await entrar(p, SECRETARIA);
  await p.goto(`${BASE}#/pareceres`);
  await p.getByText(/Acesso não autorizado/).first().waitFor();
  assert.equal(await p.getByLabel('Buscar parecer').count(), 0);
  await p.context().close();
});

test('Perícia Menor: lista o registro semeado, busca, abre o detalhe e o formulário "Novo"', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/pericia-menor/historico`);
  await p.getByRole('heading', { name: 'Perícia Menor' }).waitFor();
  const abrir = p.getByRole('button', { name: `Abrir detalhe da perícia de ${INSPECIONADO.nome}` });
  await abrir.waitFor();

  const busca = p.getByLabel('Buscar perícia menor');
  await busca.fill('NADA-COM-ESSE-TEXTO');
  await p.getByText('Nenhum resultado').waitFor();
  await busca.fill('M54');
  await abrir.waitFor();
  await abrir.click();
  await p.getByRole('dialog', { name: 'Perícia menor' }).waitFor();
  await p.keyboard.press('Escape');

  await p.getByRole('button', { name: 'Novo', exact: true }).click();
  await p.getByRole('dialog', { name: 'Nova perícia menor' }).waitFor();
  await p.context().close();
});

test('aliases estáveis redirecionam para a rota canônica (/estudo, /doencas)', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/estudo`);
  await p.waitForURL(/#\/extras\/roteiro$/);
  await p.goto(`${BASE}#/doencas`);
  await p.waitForURL(/#\/beneficios\/doencas$/);
  await p.context().close();
});

test('o SDK do service worker e a fonte de ícones são autohospedados (sem CDN)', async () => {
  for (const arquivo of ['firebase-app-compat.js', 'firebase-messaging-compat.js']) {
    const r = await fetch(`${BASE}firebase-sdk/${arquivo}`);
    assert.equal(r.status, 200, arquivo);
  }
  const sw = await (await fetch(`${BASE}firebase-messaging-sw.js`)).text();
  assert.doesNotMatch(sw, /gstatic\.com/);
  const p = await novaPagina();
  const externas = [];
  p.on('request', req => { if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) externas.push(req.url()); });
  await p.goto(BASE);
  await p.waitForLoadState('networkidle');
  assert.deepEqual(externas, []);
  await p.context().close();
});
