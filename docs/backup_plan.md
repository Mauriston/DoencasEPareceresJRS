# Plano de Backup, Retenção e Recuperação

## 1. Visão Geral
Este documento define o plano mínimo de backup e retenção para o projeto DoencasEPareceresJRS (Item 18).

## 2. Backup do Firestore
- **Ferramenta:** `gcloud firestore export`
- **Frequência Sugerida:** Diária ou Semanal (via cron job ou Cloud Scheduler)
- **Script:** O script de automação encontra-se em `scripts/backup_firestore.sh`.

## 3. Retenção
- **Políticas do Bucket:** Configurar *Lifecycle Rules* no Cloud Storage para mover backups antigos para classes de armazenamento mais frias (ex: Nearline/Coldline) após 30 dias e deletar definitivamente após 365 dias (ou de acordo com a exigência LGPD).
- **Google Drive / Storage:** Evitar exclusão definitiva imediata de arquivos. Mover para lixeira por 30 dias.

## 4. Recuperação
- **Procedimento:** Utilizar `gcloud firestore import gs://[BUCKET_NAME]/[BACKUP_PATH]`
- **Testes:** Realizar testes de recuperação a cada 6 meses em ambiente de homologação.