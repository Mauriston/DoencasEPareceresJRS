# Inventário de configuração

> **Atualizado em 08/11/2026.** Item 18.3 de `docs/database.md`: tudo o que o app precisa para funcionar e que **não** é código — IDs de pastas, propriedades do Apps Script, variáveis do Cloud Run e do build, segredos e serviços do Google Cloud. Para recuperar o ambiente (ou montar um novo projeto), basta seguir esta lista.
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
| `AGENDADOR_TOKEN` | token (mín. 32 caracteres) que o Cloud Scheduler envia no cabeçalho `X-Agendador-Token` ao disparar o e-mail "IS AGENDADAS" das 18h. Sem ele, `/api/agendador/agenda-is` fica desligada (o envio manual do Admin continua) | **secret** `AGENDADOR_TOKEN` do GitHub → `deploy-cloud-run.yml` |
| `EMAIL_JRS`, `EMAIL_BANNER_URL`, `EMAIL_LOGO_RODAPE_URL`, `EMAIL_APP_IMAGEM_URL` | opcionais: texto da caixa da JRS no rodapé em texto simples e imagens dos e-mails (padrões em `servidor/email/`). Destinatários, Reply-To e assinatura do Presidente **não** são variáveis: ficam em `config/emails`, editados pelo Admin em *Configurações* | definidas à mão no serviço, se preciso |
| `APP_URL`, `PORT`, `NODE_ENV` | URL do app (links das notificações), porta e modo | padrão do Cloud Run / do código |

Serviço `jrs-hnre-api`, região `southamerica-east1`, 1 GiB de memória (`deploy-cloud-run.yml`). A imagem (Debian) traz o Chromium e as fontes Carlito/Liberation dos documentos em PDF (e a Noto Color Emoji, para os ícones do rodapé do anexo da agenda de IS) (`CHROMIUM_PATH=/usr/bin/chromium`). A service account do Cloud Run precisa de *Firebase Cloud Messaging API Admin* (push).

## 3. GitHub (Settings → Secrets and variables → Actions)

| Nome | Tipo | Uso |
|---|---|---|
| `GCP_SA_KEY` | secret | Deploy do Cloud Run; também regras e backup quando não houver chave própria |
| `GCP_PROJECT_ID` | secret | Deploy do Cloud Run |
| `GEMINI_API_KEY` | secret | Variável do Cloud Run |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | secret | Variáveis do Cloud Run (conta Google da JRS no servidor) |
| `AGENDADOR_TOKEN` | secret (opcional) | Variável do Cloud Run; o mesmo valor vai no job do Cloud Scheduler (seção 9) |
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

## 8. Entrevistas gravadas (Speech-to-Text)

Configuração única da gravação da entrevista da IS (ADR-014): o servidor transcreve o áudio com o **Cloud Speech-to-Text** (v2, modelo Chirp 3, separação de falantes) e organiza a anamnese com o **Gemini no Vertex AI**, usando a conta de serviço do Cloud Run — sem chave de API. Enquanto não for feita, a gravação chega ao Storage, mas a entrevista fica em *Erro* ao processar.

1. **Google Cloud Console → APIs e serviços → Biblioteca** (projeto `jrs-app-web`): ative **Cloud Speech-to-Text API** e **Vertex AI API**.
2. **IAM e administrador → IAM**: na conta de serviço do Cloud Run, `666287638123-compute@developer.gserviceaccount.com`, adicione os papéis:
   - **Cloud Speech Client** (`roles/speech.client`) — iniciar e consultar as transcrições;
   - **Vertex AI User** (`roles/aiplatform.user`) — organizar a anamnese pelo Gemini.
3. **Cloud Storage → bucket `jrs-app-web.firebasestorage.app` → Permissões → Conceder acesso**:
   - `666287638123-compute@developer.gserviceaccount.com` com **Storage Object Admin** (`roles/storage.objectAdmin`) — ler o original, gravar o `audio.flac` e devolver o áudio ao app;
   - o agente de serviço do Speech, `service-666287638123@gcp-sa-speech.iam.gserviceaccount.com`, com **Storage Object Viewer** (`roles/storage.objectViewer`) — o Speech lê o áudio direto do bucket. (O agente só aparece depois que a API do passo 1 é ativada; se o Console não o encontrar, rode `gcloud beta services identity create --service=speech.googleapis.com --project=jrs-app-web`.)
