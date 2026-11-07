// Ficheiro: servidor/documentos/gerarPdf.ts
// HTML → PDF com o Chromium headless (puppeteer-core). Um navegador por instância do servidor,
// aberto na primeira geração e reaproveitado; cada documento usa uma aba nova, fechada ao final.
// No Cloud Run o Chromium vem do pacote do sistema (Dockerfile: apk add chromium font-carlito);
// em desenvolvimento, CHROMIUM_PATH aponta para outro executável.
import type { Browser } from 'puppeteer-core';

const CAMINHOS_CHROMIUM = [
  process.env.CHROMIUM_PATH,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/opt/pw-browsers/chromium',
].filter(Boolean) as string[];

let navegador: Promise<Browser> | null = null;

const abrirNavegador = async (): Promise<Browser> => {
  const { default: puppeteer } = await import('puppeteer-core');
  const { existsSync } = await import('node:fs');
  const executablePath = CAMINHOS_CHROMIUM.find(c => existsSync(c));
  if (!executablePath) throw new Error('Chromium não encontrado no servidor (defina CHROMIUM_PATH).');
  const b = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
  });
  b.on('disconnected', () => { navegador = null; });
  return b;
};

/** Gera o PDF (A4, margens definidas no próprio HTML via @page) e devolve os bytes. */
export const htmlParaPdf = async (html: string): Promise<Buffer> => {
  if (!navegador) navegador = abrirNavegador().catch(e => { navegador = null; throw e; });
  const b = await navegador;
  const pagina = await b.newPage();
  try {
    // Sem rede: o HTML é autossuficiente (brasão em data:, fonte do sistema).
    await pagina.setRequestInterception(true);
    pagina.on('request', r => (r.url().startsWith('data:') ? r.continue() : r.abort()));
    await pagina.setContent(html, { waitUntil: 'load', timeout: 20_000 });
    await pagina.evaluate(() => document.fonts.ready);
    // Ajuste final do layout com as fontes já carregadas (ver __ajustar em layoutOficial.ts).
    await pagina.evaluate(() => (window as unknown as { __ajustar?: () => void }).__ajustar?.());
    const pdf = await pagina.pdf({ printBackground: true, preferCSSPageSize: true, timeout: 30_000 });
    return Buffer.from(pdf);
  } finally {
    await pagina.close().catch(() => { /* aba já fechada */ });
  }
};
