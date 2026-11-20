#!/usr/bin/env bash
# Ficheiro: scripts/agendador/configurar-aniversariantes.sh
# Cria (ou atualiza, de forma idempotente) o job do Cloud Scheduler que, às 07h (America/Recife), todo dia,
# chama POST /api/agendador/aniversariantes: havendo aniversariante do dia, todos os usuários ativos recebem
# o push (server.ts). Mesmo cabeçalho X-Agendador-Token = AGENDADOR_TOKEN do job email-agenda-is.
#
# Uso (gcloud autenticado numa conta com roles/cloudscheduler.admin; a API do Cloud Scheduler é ativada aqui):
#   AGENDADOR_TOKEN='<mesmo valor do secret>' PROJETO=jrs-app-web bash scripts/agendador/configurar-aniversariantes.sh
# Gerar um token novo (mín. 32 caracteres):  openssl rand -hex 32
set -euo pipefail
PROJETO="${PROJETO:-jrs-app-web}"
REGIAO="${REGIAO:-southamerica-east1}"
SERVICO="${SERVICO:-jrs-hnre-api}"
JOB="${JOB:-aniversariantes}"
: "${AGENDADOR_TOKEN:?Defina AGENDADOR_TOKEN (o mesmo valor do secret do repositório).}"
[[ ${#AGENDADOR_TOKEN} -ge 32 ]] || { echo "AGENDADOR_TOKEN precisa de pelo menos 32 caracteres." >&2; exit 1; }
gc() { gcloud --project="$PROJETO" --quiet "$@"; }

echo "== API do Cloud Scheduler"
gc services enable cloudscheduler.googleapis.com

URL="$(gc run services describe "$SERVICO" --region="$REGIAO" --format='value(status.url)')"
[[ -n "$URL" ]] || { echo "Serviço $SERVICO não encontrado em $REGIAO." >&2; exit 1; }
ALVO="$URL/api/agendador/aniversariantes"
echo "== Job $JOB → $ALVO (07h, todo dia, America/Recife)"

OPCOES=(--location="$REGIAO" --schedule="0 7 * * *" --time-zone="America/Recife"
  --uri="$ALVO" --http-method=POST --headers="Content-Type=application/json,X-Agendador-Token=$AGENDADOR_TOKEN"
  --message-body='{}' --attempt-deadline=300s --max-retry-attempts=3 --min-backoff=60s)
if gc scheduler jobs describe "$JOB" --location="$REGIAO" >/dev/null 2>&1; then
  gc scheduler jobs update http "$JOB" "${OPCOES[@]}"
else
  gc scheduler jobs create http "$JOB" "${OPCOES[@]}" --description="Push dos aniversariantes do dia (JRS/HNRe)"
fi

echo "== Situação"
gc scheduler jobs describe "$JOB" --location="$REGIAO" --format='table(name.basename(),schedule,timeZone,state,httpTarget.uri)'
echo "Para testar agora: gcloud scheduler jobs run $JOB --location=$REGIAO --project=$PROJETO"
