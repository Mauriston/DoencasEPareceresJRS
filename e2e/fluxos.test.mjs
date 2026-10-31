// Ficheiro: e2e/fluxos.test.mjs
// Fluxos críticos no navegador, contra o app real (server.ts + Vite) ligado aos emuladores do
// Firebase: página pública, login por NIP, item de IS atrasadas na Início, triagem pelo MPI
// (TRIAR → alertas → TRIADO) e o que a Secretaria vê. Rodar com `npm run test:e2e`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { MPI, SECRETARIA, SENHA, CONCURSO } from './dados.mjs';

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
  if (await entendi.isVisible().catch(() => false)) await entendi.click();
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
