#!/usr/bin/env bash
# LJVIS1 -> LJVIS2 migratsioon. Uks kask.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
exec "${PYTHON:-python3}" migrate_backup.py "$@"
