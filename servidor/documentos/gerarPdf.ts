// Ficheiro: servidor/documentos/gerarPdf.ts
// HTML → PDF com o Chromium headless (puppeteer-core). Um navegador por instância do servidor,
// aberto na primeira geração e reaproveitado; cada documento usa uma aba nova, fechada ao final.
// No Cloud Run o Chromium vem do pacote do sistema (Dockerfile: apk add chromium font-carlito);
// em desenvolvimento, CHROMIUM_PATH aponta para outro executável.
import type { Browser, PDFOptions } from 'puppeteer-core';
import type { DocumentoPaginado } from './paginado';

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

/**
 * Gera o PDF e devolve os bytes. `string`: página(s) A4 com margens no próprio HTML (@page, termos).
 * `DocumentoPaginado`: o corpo flui entre as margens e a sobreposição se repete em toda página.
 */
export const htmlParaPdf = async (doc: string | DocumentoPaginado): Promise<Buffer> => {
  const html = typeof doc === 'string' ? doc : doc.html;
  const opcoes: PDFOptions = typeof doc === 'string'
    ? { printBackground: true, preferCSSPageSize: true, timeout: 30_000 }
    : {
        // Tamanho e margens no @page do próprio HTML (documentoPaginado): com as do Chromium o corpo encolhia ~1,4%.
        printBackground: true, preferCSSPageSize: true, timeout: 30_000,
        displayHeaderFooter: true,
        // A sobreposição vai no cabeçalho (coordenadas da página inteira); <span> vazio: sem o padrão do Chromium.
        headerTemplate: doc.sobreposicao || '<span></span>',
        footerTemplate: '<span></span>',
      };
  if (!navegador) navegador = abrirNavegador().catch(e => { navegador = null; throw e; });
  const b = await navegador;
  const pagina = await b.newPage();
  try {
    // Sem rede: o HTML é autossuficiente (brasão em data:, fonte do sistema).
    await pagina.setRequestInterception(true);
    pagina.on('request', r => (r.url().startsWith('data:') ? r.continue() : r.abort()));
    // Documento paginado: a janela fica com a largura útil da página, para o __ajustar medir como na impressão.
    if (typeof doc !== 'string') {
      const larguraPt = 595.28 - doc.margens.esq - doc.margens.dir;
      await pagina.setViewport({ width: Math.round((larguraPt * 4) / 3), height: 1123 });
    }
    await pagina.setContent(html, { waitUntil: 'load', timeout: 20_000 });
    await pagina.evaluate(() => document.fonts.ready);
    // Ajuste final do layout com as fontes já carregadas (ver __ajustar em layoutOficial.ts).
    await pagina.evaluate(() => (window as unknown as { __ajustar?: () => void }).__ajustar?.());
    const pdf = await pagina.pdf(opcoes);
    return Buffer.from(pdf);
  } finally {
    await pagina.close().catch(() => { /* aba já fechada */ });
  }
};
