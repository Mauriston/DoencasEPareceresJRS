// Ficheiro: e2e/fluxos.test.mjs
// Fluxos críticos no navegador, contra o app real (server.ts + Vite) ligado aos emuladores do
// Firebase: página pública, login por NIP, item de IS atrasadas na Início, triagem pelo MPI
// (TRIAR → alertas → TRIADO), o que a Secretaria vê e as telas de Inspeções, Pareceres e Perícia Menor
// (carregamento, busca, detalhe, formulário de cadastro e permissões). Rodar com `npm run test:e2e`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { MPI, SECRETARIA, MEDICO, SENHA, CONCURSO, INSPECIONADO, IS_E2E, PARECER_E2E, PERICIA_E2E } from './dados.mjs';

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
  const abrir = p.getByRole('button', { name: `Abrir IS ${IS_E2E.numero}` });
  await abrir.waitFor();

  const busca = p.getByLabel('Buscar IS');
  await busca.fill('NADA-COM-ESSE-TEXTO');
  await p.getByText('Nenhuma IS encontrada').waitFor();
  await busca.fill(INSPECIONADO.nome);
  await abrir.waitFor();

  await abrir.click();
  await p.getByRole('dialog', { name: `IS ${IS_E2E.numero}` }).waitFor();
  await p.context().close();
});

test('Inspeções: o formulário "Cadastrar IS" valida os campos obrigatórios sem gravar nada', async () => {
  const p = await novaPagina();
  await entrar(p, MEDICO);
  await p.goto(`${BASE}#/inspecoes`);
  await p.getByRole('button', { name: 'Cadastrar IS' }).click();
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
