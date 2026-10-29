#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV="${1:-$SCRIPT_DIR/ci-stack-environment.json}"
GROUP="${2:-all}"
SELECTED_COLLECTIONS="$(python3 "$SCRIPT_DIR/groups.py" "$GROUP")"
COL="$SCRIPT_DIR/collections"
REPORT_DIR="${E2E_REPORT_DIR:-$SCRIPT_DIR/reports}"
COMPOSE="docker compose -f $REPO_ROOT/docker-compose.ci.yml -p ljvis-ci"

# shellcheck source=../ci-timing.sh
source "$REPO_ROOT/tests/ci-timing.sh"
trap 'ci_phase_report "API-testide ajamõõtmine (rühm: $GROUP)" "$REPORT_DIR/ajamootmine.md"' EXIT

mkdir -p "$REPORT_DIR"

echo "Using environment: $ENV"
echo "Test group: $GROUP"
echo "Reports directory: $REPORT_DIR"
echo ""

# ── Stack lifecycle ────────────────────────────────────────────────────────────
# Always start from a clean slate so tests see a fresh database.

ci_phase "Eelmise pinu teardown"
echo "==> Tearing down any existing CI stack (volumes included)…"
$COMPOSE down -v --remove-orphans 2>&1 | grep -E "Removed|Stopped|error" || true

ci_phase "Pinu käivitus (compose up; --build ainult kui pilte pole eelehitatud)"
echo "==> Building and starting CI stack…"
# CI_IMAGES_PREBUILT=1: rasked pildid on workflow's juba ehitatud (vahemälu toel); ilma --build'ita
# kasutab compose olemasolevaid ja ehitab ainult puuduvad.
BUILD_FLAG="--build"
[ "${CI_IMAGES_PREBUILT:-0}" = "1" ] && BUILD_FLAG=""
$COMPOSE up -d $BUILD_FLAG

ci_phase "Teenuste ootamine"
echo "==> Waiting for Resql…"
for i in $(seq 1 60); do
  if curl -sf http://localhost:9087/healthz > /dev/null 2>&1; then
    echo "    resql ready (${i}x5s)"; break
  fi
  [ "$i" = "60" ] && { echo "❌ resql not ready after 300s"; $COMPOSE logs resql-ljvis --tail=30; exit 1; }
  sleep 5
done

echo "==> Waiting for Ruuter…"
for i in $(seq 1 60); do
  if curl -sf http://localhost:9086/health > /dev/null 2>&1; then
    echo "    ruuter ready (${i}x5s)"; break
  fi
  [ "$i" = "60" ] && { echo "❌ ruuter not ready after 300s"; $COMPOSE logs ruuter --tail=30; exit 1; }
  sleep 5
done

echo "==> Waiting for TIM…"
for i in $(seq 1 60); do
  if curl -sf http://localhost:9085/health > /dev/null 2>&1; then
    echo "    TIM ready (${i}x5s)"; break
  fi
  [ "$i" = "60" ] && { echo "❌ TIM not ready after 300s"; $COMPOSE logs tim --tail=30; exit 1; }
  sleep 5
done

echo "==> Waiting for XTR inbound SOAP lane…"
for i in $(seq 1 30); do
  if curl -sf http://localhost:9095/health > /dev/null 2>&1; then
    echo "    xtr-inbound ready (${i}x2s)"; break
  fi
  [ "$i" = "30" ] && { echo "❌ xtr-inbound not ready after 60s"; $COMPOSE logs xtr-inbound --tail=30; exit 1; }
  sleep 2
done

echo "==> Waiting for erru-xml-adapter…"
for i in $(seq 1 60); do
  if curl -sf http://localhost:9091/health > /dev/null 2>&1; then
    echo "    erru-xml-adapter ready (${i}x5s)"; break
  fi
  [ "$i" = "60" ] && { echo "❌ erru-xml-adapter not ready after 300s"; $COMPOSE logs erru-xml-adapter --tail=30; exit 1; }
  sleep 5
done

echo ""

ci_phase "Lepingu-, SQL- ja XTR-testid"
if [ "$GROUP" = all ] || [ "$GROUP" = xroad ]; then
python3 -B "$REPO_ROOT/tests/contract/check_erru_contract.py" --emit-sql | $COMPOSE exec -T database psql -X -q -o /dev/null -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db


# Test the actual deployment XTR build before the API collections.
python3 "$REPO_ROOT/tests/xtr/xml_entities_test.py" --image ljvis-ci-xtr-inbound

python3 "$REPO_ROOT/tests/erru-adapter/test_migrations.py" -- $COMPOSE exec -T database psql -U ljvis -d ljvis_db

python3 "$REPO_ROOT/tests/sql/risk-all-forms.py" -- $COMPOSE exec -T database psql -U ljvis -d ljvis_db
python3 "$REPO_ROOT/tests/sql/risk-recalc-candidates.py" -- $COMPOSE exec -T database psql -U ljvis -d ljvis_db
python3 "$REPO_ROOT/tests/sql/test_nu_concurrency.py" -- $COMPOSE exec -T database psql -U ljvis -d ljvis_db

