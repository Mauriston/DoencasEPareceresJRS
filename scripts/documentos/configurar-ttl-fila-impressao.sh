#!/usr/bin/env bash
# Ficheiro: scripts/documentos/configurar-ttl-fila-impressao.sh
# Retenção da fila de impressão (documentos_gerados; docs/retencao-lgpd.md): liga a política de TTL do
# Firestore no campo `expiraEm`. O app grava expiraEm = criação + 24 h e, ao abrir o PDF, abertura + 5 min
# (services/documentosGerados.ts); o Firestore apaga o registro depois desse instante — normalmente em até
# ~24 h após vencer. Enquanto isso, a Início da Secretaria já esconde os vencidos. O PDF não é apagado.
# Idempotente. Uso (gcloud autenticado numa conta com roles/datastore.owner no projeto):
#   bash scripts/documentos/configurar-ttl-fila-impressao.sh
set -euo pipefail
PROJETO="${PROJETO:-jrs-app-web}"
gcloud firestore fields ttls update expiraEm \
  --collection-group=documentos_gerados \
  --enable-ttl \
  --project="$PROJETO"
gcloud firestore fields ttls list --project="$PROJETO"
