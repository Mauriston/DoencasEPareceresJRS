// Ficheiro: e2e/fluxos.test.mjs
// Fluxos críticos no navegador, contra o app real (server.ts + Vite) ligado aos emuladores do
// Firebase: página pública, login por NIP, item de IS atrasadas na Início, triagem pelo MPI
// (TRIAR → alertas → TRIADO), o que a Secretaria vê e as telas de Inspeções, Pareceres e Perícia Menor
// (carregamento, busca, detalhe, formulário de cadastro e permissões). Rodar com `npm run test:e2e`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { MPI, SECRETARIA, MEDICO, SENHA, CONCURSO, INSPECIONADO, IS_E2E, IS_AGENDADA_E2E, PARECER_E2E, PERICIA_E2E, EMAIL_E2E } from './dados.mjs';

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
  // Início (painel do dia): o h1 é a saudação (desktop); no celular, "Início" na topbar.
  await pagina.getByRole('heading', { level: 1, name: /Bom dia|Boa tarde|Boa noite|^Início$/ }).first().waitFor();
  // Aviso da triagem (MPI, 3 primeiros acessos): fecha para seguir.
  const entendi = pagina.getByRole('button', { name: 'Entendi' });
  // O aviso aparece um instante depois da Início: espera um pouco em vez de testar só uma vez.
  await entendi.click({ timeout: 4_000 }).catch(() => { /* sem aviso para este perfil */ });
};

const abrirConcurso = async (pagina) => {
  await pagina.goto(`${BASE}#/concursos/${CONCURSO.id}`);
  await pagina.getByText('CANDIDATO DE HOJE').first().waitFor();
};

// Inspeções: a Lista abre na aba "Ativas" (abertas + em andamento), sem filtro de período; filtros em chips.
const abaInspecoes = (pagina, nome) => pagina.getByRole('tab', { name: new RegExp(`^${nome}`) });

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
  // Na faixa "Hoje" (contador) ou, quando a faixa do perfil já está cheia, em "Pendências · por atraso".
  await p.getByText('1 IS de concurso atrasada').or(p.getByRole('link', { name: /^1 · IS de concurso atrasadas/ })).first().waitFor();
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
  // A IS semeada está aberta (não agendada): aparece na aba Ativas, no grupo "Abertas · sem agendamento".
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
  // Aberta sem data de entrevista: só a Finalidade é editável (menu em cascata); a Conclusão fica em leitura.
  await detalhe.getByRole('button', { name: 'Finalidade' }).waitFor();
  await detalhe.getByText('A Conclusão fica editável depois que a entrevista for agendada.').waitFor();
  for (const campo of ['Laudo', 'Nº do TIS', 'DS-1a', 'Observações']) assert.equal(await detalhe.getByLabel(campo).count(), 0, `${campo} não editável`);
  assert.equal(await detalhe.getByRole('combobox', { name: 'Restrições' }).count(), 0);
  await p.context().close();
});

test('Inspeções: Conclusão da IS agendada grava sozinha (Observações) e o Nº do TIS/DS-1a esperam o Laudo', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  await p.getByRole('button', { name: `Abrir IS ${IS_AGENDADA_E2E.numero}` }).click();
  const detalhe = p.getByRole('dialog', { name: `IS ${IS_AGENDADA_E2E.numero}` });
  await detalhe.getByText('Conclusão da IS').waitFor();
  // Sem select de Status e sem "Salvar alterações": a Conclusão grava sozinha.
  assert.equal(await detalhe.getByRole('button', { name: 'Salvar alterações' }).count(), 0);
  assert.equal(await detalhe.getByLabel('Status').count(), 0);
  // Com data de entrevista a Finalidade não é mais editável.
  assert.equal(await detalhe.getByRole('button', { name: 'Finalidade' }).count(), 0);
  // Nº do TIS e DS-1a ficam desabilitados sem Laudo.
  assert.equal(await detalhe.getByLabel('Nº do TIS').isDisabled(), true);
  assert.equal(await detalhe.getByLabel('DS-1a').isDisabled(), true);
  const obs = detalhe.getByLabel('Observações');
  await obs.fill('Observação do E2E');
  await obs.blur();
  await detalhe.getByText('Salvo', { exact: true }).waitFor();
  await p.context().close();
});

