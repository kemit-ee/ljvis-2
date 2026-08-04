#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="${1:-$SCRIPT_DIR/ci-stack-environment.json}"
COL="$SCRIPT_DIR/collections"
REPORT_DIR="$SCRIPT_DIR/reports"

mkdir -p "$REPORT_DIR"

echo "Using environment: $ENV"
echo "Reports directory: $REPORT_DIR"
echo ""

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

newman run "$COL/labour-inspection.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/labour-inspection.html"

newman run "$COL/technical-check-forms.collection.json" -e "$ENV" \
  --delay-request 300 \
  -r cli,htmlextra \
  --reporter-htmlextra-export "$REPORT_DIR/technical-check-forms.html"

echo ""
echo "All collections passed."
echo "HTML reports:"
find "$REPORT_DIR" -type f -name "*.html" -print
