# Publicação dos projetos Apps Script (manual)

O código do projeto Apps Script fica **versionado neste repositório** — ele é a fonte da verdade — e é publicado **colando no editor do Apps Script**. Não há automação de deploy.

| Projeto | Pasta no repositório | Arquivos | URL no app |
|---|---|---|---|
| `concursos` | `apps-script/concursos/` | `CodeConcursos.gs`, `CodePrincipal.gs` | `GAS_URL_CONCURSOS` em `config/endpoints.ts` |

Os IDs do projeto (`scriptId` e `deploymentId`) estão em `apps-script/projetos.json`. Nenhum script lê esse arquivo: ele serve de referência para achar o projeto certo no editor e conferir a qual implantação cada URL corresponde.

## Por que não é automático

Já houve um deploy por [clasp](https://github.com/google/clasp) no GitHub Actions. Ele parou de funcionar porque a credencial do clasp (`~/.clasprc.json`, guardada no secret `CLASPRC_JSON`) é um **refresh token de usuário**, e o domínio Google Workspace tem política de reautenticação: o token vence sozinho e o deploy passa a falhar com `invalid_grant / invalid_rapt` sem ninguém ter mexido em nada. Renovar o secret só adia o próximo vencimento.

Como os `.gs` mudam pouco, a automação custava mais em manutenção e em falhas vermelhas do que economizava em colagens.

**Se um dia valer a pena automatizar de novo**, o caminho certo não é renovar o clasp: é uma **conta de serviço com delegação em todo o domínio** falando direto com `script.googleapis.com` (`projects.updateContent` + `projects.versions.create` + `projects.deployments.update`), que assina um JWT novo a cada execução e não tem credencial que expire. Essa solução já foi escrita e testada; está parada no PR #174 e pode ser recuperada com:

```bash
git fetch origin refs/pull/174/head:gas-deploy-sa
```

## Controle de versão (o que está no ar?)

- `CodeConcursos.gs` declara `VERSAO_SCRIPT` (formato `AAAA-MM-DD.N`). **Aumente esse valor em toda alteração de qualquer `.gs`** do projeto.
- O web app responde à ação `versao` (sem login) com a versão publicada; `node scripts/verificar-apps-script.mjs` compara com a do repositório.
- O workflow **Apps Script publicado** (`.github/workflows/apps-script-publicado.yml`) roda quando um `.gs` muda na `main`, todo dia útil de manhã e sob demanda. Enquanto a versão no ar for diferente da do repositório, mantém aberta a issue **"Reimplantar o Apps Script"** com o checklist abaixo; quando você publica, ela fecha sozinha.
- O `deploymentId` (que define a URL `…/exec` do app) está versionado em `apps-script/projetos.json` e em `config/endpoints.ts`. Publicar sempre **editando a implantação existente** mantém esse id; criar implantação nova quebraria o app.

## Como publicar uma alteração

Depois de alterar um `.gs` no repositório (e mergear na `main`):

1. **Abra o projeto** no editor: https://script.google.com → o projeto correspondente à pasta que você mudou.
2. **Cole o código**: abra o arquivo com o mesmo nome no editor, selecione tudo (`Ctrl/Cmd+A`) e cole o conteúdo do arquivo do repositório. Repita para cada arquivo alterado. Salve (`Ctrl/Cmd+S`).
3. **Publique uma nova versão** — este passo é o que mais se esquece: salvar o código **não** atualiza o web app. Vá em **Implantar → Gerenciar implantações**, clique no lápis (editar) da implantação existente, em **Versão** escolha **Nova versão**, e clique em **Implantar**.
   - Editar a implantação existente mantém a **mesma URL `…/exec`**, então `config/endpoints.ts` não muda. Criar uma implantação *nova* geraria outra URL e quebraria o app.
4. **Teste** a funcionalidade que depende daquela ação no app.
5. **Confira a versão**: em GitHub → Actions → "Apps Script publicado" → *Run workflow* (ou `node scripts/verificar-apps-script.mjs`). A issue de reimplantação fecha quando a versão no ar bate com a do repositório.

### Checklist rápido
- [ ] `VERSAO_SCRIPT` aumentada no commit que alterou o `.gs`.
- [ ] Código colado em todos os arquivos alterados e salvo.
- [ ] Nova versão na implantação **existente** (mesmo deploymentId).
- [ ] Permissões novas autorizadas, se pedidas.
- [ ] Funcionalidade testada no app e versão conferida.

## Falhas e cotas

- **Logs:** use `logSeguro_(contexto, erro)` (CodeConcursos.gs); nunca `Logger.log` com corpo, NIP, nome, CID ou token.
- **Gemini:** todas as chamadas passam por `chamarGemini`, que tenta de novo nas falhas passageiras (429 limite de uso, 500, 503; esperas de 2 s e 4 s) e devolve mensagens claras de cota ou indisponibilidade.
- **E-mail para impressão:** `garantirCotaEmail` verifica a cota diária do `MailApp` antes de enviar. O documento é gerado e salvo **antes** do e-mail: se o envio falhar, o app avisa, o PDF continua salvo no Drive e o documento continua na fila de impressão da Secretaria (Início).

## Cuidados

- **A direção é sempre repositório → editor.** Se alguém editar direto no editor, a alteração não está versionada e some na próxima colagem. Quando isso acontecer, traga o código do editor para o repositório antes de qualquer outra coisa.
- **Permissões novas**: se uma versão passar a usar um serviço que o projeto ainda não usava (ex.: Drive, Agenda), o dono precisa autorizar uma vez — no editor, rode qualquer função e aceite as permissões. Até lá o web app responde com erro de autorização.
- **Propriedades do script** (ex.: `GEMINI_API_KEY`) ficam em Configurações do projeto → Propriedades do script. Não estão no repositório e não são afetadas pela colagem.
- **Manifesto**: `apps-script/<projeto>/appsscript.json` guarda fuso, permissões e a configuração do web app (executar como, quem acessa). Normalmente não muda; se mudar, atualize também pelo editor (Configurações do projeto → marque "Mostrar arquivo de manifesto `appsscript.json` no editor").
- O secret `CLASPRC_JSON` do repositório não é mais usado por nada e pode ser apagado.

## Consolidação dos projetos

O antigo projeto `principal` (`Code.gs`, URL que terminava em `…AKfycby2vz9K…/exec`) foi **desativado em 31/10/2026**. Ele lia a planilha principal (abas `ListasRef`, `OM`, `Perito`, `Militares`, `Templates`, `Templates_Documentos`, `Pareceres`, `Pericia_Menor`, `Usuarios`) e a planilha de conteúdos extras, que deixaram de ser usadas — os dados estão no Firestore.

- As duas ações dele ainda em uso (`extrair_dados_atestado` e `gerarMinutaMensagem`) ficam em `CodePrincipal.gs`, no projeto `concursos`, e o app (Perícia Menor e Mensagens) chama só a URL desse projeto.
- As ações GET que liam as planilhas (`getLookups`, `getMilitaresList`, `getMilitar`, `getPericiaMenorList`, `getExtras`) e o cadastro de militar na planilha foram removidos de `CodePrincipal.gs`. O projeto não tem mais `doGet`.
- **No Google:** depois de publicar esta versão do projeto `concursos`, o projeto `principal` pode ser arquivado (ou ter a implantação removida) no editor do Apps Script, e as planilhas podem ser arquivadas no Drive. Nada no app depende mais deles.
