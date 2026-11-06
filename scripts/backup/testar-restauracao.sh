#!/usr/bin/env bash
# Ficheiro: scripts/backup/testar-restauracao.sh
# Teste de restauração do Firestore (item 18.4 de docs/database.md): restaura o backup mais recente num
# banco temporário ("restauracao-teste"), compara a contagem de documentos das coleções principais com a
# produção (scripts/backup/comparar-contagens.mjs) e apaga o banco temporário. Não toca o banco (default).
#
# Uso (gcloud autenticado e GOOGLE_APPLICATION_CREDENTIALS com a mesma conta; papéis: roles/datastore.owner):
#   PROJETO=jrs-app-web bash scripts/backup/testar-restauracao.sh
# Sai com código 1 se a restauração falhar ou se a comparação reprovar.
set -euo pipefail
PROJETO="${PROJETO:-jrs-app-web}"
DESTINO="${DESTINO:-restauracao-teste}"
gc() { gcloud --project="$PROJETO" --quiet "$@"; }

limpar() {
  if gc firestore databases describe --database="$DESTINO" >/dev/null 2>&1; then
    echo "== Apagando o banco temporário $DESTINO"
    gc firestore databases delete --database="$DESTINO" || echo "AVISO: apague à mão: gcloud firestore databases delete --database=$DESTINO"
  fi
}
trap limpar EXIT

echo "== Backup mais recente (READY)"
BACKUP="$(gc firestore backups list --format='value(name,snapshotTime)' --filter='state=READY' | sort -k2 | tail -n1 | cut -f1)"
[[ -n "$BACKUP" ]] || { echo "Nenhum backup pronto encontrado."; exit 1; }
SNAPSHOT="$(gc firestore backups describe "$BACKUP" --format='value(snapshotTime)')"
echo "   $BACKUP (snapshot $SNAPSHOT)"

limpar
echo "== Restaurando em $DESTINO (pode levar alguns minutos)"
gc firestore databases restore --source-backup="$BACKUP" --destination-database="$DESTINO"
for i in $(seq 1 120); do
  estado="$(gc firestore databases describe --database="$DESTINO" --format='value(name)' 2>/dev/null || true)"
  [[ -n "$estado" ]] && break; sleep 15
done
# A restauração termina de copiar os dados depois que o banco aparece: espera a operação concluir.
for i in $(seq 1 120); do
  pend="$(gc firestore operations list --database="$DESTINO" --filter='done!=true' --format='value(name)' 2>/dev/null | wc -l)"
  [[ "$pend" == "0" ]] && break; sleep 20
done

echo "== Comparando contagens"
node scripts/backup/comparar-contagens.mjs "$PROJETO" "$DESTINO" "$SNAPSHOT"
