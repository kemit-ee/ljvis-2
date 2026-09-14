#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image=$(awk '/^FROM / { print $2; exit }' docker/ruuter/Dockerfile)
python3 scripts/generate-xtee-mock.py --check
python3 tests/contract/check_xtee_mock.py
test_image="ljvis2-xtee-mock-tests:$(date +%s)-$$"
trap 'docker image rm "$test_image" >/dev/null 2>&1 || true' EXIT
# Send a minimal context to the daemon: GitLab's sibling Docker daemon cannot
# resolve the job container's bind-mount paths. No .env or real DSL is included.
COPYFILE_DISABLE=1 tar --format=ustar --exclude='._*' -cf - \
  docker/xtee-mock-tests/Dockerfile DSL/Ruuter/xtee-mock DSL-mock-tests |
  docker build --network none --build-arg "RUUTER_IMAGE=$image" \
    -f docker/xtee-mock-tests/Dockerfile -t "$test_image" -
for tool in dsl-lint dsl-test; do
  args=(--dsl /sandbox)
  if [[ "$tool" == dsl-test ]]; then args+=(--tests /tests); else args+=(--require-guard); fi
  docker run --rm --network none --read-only --tmpfs /tmp \
    --entrypoint "$tool" "$test_image" "${args[@]}"
done
