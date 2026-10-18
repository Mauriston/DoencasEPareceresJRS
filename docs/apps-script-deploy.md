# Deploy dos projetos Apps Script (clasp)

O código dos dois projetos Apps Script fica no repositório e é publicado com o [clasp](https://github.com/google/clasp), sem copiar e colar no editor:

| Projeto | Pasta | URL no app |
|---|---|---|
| `principal` | `apps-script/principal/` (`Code.gs`) | `GAS_URL` em `config/endpoints.ts` |
| `concursos` | `apps-script/concursos/` (`CodeConcursos.gs`) | `GAS_URL_CONCURSOS` em `config/endpoints.ts` |

Para um novo projeto: crie a pasta `apps-script/<nome>/` e adicione uma entrada em `apps-script/projetos.json`; o script e o workflow o reconhecem (inclua o nome na lista `options` do workflow para o disparo manual).

## Como funciona
- `scripts/gas-deploy.mjs <projeto|todos>` roda `clasp push` (envia os arquivos) e `clasp deploy -i <deploymentId>` (cria uma **nova versão** na implantação existente). A URL `…/exec` **não muda**, então o app não precisa ser alterado.
- O workflow `.github/workflows/deploy-apps-script.yml` faz isso sozinho quando algo em `apps-script/**` muda na `main` (só publica o projeto que mudou). Também pode ser disparado à mão (Actions → Deploy Apps Script → Run workflow).
- Localmente: `npm run gas:deploy -- concursos` (use `--dry-run` para só simular).

## Configuração (uma vez só)

1. **Ativar a API do Apps Script** na conta dona dos projetos: https://script.google.com/home/usersettings → "API Google Apps Script" → Ativada.
2. **IDs dos projetos** (preencher em `apps-script/projetos.json`):
   - `scriptId`: no editor do projeto → Configurações do projeto (engrenagem) → "ID do script".
   - `deploymentId`: é o trecho `AKfycb…` da URL do web app (`…/macros/s/<deploymentId>/exec`, as mesmas URLs de `config/endpoints.ts`); também aparece em Implantar → Gerenciar implantações → "ID da implantação".
3. **Manifesto**: o `appsscript.json` guarda fuso, permissões e a configuração do web app (executar como, quem acessa). Para não sobrescrever o que já está no projeto, traga o atual para o repositório uma vez.
   - **Pelo editor (mais simples)**: no projeto, Configurações do projeto (engrenagem) → marque "Mostrar arquivo de manifesto "appsscript.json" no editor" → volte ao editor, abra `appsscript.json`, copie o conteúdo e salve em `apps-script/<projeto>/appsscript.json`.
   - **Pelo clasp**:
   ```bash
   npm i -g @google/clasp && clasp login
   cd apps-script/concursos && echo '{"scriptId":"<scriptId>"}' > .clasp.json && clasp pull && rm .clasp.json
   ```
   (repita em `apps-script/principal/`). O `clasp pull` pode trazer arquivos de código; mantenha só o `appsscript.json` e deixe o `.gs` do repositório como está.
4. **Credenciais no GitHub**: depois do `clasp login` (abre o navegador para você autorizar), o clasp cria o arquivo oculto `.clasprc.json` na sua pasta pessoal (`~/.clasprc.json`; no Windows, `C:\Users\<você>\.clasprc.json`). Copie o conteúdo dele para um secret do repositório chamado `CLASPRC_JSON` (Settings → Secrets and variables → Actions → New repository secret). Para copiar sem exibir na tela: macOS `pbcopy < ~/.clasprc.json`; Windows (prompt) `clip < %USERPROFILE%\.clasprc.json`; Linux `xclip -selection clipboard < ~/.clasprc.json`. É a credencial da sua conta Google: não a cole em issues, PRs ou chats.

## Cuidados
- **Novas permissões**: se uma versão passar a usar um serviço novo (ex.: Drive), o dono do projeto precisa autorizar uma vez — abra o projeto no editor, rode qualquer função e aceite as permissões. Até lá o web app responde com erro de autorização.
- **Propriedades do script** (ex.: `GEMINI_API_KEY`) não vão no repositório e não são alteradas pelo deploy.
- Um `clasp push` substitui o código remoto: edições feitas direto no editor e não comitadas se perdem. Daqui em diante, edite pelo repositório.
- Se o workflow falhar com erro de autenticação, refaça o `clasp login` e atualize o secret `CLASPRC_JSON`.
