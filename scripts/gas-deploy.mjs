// Envia o código de apps-script/<projeto>/ para o projeto Apps Script e atualiza a implantação (web app)
// existente numa NOVA VERSÃO — a URL ".../exec" não muda. Fala direto com a API do Apps Script
// (script.googleapis.com), autenticado por uma conta de serviço com delegação em todo o domínio, que
// personifica o dono dos projetos. Não usa clasp: a credencial do clasp é um refresh token de usuário e,
// num domínio Google Workspace com política de reautenticação, ela vence sozinha (invalid_rapt) e quebra o
// deploy sem ninguém ter mexido em nada. A conta de serviço assina um JWT novo a cada execução.
// Ver docs/apps-script-deploy.md.
//
//   node scripts/gas-deploy.mjs <projeto|todos> [--so-se-mudou=<sha-anterior>] [--dry-run]
//
// Variáveis de ambiente:
//   GAS_SA_KEY        — JSON da chave da conta de serviço (ou GAS_SA_KEY_FILE com o caminho do arquivo)
//   GAS_IMPERSONATE   — e-mail do usuário personificado (precisa poder editar os projetos)
import { execFileSync } from 'node:child_process';
import { createSign } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, extname, basename } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const projetos = JSON.parse(readFileSync(join(RAIZ, 'apps-script', 'projetos.json'), 'utf8'));

const API = 'https://script.googleapis.com/v1';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
// script.projects: conteúdo e versões; script.deployments: apontar a implantação para a nova versão.
const ESCOPOS = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.deployments',
];

// Extensão → tipo de arquivo da API. O manifesto entra como "appsscript" (JSON).
const TIPOS = { '.gs': 'SERVER_JS', '.js': 'SERVER_JS', '.html': 'HTML', '.json': 'JSON' };

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

// -------------------------------------------------------------------------
// Autenticação: JWT assinado pela conta de serviço, trocado por um access token
// -------------------------------------------------------------------------

const lerChaveServico = () => {
  const arquivo = process.env.GAS_SA_KEY_FILE;
  const bruto = arquivo ? readFileSync(arquivo, 'utf8') : process.env.GAS_SA_KEY;
  if (!bruto) falhar('Defina GAS_SA_KEY (JSON da chave da conta de serviço) ou GAS_SA_KEY_FILE. Ver docs/apps-script-deploy.md.');
  let chave;
  try { chave = JSON.parse(bruto); } catch { falhar('GAS_SA_KEY não é um JSON válido (copie o arquivo de chave inteiro).'); }
  if (!chave.client_email || !chave.private_key) falhar('A chave da conta de serviço não tem "client_email"/"private_key".');
  return chave;
};

const base64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const obterAccessToken = async () => {
  const chave = lerChaveServico();
  const subject = process.env.GAS_IMPERSONATE;
  if (!subject) falhar('Defina GAS_IMPERSONATE com o e-mail do usuário dono dos projetos Apps Script.');

  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = base64url(JSON.stringify({
    iss: chave.client_email,
    sub: subject, // delegação em todo o domínio: age como este usuário
    scope: ESCOPOS.join(' '),
    aud: TOKEN_URL,
    iat: agora,
    exp: agora + 3600,
  }));
  const assinatura = base64url(createSign('RSA-SHA256').update(`${cabecalho}.${corpo}`).sign(chave.private_key));

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecalho}.${corpo}.${assinatura}`,
    }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json.access_token) {
    const detalhe = json.error_description || json.error || `HTTP ${resp.status}`;
    if (String(json.error) === 'unauthorized_client') {
      falhar(`Token negado (${detalhe}). A delegação em todo o domínio não está liberada: no Admin do Google Workspace, `
        + `Segurança → Controle de API → Delegação em todo o domínio, inclua o Client ID ${chave.client_id || '(da conta de serviço)'} `
        + `com os escopos:\n  ${ESCOPOS.join('\n  ')}`);
    }
    falhar(`Não foi possível obter o token da conta de serviço: ${detalhe}`);
  }
  return json.access_token;
};

// -------------------------------------------------------------------------
// API do Apps Script
// -------------------------------------------------------------------------

const chamarApi = async (token, metodo, caminho, corpo) => {
  const resp = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resp.text();
  let json;
  try { json = texto ? JSON.parse(texto) : {}; } catch { json = {}; }
  if (!resp.ok) {
    const msg = json?.error?.message || texto || `HTTP ${resp.status}`;
    // Erro clássico: a API do Apps Script está desligada na conta personificada.
    if (/has not enabled the Apps Script API/i.test(msg)) {
      throw new Error(`${msg}\n    → entre como ${process.env.GAS_IMPERSONATE} em https://script.google.com/home/usersettings e ative "API Google Apps Script".`);
    }
    throw new Error(`${metodo} ${caminho} → ${resp.status}: ${msg}`);
  }
  return json;
};

