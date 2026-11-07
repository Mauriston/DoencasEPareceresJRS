#!/usr/bin/env bash
# Ficheiro: scripts/entrevistas/configurar-retencao.sh
# Retenção do ÁUDIO das entrevistas gravadas da IS (ADR-014; docs/retencao-lgpd.md):
# aplica no bucket do app uma regra de ciclo de vida que APAGA os objetos com prefixo
# `entrevistas/` (entrevistas/{isId}/{entrevistaId}/original.* e audio.flac) com idade ≥ 90 dias
# (DIAS_RETENCAO_AUDIO em config/entrevistas.ts). A transcrição e a anamnese ficam no Firestore
# e seguem a retenção da IS; só o áudio sai.
#
# PRESERVA as regras de ciclo de vida que já existirem no bucket: lê a configuração atual
# (`gcloud storage buckets describe --format=json(lifecycle_config)`), tira só a regra antiga
# deste script (Delete com matchesPrefix ["entrevistas/"]) e acrescenta a nova. Idempotente:
# rodar de novo não duplica a regra. O Cloud Storage aplica o ciclo de vida uma vez por dia
# (o objeto pode durar até ~1 dia além dos 90). Com a lixeira (soft delete de 30 dias,
# scripts/backup/configurar-backup.sh), o objeto apagado ainda pode ser restaurado nesse prazo.
#
# Uso (gcloud autenticado numa conta com roles/storage.admin no bucket; precisa de python3):
#   bash scripts/entrevistas/configurar-retencao.sh
#   SIMULAR=1 bash scripts/entrevistas/configurar-retencao.sh   # só mostra o JSON que seria aplicado
set -euo pipefail
PROJETO="${PROJETO:-jrs-app-web}"
BUCKET="${BUCKET:-jrs-app-web.firebasestorage.app}"
DIAS="${DIAS:-90}"
PREFIXO="entrevistas/"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "== Ciclo de vida atual de gs://$BUCKET"
gcloud storage buckets describe "gs://$BUCKET" --project="$PROJETO" --format='json(lifecycle_config)' > "$TMP/atual.json"
cat "$TMP/atual.json"

python3 - "$TMP/atual.json" "$TMP/novo.json" "$DIAS" "$PREFIXO" <<'PY'
import json, sys
atual_path, novo_path, dias, prefixo = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
try:
    atual = json.load(open(atual_path)) or {}
except ValueError:
    atual = {}
cfg = atual.get('lifecycle_config') or atual.get('lifecycle') or {}
regras = list(cfg.get('rule') or cfg.get('rules') or [])

def e_desta(r):
    cond = r.get('condition') or {}
    tipo = (r.get('action') or {}).get('type')
    pref = cond.get('matchesPrefix') or cond.get('matches_prefix') or []
    return tipo == 'Delete' and list(pref) == [prefixo]

mantidas = [r for r in regras if not e_desta(r)]
nova = {'action': {'type': 'Delete'}, 'condition': {'age': dias, 'matchesPrefix': [prefixo]}}
json.dump({'rule': mantidas + [nova]}, open(novo_path, 'w'), indent=2)
print(f"   regras existentes preservadas: {len(mantidas)}; regra de {prefixo} ({dias} dias): {'substituída' if len(mantidas) < len(regras) else 'nova'}")
PY

echo "== Ciclo de vida a aplicar"
cat "$TMP/novo.json"

if [[ "${SIMULAR:-0}" == "1" ]]; then
  echo "== SIMULAR=1: nada foi alterado"
  exit 0
fi

gcloud storage buckets update "gs://$BUCKET" --project="$PROJETO" --lifecycle-file="$TMP/novo.json"

echo "== Situação"
gcloud storage buckets describe "gs://$BUCKET" --project="$PROJETO" --format='json(lifecycle_config)'