test('Inspeções: Restrições (Verificações e Términos) só com "restrições" no laudo — clicar seleciona e o × do chip remove', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  // IS agendada (a Conclusão só é editável com data de entrevista).
  await p.getByRole('button', { name: `Abrir IS ${IS_AGENDADA_E2E.numero}` }).click();
  const detalhe = p.getByRole('dialog', { name: `IS ${IS_AGENDADA_E2E.numero}` });
  const campo = detalhe.getByRole('combobox', { name: 'Restrições' });
  // Sem laudo o campo não aparece; o CID é obrigatório no grupo Verificações e Términos.
  const laudo = detalhe.getByLabel('Laudo', { exact: true });
  await laudo.waitFor();
  assert.equal(await campo.count(), 0, 'Restrições oculto sem laudo');
  await laudo.fill('Apto para o SAM com restrições por 30 dias.');
  await campo.waitFor();
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
  // Laudo sem "restrições" esconde o campo; apagar deixa a IS como estava.
  await laudo.fill('');
  await laudo.blur();
  await campo.waitFor({ state: 'detached' });
  // Espera a gravação do Laudo vazio chegar ao banco (status de volta a Agendada e "Salvando…" encerrado) antes de
  // fechar: sem isso a IS podia ficar em "Votação pendente" e o teste do tooltip do calendário falhava às vezes.
  await detalhe.getByText('Agendada', { exact: true }).first().waitFor();
  await detalhe.getByText('Salvando…', { exact: true }).waitFor({ state: 'detached' });
  await detalhe.getByText('Salvo', { exact: true }).waitFor();
  await p.context().close();
});

test('Inspeções: o menu da linha não tem mais "Ver detalhes" e a tabela não tem a coluna Entrevista', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  await p.getByRole('button', { name: `Abrir IS ${IS_E2E.numero}` }).waitFor();
  assert.equal(await p.getByRole('columnheader', { name: 'Entrevista' }).count(), 0);
  await p.locator(`button[aria-label="Ações da IS ${IS_E2E.numero}"]:visible`).first().click();
  await p.getByRole('menuitem').first().waitFor();
  assert.equal(await p.getByRole('menuitem', { name: 'Ver detalhes' }).count(), 0);
  await p.context().close();
});

