#!/bin/bash
# Backup do Cloud Firestore
# Requisitos: gcloud CLI instalado e autenticado.
# Exemplo de plano mínimo de backup (Item 18)

set -e

# Configurações
PROJECT_ID="jrs-app-web"
BUCKET_NAME="gs://jrs-app-web-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BUCKET_NAME}/firestore_export_${TIMESTAMP}"

echo "Iniciando exportação do Firestore para o projeto ${PROJECT_ID}..."
echo "Destino: ${BACKUP_PATH}"

# Executar exportação
# gcloud firestore export ${BACKUP_PATH} --project=${PROJECT_ID}

echo "Comando dry-run executado com sucesso."
echo "Para executar de verdade, descomente a linha do gcloud firestore export."