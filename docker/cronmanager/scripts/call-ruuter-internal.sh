#!/bin/sh
# POST <path> to ruuter-internal with the shared service token (#515).
#
# CronManager's `type: http` jobs cannot send headers and `shell_environment` does not expand
# env vars, so the cron DSLs are `type: exec` jobs that call this script. Base URL and token come
# from the same constants.ini ruuter-internal reads (LJVIS_RUUTER_INTERNAL, INTERNAL_COMMUNICATION_KEY),
# so there is one source of truth; the file must be mounted into the cronmanager container.
#
# Usage: call-ruuter-internal.sh /cron/risk-score-recalc-sync[?query]
set -eu

CONSTANTS_FILE="${CONSTANTS_FILE:-/app/constants.ini}"
path="${1:?usage: call-ruuter-internal.sh /path[?query]}"

const() { sed -n "s/^$1=//p" "$CONSTANTS_FILE" | head -n1; }

base="$(const LJVIS_RUUTER_INTERNAL)"
token="$(const INTERNAL_COMMUNICATION_KEY)"
[ -n "$base" ] && [ -n "$token" ] || { echo "LJVIS_RUUTER_INTERNAL / INTERNAL_COMMUNICATION_KEY missing in $CONSTANTS_FILE" >&2; exit 1; }

# Header goes through stdin so the token never appears in the process list.
printf 'x-internal-service-token: %s\n' "$token" | curl -sf -X POST -H @- "${base}${path}"
