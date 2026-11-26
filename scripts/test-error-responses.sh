#!/usr/bin/env bash
# Veavastuste leping: Ruuteri 500 jõuab kliendini ühtsel kujul koos trace id-ga, muud vastused
# muutmata. Käivitab päris Ruuteri (versioon docker/ruuter/Dockerfile järgi, seadistus ruuter.yaml)
# ja päris nginx-i (frontend/nginx.conf). Vajab ainult Dockerit ja curl-i.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
img=$(sed -n 's/^FROM //p' "$root/docker/ruuter/Dockerfile" | head -1)
id="errresp-$$"
tmp=$(mktemp -d)

cleanup() {
  docker rm -f "$id-ruuter" "$id-nginx" >/dev/null 2>&1 || true
  docker network rm "$id" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT

mkdir -p "$tmp/dsl/POST"
# Lubatud loendist välja jääv staatus (418) põhjustab Ruuteri 500.
cat > "$tmp/dsl/POST/unhandled.yml" <<'YML'
callStep:
  call: http.post
  args:
    url: "http://ruuter:8080/ljvis/teapot"
    body:
      a: 1
  result: r
  next: done
done:
  return: ${r}
YML
printf 'only:\n  status: 418\n  return: teapot\n  next: end\n' > "$tmp/dsl/POST/teapot.yml"
printf 'only:\n  status: 500\n  return: "original-body"\n  next: end\n' > "$tmp/dsl/POST/deliberate.yml"
printf 'only:\n  status: 415\n  return:\n    error: FILE_TYPE_NOT_ALLOWED\n  next: end\n' > "$tmp/dsl/POST/handled.yml"
printf '[DSL]\n' > "$tmp/constants.ini"
chmod -R a+rX "$tmp"

docker network create "$id" >/dev/null
docker run -d --name "$id-ruuter" --network "$id" --network-alias ruuter \
  -v "$tmp/dsl:/app/DSL/ljvis:ro" -v "$tmp/constants.ini:/app/constants.ini:ro" \
  -v "$root/ruuter.yaml:/app/ruuter.yaml:ro" "$img" >/dev/null
docker run -d --name "$id-nginx" --network "$id" -p 127.0.0.1:0:3001 \
  --add-host tim:127.0.0.1 --add-host tara-mock:127.0.0.1 \
  -v "$root/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$root/frontend/security-headers.conf:/etc/nginx/ljvis-security-headers.conf:ro" \
  nginx:alpine >/dev/null

port=$(docker port "$id-nginx" 3001/tcp | head -1 | sed 's/.*://')
base="http://127.0.0.1:$port/api"
# Valmisolek: oodatav 415 jõuab läbi nginx-i alles siis, kui mõlemad teenused vastavad.
ready=
for _ in $(seq 1 60); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' "$base/handled")" = 415 ] && { ready=1; break; }
  read -r -t 1 <> <(:) || true
done
[ -n "$ready" ] || { docker logs "$id-ruuter" >&2; docker logs "$id-nginx" >&2; exit 1; }

fail() { echo "FAIL: $*" >&2; cat "$tmp/headers" "$tmp/body" >&2 || true; exit 1; }
call() {
  status=$(curl -s -D "$tmp/headers" -o "$tmp/body" -w '%{http_code}' -X POST -H 'content-type: application/json' "${@:2}" -d '{}' "$base/$1")
}
original='step|DSL|project|upstream|http_codes_allow_list|\.yml|callStep|original-body|teapot'

for route in unhandled deliberate; do
  call "$route"
  [ "$status" = 500 ] || fail "$route: staatus $status, ootasin 500"
  trace=$(tr -d '\r' < "$tmp/headers" | awk 'tolower($1)=="x-trace-id:"{print $2; exit}')
  [[ "$trace" =~ ^[0-9a-f]{32}$ ]] || fail "$route: X-Trace-Id puudub"
  expected="{\"response\":{\"error\":\"INTERNAL_ERROR\",\"traceId\":\"$trace\"}}"
  [ "$(cat "$tmp/body")" = "$expected" ] || fail "$route: ootamatu keha"
  if grep -Eiq "$original" "$tmp/body"; then fail "$route: algne keha pole asendatud"; fi
  grep -iq '^content-security-policy:' "$tmp/headers" || fail "$route: turvapäised puuduvad"
  echo "ok  $route: üldine 500, trace id $trace"
done

# Sama ID peab olema Ruuteri logis, muidu pole sellest kasu.
call unhandled -H 'traceparent: 00-0123456789abcdef0123456789abcdef-0123456789abcdef-01'
grep -q 0123456789abcdef0123456789abcdef "$tmp/body" || fail "kliendi traceparent ei jõudnud vastusesse"
docker logs "$id-ruuter" 2>&1 | grep -q 't=01234567' || fail "trace id puudub Ruuteri logis"
echo "ok  trace id on Ruuteri logis"

# Kliendi saadetud mitte-kuueteistkümnendväärtust vastusesse ei kopeerita.
call unhandled -H 'traceparent: 00-"};<script>alert(1)</script>aaaaaa-0123456789abcdef-01'
grep -q '"traceId":""}}$' "$tmp/body" || fail "vigane traceparent jõudis vastuse kehasse"
echo "ok  vigast traceparent väärtust ei peegeldata"

call handled
[ "$status" = 415 ] || fail "handled: staatus $status, ootasin 415"
grep -q FILE_TYPE_NOT_ALLOWED "$tmp/body" || fail "handled: veakood kadus"
echo "ok  käsitletud 415 läbib proksi muutmata"
