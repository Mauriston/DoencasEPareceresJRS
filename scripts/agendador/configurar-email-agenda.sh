#!/usr/bin/env bash
# Ficheiro: scripts/agendador/configurar-email-agenda.sh
# Cria (ou atualiza, de forma idempotente) o job do Cloud Scheduler que dispara o e-mail "IS AGENDADAS EM
# dd/mm/aaaa" às 18h (America/Recife) de domingo a quinta — servidor/email/agendaIS.ts. O servidor decide o
# resto (véspera de feriado não envia; uma vez por data). O job chama POST /api/agendador/agenda-is com o
# cabeçalho X-Agendador-Token = AGENDADOR_TOKEN, o mesmo valor do secret AGENDADOR_TOKEN do repositório
# (o workflow deploy-cloud-run.yml o passa ao Cloud Run).
#
# Uso (gcloud autenticado numa conta com roles/cloudscheduler.admin; a API do Cloud Scheduler é ativada aqui):
#   AGENDADOR_TOKEN='<mesmo valor do secret>' PROJETO=jrs-app-web bash scripts/agendador/configurar-email-agenda.sh
# Gerar um token novo (mín. 32 caracteres):  openssl rand -hex 32
set -euo pipefail
PROJETO="${PROJETO:-jrs-app-web}"
REGIAO="${REGIAO:-southamerica-east1}"
SERVICO="${SERVICO:-jrs-hnre-api}"
JOB="${JOB:-email-agenda-is}"
: "${AGENDADOR_TOKEN:?Defina AGENDADOR_TOKEN (o mesmo valor do secret do repositório).}"
[[ ${#AGENDADOR_TOKEN} -ge 32 ]] || { echo "AGENDADOR_TOKEN precisa de pelo menos 32 caracteres." >&2; exit 1; }
gc() { gcloud --project="$PROJETO" --quiet "$@"; }

echo "== API do Cloud Scheduler"
gc services enable cloudscheduler.googleapis.com

URL="$(gc run services describe "$SERVICO" --region="$REGIAO" --format='value(status.url)')"
[[ -n "$URL" ]] || { echo "Serviço $SERVICO não encontrado em $REGIAO." >&2; exit 1; }
ALVO="$URL/api/agendador/agenda-is"
echo "== Job $JOB → $ALVO (18h, dom–qui, America/Recife)"

OPCOES=(--location="$REGIAO" --schedule="0 18 * * 0-4" --time-zone="America/Recife"
  --uri="$ALVO" --http-method=POST --headers="Content-Type=application/json,X-Agendador-Token=$AGENDADOR_TOKEN"
  --message-body='{}' --attempt-deadline=300s --max-retry-attempts=3 --min-backoff=60s)
if gc scheduler jobs describe "$JOB" --location="$REGIAO" >/dev/null 2>&1; then
  gc scheduler jobs update http "$JOB" "${OPCOES[@]}"
else
  gc scheduler jobs create http "$JOB" "${OPCOES[@]}" --description="E-mail IS AGENDADAS do dia seguinte (JRS/HNRe)"
fi

echo "== Situação"
gc scheduler jobs describe "$JOB" --location="$REGIAO" --format='table(name.basename(),schedule,timeZone,state,httpTarget.uri)'
echo "Para testar agora: gcloud scheduler jobs run $JOB --location=$REGIAO --project=$PROJETO"
