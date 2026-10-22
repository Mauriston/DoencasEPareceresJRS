# Deploy dos projetos Apps Script

O código dos dois projetos Apps Script fica no repositório e é publicado pela **API do Apps Script**, sem copiar e colar no editor:

| Projeto | Pasta | URL no app |
|---|---|---|
| `principal` | `apps-script/principal/` (`Code.gs`) | `GAS_URL` em `config/endpoints.ts` |
| `concursos` | `apps-script/concursos/` (`CodeConcursos.gs`, `CodePrincipal.gs`) | `GAS_URL_CONCURSOS` em `config/endpoints.ts` |

Para um novo projeto: crie a pasta `apps-script/<nome>/` e adicione uma entrada em `apps-script/projetos.json`; o script e o workflow o reconhecem (inclua o nome na lista `options` do workflow para o disparo manual).

## Como funciona
- `scripts/gas-deploy.mjs <projeto|todos>` faz três chamadas à API: `projects.updateContent` (envia os arquivos), `projects.versions.create` (cria uma **nova versão**) e `projects.deployments.update` (aponta a implantação existente para essa versão). A URL `…/exec` **não muda**, então o app não precisa ser alterado.
- A autenticação é por **conta de serviço com delegação em todo o domínio**, que personifica o dono dos projetos. O script assina um JWT novo a cada execução, então não há credencial que vença sozinha.
- Por que não clasp: a credencial do clasp (`~/.clasprc.json`) é um refresh token de usuário. Num domínio Google Workspace com política de reautenticação, ele vence sozinho e o deploy passa a falhar com `invalid_grant / invalid_rapt` sem ninguém ter mexido em nada — foi o que aconteceu em outubro/2026.
- O workflow `.github/workflows/deploy-apps-script.yml` faz isso sozinho quando algo em `apps-script/**` muda na `main` (só publica o projeto que mudou). Também pode ser disparado à mão (Actions → Deploy Apps Script → Run workflow).
- Localmente: `npm run gas:deploy -- concursos` (use `--dry-run` para só simular).

## Configuração (uma vez só)

1. **Ativar a API do Apps Script** na conta dona dos projetos: https://script.google.com/home/usersettings → "API Google Apps Script" → Ativada.
2. **IDs dos projetos** (preencher em `apps-script/projetos.json`):
   - `scriptId`: no editor do projeto → Configurações do projeto (engrenagem) → "ID do script".
   - `deploymentId`: é o trecho `AKfycb…` da URL do web app (`…/macros/s/<deploymentId>/exec`, as mesmas URLs de `config/endpoints.ts`); também aparece em Implantar → Gerenciar implantações → "ID da implantação".
3. **Manifesto**: o `appsscript.json` guarda fuso, permissões e a configuração do web app (executar como, quem acessa). Para não sobrescrever o que já está no projeto, traga o atual para o repositório uma vez.
   - **Pelo editor (mais simples)**: no projeto, Configurações do projeto (engrenagem) → marque "Mostrar arquivo de manifesto "appsscript.json" no editor" → volte ao editor, abra `appsscript.json`, copie o conteúdo e salve em `apps-script/<projeto>/appsscript.json`.
   - **Pelo clasp** (opcional, só para esta cópia inicial — o deploy em si não usa clasp):
   ```bash
   npm i -g @google/clasp && clasp login
   cd apps-script/concursos && echo '{"scriptId":"<scriptId>"}' > .clasp.json && clasp pull && rm .clasp.json
   ```
   (repita em `apps-script/principal/`). O `clasp pull` pode trazer arquivos de código; mantenha só o `appsscript.json` e deixe o `.gs` do repositório como está.
