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
LINHA="$(gc firestore backups list --format='value(snapshotTime,name)' --filter='state=READY' | sort | tail -n1)"
[[ -n "$LINHA" ]] || { echo "Nenhum backup pronto encontrado."; exit 1; }
SNAPSHOT="$(cut -f1 <<<"$LINHA")"
BACKUP="$(cut -f2 <<<"$LINHA")"
echo "   $BACKUP (snapshot $SNAPSHOT)"

limpar
echo "== Restaurando em $DESTINO (pode levar alguns minutos)"
gc firestore databases restore --source-backup="$BACKUP" --destination-database="$DESTINO"
# A restauração continua depois que o banco aparece (pode levar dezenas de minutos): espera o fim.
for i in $(seq 1 240); do
  progresso="$(gc firestore databases describe --database="$DESTINO" --format='value(sourceInfo.progress)' 2>/dev/null || true)"
  [[ "$progresso" == "IN_PROGRESS" || -z "$progresso" ]] || break
  (( i % 4 == 0 )) && echo "   ainda restaurando… ($((i / 4)) min)"
  sleep 15
done
echo "   restauração: ${progresso:-desconhecida}"
[[ "$progresso" == "COMPLETED" || "$progresso" == "SUCCEEDED" ]] || { echo "A restauração não terminou com sucesso."; exit 1; }
# O banco só pode ser lido/apagado quando a operação de restauração fecha (done=True).
for i in $(seq 1 40); do
  [[ -z "$(gc firestore operations list --database="$DESTINO" --filter='done!=true' --format='value(name)' 2>/dev/null)" ]] && break
  sleep 15
done

echo "== Comparando contagens"
node scripts/backup/comparar-contagens.mjs "$PROJETO" "$DESTINO" "$SNAPSHOT"
