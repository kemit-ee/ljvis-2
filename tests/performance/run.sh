#!/usr/bin/env bash
# LJVIS2 jõudlustestide käivitamine.
#
#   bash tests/performance/run.sh [smoke|load|stress|spike|soak]
#
# Keskkonnamuutujad:
#   BASE_URL     Ruuteri aadress (vaikimisi CI-pinu http://localhost:9086)
#   START_STACK  1 = tõsta CI-pinu üles ja lõpus maha (vaikimisi 1, kui BASE_URL pole antud)
#   SEED_FORMS, VUS_SCALE  vt k6/ljvis.js
# Tulemus: tests/performance/tulemus/<stsenaarium>.json (.gitignore'is)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
REPO_ROOT="$(cd ../.. && pwd)"
SCENARIO="${1:-load}"
mkdir -p tulemus
COMPOSE="docker compose -f $REPO_ROOT/docker-compose.ci.yml -p ljvis-ci"

START_STACK="${START_STACK:-}"
if [ -z "${BASE_URL:-}" ]; then BASE_URL="http://localhost:9086"; START_STACK="${START_STACK:-1}"; fi

if [ "$START_STACK" = "1" ]; then
  echo "==> Tõstan CI-pinu üles (puhas andmebaas)"
  $COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true
  $COMPOSE up -d --build
  for i in $(seq 1 60); do
    curl -sf "$BASE_URL/health" >/dev/null 2>&1 && break
    [ "$i" = 60 ] && { echo "Ruuter ei käivitunud"; exit 1; }
    sleep 5
  done
  trap '$COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true' EXIT
fi

echo "==> k6 stsenaarium: $SCENARIO ($BASE_URL)"
if command -v k6 >/dev/null 2>&1; then
  SCENARIO="$SCENARIO" BASE_URL="$BASE_URL" k6 run k6/ljvis.js
else
  DOCKER_URL="${BASE_URL//localhost/host.docker.internal}"
  docker run --rm -i --add-host=host.docker.internal:host-gateway \
    -e SCENARIO="$SCENARIO" -e BASE_URL="$DOCKER_URL" \
    -e SEED_FORMS="${SEED_FORMS:-50}" -e VUS_SCALE="${VUS_SCALE:-1}" \
    -v "$PWD:/work" -w /work grafana/k6:latest run k6/ljvis.js
fi
