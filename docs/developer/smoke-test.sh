#!/usr/bin/env bash
# Kiire terviskontroll lokaalselt käivitatud xtee-mockile.
# Kasutus: bash smoke-test.sh [base-url]
# Vaikimisi base-url on lokaalse Compose-seadistuse aadress (vt lokaalne-mock.md).
set -euo pipefail

BASE_URL="${1:-http://localhost:40386/xtee-mock}"
FAILED=0

check() {
  local name="$1"
  local expected_status="$2"
  shift 2
  local status curl_exit
  set +e
  status="$(curl -s -o /tmp/smoke-test-body.$$ -w '%{http_code}' "$@")"
  curl_exit=$?
  set -e
  if [ "$curl_exit" -ne 0 ]; then
    status="000 (curl viga: ei saanud ühendust)"
  fi
  if [ "$status" = "$expected_status" ]; then
    echo "OK   $name ($status)"
  else
    echo "FAIL $name (oodatud $expected_status, sain $status)"
    [ -s /tmp/smoke-test-body.$$ ] && cat /tmp/smoke-test-body.$$ && echo
    FAILED=1
  fi
  rm -f /tmp/smoke-test-body.$$
}

echo "Kontrollin mocki aadressil: $BASE_URL"
echo

check "health/ready" 200 \
  "$BASE_URL/health/ready"

check "isiku-kontroll (edukas)" 200 \
  -X POST "$BASE_URL/xroad/v1/isiku-kontroll" \
  -H 'Content-Type: application/json' \
  -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  -d '{"isikukood":"60001019906"}'

check "isiku-kontroll (puuduv X-Road-Client -> 403)" 403 \
  -X POST "$BASE_URL/xroad/v1/isiku-kontroll" \
  -H 'Content-Type: application/json' \
  -d '{"isikukood":"60001019906"}'

check "findUsage (AJ)" 200 \
  "$BASE_URL/xroad/v2/findUsage?userCode=60001019906&offset=0&limit=1" \
  -H 'X-Road-UserId: 60001019906'

echo
if [ "$FAILED" = "0" ]; then
  echo "Stack on üleval ja vastab ootuspäraselt."
else
  echo "Mõni kontroll ebaõnnestus — vt eespool."
  exit 1
fi
