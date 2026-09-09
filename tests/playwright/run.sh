#!/usr/bin/env bash
# LJVIS2 kontrollvormide Playwright UI-testide käivitaja.
#
# Tõstab üles docker-compose.ci.yml pinu (sama, mida tests/postman kasutab),
# lisab klassifikaatorite seemned, käivitab Playwright'i (mis omakorda stardib
# frontendi vite-dev serveri CI-stack'i portidele suunatuna) ja teeb teardowni.
#
# Kasutus:  bash tests/playwright/run.sh [playwright-argumendid]
#   nt:     bash tests/playwright/run.sh --grep TRAM
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE="docker compose -f $REPO_ROOT/docker-compose.ci.yml -p ljvis-pw"
KEEP_STACK="${KEEP_STACK:-0}"

cd "$SCRIPT_DIR"

echo "==> Teardown varasemast pinust (koos mahtudega)…"
$COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true

echo "==> Ehitan ja käivitan CI-pinu…"
$COMPOSE up -d --build

wait_for() {
  local name="$1" url="$2"
  echo "==> Ootan: $name"
  for i in $(seq 1 60); do
    curl -sf "$url" >/dev/null 2>&1 && { echo "    $name valmis (${i}x5s)"; return 0; }
    [ "$i" = "60" ] && { echo "❌ $name ei tõusnud 300s jooksul"; $COMPOSE logs "${name}" --tail=40; exit 1; }
    sleep 5
  done
}
wait_for resql-ljvis http://localhost:9087/healthz
wait_for ruuter     http://localhost:9086/health
wait_for tim        http://localhost:9085/health

echo "==> Lisan klassifikaatorite seemned…"
export PGPASSWORD=01234
# NB: seed_extra.sql SIHILIKULT välja jäetud — see teeb Super Admin grupile
# uue permissions-snapshot'i, kus PUUDUVAD tram_driver_form.* ja ERRU õigused,
# ning tõstab kasutaja KLIM-i alla → TRAM/ERRU lehed muutuksid keelatuks.
# seed_classifiers.sql annab kõik dropdown'ide jaoks vajaliku (STRUCTURE_UNIT,
# VEHICLE_CATEGORY, EU_INFRINGEMENT jne), muutmata kasutajaid/gruppe.
if [ -f "$REPO_ROOT/tests/bootstrap/seed_classifiers.sql" ]; then
  psql -h localhost -p 5433 -U ljvis -d ljvis_db -q \
    -f "$REPO_ROOT/tests/bootstrap/seed_classifiers.sql" \
    && echo "    seed_classifiers.sql OK" \
    || echo "    seed_classifiers.sql — hoiatus (võib olla juba seeditud)"
fi

echo "==> Ehitan frontendi (staatiline build → vite preview)…"
export VITE_PROXY_API=http://localhost:9086
export VITE_PROXY_TIM=http://localhost:9085
export VITE_PROXY_TARA=https://localhost:9888
( cd "$REPO_ROOT/frontend" && npm run build )
export LJVIS_PW_CMD=preview

echo "==> Käivitan Playwright'i…"
set +e
CI=1 npx playwright test "$@"
PW_EXIT=$?
set -e

if [ "$KEEP_STACK" != "1" ]; then
  echo "==> Teardown…"
  $COMPOSE down -v >/dev/null 2>&1 || true
else
  echo "==> KEEP_STACK=1 — pinu jääb püsti (docker compose -p ljvis-pw down -v puhastamiseks)"
fi

echo ""
echo "Tulemused:   tests/playwright/tulemus/KOKKUVÕTE.md"
echo "HTML-raport: npx playwright show-report tests/playwright/tulemus/html-raport"
exit $PW_EXIT
