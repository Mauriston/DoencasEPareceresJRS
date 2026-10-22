# Publicação dos projetos Apps Script (manual)

O código dos dois projetos Apps Script fica **versionado neste repositório** — ele é a fonte da verdade — e é publicado **colando no editor do Apps Script**. Não há automação de deploy.

| Projeto | Pasta no repositório | Arquivos | URL no app |
|---|---|---|---|
| `principal` | `apps-script/principal/` | `Code.gs` | `GAS_URL` em `config/endpoints.ts` |
| `concursos` | `apps-script/concursos/` | `CodeConcursos.gs`, `CodePrincipal.gs` | `GAS_URL_CONCURSOS` em `config/endpoints.ts` |

Os IDs de cada projeto (`scriptId` e `deploymentId`) estão em `apps-script/projetos.json`. Nenhum script lê esse arquivo: ele serve de referência para achar o projeto certo no editor e conferir a qual implantação cada URL corresponde.

## Por que não é automático

Já houve um deploy por [clasp](https://github.com/google/clasp) no GitHub Actions. Ele parou de funcionar porque a credencial do clasp (`~/.clasprc.json`, guardada no secret `CLASPRC_JSON`) é um **refresh token de usuário**, e o domínio Google Workspace tem política de reautenticação: o token vence sozinho e o deploy passa a falhar com `invalid_grant / invalid_rapt` sem ninguém ter mexido em nada. Renovar o secret só adia o próximo vencimento.

Como os `.gs` mudam pouco, a automação custava mais em manutenção e em falhas vermelhas do que economizava em colagens.

**Se um dia valer a pena automatizar de novo**, o caminho certo não é renovar o clasp: é uma **conta de serviço com delegação em todo o domínio** falando direto com `script.googleapis.com` (`projects.updateContent` + `projects.versions.create` + `projects.deployments.update`), que assina um JWT novo a cada execução e não tem credencial que expire. Essa solução já foi escrita e testada; está parada no PR #174 e pode ser recuperada com:

```bash
git fetch origin refs/pull/174/head:gas-deploy-sa
```

## Como publicar uma alteração

Depois de alterar um `.gs` no repositório (e mergear na `main`):

1. **Abra o projeto** no editor: https://script.google.com → o projeto correspondente à pasta que você mudou.
2. **Cole o código**: abra o arquivo com o mesmo nome no editor, selecione tudo (`Ctrl/Cmd+A`) e cole o conteúdo do arquivo do repositório. Repita para cada arquivo alterado. Salve (`Ctrl/Cmd+S`).
3. **Publique uma nova versão** — este passo é o que mais se esquece: salvar o código **não** atualiza o web app. Vá em **Implantar → Gerenciar implantações**, clique no lápis (editar) da implantação existente, em **Versão** escolha **Nova versão**, e clique em **Implantar**.
   - Editar a implantação existente mantém a **mesma URL `…/exec`**, então `config/endpoints.ts` não muda. Criar uma implantação *nova* geraria outra URL e quebraria o app.
4. **Teste** a funcionalidade que depende daquela ação no app.

## Cuidados

- **A direção é sempre repositório → editor.** Se alguém editar direto no editor, a alteração não está versionada e some na próxima colagem. Quando isso acontecer, traga o código do editor para o repositório antes de qualquer outra coisa.
- **Permissões novas**: se uma versão passar a usar um serviço que o projeto ainda não usava (ex.: Drive, Agenda), o dono precisa autorizar uma vez — no editor, rode qualquer função e aceite as permissões. Até lá o web app responde com erro de autorização.
- **Propriedades do script** (ex.: `GEMINI_API_KEY`) ficam em Configurações do projeto → Propriedades do script. Não estão no repositório e não são afetadas pela colagem.
- **Manifesto**: `apps-script/<projeto>/appsscript.json` guarda fuso, permissões e a configuração do web app (executar como, quem acessa). Normalmente não muda; se mudar, atualize também pelo editor (Configurações do projeto → marque "Mostrar arquivo de manifesto `appsscript.json` no editor").
- O secret `CLASPRC_JSON` do repositório não é mais usado por nada e pode ser apagado.

## Consolidação dos projetos
`apps-script/concursos/CodePrincipal.gs` recebeu as ações em uso do antigo projeto `principal` (`getLookups`, `getMilitaresList`, `getMilitar`, `getPericiaMenorList`, `getExtras`, `extrair_dados_atestado`, `gerarMinutaMensagem`; a `gerar_pericia_menor` foi removida — a Perícia Menor agora é gravada no Firestore), com o mesmo formato de resposta. O `doPost` de `CodeConcursos.gs` encaminha essas ações para `doPostPrincipal`. Ficaram de fora, por estarem sem uso: `getPareceresList`, `imprimir` e o parecer "regular" por planilha. Enquanto o app não migrar para a URL única, o projeto `principal` continua como está (reversão).