/** Arquivos do projeto no formato da API (manifesto primeiro, como no editor). */
const coletarArquivos = dir => {
  const arquivos = [];
  for (const nomeArquivo of readdirSync(dir).sort()) {
    const ext = extname(nomeArquivo);
    const tipo = TIPOS[ext];
    if (!tipo) continue;
    if (nomeArquivo === '.clasp.json') continue;
    const nome = nomeArquivo === 'appsscript.json' ? 'appsscript' : basename(nomeArquivo, ext);
    if (ext === '.json' && nome !== 'appsscript') continue; // só o manifesto é JSON num projeto Apps Script
    arquivos.push({ name: nome, type: tipo, source: readFileSync(join(dir, nomeArquivo), 'utf8') });
  }
  return arquivos.sort((a, b) => (a.name === 'appsscript' ? -1 : b.name === 'appsscript' ? 1 : 0));
};

// -------------------------------------------------------------------------

let erros = 0;
const pendentes = nomes.filter(nome => {
  if (!mudou(nome)) { console.log(`• ${nome}: sem mudanças em apps-script/${nome}, nada a publicar.`); return false; }
  return true;
});

if (pendentes.length === 0) process.exit(0);

// Preguiçoso de propósito: a lista de arquivos é impressa antes de pedir o token, então
// "--dry-run" já mostra o que seria enviado mesmo numa máquina sem a chave configurada.
let tokenCache = null;
const obterToken = async () => (tokenCache ??= await obterAccessToken());

for (const nome of pendentes) {
  const { scriptId, deploymentId } = projetos[nome];
  const dir = join(RAIZ, 'apps-script', nome);
  // Projeto ainda não configurado (sem scriptId): em "todos" é só ignorado; pedido pelo nome, é erro.
  if (!scriptId && alvo === 'todos') { console.log(`• ${nome}: sem scriptId em apps-script/projetos.json, ignorado.`); continue; }
  if (!scriptId || !deploymentId) { console.error(`✖ ${nome}: preencha scriptId e deploymentId em apps-script/projetos.json.`); erros++; continue; }
  if (!existsSync(join(dir, 'appsscript.json'))) {
    console.error(`✖ ${nome}: falta apps-script/${nome}/appsscript.json (manifesto). Ver docs/apps-script-deploy.md.`);
    erros++; continue;
  }

  try {
    const sha = git(['rev-parse', '--short', 'HEAD']);
    const arquivos = coletarArquivos(dir);
    console.log(`▶ ${nome}: ${dryRun ? '(simulação) ' : ''}publicando ${sha} — ${arquivos.map(a => a.name).join(', ')}`);

    if (dryRun) {
      // Valida credencial e acesso de verdade, sem escrever nada.
      const info = await chamarApi(await obterToken(), 'GET', `/projects/${scriptId}`);
      console.log(`  acesso confirmado ao projeto "${info.title || scriptId}" (nada foi alterado).`);
      continue;
    }

    const token = await obterToken();
    await chamarApi(token, 'PUT', `/projects/${scriptId}/content`, { files: arquivos });
    const versao = await chamarApi(token, 'POST', `/projects/${scriptId}/versions`, { description: `repo ${sha}` });
    if (!versao.versionNumber) throw new Error('a API não devolveu o número da nova versão.');
    await chamarApi(token, 'PUT', `/projects/${scriptId}/deployments/${deploymentId}`, {
      deploymentConfig: {
        scriptId,
        versionNumber: versao.versionNumber,
        manifestFileName: 'appsscript',
        description: `repo ${sha}`,
      },
    });
    console.log(`✔ ${nome}: versão ${versao.versionNumber} publicada na implantação existente (a URL não mudou).`);
  } catch (e) {
    console.error(`✖ ${nome}: ${e.message}`);
    erros++;
  }
}
process.exit(erros ? 1 : 0);
