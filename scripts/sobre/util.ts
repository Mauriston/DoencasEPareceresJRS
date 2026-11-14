// Ficheiro: scripts/sobre/util.ts
// Utilitários comuns dos scripts que geram as imagens da página "Sobre o app" (public/sobre/):
// conversão PNG → WebP pelo próprio Chromium (sem dependência nova) e o manifesto com as dimensões
// de cada imagem (components/sobre/imagens.gerado.ts), que a página usa para fixar largura/altura
// e para saber se a imagem já existe (senão mostra a moldura com ícone).
import fs from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';

export const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export const PASTA_PUBLICA = path.join(RAIZ, 'public/sobre');
const MANIFESTO = path.join(RAIZ, 'components/sobre/imagens.gerado.ts');

export interface DimensaoImagem { w: number; h: number; escuro?: boolean }

/** Converte um PNG (bytes) em WebP, desenhando-o num <canvas> do Chromium. */
export const pngParaWebp = async (navegador: Browser, png: Buffer, qualidade = 0.82): Promise<Buffer> => {
  const pagina = await navegador.newPage();
  try {
    const dataUrl = await pagina.evaluate(async ({ b64, q }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      return c.toDataURL('image/webp', q);
    }, { b64: png.toString('base64'), q: qualidade });
    if (!dataUrl.startsWith('data:image/webp')) throw new Error('O Chromium não gerou WebP.');
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  } finally {
    await pagina.close();
  }
};

/** Grava `public/sobre/<nome>.webp` (1×) ou `<nome>@2x.webp` (2×). */
export const gravarWebp = (nome: string, escala: 1 | 2, bytes: Buffer) => {
  const arquivo = path.join(PASTA_PUBLICA, `${nome}${escala === 2 ? '@2x' : ''}.webp`);
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, bytes);
  return arquivo;
};

const lerManifesto = (): Record<string, DimensaoImagem> => {
  try {
    const m = fs.readFileSync(MANIFESTO, 'utf8').match(/=\s*(\{[\s\S]*\});\s*$/);
    return m ? JSON.parse(m[1]) : {};
  } catch { return {}; }
};

/** Acrescenta/atualiza entradas do manifesto (as dos outros scripts ficam). */
export const atualizarManifesto = (novas: Record<string, DimensaoImagem>) => {
  const tudo = { ...lerManifesto(), ...novas };
  const ordenado = Object.fromEntries(Object.keys(tudo).sort().map(k => [k, tudo[k]]));
  fs.writeFileSync(MANIFESTO, [
    '// Ficheiro: components/sobre/imagens.gerado.ts',
    '// GERADO por scripts/sobre/gerar-emails.ts e scripts/sobre/gerar-capturas.ts — não edite à mão.',
    '// Dimensões (px CSS, 1×) das imagens em public/sobre/. Imagem ausente daqui = a página mostra a moldura.',
    'export interface DimensaoImagem { w: number; h: number; escuro?: boolean }',
    `export const IMAGENS_GERADAS: Record<string, DimensaoImagem> = ${JSON.stringify(ordenado, null, 2)};`,
    '',
  ].join('\n'));
};

/** Chromium do Playwright (ou o indicado em PW_CHROMIUM_PATH, como nos testes E2E). */
export const abrirChromium = async () => {
  const { chromium } = await import('playwright');
  return chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
};
