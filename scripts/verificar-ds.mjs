// Verifica que o código só usa as cores e a escala tipográfica do design system
// (tailwind.config.js). O Tailwind ignora em silêncio classes que não existem — uma
// "bg-red-50" antiga compilaria sem erro e ficaria sem estilo. Roda no `prebuild`:
// uma classe fora do DS falha o build.
//   Cores permitidas: navy, gold, green, wine, ink, blue, line, paper, thead, canvas, white, black.
//   Tamanhos de texto: xs, sm, base, h3, h2, h1, kpi, display, 5xl, 6xl (ou valores arbitrários).
// Auditoria v3: também barra (O4/G9) qualquer tonalidade que não exista na paleta do
// tailwind.config (ex.: text-ink-2, bg-navy-300), (G5) font-mono e (O5) shadow-sm/shadow-md
// — sombra só em sobreposições (shadow-lg/xl/2xl).
import fs from 'node:fs';
import path from 'node:path';
import config from '../tailwind.config.js';

const RAIZES = ['components', 'hooks', 'utils', 'config', 'context', 'services', 'App.tsx', 'index.tsx', 'index.html', 'styles'];
const EXT = /\.(tsx?|css|html)$/;

const PROPS = 'text|bg|border|ring|divide|from|to|via|fill|stroke|placeholder|outline|accent|decoration|shadow|caret';
const PALETAS_FORA = 'gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose';
const reCor = new RegExp(`(?<![\\w-])(?:${PROPS})-(?:${PALETAS_FORA})-\\d{2,3}\\b`, 'g');
const reTexto = /(?<![\w-])text-(?:lg|xl|2xl|3xl|4xl|7xl|8xl|9xl)\b/g;

// Nomes de cor que existem (navy, navy-hover, gold-50, ink-3, line, surface-2…).
const CORES = new Set();
const achatar = (obj, prefixo = '') => {
  for (const [k, val] of Object.entries(obj)) {
    const nome = k === 'DEFAULT' ? prefixo : prefixo ? `${prefixo}-${k}` : k;
    if (val && typeof val === 'object') achatar(val, nome);
    else CORES.add(nome);
  }
};
achatar(config.theme.colors);
const FAMILIAS = [...new Set([...CORES].map(c => c.split('-')[0]))].filter(f => !['transparent', 'current'].includes(f));
// Classe de cor de uma família do DS (bg-ink-2, text-navy-300, border-line-2…): a tonalidade tem de existir.
const reTom = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${PROPS})-((?:${FAMILIAS.join('|')})(?:-[a-z0-9]+)*)(?:\\/\\d+)?(?![\\w-])`, 'g');
const reMono = /(?<![\w-])(?:[a-z0-9-]+:)*font-mono(?![\w-])/g;
const reSombra = /(?<![\w-])(?:[a-z0-9-]+:)*shadow-(?:sm|md)(?![\w-])/g;

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
    for (const re of [reCor, reTexto, reMono, reSombra]) {
      for (const m of linha.matchAll(re)) achados.push(`${f}:${i + 1}  ${m[0]}`);
    }
    for (const m of linha.matchAll(reTom)) {
      if (!CORES.has(m[1])) achados.push(`${f}:${i + 1}  ${m[0]} (a cor "${m[1]}" não existe no tailwind.config)`);
    }
  });
}

if (achados.length) {
  console.error(`\nClasses fora do design system (${achados.length}):\n  ${achados.slice(0, 40).join('\n  ')}${achados.length > 40 ? `\n  … e mais ${achados.length - 40}` : ''}\n`);
  console.error('Use as cores navy/gold/green/wine/ink/blue/line/paper/thead/canvas/surface/placa e a escala h1/h2/h3/kpi/display (ver tailwind.config.js);');
  console.error('números alinhados com tabular-nums (sem font-mono); sombra só em sobreposições (shadow-lg).\n');
  process.exit(1);
}
console.log(`Design system OK (${arquivos.length} arquivos verificados).`);
