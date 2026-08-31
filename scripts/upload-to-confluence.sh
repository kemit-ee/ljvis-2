#!/bin/bash
# Upload LJVIS2 user guide and admin guide DOCX files to Confluence (wiki.kemit.ee)
# Run from the repo root: bash scripts/upload-to-confluence.sh

set -euo pipefail

TOKEN="${CONFLUENCE_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "Usage: CONFLUENCE_TOKEN=<your-token> bash scripts/upload-to-confluence.sh"
  exit 1
fi

BASE="https://wiki.kemit.ee"
SPACE="LIA"
BRANCH="dev"
GITHUB_BASE="https://github.com/kemit-ee/ljvis-2/blob/${BRANCH}/docs"

echo "==> Loon vanemlehe 'LJVIS2 kasutusjuhendid'..."
PARENT=$(curl -fsSL -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$BASE/rest/api/content" \
  -d "{
    \"type\": \"page\",
    \"title\": \"LJVIS2 kasutusjuhendid\",
    \"space\": { \"key\": \"$SPACE\" },
    \"body\": {
      \"storage\": {
        \"value\": \"<p>LJVIS2 kasutaja- ja administraatorijuhendid. Juhendid on saadaval ka Markdownina GitHubis.</p>\",
        \"representation\": \"storage\"
      }
    }
  }")
PARENT_ID=$(echo "$PARENT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
echo "    Vanemlehe ID: $PARENT_ID"

create_page_and_attach() {
  local title="$1"
  local description="$2"
  local github_link="$3"
  local docx_file="$4"
  local docx_github_link="${github_link%.md}.docx"

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
          \"value\": \"<p>$description Markdown versioon on saadaval <a href=\\\"$github_link\\\">GitHubis</a>. DOCX-fail on saadaval <a href=\\\"$docx_github_link\\\">siit</a>.</p>\",
          \"representation\": \"storage\"
        }
      }
    }")
  PAGE_ID=$(echo "$PAGE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
  echo "    Lehe ID: $PAGE_ID"

  echo "==> Laadin manuse: $docx_file ..."
  curl -fsSL -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Atlassian-Token: no-check" \
    -F "file=@$docx_file;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
    "$BASE/rest/api/content/$PAGE_ID/child/attachment" > /dev/null
  echo "    Manus lisatud."
}

create_page_and_attach \
  "LJVIS2 kasutajajuhend" \
  "LJVIS2 kasutajajuhend kirjeldab süsteemi kasutamist tee ametnikele ja ettevõtja esindajatele." \
  "$GITHUB_BASE/user-guide.md" \
  "docs/user-guide.docx"

create_page_and_attach \
  "LJVIS2 administraatorijuhend" \
  "LJVIS2 administraatorijuhend kirjeldab kasutajahaldust, klassifikaatoreid, auditilogi ja S3 failihoidlat." \
  "$GITHUB_BASE/admin-guide.md" \
  "docs/admin-guide.docx"

echo ""
echo "Valmis! Vaata tulemust: $BASE/spaces/$SPACE"