# Text length limits in the Ruuter validation must equal the VARCHAR size of the migrated column.
PSQL_CMD="$COMPOSE exec -T database psql -X -U ljvis -d ljvis_db" python3 "$REPO_ROOT/tests/contract/check_text_limits.py"

$COMPOSE exec -T database psql -X -q -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db < "$REPO_ROOT/tests/sql/sp-erru-points.sql"
$COMPOSE exec -T database psql -X -q -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db < "$REPO_ROOT/tests/sql/form-snapshot-revision.sql"

fi

# ── Newman runs ───────────────────────────────────────────────────────────────
# Iga kollektsioon jookseb lõpuni ka siis, kui mõni varasem kukub; kukkunud
# kogutakse FAILED massiivi ja skript lõpeb veaga allpool. JSON-raportid
# (reports/*.json) on masinloetav sisend scripts/generate-api-test-report.py-le.
FAILED=()
run_collection() {
  local name="$1"
  shift
  case " $SELECTED_COLLECTIONS " in
    *" $name "*) ;;
    *) return 0 ;;
  esac
  ci_phase "Newman: $name"
  newman run "$COL/$name.collection.json" -e "$ENV" "$@" \
    -r cli,htmlextra,json \
    --reporter-htmlextra-export "$REPORT_DIR/$name.html" \
    --reporter-json-export "$REPORT_DIR/$name.json" || FAILED+=("$name")
}

run_collection organisations

run_collection permissions

run_collection users

run_collection user-groups

run_collection classifiers --delay-request 600

run_collection compound-form --delay-request 300

run_collection driverest-forms --delay-request 300

run_collection tram-control-card --delay-request 300

run_collection labour-inspection --delay-request 300

run_collection foreign-violation-form --delay-request 300

run_collection erru-ctud --delay-request 300

run_collection erru-cgr --delay-request 300

run_collection erru-rsi --delay-request 300

run_collection erru-ncr --delay-request 300

run_collection erru-nu --delay-request 300

run_collection erru-xml-adapter --delay-request 300

if [ "$GROUP" = all ] || [ "$GROUP" = erru ]; then
  python3 "$REPO_ROOT/tests/erru-adapter/test_regression.py" -- $COMPOSE exec -T database psql -U ljvis -d ljvis_db
fi

run_collection technical-check-forms --delay-request 300

run_collection transport-interruption --delay-request 300

run_collection adr-form --delay-request 300

run_collection good-repute-form --delay-request 300

run_collection form-search --delay-request 300

run_collection xroad-provide-query

run_collection xroad-provide-write

if [ "$GROUP" = all ] || [ "$GROUP" = xroad ]; then
# ── XTR SOAP provider (xtr-inbound) ── see docs/xtee/09-xtr-soap.md
$COMPOSE exec -T database psql -X -q -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db < "$REPO_ROOT/tests/xtr/seed.sql"
run_collection xroad-soap-inbound
python3 "$REPO_ROOT/tests/xtr/verify.py" --report "$REPORT_DIR/xroad-soap-inbound.json" -- $COMPOSE exec -T database psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db || FAILED+=("xroad-soap-contract-and-storage")
# XTR SOAP: repeated/changed/concurrent writes, ETL -> SOAP; SOAP bridge against misbehaving backends.
python3 "$REPO_ROOT/tests/xtr/repeat_test.py" --soap-url http://localhost:9095 --rest-url http://localhost:9089 \
  --resql-url http://localhost:9087/ljvis -- $COMPOSE exec -T database psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db \
  || FAILED+=("xroad-soap-repeat-concurrency")
# Concurrent UI / e-toimik / X-tee writers on one act: no forked history (revision).
python3 "$REPO_ROOT/tests/xtr/race_test.py" -- $COMPOSE exec -T database psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db \
  || FAILED+=("labour-inspection-concurrent-writers")
python3 "$REPO_ROOT/tests/xtr/bridge_test.py" --image ljvis-ci-ruuter-internal --network ljvis-ci_ljvis-ci \
  -- $COMPOSE exec -T database psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db || FAILED+=("xroad-soap-bridge")

fi

run_collection risk-scores

run_collection citizen-representation
run_collection cron-jobs

run_collection notifications --delay-request 300

run_collection audit-log

run_collection dashboard --delay-request 300

ci_phase "Auditiahela kontroll"
echo ""
# Verify the complete chain after all producers (including ordinary UI flows) have run.
python3 - <<'VERIFY_AUDIT'
import json
import urllib.request
request = urllib.request.Request(
    'http://localhost:9087/ljvis/log/get_logs_verify',
    data=b'{"from_event_id":"","to_event_id":""}',
    headers={'Content-Type': 'application/json', 'Authorization': 'Bearer dev-resql-service-token'})
with urllib.request.urlopen(request, timeout=20) as response:
    result = json.load(response)[0]
assert result['ok'], result
print('Official audit verification passed:', result['checked'], 'events')
VERIFY_AUDIT

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "❌ Kukkunud kollektsioonid: ${FAILED[*]}"
  exit 1
fi
echo "All collections passed."
echo "HTML reports:"
find "$REPORT_DIR" -type f -name "*.html" -print