test('Inspeções: "+ Abrir IS" → "Manualmente" abre o formulário que valida os campos obrigatórios sem gravar nada', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  // "Abrir IS" é um botão com menu: Manualmente · Enviar print.
  await p.getByRole('button', { name: 'Abrir IS', exact: true }).click();
  await p.getByRole('menuitem', { name: 'Enviar print' }).waitFor();
  await p.getByRole('menuitem', { name: 'Manualmente' }).click();
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

test('Início: "+ Abrir IS" (no lugar de "Novo parecer") leva ao formulário de Inspeções', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/`);
  assert.equal(await p.getByRole('link', { name: 'Novo parecer' }).count(), 0);
  await p.getByRole('button', { name: 'Abrir IS', exact: true }).click();
  await p.getByRole('menuitem', { name: 'Manualmente' }).click();
  await p.getByRole('dialog', { name: 'Cadastrar IS' }).waitFor();
  await p.context().close();
});

test('Inspeções: abas Ativas/Finalizadas, chips de filtro e Período, botões só ícone e rich tooltip no calendário', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  const aberta = p.getByRole('button', { name: `Abrir IS ${IS_E2E.numero}` });
  const agendada = p.getByRole('button', { name: `Abrir IS ${IS_AGENDADA_E2E.numero}` });
  // Padrão: aba Ativas · todos os períodos — a agendada (hoje) e a aberta (sem agendamento) aparecem.
  assert.equal(await abaInspecoes(p, 'Ativas').getAttribute('aria-selected'), 'true');
  await agendada.waitFor();
  await aberta.waitFor();
  assert.equal(await p.getByText('Cadastre IS, agende as entrevistas').count(), 0);
  assert.equal(await p.getByRole('button', { name: /^Período:/ }).getAttribute('aria-label'), 'Período: Todos os períodos');
  // Sem o banner "Toque para ver" (I1): Atrasadas é um chip de filtro.
  assert.equal(await p.getByText(/Toque para ver/).count(), 0);
  // Ordem de trabalho: Hoje primeiro; as abertas sem agendamento num grupo próprio.
  await p.getByRole('rowheader', { name: /^Hoje/ }).waitFor();
  await p.getByRole('rowheader', { name: /sem agendamento/ }).waitFor();

  // Chip "Sem agendamento": só a aberta; vai para a URL (?situacao=sem_agendamento).
  const semAgendamento = p.getByRole('button', { name: /^Sem agendamento/ });
  await semAgendamento.click();
  // O chip só muda depois da navegação (setSearchParams é uma transition do React Router): espera o estado pressionado.
  await p.getByRole('button', { name: /^Sem agendamento/, pressed: true }).waitFor();
  await agendada.waitFor({ state: 'detached' });
  await aberta.waitFor();
  assert.match(p.url(), /situacao=sem_agendamento/);
  await semAgendamento.click();
  await p.getByRole('button', { name: /^Sem agendamento/, pressed: false }).waitFor();
  await agendada.waitFor();

  // Aba Finalizadas: nenhuma das duas; volta para Ativas.
  await abaInspecoes(p, 'Finalizadas').click();
  await agendada.waitFor({ state: 'detached' });
  assert.equal(await aberta.count(), 0);
  await abaInspecoes(p, 'Ativas').click();
  await agendada.waitFor();

  // Deep link do Painel/Início: ?situacao=sem_agendamento abre já filtrado.
  await p.goto(`${BASE}#/inspecoes?situacao=sem_agendamento`);
  await aberta.waitFor();
  assert.equal(await agendada.count(), 0);
  await p.goto(`${BASE}#/inspecoes`);
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
  // Abas e Período só valem para a Lista.
  assert.equal(await p.getByRole('button', { name: /^(Perito|Período):/ }).count(), 0);
  assert.equal(await p.getByRole('tab', { name: /^Ativas/ }).count(), 0);
  // No Calendário não há barra de filtros (nem perito/busca); a alternância fica na barra do calendário.
  assert.equal(await p.getByLabel('Filtrar por perito').count(), 0);
  assert.equal(await p.getByLabel('Buscar IS').count(), 0);
  await p.getByRole('radio', { name: 'Tabela' }).waitFor();
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
  await p.getByText(/Acesso não autorizado/).filter({ visible: true }).first().waitFor();
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
  // Tabela enxuta (auditoria v3, 5c): Inspecionado · CID · Tipo · Término · Hist.; data e médico vão para o painel.
  assert.deepEqual(await p.locator('table thead th').allInnerTexts(), ['Inspecionado', 'CID', 'Tipo', 'Término', 'Hist.']);

  const busca = p.getByLabel('Buscar perícia menor');
  await busca.fill('NADA-COM-ESSE-TEXTO');
  await p.getByText('Nenhum resultado').waitFor();
  await busca.fill('M54');
  await abrir.waitFor();
  await abrir.click();
  // ≥ 1280 px: painel lateral (mestre-detalhe, sem backdrop) com as abas Esta perícia · Histórico; a seleção vai para a URL.
  const painel = p.getByRole('region', { name: `Perícia menor de ${INSPECIONADO.nome}` });
  await painel.waitFor();
  await p.waitForURL(/[?&]sel=/);
  await painel.getByRole('tab', { name: /Histórico/ }).click();
  await painel.getByRole('tab', { name: /Histórico/, selected: true }).waitFor();
  await painel.getByRole('tab', { name: 'Esta perícia' }).click();
  await painel.getByText('Emissor, perito e registro').click();
  await painel.getByText('CT Teste Medico').waitFor();
  await p.keyboard.press('Escape');
  await painel.waitFor({ state: 'detached' });

  await p.getByRole('button', { name: 'Perícia Menor', exact: true }).click();
  const form = p.getByRole('dialog', { name: 'Nova perícia menor' });
  await form.waitFor();
  // Abas Registrar/Homologar; todos os campos visíveis; foto só (e obrigatória) na homologação.
  const abaRegistrar = form.getByRole('tab', { name: 'Registrar atestado' });
  assert.equal(await abaRegistrar.getAttribute('aria-selected'), 'true');
  await form.getByText('ENC p/ VDF?').waitFor();
  assert.equal(await form.getByRole('button', { name: 'Fotografar atestado' }).count(), 0);
  assert.equal(await form.getByLabel('Perito responsável').count(), 0); // só o Admin escolhe
  await form.getByRole('tab', { name: 'Homologar atestado' }).click();
  await form.getByRole('button', { name: 'Fotografar atestado' }).waitFor();
  await form.getByLabel(/Tempo homologado/).waitFor();
  await p.context().close();
});

