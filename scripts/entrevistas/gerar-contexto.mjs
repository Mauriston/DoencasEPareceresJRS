// Ficheiro: scripts/entrevistas/gerar-contexto.mjs
// Gera servidor/entrevistas/contexto/textos.ts a partir dos .md de servidor/entrevistas/contexto/
// (glossário da JRS e trechos da DGPM-406 por finalidade). Os textos viram strings no .ts porque o
// servidor é empacotado pelo esbuild em dist/server.cjs e a imagem só leva dist/: nada é lido do disco
// em produção. Rode depois de editar um .md:  node scripts/entrevistas/gerar-contexto.mjs
// (o teste "contexto de conhecimento" falha se textos.ts estiver diferente dos .md).
import fs from 'node:fs';
import path from 'node:path';

const PASTA = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../servidor/entrevistas/contexto');
const ARQUIVOS = {
  GLOSSARIO_JRS: 'glossario-jrs.md',
  TRECHO_VDF: 'dgpm-vdf.md',
  TRECHO_TERMINO: 'dgpm-termino.md',
  TRECHO_AO: 'dgpm-ao.md',
  TRECHO_BENEFICIO: 'dgpm-beneficio.md',
};

let saida = `// Ficheiro: servidor/entrevistas/contexto/textos.ts
// GERADO por scripts/entrevistas/gerar-contexto.mjs a partir dos .md desta pasta — não edite à mão.
// Fonte: DGPM-406 (9ª Rev.), skill "assessor-pericial-dgpm406" do Presidente da JRS (extraído em 08/11/2026).
`;
for (const [nome, arquivo] of Object.entries(ARQUIVOS)) {
  const texto = fs.readFileSync(path.join(PASTA, arquivo), 'utf8');
  saida += `\n/** ${arquivo} */\nexport const ${nome} = ${JSON.stringify(texto)};\n`;
}
fs.writeFileSync(path.join(PASTA, 'textos.ts'), saida);
console.log('Gerado servidor/entrevistas/contexto/textos.ts');
