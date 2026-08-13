#!/bin/bash
# Create Confluence child pages for LJVIS2 user and admin guides under an existing parent page.
# The pages contain only descriptive text, the EU logo, and links to the Markdown and DOCX files on GitHub.
# Run from the repo root: CONFLUENCE_TOKEN=<token> bash scripts/upload-to-confluence.sh

set -euo pipefail

TOKEN="${CONFLUENCE_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "Usage: CONFLUENCE_TOKEN=<your-token> bash scripts/upload-to-confluence.sh"
  exit 1
fi

BASE="https://wiki.kemit.ee"
SPACE="LIA"
PARENT_ID="258229822"
BRANCH="dev"
GITHUB_BASE="https://github.com/kemit-ee/ljvis-2/blob/${BRANCH}/docs"
LOGO_URL="https://wiki.kemit.ee/download/attachments/258229842/Rahastanud_EL_kaksiklogod_EST_hor_color_RGB.jpg"

build_payload() {
  python3 - "$@" <<'PY'
import json, sys
logo, desc, md, docx, title, space, parent = sys.argv[1:8]
body = (
    f'<ac:image ac:align="center"><ri:url ri:value="{logo}" /></ac:image>'
    f'<p>{desc}</p>'
    f'<p>Markdown versioon on saadaval <a href="{md}">GitHubis</a> '
    f'ja DOCX-fail <a href="{docx}">siit</a>.</p>'
)
payload = {
    "type": "page",
    "title": title,
    "space": {"key": space},
    "ancestors": [{"id": int(parent)}],
    "body": {
        "storage": {
            "value": body,
            "representation": "storage"
        }
    }
}
print(json.dumps(payload, ensure_ascii=False))
PY
}

api_post() {
  local payload="$1"
  local tmp_resp
  tmp_resp=$(mktemp)
  local tmp_err
  tmp_err=$(mktemp)
  local http_code

  http_code=$(curl -sSL -m 30 -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -o "$tmp_resp" \
    -w "%{http_code}" \
    -d "$payload" \
    "$BASE/rest/api/content" 2>"$tmp_err") || true

  if [[ -z "$http_code" ]]; then
    echo "    Viga: curl ei saanud Confluence'i poole pöörduda"
    cat "$tmp_err"
    echo ""
    rm -f "$tmp_resp" "$tmp_err"
    exit 1
  fi

  if [[ "$http_code" -ne 200 ]]; then
    echo "    Viga: HTTP $http_code"
    [[ -s "$tmp_resp" ]] && cat "$tmp_resp"
    [[ -s "$tmp_err" ]] && cat "$tmp_err"
    echo ""
    rm -f "$tmp_resp" "$tmp_err"
    exit 1
  fi

  cat "$tmp_resp"
  rm -f "$tmp_resp" "$tmp_err"
}

create_page() {
  local title="$1"
  local description="$2"
  local github_md="$3"
  local github_docx="$4"

  echo ""
  echo "==> Loon alamlehe '$title'..."
  PAYLOAD=$(build_payload "$LOGO_URL" "$description" "$github_md" "$github_docx" "$title" "$SPACE" "$PARENT_ID")
  PAGE=$(api_post "$PAYLOAD")
  PAGE_ID=$(echo "$PAGE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
  echo "    Leht loodud, ID: $PAGE_ID"
}

create_page \
  "LJVIS2 kasutajajuhend" \
  "LJVIS2 kasutajajuhend kirjeldab süsteemi kasutamist järelevalveametnikele ja ettevõtja esindajatele." \
  "$GITHUB_BASE/user-guide.md" \
  "$GITHUB_BASE/user-guide.docx"

create_page \
  "LJVIS2 administraatorijuhend" \
  "LJVIS2 administraatorijuhend kirjeldab kasutajahaldust, kasutajagruppe, klassifikaatoreid, auditilogi, S3 failihoidlat ja API lõpp-punkte." \
  "$GITHUB_BASE/admin-guide.md" \
  "$GITHUB_BASE/admin-guide.docx"

echo ""
echo "Valmis! Vaata tulemust: $BASE/pages/viewpage.action?pageId=$PARENT_ID"
