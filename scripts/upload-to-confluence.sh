#!/bin/bash
exec python3 -u - "$@" <<'PY'
import json
import os
import ssl
import sys
import urllib.error
import urllib.request

TOKEN = os.environ.get("CONFLUENCE_TOKEN", "")
if not TOKEN:
    print("Usage: CONFLUENCE_TOKEN=<your-token> python3 scripts/upload-to-confluence.sh")
    sys.exit(1)

BASE = "https://wiki.kemit.ee"
SPACE = "LIA"
PARENT_ID = 258229822
BRANCH = "dev"
GITHUB_BASE = f"https://github.com/kemit-ee/ljvis-2/blob/{BRANCH}/docs"
LOGO_URL = "https://wiki.kemit.ee/download/attachments/258229842/Rahastanud_EL_kaksiklogod_EST_hor_color_RGB.jpg"

# Confluence internal instance may use a self-signed cert; use unverified context to avoid SSL errors.
SSL_CTX = ssl._create_unverified_context()


def create_page(title: str, description: str, md_url: str, docx_url: str):
    body = (
        f'<ac:image ac:align="center"><ri:url ri:value="{LOGO_URL}" /></ac:image>'
        f'<p>{description}</p>'
        f'<p>Markdown versioon on saadaval <a href="{md_url}">GitHubis</a> '
        f'ja DOCX-fail <a href="{docx_url}">siit</a>.</p>'
    )
    payload = {
        "type": "page",
        "title": title,
        "space": {"key": SPACE},
        "ancestors": [{"id": PARENT_ID}],
        "body": {
            "storage": {
                "value": body,
                "representation": "storage",
            }
        },
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/rest/api/content",
        data=data,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as resp:
            response = json.loads(resp.read().decode("utf-8"))
            print(f"    Leht loodud, ID: {response['id']}")
    except urllib.error.HTTPError as e:
        print(f"    Viga: HTTP {e.code}")
        try:
            print(e.read().decode("utf-8"))
        except Exception:
            pass
        sys.exit(1)
    except Exception as e:
        print(f"    Viga: {e}")
        sys.exit(1)


print('==> Loon alamlehe "LJVIS2 kasutajajuhend"...')
create_page(
    "LJVIS2 kasutajajuhend",
    "LJVIS2 kasutajajuhend kirjeldab süsteemi kasutamist järelevalveametnikele ja ettevõtja esindajatele.",
    f"{GITHUB_BASE}/user-guide.md",
    f"{GITHUB_BASE}/user-guide.docx",
)

print('==> Loon alamlehe "LJVIS2 administraatorijuhend"...')
create_page(
    "LJVIS2 administraatorijuhend",
    "LJVIS2 administraatorijuhend kirjeldab kasutajahaldust, kasutajagruppe, klassifikaatoreid, auditilogi, S3 failihoidlat ja API lõpp-punkte.",
    f"{GITHUB_BASE}/admin-guide.md",
    f"{GITHUB_BASE}/admin-guide.docx",
)

print("")
print(f"Valmis! Vaata tulemust: {BASE}/pages/viewpage.action?pageId={PARENT_ID}")
PY
