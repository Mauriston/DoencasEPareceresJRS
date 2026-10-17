// Verifica que o código só usa as cores e a escala tipográfica do design system
// (tailwind.config.js). O Tailwind ignora em silêncio classes que não existem — uma
// "bg-red-50" antiga compilaria sem erro e ficaria sem estilo. Roda no `prebuild`:
// uma classe fora do DS falha o build.
//   Cores permitidas: navy, gold, green, wine, ink, blue, line, paper, thead, canvas, white, black.
//   Tamanhos de texto: xs, sm, base, h3, h2, h1, kpi, display, 5xl, 6xl (ou valores arbitrários).
import fs from 'node:fs';
import path from 'node:path';

const RAIZES = ['components', 'hooks', 'utils', 'config', 'context', 'services', 'App.tsx', 'index.tsx', 'index.html', 'styles'];
const EXT = /\.(tsx?|css|html)$/;

const PROPS = 'text|bg|border|ring|divide|from|to|via|fill|stroke|placeholder|outline|accent|decoration|shadow|caret';
const PALETAS_FORA = 'gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose';
const reCor = new RegExp(`(?<![\\w-])(?:${PROPS})-(?:${PALETAS_FORA})-\\d{2,3}\\b`, 'g');
const reTexto = /(?<![\w-])text-(?:lg|xl|2xl|3xl|4xl|7xl|8xl|9xl)\b/g;

const arquivos = [];
const varrer = (p) => {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) fs.readdirSync(p).forEach(f => varrer(path.join(p, f)));
  else if (EXT.test(p)) arquivos.push(p);
};
RAIZES.forEach(varrer);

const achados = [];
for (const f of arquivos) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((linha, i) => {
    for (const re of [reCor, reTexto]) {
      for (const m of linha.matchAll(re)) achados.push(`${f}:${i + 1}  ${m[0]}`);
    }
  });
}

if (achados.length) {
  console.error(`\nClasses fora do design system (${achados.length}):\n  ${achados.slice(0, 40).join('\n  ')}${achados.length > 40 ? `\n  … e mais ${achados.length - 40}` : ''}\n`);
  console.error('Use as cores navy/gold/green/wine/ink/blue/line/paper/thead e a escala h1/h2/h3/kpi/display (ver tailwind.config.js).\n');
  process.exit(1);
}
console.log(`Design system OK (${arquivos.length} arquivos verificados).`);