4. **Retenção do áudio (90 dias):** com o `gcloud` autenticado numa conta com *Storage Admin* no bucket, rode `bash scripts/entrevistas/configurar-retencao.sh` (para conferir antes: `SIMULAR=1 bash scripts/entrevistas/configurar-retencao.sh`). O script acrescenta a regra de ciclo de vida que apaga `entrevistas/` com 90 dias e **preserva** as regras que já existirem; pode ser rodado de novo sem duplicar. Confira em *Cloud Storage → bucket → Ciclo de vida*.
5. **Regras:** `firestore.rules` (subcoleção `inspecoes/{id}/entrevistas`) e `storage.rules` (`entrevistas/`) são publicadas pelo CI (`deploy-firestore-rules.yml`) — confira se a publicação rodou.
6. **Região:** o Chirp 3 roda na região multirregional **`us`** (EUA); o processamento dos dados de saúde nos EUA foi **aceito** pelo Presidente da JRS (08/11/2026). O áudio continua guardado no bucket em `southamerica-east1`.

Variáveis opcionais do Cloud Run (padrões no código, `servidor/entrevistas/`): `SPEECH_LOCALIZACAO` (padrão `us`), `GEMINI_MODELO_ENTREVISTA` (padrão `gemini-3.5-flash`), `GEMINI_LOCALIZACAO` (padrão `global`), `SPEECH_DIARIZACAO_LIMITES` (`0` desliga os limites de 2–4 falantes) e `FFMPEG_PATH` (conversão para FLAC; padrão `ffmpeg` da imagem).

Para testar: no celular, entre como um usuário `user_medicos`, abra uma IS → **Entrevista gravada → Gravar entrevista**, grave alguns segundos e acompanhe a situação (*Transcrevendo* → *Organizando* → *Pronta*).

## 9. E-mail das IS agendadas (Cloud Scheduler, 18h)

O e-mail **"IS AGENDADAS EM dd/mm/aaaa"** (`servidor/email/agendaIS.ts`) sai sozinho às **18h (America/Recife), de domingo a quinta**, com as IS do dia seguinte — mesmo sem IS agendadas — e **não sai em véspera de feriado** (nacional, PE ou Recife; `utils/emailAgendaIS.ts`). Usa a conta Google do servidor (seção 7) e grava o PDF no Storage em `agendaIS/{ano}/IS_AGENDADAS_{data}.pdf` (a conta de serviço do Cloud Run precisa gravar no bucket — o papel *Storage Object Admin* da seção 8 já cobre). Configuração única:

1. Gere um token: `openssl rand -hex 32`.
2. **GitHub → Secrets**: crie `AGENDADOR_TOKEN` com esse valor e rode o workflow *Deploy API to Cloud Run*.
3. Com o `gcloud` autenticado numa conta com *Cloud Scheduler Admin* (`roles/cloudscheduler.admin`) e permissão de ler o serviço do Cloud Run, rode:
   `AGENDADOR_TOKEN='<o mesmo valor>' bash scripts/agendador/configurar-email-agenda.sh`
   O script ativa a API do Cloud Scheduler e cria (ou atualiza) o job `email-agenda-is` em `southamerica-east1` (`0 18 * * 0-4`, fuso America/Recife, até 3 novas tentativas). Pode ser rodado de novo.
4. Para testar na hora: `gcloud scheduler jobs run email-agenda-is --location=southamerica-east1`. O servidor decide se envia: fora de domingo–quinta, em véspera de feriado ou se o automático daquela data já saiu, responde `enviado: false` com o motivo.

Para trocar o token: atualize o secret, rode o deploy e rode o script de novo com o valor novo. O registro dos envios fica em `emailsAgendaIS/{AAAA-MM-DD}` (Firestore; só o Admin lê no app). O Admin também envia na hora pela página Inspeções de Saúde (ícone *E-mail das IS agendadas*).

