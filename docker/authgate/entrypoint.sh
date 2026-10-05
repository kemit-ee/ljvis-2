#!/bin/sh
# Renderdab nginx.conf mallist ja käivitab nginxi. Fail-closed: võtmeta värav ei käivitu.
set -eu

: "${GATE_TOKEN:?GATE_TOKEN must be set}"
: "${GATE_UPSTREAM:?GATE_UPSTREAM must be set (host:port)}"
export GATE_PORT="${GATE_PORT:-8080}"
export GATE_MAX_BODY="${GATE_MAX_BODY:-64m}"
export GATE_TIMEOUT="${GATE_TIMEOUT:-120s}"
# Regex avalikele teedele; vaikimisi mittevastav muster.
export GATE_PUBLIC_PATHS="${GATE_PUBLIC_PATHS:-^/__gate/none\$}"

# GATE_ENFORCE=false: pehme režiim sisseviimiseks (kutsujad hakkavad tokenit saatma enne jõustamist).
case "${GATE_ENFORCE:-true}" in
  true)  export GATE_DEFAULT_AUTH=0 ;;
  false) export GATE_DEFAULT_AUTH=1; echo "authgate: SOFT MODE (GATE_ENFORCE=false) - missing/wrong tokens are only logged" >&2 ;;
  *) echo "GATE_ENFORCE must be true or false" >&2; exit 1 ;;
esac

# Token läheb nginx map-i literaalina: lubame ainult ohutud märgid.
case "$GATE_TOKEN" in
  *[!A-Za-z0-9._~+=-]*) echo "GATE_TOKEN may only contain [A-Za-z0-9._~+=-]" >&2; exit 1 ;;
esac

VARS='${GATE_DEFAULT_AUTH} ${GATE_TOKEN} ${GATE_UPSTREAM} ${GATE_PORT} ${GATE_MAX_BODY} ${GATE_TIMEOUT} ${GATE_PUBLIC_PATHS}'
envsubst "$VARS" < /etc/authgate/nginx.conf.template > /tmp/nginx.conf
envsubst "$VARS" < /etc/authgate/gate-proxy.conf > /tmp/gate-proxy.conf
nginx -t -c /tmp/nginx.conf
exec nginx -c /tmp/nginx.conf -g 'daemon off;'
