#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV="${1:-$SCRIPT_DIR/ci-stack-environment.json}"
COL="$SCRIPT_DIR/collections"
REPORT_DIR="$SCRIPT_DIR/reports"
COMPOSE="docker compose -f $REPO_ROOT/docker-compose.ci.yml -p ljvis-ci"

mkdir -p "$REPORT_DIR"

echo "Using environment: $ENV"
echo "Reports directory: $REPORT_DIR"
echo ""

# ── Stack lifecycle ────────────────────────────────────────────────────────────
# Always start from a clean slate so tests see a fresh database.

echo "==> Tearing down any existing CI stack (volumes included)…"
$COMPOSE down -v --remove-orphans 2>&1 | grep -E "Removed|Stopped|error" || true

echo "==> Building and starting CI stack…"
$COMPOSE up -d --build

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

echo "==> Waiting for erru-xml-adapter…"
for i in $(seq 1 60); do
  if curl -sf http://localhost:9091/health > /dev/null 2>&1; then
    echo "    erru-xml-adapter ready (${i}x5s)"; break
  fi
  [ "$i" = "60" ] && { echo "❌ erru-xml-adapter not ready after 300s"; $COMPOSE logs erru-xml-adapter --tail=30; exit 1; }
  sleep 5
done

echo ""

python3 -B "$REPO_ROOT/tests/contract/check_erru_contract.py" --emit-sql | $COMPOSE exec -T database psql -X -q -o /dev/null -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db


python3 "$REPO_ROOT/tests/erru-adapter/test_migrations.py" -- $COMPOSE exec -T database psql -U ljvis -d ljvis_db

python3 "$REPO_ROOT/tests/sql/test_nu_concurrency.py" -- $COMPOSE exec -T database psql -U ljvis -d ljvis_db

$COMPOSE exec -T database psql -X -q -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db < "$REPO_ROOT/tests/sql/sp-erru-points.sql"
$COMPOSE exec -T database psql -X -q -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db < "$REPO_ROOT/tests/sql/form-snapshot-revision.sql"

# ── Newman runs ───────────────────────────────────────────────────────────────
# Iga kollektsioon jookseb lõpuni ka siis, kui mõni varasem kukub; kukkunud
# kogutakse FAILED massiivi ja skript lõpeb veaga allpool. JSON-raportid
# (reports/*.json) on masinloetav sisend scripts/generate-api-test-report.py-le.
FAILED=()

newman run "$COL/organisations.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/organisations.html" \
  --reporter-json-export "$REPORT_DIR/organisations.json" || FAILED+=("organisations")

newman run "$COL/permissions.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/permissions.html" \
  --reporter-json-export "$REPORT_DIR/permissions.json" || FAILED+=("permissions")

newman run "$COL/users.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/users.html" \
  --reporter-json-export "$REPORT_DIR/users.json" || FAILED+=("users")

newman run "$COL/user-groups.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/user-groups.html" \
  --reporter-json-export "$REPORT_DIR/user-groups.json" || FAILED+=("user-groups")

newman run "$COL/classifiers.collection.json" -e "$ENV" \
  --delay-request 600 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/classifiers.html" \
  --reporter-json-export "$REPORT_DIR/classifiers.json" || FAILED+=("classifiers")

newman run "$COL/compound-form.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/compound-form.html" \
  --reporter-json-export "$REPORT_DIR/compound-form.json" || FAILED+=("compound-form")

newman run "$COL/driverest-forms.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/driverest-forms.html" \
  --reporter-json-export "$REPORT_DIR/driverest-forms.json" || FAILED+=("driverest-forms")

newman run "$COL/tram-control-card.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/tram-control-card.html" \
  --reporter-json-export "$REPORT_DIR/tram-control-card.json" || FAILED+=("tram-control-card")

newman run "$COL/labour-inspection.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/labour-inspection.html" \
  --reporter-json-export "$REPORT_DIR/labour-inspection.json" || FAILED+=("labour-inspection")

  newman run "$COL/foreign-violation-form.collection.json" -e "$ENV" \
    --delay-request 300 \
    -r cli,htmlextra,json \
    --reporter-htmlextra-export "$REPORT_DIR/foreign-violation-form.html" \
  --reporter-json-export "$REPORT_DIR/foreign-violation-form.json" || FAILED+=("foreign-violation-form")