4. **Conta de serviço** (no Google Cloud, em qualquer projeto do domínio — pode ser o `jrs-app-web`):
   - IAM e administrador → Contas de serviço → **Criar conta de serviço**. Use uma conta **dedicada a este deploy** (ex.: `gas-deploy`), não uma que já exista para outra coisa: a delegação do passo 5 dá a ela o poder de agir como um usuário do domínio, e convém que essa chave viva só no secret do GitHub.
   - Na conta criada → Chaves → **Adicionar chave** → Criar nova chave → **JSON**. O arquivo baixa uma vez só.
   - APIs e serviços → **Ativar** a `script.googleapis.com` (API Google Apps Script) no projeto da conta de serviço.
   - Anote o **ID do cliente** (OAuth 2, numérico) da conta de serviço — aparece na aba Detalhes.
5. **Delegação em todo o domínio** (precisa de administrador do Google Workspace): Admin → Segurança → Acesso e controle de dados → **Controles de API** → Delegação em todo o domínio → **Adicionar novo**. Cole o ID do cliente do passo 4 e, em escopos OAuth, exatamente estes dois, separados por vírgula:
   ```
   https://www.googleapis.com/auth/script.projects,https://www.googleapis.com/auth/script.deployments
   ```
   A delegação pode levar alguns minutos para valer.
6. **Secrets no GitHub** (Settings → Secrets and variables → Actions → New repository secret):
   - `GAS_SA_KEY`: o conteúdo **inteiro** do JSON baixado no passo 4. É uma credencial: não a cole em issues, PRs ou chats. Para copiar sem exibir na tela: macOS `pbcopy < chave.json`; Windows `clip < chave.json`; Linux `xclip -selection clipboard < chave.json`.
   - `GAS_IMPERSONATE`: o e-mail do usuário do domínio que é dono dos projetos Apps Script (o mesmo do passo 1).
   Depois de criar os secrets, apague o arquivo JSON baixado.

## Cuidados
- **Novas permissões**: se uma versão passar a usar um serviço novo (ex.: Drive), o dono do projeto precisa autorizar uma vez — abra o projeto no editor, rode qualquer função e aceite as permissões. Até lá o web app responde com erro de autorização.
- **Propriedades do script** (ex.: `GEMINI_API_KEY`) não vão no repositório e não são alteradas pelo deploy.
- O deploy **substitui todo o conteúdo** do projeto remoto (`updateContent` manda a lista completa de arquivos): edições feitas direto no editor e não comitadas se perdem. Daqui em diante, edite pelo repositório.
- `npm run gas:deploy -- <projeto> --dry-run` mostra os arquivos que seriam enviados e confirma o acesso ao projeto, sem alterar nada.

### Erros comuns
| Mensagem | O que fazer |
|---|---|
| `unauthorized_client` ao pegar o token | A delegação do passo 5 não está valendo: confira o ID do cliente e os dois escopos, e espere alguns minutos. |
| `Not a valid email or user ID` | `GAS_IMPERSONATE` não é um usuário do domínio. |
| `User has not enabled the Apps Script API` | Entre como o usuário de `GAS_IMPERSONATE` em https://script.google.com/home/usersettings e ative a API (passo 1). |
| `Requested entity was not found` | `scriptId` ou `deploymentId` errado em `apps-script/projetos.json`, ou o usuário personificado não tem acesso de edição ao projeto. |

## Consolidação dos projetos
`apps-script/concursos/CodePrincipal.gs` recebeu as ações em uso do antigo projeto `principal` (`getLookups`, `getMilitaresList`, `getMilitar`, `getPericiaMenorList`, `getExtras`, `extrair_dados_atestado`, `gerarMinutaMensagem`; a `gerar_pericia_menor` foi removida — a Perícia Menor agora é gravada no Firestore), com o mesmo formato de resposta. O `doPost` de `CodeConcursos.gs` encaminha essas ações para `doPostPrincipal`. Ficaram de fora, por estarem sem uso: `getPareceresList`, `imprimir` e o parecer "regular" por planilha. Enquanto o app não migrar para a URL única, o projeto `principal` continua como está (reversão).
