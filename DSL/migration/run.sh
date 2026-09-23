#!/usr/bin/env bash
# .env is trusted shell syntax. Environment is loaded only here; local tests
# set MIGRATION_ENV_FILE=/dev/null so production settings cannot override them.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${MIGRATION_ENV_FILE:-$HERE/.env}"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
fi
exec "${PYTHON:-python3}" "$HERE/migrate.py" "$@"
