#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
test_image="ljvis2-erru-register-mocks:$(date +%s)-$$"
trap 'docker image rm "$test_image" >/dev/null 2>&1 || true' EXIT
# Use the deployed Dockerfile and .dockerignore. Do not restore DSL with a bind mount.
docker build --network none -f docker/ruuter/Dockerfile -t "$test_image" .
# Pass only synthetic test fixtures on stdin; this also works with a sibling daemon.
docker run --rm -i --network none --read-only --tmpfs /tmp \
  --entrypoint sh "$test_image" -c '
    mkdir -p /tmp/tests
    cat > /tmp/tests/register-mocks.test.yml
    dsl-test --dsl /app/DSL --tests /tmp/tests --constants /app/constants.ini
  ' < DSL-tests/erru/register-mocks.test.yml
