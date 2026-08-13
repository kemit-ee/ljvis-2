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

LOGO_URL="https://wiki.kemit.ee/download/attachments/258229842/Rahastanud_EL_kaksiklogod_EST_hor_color_RGB.jpg?version=1&amp;modificationDate=1773758668398&amp;api=v2"
LOGO_XML="<ac:image><ri:url ri:value=\"$LOGO_URL\" /></ac:image>"

create_page() {
  local title="$1"
  local description="$2"
  local github_md="$3"
  local github_docx="$4"

  echo ""
  echo "==> Loon alamlehe '$title'..."
  PAGE=$(curl -fsSL -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$BASE/rest/api/content" \
    -d "{
      \"type\": \"page\",
      \"title\": \"$title\",
      \"space\": { \"key\": \"$SPACE\" },
      \"ancestors\": [{ \"id\": $PARENT_ID }],
      \"body\": {
        \"storage\": {
          \"value\": \"$LOGO_XML<p>$description Markdown versioon on saadaval <a href=\\\"$github_md\\\">GitHubis</a> ja DOCX-fail <a href=\\\"$github_docx\\\">siit</a>.</p>\",
          \"representation\": \"storage\"
        }
      }
    }")
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
