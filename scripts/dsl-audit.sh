#!/usr/bin/env bash
# Boots both Ruuter DSL trees from the pinned image, fetches GET /_/audit/dsl
# (Ruuter #146) and asserts zero error- AND warning-severity findings in the
# LJVIS project (info-level findings are tolerated).
# The base image also bundles demo projects ("samples" etc.) — they are ignored.
#
# Usage: scripts/dsl-audit.sh [IMAGE] [OUT_DIR]
#   IMAGE   default: image pinned in docker/ruuter/Dockerfile
#   OUT_DIR default: ./dsl-audit-out (audit-public.json, audit-internal.json)
set -euo pipefail
cd "$(dirname "$0")/.."
IMG="${1:-$(grep -m1 '^FROM ' docker/ruuter/Dockerfile | awk '{print $2}')}"
OUT="${2:-dsl-audit-out}"
mkdir -p "$OUT"
fail=0
for t in "DSL/Ruuter/ljvis:ruuter.yaml:public" "DSL/Ruuter.internal/ljvis:ruuter-internal.yaml:internal"; do
  dir="${t%%:*}"; rest="${t#*:}"; cfg="${rest%%:*}"; tag="${rest#*:}"
  cid=$(docker run -d --rm -p 8080 \
    -v "$PWD/$dir:/app/DSL/ljvis:ro" -v "$PWD/constants.ini:/app/constants.ini:ro" \
    -v "$PWD/$cfg:/app/ruuter.yaml:ro" -e RUUTER_ADMIN_ENABLED=true "$IMG")
  port=$(docker port "$cid" 8080 | head -1 | sed 's/.*://')
  ok=0
  for _ in $(seq 1 40); do
    docker logs "$cid" 2>&1 | grep -q 'Server listening' && { ok=1; break; }
    sleep 1
  done
  if [ "$ok" != 1 ]; then
    echo "❌ $tag — Ruuter did not reach 'Server listening'"; docker logs "$cid" 2>&1 | tail -20
    docker rm -f "$cid" >/dev/null 2>&1 || true; fail=1; continue
  fi
  curl -sf "http://localhost:$port/_/audit/dsl" -o "$OUT/audit-$tag.json" \
    || { echo "❌ $tag — GET /_/audit/dsl failed"; fail=1; docker rm -f "$cid" >/dev/null 2>&1 || true; continue; }
  docker rm -f "$cid" >/dev/null 2>&1 || true
  python3 - "$OUT/audit-$tag.json" "$tag" <<'PY' || fail=1
import json, sys
path, tag = sys.argv[1:]
f = [x for x in json.load(open(path))["findings"] if x.get("project") == "ljvis"]
errs = [x for x in f if x["severity"] == "error"]
warns = sum(x["severity"] == "warning" for x in f)
bad = [x for x in f if x["severity"] in ("error", "warning")]
if bad:
    print(f"❌ {tag}: {len(errs)} audit error(s), {warns} warning(s)")
    for x in bad:
        print(json.dumps(x, ensure_ascii=False))
    sys.exit(1)
print(f"✅ {tag}: 0 errors, 0 warnings ({len(f)} info)")
PY
done
exit $fail
