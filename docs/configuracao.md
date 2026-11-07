# Inventário de configuração

> **Atualizado em 07/11/2026.** Item 18.3 de `docs/database.md`: tudo o que o app precisa para funcionar e que **não** é código — IDs de pastas, propriedades do Apps Script, variáveis do Cloud Run e do build, segredos e serviços do Google Cloud. Para recuperar o ambiente (ou montar um novo projeto), basta seguir esta lista.
>
> **Segredos não entram aqui** (nem no repositório): só o nome e onde ficam. Valores públicos por natureza (configuração web do Firebase, chave do site do reCAPTCHA, IDs de pastas) aparecem para facilitar a recuperação.

## 1. Projeto Google Cloud / Firebase

| Item | Valor | Onde |
|---|---|---|
| Projeto | `jrs-app-web` | `firebase-applet-config.json`, `.firebaserc` implícito nos workflows |
| Firestore | banco `(default)`, `southamerica-east1`, modo nativo | Console → Firestore |
| Storage | `gs://jrs-app-web.firebasestorage.app` (`southamerica-east1`) | `firebase-applet-config.json` |
| Configuração web do Firebase | `apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`… (públicos) | `firebase-applet-config.json` |
| App Check | reCAPTCHA Enterprise, chave do site *app-jrs-hnre* `6LdtjBMuAAAAADcsZuWXKZS2PU8MMvV0tA2z5-K3` (domínio `mauriston.github.io`) | `services/appCheck.ts`; registro no Console → App Check |
| Firebase AI Logic | backend Vertex AI, modelo `gemini-3.5-flash`, região `global` | `services/geminiAI.ts`; API *Vertex AI / Agent Platform* ativa no projeto |
| Backups do Firestore | agendamento gerenciado **semanal** (segunda, retenção de 14 semanas — ativo desde 28/09/2026); **diário** (7 dias) e proteção contra exclusão do banco — ativos desde 06/11/2026 (`scripts/backup/configurar-backup.sh`) | conferidos por `.github/workflows/backup-firestore.yml` |
| Lixeira do Storage | soft delete de **30 dias** (desde 06/11/2026; antes, 7 dias do padrão do GCS) — `scripts/backup/configurar-backup.sh` | Console → Cloud Storage → bucket → Proteção |
| Regras | `firestore.rules`, `storage.rules` | publicadas pelo CI (`deploy-firestore-rules.yml`) |

## 2. Cloud Run (`server.ts`)

| Variável | Conteúdo | Origem |
|---|---|---|
| `GEMINI_API_KEY` | chave da Gemini API (OCR de PDF e análise de imagem no servidor) | **secret** `GEMINI_API_KEY` do GitHub → `deploy-cloud-run.yml` |
| `ALLOWED_ORIGIN` | origem liberada no CORS (padrão `https://mauriston.github.io`) | variável `ALLOWED_ORIGIN` do GitHub |
| `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_EMAIL` | opcionais (o Admin SDK usa as credenciais padrão do Cloud Run) | definidas à mão no serviço, se preciso |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | cliente OAuth "Aplicativo da Web" (`jrs-app-web`) da conta Google da JRS: e-mails de impressão e Google Agenda pelo servidor (ADR-013). Sem eles, o app usa o Apps Script | **secrets** de mesmo nome do GitHub → `deploy-cloud-run.yml` |
| `URL_PUBLICA_SERVIDOR` | opcional: base do URI de retorno do OAuth (padrão: o host do Cloud Run) | definida à mão no serviço, se preciso |
| `ID_PASTA_PARECERES`, `ID_PASTA_RAIZ_CONCURSOS`, `ID_AGENDA_JRS_HNRE`, `EMAIL_IMPRESSAO`, `EMAILS_COPIA_IMPRESSAO` | opcionais: os mesmos valores do Apps Script (padrão no código, `servidor/google/`) | definidas à mão no serviço, se preciso |
| `APP_URL`, `PORT`, `NODE_ENV` | URL do app (links das notificações), porta e modo | padrão do Cloud Run / do código |

Serviço `jrs-hnre-api`, região `southamerica-east1`, 1 GiB de memória (`deploy-cloud-run.yml`). A imagem (Debian) traz o Chromium e as fontes Carlito/Liberation dos documentos em PDF (`CHROMIUM_PATH=/usr/bin/chromium`). A service account do Cloud Run precisa de *Firebase Cloud Messaging API Admin* (push).

## 3. GitHub (Settings → Secrets and variables → Actions)

| Nome | Tipo | Uso |
|---|---|---|
| `GCP_SA_KEY` | secret | Deploy do Cloud Run; também regras e backup quando não houver chave própria |
| `GCP_PROJECT_ID` | secret | Deploy do Cloud Run |
| `GEMINI_API_KEY` | secret | Variável do Cloud Run |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | secret | Variáveis do Cloud Run (conta Google da JRS no servidor) |
| `FIREBASE_RULES_SA_KEY` | secret (opcional) | Teste e publicação das regras (papel *Firebase Rules Admin*) |
| `BACKUP_SA_KEY` | secret (opcional) | Workflow *Backup do Firestore* (papel *Cloud Datastore Owner*) |
| `API_BASE_URL` | variável | URL do Cloud Run no build do app (`VITE_API_BASE_URL`) |
| `FIREBASE_VAPID_KEY` | variável | Chave pública do push (`VITE_FIREBASE_VAPID_KEY`) |
| `ALLOWED_ORIGIN` | variável | CORS do servidor |

