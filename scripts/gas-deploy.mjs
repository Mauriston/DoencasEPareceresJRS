// Envia o código de apps-script/<projeto>/ para o projeto Apps Script e atualiza a implantação (web app)
// existente numa NOVA VERSÃO — a URL ".../exec" não muda. Usa o clasp (via npx); a autenticação vem de
// ~/.clasprc.json (clasp login, ou o secret CLASPRC_JSON no GitHub Actions). Ver docs/apps-script-deploy.md.
//
//   node scripts/gas-deploy.mjs <projeto|todos> [--so-se-mudou=<sha-anterior>] [--dry-run]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const projetos = JSON.parse(readFileSync(join(RAIZ, 'apps-script', 'projetos.json'), 'utf8'));
const CLASP = '@google/clasp@3.4.1';

const [alvo, ...opcoes] = process.argv.slice(2);
const dryRun = opcoes.includes('--dry-run');
const anterior = opcoes.find(o => o.startsWith('--so-se-mudou='))?.split('=')[1];

const falhar = msg => { console.error(`✖ ${msg}`); process.exit(1); };
if (!alvo) falhar('Informe o projeto: ' + Object.keys(projetos).join(' | ') + ' | todos');
const nomes = alvo === 'todos' ? Object.keys(projetos) : [alvo];
for (const n of nomes) if (!projetos[n]) falhar(`Projeto desconhecido: "${n}".`);

const git = args => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).trim();
const mudou = nome => {
  if (!anterior || /^0+$/.test(anterior)) return true; // sem referência (primeiro push): publica
  try { return git(['diff', '--name-only', anterior, 'HEAD', '--', `apps-script/${nome}`]) !== ''; } catch { return true; }
};

let erros = 0;
for (const nome of nomes) {
  const { scriptId, deploymentId } = projetos[nome];
  const dir = join(RAIZ, 'apps-script', nome);
  if (!mudou(nome)) { console.log(`• ${nome}: sem mudanças em apps-script/${nome}, nada a publicar.`); continue; }
  // Projeto ainda não configurado (sem scriptId): em "todos" é só ignorado; pedido pelo nome, é erro.
  if (!scriptId && alvo === 'todos') { console.log(`• ${nome}: sem scriptId em apps-script/projetos.json, ignorado.`); continue; }
  if (!scriptId || !deploymentId) { console.error(`✖ ${nome}: preencha scriptId e deploymentId em apps-script/projetos.json.`); erros++; continue; }
  if (!existsSync(join(dir, 'appsscript.json'))) {
    console.error(`✖ ${nome}: falta apps-script/${nome}/appsscript.json (manifesto). Rode "clasp pull" uma vez nesse projeto e comite o arquivo.`);
    erros++; continue;
  }

  const arquivoClasp = join(dir, '.clasp.json');
  writeFileSync(arquivoClasp, JSON.stringify({ scriptId, rootDir: '.' }));
  const clasp = args => execFileSync('npx', ['--yes', CLASP, ...args], { cwd: dir, stdio: 'inherit' });
  try {
    const sha = git(['rev-parse', '--short', 'HEAD']);
    console.log(`▶ ${nome}: ${dryRun ? '(simulação) ' : ''}publicando ${sha}…`);
    if (dryRun) { console.log(`  clasp push --force  +  clasp deploy -i ${deploymentId}`); continue; }
    clasp(['push', '--force']);
    clasp(['deploy', '--deploymentId', deploymentId, '--description', `repo ${sha}`]);
    console.log(`✔ ${nome}: nova versão publicada na implantação existente.`);
  } catch (e) {
    console.error(`✖ ${nome}: falha no clasp (${e.message}).`);
    erros++;
  } finally {
    rmSync(arquivoClasp, { force: true });
  }
}
process.exit(erros ? 1 : 0);
