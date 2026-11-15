// Ficheiro: scripts/documentos/gerar-imagens-guias.mjs
// Gera servidor/documentos/guiasExames/imagens.ts com a rubrica do Presidente e o odontograma em base64
// (a partir de servidor/documentos/guiasExames/imagens/*.png). O servidor é empacotado pelo esbuild
// (dist/server.cjs) e a imagem do Cloud Run só leva o dist/: as imagens precisam ir dentro do código,
// como o brasão (servidor/documentos/brasao.ts). Rode de novo sempre que trocar um dos PNG:
//   node scripts/documentos/gerar-imagens-guias.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pasta = join(raiz, 'servidor', 'documentos', 'guiasExames');
const b64 = nome => readFileSync(join(pasta, 'imagens', nome)).toString('base64');

writeFileSync(join(pasta, 'imagens.ts'), `// Ficheiro: servidor/documentos/guiasExames/imagens.ts
// GERADO por scripts/documentos/gerar-imagens-guias.mjs a partir de imagens/*.png — não edite à mão.
// PNG em base64 para o HTML das guias não depender de arquivo no Cloud Run (só o dist/ vai na imagem).

/** Rubrica do Presidente (157×270 px, fundo transparente). */
export const RUBRICA_PNG_BASE64 =
  '${b64('rubrica.png')}';

/** Odontograma da guia do Exame odontológico geral (956×562 px). */
export const ODONTOGRAMA_PNG_BASE64 =
  '${b64('odontograma.png')}';
`);
console.log('servidor/documentos/guiasExames/imagens.ts gerado.');
