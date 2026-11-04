#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${JAVA_TEST_OUTPUT_DIR:?Run run-java-tests.sh first and retain its compiled classes}"
container="ljvis-erru-test-$(date +%s)-$$"
cleanup() { docker rm -f "${container}" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# This runner owns the database. It never accepts a shared database URL.
docker run -d --name "${container}" -e POSTGRES_PASSWORD=synthetic-test-password \
  -e POSTGRES_DB=erru_adapter_test -p 127.0.0.1::5432 postgres:17 >/dev/null
for attempt in {1..60}; do
  if docker exec "${container}" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  if [[ "${attempt}" == 60 ]]; then echo 'PostgreSQL did not become ready' >&2; exit 1; fi
  sleep 1
done
port=$(docker port "${container}" 5432/tcp); port=${port##*:}
export ERRU_DISPOSABLE_DATABASE=1
export DB_URL="jdbc:postgresql://127.0.0.1:${port}/erru_adapter_test" DB_USER=postgres DB_PASSWORD=synthetic-test-password
export RUUTER_INTERNAL_BASE_URL=http://127.0.0.1:1 INTERNAL_COMMUNICATION_KEY=synthetic-token
export HUB_RESPONSE_URL=http://127.0.0.1:1/response CONTRACTS_DIR=contracts/erru/3.5
export RESPONDING_AUTHORITY=EE-PPA RESPONDING_AUTHORITY_CTUD=EE-TRAM RESPONDING_AUTHORITY_RSI=EE-TRAM RESPONDING_AUTHORITY_NCR=EE-TRAM MEMBER_STATE_CODE=EE
java_args=(-ea)
if [[ -n "${JACOCO_AGENT:-}" ]]; then
  : "${JACOCO_EXEC:?Set JACOCO_EXEC}"
  java_args+=("-javaagent:${JACOCO_AGENT}=destfile=${JACOCO_EXEC},append=true")
fi
java "${java_args[@]}" -classpath "${JAVA_TEST_OUTPUT_DIR}/classes:${JAVA_TEST_OUTPUT_DIR}/test-classes:docker/erru-xml-adapter/lib/postgresql-42.7.4.jar" JdbcLifecycleTest
python3 tests/erru-adapter/test_transport_lifecycle.py "${container}"