Build local: `VITE_FIREBASE_EMULATORS=1` (E2E) e `VITE_APPCHECK_DEBUG_TOKEN` (App Check em `localhost`), ambos opcionais.

## 4. Apps Script (projeto único)

| Item | Valor |
|---|---|
| `scriptId` | `apps-script/projetos.json` |
| `deploymentId` / URL do web app | `apps-script/projetos.json` e `GAS_URL_CONCURSOS` em `config/endpoints.ts` |
| Versão publicada esperada | `VERSAO_SCRIPT` em `CodeConcursos.gs` (conferida por `apps-script-publicado.yml`) |

**Propriedades do script** (Configurações do projeto → Propriedades do script). Desde 06/11/2026 os IDs abaixo são lidos das propriedades (`cfg_` em `CodeConcursos.gs`), com o valor atual do código como padrão — trocar uma pasta não exige editar o código. As antigas `ID_TEMPLATE_*` (templates do Google Docs) não são mais lidas desde a versão `2026-11-07.1` e podem ser apagadas. Para gravar os padrões nas propriedades, rode uma vez `gravarConfiguracaoPadrao()` no editor.

| Propriedade | Uso | Valor padrão |
|---|---|---|
| `ID_PASTA_RAIZ_CONCURSOS` | Pasta CONCURSOS (drive compartilhado) | `1eBTehJDTOPjsgOeP3DjWKbE-iXdIKGos` |
| `ID_PASTA_PARECERES` | Pasta PARECERES | `176YQTOOWXuE78Xul49XYpJsVNyu-eZFi` |
| `ID_PASTA_MINUTAS` | Pasta das minutas de mensagem (`CodePrincipal.gs`) | `1q_Pw_mbjYKvyJvBr-PGmV9pK7YiBZOKv` |
| `ID_AGENDA_JRS_HNRE` | Agenda "JRS/HNRe" (IS e dias de concurso) | `c_b103c034…762@group.calendar.google.com` |
| `EMAIL_IMPRESSAO` | Destino dos e-mails "Enviar para impressão" | e-mail da Secretaria (ver código) |
| `GEMINI_API_KEY` | **Não é mais usada** (a IA saiu do Apps Script em 06/11/2026); pode ser apagada | — |

Constantes que continuam no código por serem públicas e estáveis: `FIREBASE_PROJECT_ID` e `FIREBASE_API_KEY` (validação do `idToken`).

## 5. Outros

| Item | Onde |
|---|---|
| Escala SVÇ | enviada pelo Admin em CSV (coleção `escalaSpa`); a planilha de origem (aba *Agenda*) não é lida pelo app |
| Matriz de permissões | Firestore `config/permissoes` (editada em *Usuários*); padrões em `config/permissions.ts` |
| Turnos dos peritos | Firestore `config/agendaIS` |
| Catálogos | `public/*.json` (CID, OMs, corpos e quadros, finalidades, restrições, serviços do HNRe) |

## 6. Ao mudar algo

1. Atualize este inventário no mesmo PR.
2. Segredo novo → só no GitHub/Cloud Run, nunca no código; registre aqui o **nome**.
3. Pasta nova do Drive → Propriedade do script (sem republicar) e, se for padrão, também o valor em `cfg_` e em `servidor/google/` (ou a variável do Cloud Run).

## 7. Conta Google do servidor (e-mails de impressão e Google Agenda)

Configuração única (ADR-013). Enquanto não for feita, tudo continua pelo Apps Script.

1. **Google Cloud Console → APIs e serviços → Biblioteca** (projeto `jrs-app-web`): ative **Gmail API**, **Google Calendar API** e **Google Drive API**.
2. **Tela de consentimento OAuth**: tipo *Externo*, escopos `gmail.send`, `calendar.events` e `drive.readonly`; status **Em produção** (em "Teste", a autorização expira em 7 dias). Enquanto o Google não verificar o app, a tela mostra "app não verificado" — é só para a conta da JRS: *Avançado → Acessar*.
3. **Credenciais → cliente OAuth `jrs-app-web` (Aplicativo da Web)** → *URIs de redirecionamento autorizados*: `https://jrs-hnre-api-ubxa34sh2q-rj.a.run.app/api/google/retorno`. Crie uma **nova chave secreta** (a antiga não pode mais ser vista).
4. **GitHub → Secrets**: `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET`; rode o workflow *Deploy API to Cloud Run*.
5. No app, como Admin: **Usuários → Conta Google do servidor → Autorizar conta**, entrando com a **conta Google da JRS** (a dona da agenda "JRS/HNRe" e do Apps Script). O cartão passa a "Autorizada" com o e-mail da conta.

O *refresh token* fica em `segredos_servidor/contaGoogle` (Firestore; só o Admin SDK lê). Para revogar: myaccount.google.com → Segurança → Apps de terceiros, ou autorize de novo com outra conta.