test('Ficha do inspecionado: a rota antiga do histórico redireciona e a ficha mostra IS, parecer e perícia', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/pericia-menor/historico/${INSPECIONADO.nip}`);
  await p.waitForURL(new RegExp(`#/inspecionados/${INSPECIONADO.nip}$`));
  await p.getByRole('heading', { name: INSPECIONADO.nome }).waitFor();
  // Abas sem contagens (Inspeções de Saúde, Perícia Menor e as novas); "Pedir parecer" e o card Cadastro saíram da ficha.
  const guias = p.getByRole('tablist', { name: 'Registros do inspecionado' });
  await guias.getByRole('tab', { name: 'Inspeções de Saúde', exact: true }).waitFor();
  for (const nome of ['Afastamentos', 'Atestados e Laudos', 'Pareceres', 'Exames', 'Guias', 'Emails', 'Mensagens', 'Outros', 'Transcrições']) {
    await guias.getByRole('tab', { name: nome, exact: true }).waitFor();
  }
  // "Outros" fica desabilitada para todos.
  assert.equal(await guias.getByRole('tab', { name: 'Outros', exact: true }).getAttribute('aria-disabled'), 'true');
  assert.equal(await p.getByRole('button', { name: /Pedir parecer/i }).count(), 0);
  // A aba abre com o registro mais recente no painel principal (sem drawer) e o histórico no painel de apoio.
  await guias.getByRole('tab', { name: 'Perícia Menor', exact: true }).click();
  await p.getByRole('heading', { name: /Perícia menor de/ }).waitFor();
  await p.getByRole('complementary', { name: /Histórico de Perícias Menores/ }).getByRole('button', { name: /Perícia menor registrada/ }).first().click();
  assert.equal(await p.getByRole('dialog').count(), 0);
  assert.match(p.url(), new RegExp(`#/inspecionados/${INSPECIONADO.nip}\\?.*aba=pm`));
  // "+ Perícia Menor" (cabeçalho): abre o formulário no painel principal da aba Perícia Menor, sem drawer.
  await p.getByRole('button', { name: 'Perícia Menor', exact: true }).click();
  await p.getByRole('heading', { name: 'Nova perícia menor' }).waitFor();
  assert.equal(await p.getByRole('dialog').count(), 0);
  // Afastamentos: só leitura, com os cards de resumo no apoio e sem barra de ações.
  await guias.getByRole('tab', { name: 'Afastamentos', exact: true }).click();
  await p.getByRole('heading', { name: 'Afastamentos', exact: true }).waitFor();
  await p.getByRole('complementary', { name: 'Resumo dos afastamentos' }).getByText('Situação atual').waitFor();
  assert.equal(await p.getByRole('toolbar', { name: 'Ações da aba' }).count(), 0);
  // Guias: sem guias geradas, o painel principal avisa que não há registros.
  await guias.getByRole('tab', { name: 'Guias', exact: true }).click();
  await p.getByText('Nenhum registro em Guias').waitFor();
  // Emails: abre o mais recente (com conteúdo) num iframe sandbox, sem rodar o script do e-mail; sem barra de ações.
  await guias.getByRole('tab', { name: 'Emails', exact: true }).click();
  await p.getByRole('heading', { name: 'Resultado da IS' }).waitFor();
  const quadro = p.frameLocator('iframe[title^="E-mail:"]');
  await quadro.getByText(EMAIL_E2E.corpo).waitFor();
  assert.equal(await quadro.getByText('SCRIPT RODOU').count(), 0);
  assert.equal(await p.getByRole('toolbar', { name: 'Ações da aba' }).count(), 0);
  // Registro antigo (sem conteúdo): só os dados do envio e a nota.
  await p.getByRole('complementary', { name: /Histórico de Emails/ }).getByRole('button', { name: /ABERTURA ANTIGA E2E/ }).click();
  await p.getByText(/anterior à gravação do conteúdo/).waitFor();
  // IS aberta sem data: "Agendar IS" na barra (e não "Abrir IS", pois já há IS em andamento); sem o campo Inspecionado.
  await guias.getByRole('tab', { name: 'Inspeções de Saúde', exact: true }).click();
  await p.getByRole('complementary', { name: /Histórico de Inspeções de Saúde/ }).getByRole('button', { name: new RegExp(`IS ${IS_E2E.numero}`) }).click();
  const barra = p.getByRole('toolbar', { name: 'Ações da aba' });
  await p.getByRole('heading', { name: `IS ${IS_E2E.numero}`, exact: true }).waitFor();
  await barra.getByRole('button', { name: 'Agendar IS', exact: true }).waitFor();
  assert.equal(await barra.getByRole('button', { name: 'Abrir IS' }).count(), 0);
  assert.equal(await barra.getByRole('button', { name: 'Excluir' }).count(), 0);
  // Barra da IS na ficha: "Gerar Documento ▾" (IS não finalizada); "Enviar PDF ▾" só com data de entrevista;
  // "Concluir IS" só com a Conclusão editável (entrevista agendada); sem os antigos "Parecer" e "Exames".
  await barra.getByRole('button', { name: 'Gerar Documento' }).waitFor();
  for (const nome of ['Enviar PDF', 'Concluir IS', 'Parecer', 'Exames']) assert.equal(await barra.getByRole('button', { name: nome, exact: true }).count(), 0, nome);
  // "Abrir IS ▾" no cabeçalho: de outra aba, volta para Inspeções de Saúde e abre o formulário no painel principal.
  await guias.getByRole('tab', { name: 'Exames', exact: true }).click();
  await p.getByRole('button', { name: 'Abrir IS', exact: true }).click();
  await p.getByRole('menuitem', { name: /Manualmente/ }).click();
  await p.getByRole('heading', { name: 'Cadastrar IS' }).waitFor();
  assert.equal(await guias.getByRole('tab', { name: 'Inspeções de Saúde', exact: true }).getAttribute('aria-selected'), 'true');
  assert.equal(await p.getByRole('dialog').count(), 0);
  // Registro de eventos é só do Admin.
  assert.equal(await p.getByText('Registro de eventos').count(), 0);
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

test('Perícia Menor: o perito responsável edita com Justificativa (mínimo de 10 caracteres)', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/pericia-menor/historico`);
  await p.getByRole('button', { name: `Abrir detalhe da perícia de ${INSPECIONADO.nome}` }).click();
  const painel = p.getByRole('region', { name: `Perícia menor de ${INSPECIONADO.nome}` });
  await painel.getByRole('button', { name: 'Editar', exact: true }).click();
  const form = p.getByRole('dialog', { name: 'Editar perícia menor' });
  await form.getByLabel(/Justificativa da alteração/).fill('curto');
  await form.getByRole('button', { name: 'Salvar alterações' }).click();
  await form.getByText(/ao menos 10 caracteres/).waitFor();
  await form.getByLabel(/Justificativa da alteração/).fill('Correção do tempo do atestado.');
  await form.getByRole('button', { name: 'Salvar alterações' }).click();
  await form.waitFor({ state: 'detached', timeout: 40_000 });
  await p.getByText(/atualizada/).first().waitFor();
  await p.context().close();
});

// Por último: apaga a perícia semeada (os testes acima a usam).
test('Perícia Menor: o perito responsável exclui com Justificativa (mínimo de 10 caracteres)', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/pericia-menor/historico`);
  await p.getByRole('button', { name: `Abrir detalhe da perícia de ${INSPECIONADO.nome}` }).click();
  const painel = p.getByRole('region', { name: `Perícia menor de ${INSPECIONADO.nome}` });
  await painel.getByRole('button', { name: 'Excluir', exact: true }).click();
  const dialogo = p.getByRole('dialog', { name: /Excluir perícia menor/ });
  await dialogo.getByLabel(/Justificativa/).fill('curto');
  await dialogo.getByRole('button', { name: 'Excluir', exact: true }).click();
  await dialogo.getByText(/ao menos 10 caracteres/).waitFor();
  await dialogo.getByLabel(/Justificativa/).fill('Registro feito em duplicidade.');
  await dialogo.getByRole('button', { name: 'Excluir', exact: true }).click();
  await dialogo.waitFor({ state: 'detached', timeout: 40_000 });
  await p.getByRole('button', { name: `Abrir detalhe da perícia de ${INSPECIONADO.nome}` }).waitFor({ state: 'detached' });
  await p.context().close();
});