newman run "$COL/erru-ctud.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/erru-ctud.html" \
  --reporter-json-export "$REPORT_DIR/erru-ctud.json" || FAILED+=("erru-ctud")

newman run "$COL/erru-cgr.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/erru-cgr.html" \
  --reporter-json-export "$REPORT_DIR/erru-cgr.json" || FAILED+=("erru-cgr")

newman run "$COL/erru-rsi.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/erru-rsi.html" \
  --reporter-json-export "$REPORT_DIR/erru-rsi.json" || FAILED+=("erru-rsi")

newman run "$COL/erru-ncr.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/erru-ncr.html" \
  --reporter-json-export "$REPORT_DIR/erru-ncr.json" || FAILED+=("erru-ncr")

newman run "$COL/erru-nu.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/erru-nu.html" \
  --reporter-json-export "$REPORT_DIR/erru-nu.json" || FAILED+=("erru-nu")

newman run "$COL/erru-xml-adapter.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/erru-xml-adapter.html" \
  --reporter-json-export "$REPORT_DIR/erru-xml-adapter.json" || FAILED+=("erru-xml-adapter")

python3 "$REPO_ROOT/tests/erru-adapter/test_regression.py" -- $COMPOSE exec -T database psql -U ljvis -d ljvis_db

newman run "$COL/technical-check-forms.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/technical-check-forms.html" \
  --reporter-json-export "$REPORT_DIR/technical-check-forms.json" || FAILED+=("technical-check-forms")

newman run "$COL/transport-interruption.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/transport-interruption.html" \
  --reporter-json-export "$REPORT_DIR/transport-interruption.json" || FAILED+=("transport-interruption")

newman run "$COL/adr-form.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/adr-form.html" \
  --reporter-json-export "$REPORT_DIR/adr-form.json" || FAILED+=("adr-form")

newman run "$COL/good-repute-form.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/good-repute-form.html" \
  --reporter-json-export "$REPORT_DIR/good-repute-form.json" || FAILED+=("good-repute-form")

newman run "$COL/form-search.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/form-search.html" \
  --reporter-json-export "$REPORT_DIR/form-search.json" || FAILED+=("form-search")

newman run "$COL/xroad-provide-query.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/xroad-provide-query.html" \
  --reporter-json-export "$REPORT_DIR/xroad-provide-query.json" || FAILED+=("xroad-provide-query")

newman run "$COL/xroad-provide-write.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/xroad-provide-write.html" \
  --reporter-json-export "$REPORT_DIR/xroad-provide-write.json" || FAILED+=("xroad-provide-write")

newman run "$COL/risk-scores.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/risk-scores.html" \
  --reporter-json-export "$REPORT_DIR/risk-scores.json" || FAILED+=("risk-scores")

newman run "$COL/citizen-representation.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/citizen-representation.html" \
  --reporter-json-export "$REPORT_DIR/citizen-representation.json" || FAILED+=("citizen-representation")
newman run "$COL/cron-jobs.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/cron-jobs.html" \
  --reporter-json-export "$REPORT_DIR/cron-jobs.json" || FAILED+=("cron-jobs")

newman run "$COL/notifications.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/notifications.html" \
  --reporter-json-export "$REPORT_DIR/notifications.json" || FAILED+=("notifications")

newman run "$COL/audit-log.collection.json" -e "$ENV" \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/audit-log.html" \
  --reporter-json-export "$REPORT_DIR/audit-log.json" || FAILED+=("audit-log")

newman run "$COL/dashboard.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra,json \
  --reporter-htmlextra-export "$REPORT_DIR/dashboard.html" \
  --reporter-json-export "$REPORT_DIR/dashboard.json" || FAILED+=("dashboard")

echo ""
# Verify the complete chain after all producers (including ordinary UI flows) have run.
python3 - <<'VERIFY_AUDIT'
import json
import urllib.request
request = urllib.request.Request(
    'http://localhost:9087/ljvis/log/get_logs_verify',
    data=b'{"from_event_id":"","to_event_id":""}',
    headers={'Content-Type': 'application/json'})
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
