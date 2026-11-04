#!/bin/sh
# Writes the SPA runtime config (served as /config.json by nginx) from environment variables.
# TARA_CALLBACK_PATH: /auth/callback (default) or /auth/tara-callback —
# must match the redirect URI registered at TARA for this environment.
set -eu
path="${TARA_CALLBACK_PATH:-/auth/callback}"
case "$path" in
  /auth/callback|/auth/tara-callback) ;;
  *) echo "40-runtime-config: invalid TARA_CALLBACK_PATH '$path'" >&2; exit 1 ;;
esac
printf '{"taraCallbackPath":"%s"}\n' "$path" > /var/run/ljvis-config.json
