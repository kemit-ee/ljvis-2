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

echo ""

# ── Newman runs ───────────────────────────────────────────────────────────────

newman run "$COL/organisations.collection.json" -e "$ENV" \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/organisations.html"

newman run "$COL/permissions.collection.json" -e "$ENV" \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/permissions.html"

newman run "$COL/users.collection.json" -e "$ENV" \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/users.html"

newman run "$COL/user-groups.collection.json" -e "$ENV" \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/user-groups.html"

newman run "$COL/classifiers.collection.json" -e "$ENV" \
  --delay-request 600 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/classifiers.html"

newman run "$COL/driverest-forms.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/driverest-forms.html"

newman run "$COL/labour-inspection.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/labour-inspection.html"

newman run "$COL/technical-check-forms.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/technical-check-forms.html"

newman run "$COL/transport-interruption.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/transport-interruption.html"

newman run "$COL/adr-form.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/adr-form.html"

newman run "$COL/good-repute-form.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/good-repute-form.html"

newman run "$COL/form-search.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/form-search.html"

echo ""
echo "All collections passed."
echo "HTML reports:"
find "$REPORT_DIR" -type f -name "*.html" -print
