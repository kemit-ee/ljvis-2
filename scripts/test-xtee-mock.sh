#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image=$(awk '/^FROM / { print $2; exit }' docker/ruuter/Dockerfile)
python3 scripts/generate-xtee-mock.py --check
python3 tests/contract/check_xtee_mock.py
for tool in dsl-lint dsl-test; do
  args=(--dsl /sandbox)
  if [[ "$tool" == dsl-test ]]; then args+=(--tests /tests); else args+=(--require-guard); fi
  docker run --rm --network none --read-only --tmpfs /tmp \
    -v "$PWD/DSL/Ruuter/xtee-mock:/sandbox/xtee-mock:ro" \
    -v "$PWD/DSL-mock-tests:/tests:ro" \
    --entrypoint "$tool" "$image" "${args[@]}"
done
