#!/usr/bin/env bash
# CI ajamõõtmise abifunktsioonid (sourcetakse tests/playwright/run.sh ja tests/postman/run-all.sh
# poolt). Mõõdab, kui kaua kestab iga etapp (pinu ehitus, ootamine, seemned, testid, ...), et
# järgmine kiirendusotsus põhineks numbritel, mitte oletustel.
#
#   source tests/ci-timing.sh
#   ci_phase "Pinu ehitus"      # lõpetab eelmise etapi ja alustab uut
#   ci_phase "Testid"
#   ci_phase_report "Pealkiri" /tee/ajamootmine.md    # lõpetab viimase etapi, trükib tabeli,
#                                                     # kirjutab faili ja lisab GitHub Actions kokkuvõttesse
#
# Funktsioonid ei tohi kunagi skripti ebaõnnestuda (set -e), seepärast kõik `|| true`.
_CI_T_FILE="$(mktemp 2>/dev/null || echo /tmp/ci-timing.$$)"
_CI_T_NAME=""
_CI_T_START=0
_CI_T_BEGIN="$(date +%s)"

ci_phase() {
  local now
  now="$(date +%s)"
  if [ -n "$_CI_T_NAME" ]; then
    printf '%s\t%s\n' "$((now - _CI_T_START))" "$_CI_T_NAME" >> "$_CI_T_FILE" || true
  fi
  _CI_T_NAME="${1:-}"
  _CI_T_START="$now"
}

ci_phase_report() {
  local title="${1:-Ajamõõtmine}" out="${2:-}" total
  ci_phase ""
  total=$(( $(date +%s) - _CI_T_BEGIN ))
  local table
  table="$(awk -F'\t' -v total="$total" '
    { s[NR]=$1; n[NR]=$2; sum+=$1 }
    END {
      print "| Etapp | Aeg | Osa |"
      print "|---|---:|---:|"
      for (i=1; i<=NR; i++) {
        pct = (total > 0) ? int(100 * s[i] / total) : 0
        printf "| %s | %d min %02d s | %d%% |\n", n[i], int(s[i]/60), s[i]%60, pct
      }
      printf "| **Kokku** | **%d min %02d s** | |\n", int(total/60), total%60
    }' "$_CI_T_FILE" 2>/dev/null)" || table=""
  if [ -z "$table" ]; then rm -f "$_CI_T_FILE" 2>/dev/null || true; return 0; fi
  echo ""
  echo "==> $title"
  echo "$table"
  if [ -n "$out" ]; then
    mkdir -p "$(dirname "$out")" 2>/dev/null || true
    { echo "# $title"; echo ""; echo "$table"; } > "$out" 2>/dev/null || true
  fi
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    { echo "### $title"; echo ""; echo "$table"; echo ""; echo "_Ei sisalda runneri ettevalmistust (checkout, apt, npm ci, brauseri paigaldus) — see on töö sammude logis._"; echo ""; } >> "$GITHUB_STEP_SUMMARY" 2>/dev/null || true
  fi
  rm -f "$_CI_T_FILE" 2>/dev/null || true
  return 0
}
