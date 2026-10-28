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

# shellcheck source=../ci-timing.sh
source "$REPO_ROOT/tests/ci-timing.sh"
trap 'ci_phase_report "Playwright UI-testide ajamõõtmine" "$SCRIPT_DIR/tulemus/ajamootmine.md"' EXIT

# Resolve and validate the complete plan before touching an existing stack.
if [ "${1:-}" = --group ]; then
  selectors="$(python3 "$SCRIPT_DIR/groups.py" "${2:-}")"
  shift 2
  group_files=()
  while IFS= read -r selector; do
    group_files+=("$selector")
  done <<< "$selectors"
  set -- "${group_files[@]}" "$@"
fi

cd "$SCRIPT_DIR"

ci_phase "Eelmise pinu teardown"
echo "==> Teardown varasemast pinust (koos mahtudega)…"
$COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true

ci_phase "Pinu käivitus (compose up; --build ainult kui pilte pole eelehitatud)"
echo "==> Ehitan ja käivitan CI-pinu…"
# CI_IMAGES_PREBUILT=1: rasked pildid on workflow's juba ehitatud (vahemälu toel); ilma --build'ita
# kasutab compose olemasolevaid ja ehitab ainult puuduvad.
BUILD_FLAG="--build"
[ "${CI_IMAGES_PREBUILT:-0}" = "1" ] && BUILD_FLAG=""
$COMPOSE up -d $BUILD_FLAG

wait_for() {
  local name="$1" url="$2"
  echo "==> Ootan: $name"
  for i in $(seq 1 60); do
    curl -sf "$url" >/dev/null 2>&1 && { echo "    $name valmis (${i}x5s)"; return 0; }
    [ "$i" = "60" ] && { echo "❌ $name ei tõusnud 300s jooksul"; $COMPOSE logs "${name}" --tail=40; exit 1; }
    sleep 5
  done
}
ci_phase "Teenuste ootamine (resql, ruuter, tim)"
wait_for resql-ljvis http://localhost:9087/healthz
wait_for ruuter     http://localhost:9086/health
wait_for tim        http://localhost:9085/health

ci_phase "Seemned"
echo "==> Lisan klassifikaatorite seemned…"
export PGPASSWORD=01234
# Kui hostis psql-i pole, käivita see andmebaasikonteineris — muidu jääksid
# seemned vaikselt rakendamata ja seemnest sõltuvad testid kukuksid.
if ! command -v psql >/dev/null 2>&1; then
  psql() {
    local file=""
    local args=()
    while [ $# -gt 0 ]; do
      case "$1" in
        -f) file="$2"; shift 2 ;;
        -h|-p) shift 2 ;;
        *) args+=("$1"); shift ;;
      esac
    done
    $COMPOSE exec -T database psql "${args[@]}" < "$file"
  }
fi
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

# eToimiku X-tee logide vaate testandmed (xroad-etoimik-logs.spec.ts).
if [ -f "$REPO_ROOT/tests/bootstrap/seed_xroad_etoimik_logs.sql" ]; then
  psql -h localhost -p 5433 -U ljvis -d ljvis_db -q \
    -f "$REPO_ROOT/tests/bootstrap/seed_xroad_etoimik_logs.sql" \
    && echo "    seed_xroad_etoimik_logs.sql OK" \
    || echo "    seed_xroad_etoimik_logs.sql — hoiatus (võib olla juba seeditud)"
fi

ci_phase "Frontendi build"
echo "==> Ehitan frontendi (staatiline build → vite preview)…"
export VITE_PROXY_API=http://localhost:9086
export VITE_PROXY_TIM=http://localhost:9085
export VITE_PROXY_TARA=https://localhost:9888
( cd "$REPO_ROOT/frontend" && npm run build )
export LJVIS_PW_CMD=preview

ci_phase "Playwright testid"
echo "==> Käivitan Playwright'i…"
set +e
CI=1 npx playwright test "$@"
PW_EXIT=$?
set -e

ci_phase "Teardown"
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
