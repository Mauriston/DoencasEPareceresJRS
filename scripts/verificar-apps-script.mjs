// Ficheiro: scripts/verificar-apps-script.mjs
// Compara a versão do Apps Script no ar (ação "versao" da implantação em GAS_URL_CONCURSOS)
// com VERSAO_SCRIPT de apps-script/concursos/CodeConcursos.gs. Sai com código 1 se forem
// diferentes — o que quer dizer que o código do repositório ainda não foi reimplantado (ver
// docs/apps-script-deploy.md). Usado pelo workflow .github/workflows/apps-script-publicado.yml.
//
// Uso: node scripts/verificar-apps-script.mjs
import fs from 'node:fs';

const raiz = new URL('..', import.meta.url);
const codigo = fs.readFileSync(new URL('apps-script/concursos/CodeConcursos.gs', raiz), 'utf8');
const endpoints = fs.readFileSync(new URL('config/endpoints.ts', raiz), 'utf8');

const versaoRepo = codigo.match(/var VERSAO_SCRIPT = '([^']+)'/)?.[1];
const url = endpoints.match(/GAS_URL_CONCURSOS = '([^']+)'/)?.[1];
if (!versaoRepo || !url) {
  console.error('Não encontrei VERSAO_SCRIPT em CodeConcursos.gs ou GAS_URL_CONCURSOS em config/endpoints.ts.');
  process.exit(2);
}

let versaoNoAr = '';
try {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'versao' }),
    redirect: 'follow',
  });
  const json = JSON.parse(await resp.text());
  // Implantações anteriores ao controle de versão não conhecem a ação "versao".
  versaoNoAr = json?.sucesso ? String(json.dados?.versao || '') : '(anterior ao controle de versão)';
} catch (e) {
  console.error(`Não foi possível consultar o Apps Script: ${e.message}`);
  process.exit(2);
}

console.log(`Versão no repositório: ${versaoRepo}`);
console.log(`Versão no ar:          ${versaoNoAr}`);
if (`GITHUB_OUTPUT` in process.env) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `versao_repo=${versaoRepo}\nversao_no_ar=${versaoNoAr}\n`);
}
if (versaoNoAr !== versaoRepo) {
  console.log('\nO Apps Script no ar está desatualizado: reimplante seguindo docs/apps-script-deploy.md.');
  process.exit(1);
}
console.log('\nO Apps Script no ar está em dia com o repositório.');
