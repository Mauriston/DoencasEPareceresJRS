#!/usr/bin/env bash
# Ficheiro: scripts/backup/configurar-backup.sh
# Configura (de forma idempotente) a proteção dos dados do projeto Firebase — item 18 de docs/database.md:
#   1. Firestore: backups agendados gerenciados (diário com 7 dias e semanal com 14 semanas de retenção);
#   2. Firestore: proteção contra exclusão do banco (delete protection);
#   3. Storage: lixeira (soft delete) de 30 dias no bucket do app — arquivo apagado pode ser recuperado.
# Opcional: PITR=1 liga a recuperação a um instante dos últimos 7 dias (tem custo de armazenamento).
#
# Uso (com gcloud autenticado numa conta com roles/datastore.owner e roles/storage.admin):
#   PROJETO=jrs-app-web bash scripts/backup/configurar-backup.sh
set -euo pipefail
PROJETO="${PROJETO:-jrs-app-web}"
BANCO="(default)"
BUCKET="${BUCKET:-${PROJETO}.firebasestorage.app}"
gc() { gcloud --project="$PROJETO" --quiet "$@"; }

echo "== Firestore: agendamentos de backup ($BANCO)"
if ! gc firestore backups schedules list --database="$BANCO" --format=json | grep -q '"dailyRecurrence"'; then
  gc firestore backups schedules create --database="$BANCO" --recurrence=daily --retention=7d
else echo "   diário: já existe"; fi
if ! gc firestore backups schedules list --database="$BANCO" --format=json | grep -q '"weeklyRecurrence"'; then
  gc firestore backups schedules create --database="$BANCO" --recurrence=weekly --day-of-week=MON --retention=14w
else echo "   semanal: já existe"; fi

echo "== Firestore: proteção contra exclusão"
gc firestore databases update --database="$BANCO" --delete-protection

if [[ "${PITR:-0}" == "1" ]]; then
  echo "== Firestore: PITR (7 dias)"
  gc firestore databases update --database="$BANCO" --enable-pitr
fi

echo "== Storage: lixeira de 30 dias em gs://$BUCKET"
gcloud storage buckets update "gs://$BUCKET" --soft-delete-duration=30d --project="$PROJETO"

echo "== Situação"
gc firestore backups schedules list --database="$BANCO" --format='table(name.basename(),dailyRecurrence.yesno(yes=diário,no=""),weeklyRecurrence.day,retention)'
gc firestore databases describe --database="$BANCO" --format='value(deleteProtectionState,pointInTimeRecoveryEnablement)'
gcloud storage buckets describe "gs://$BUCKET" --format='value(soft_delete_policy.retentionDurationSeconds)'
