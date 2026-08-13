#!/bin/bash
exec python3 -u - "$@" <<'PY'
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
import urllib.parse

TOKEN = os.environ.get("CONFLUENCE_TOKEN", "")
if not TOKEN:
    print("Usage: CONFLUENCE_TOKEN=<your-token> bash scripts/upload-to-confluence.sh")
    sys.exit(1)

BASE = "https://wiki.kemit.ee"
SPACE = "LIA"
PARENT_ID = 258229822
BRANCH = "dev"
GITHUB_BASE = f"https://github.com/kemit-ee/ljvis-2/blob/{BRANCH}/docs"
LOGO_URL = "https://wiki.kemit.ee/download/attachments/258229842/Rahastanud_EL_kaksiklogod_EST_hor_color_RGB.jpg"

SSL_CTX = ssl._create_unverified_context()


def request(method, path, data=None, headers=None):
    url = f"{BASE}{path}"
    h = {"Authorization": f"Bearer {TOKEN}"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as resp:
        return json.loads(resp.read().decode("utf-8"))


def api_error(e):
    print(f"    Viga: HTTP {e.code}")
    try:
        print(e.read().decode("utf-8"))
    except Exception:
        pass


def find_page(title):
    q = urllib.parse.urlencode({"spaceKey": SPACE, "title": title, "status": "current"})
    try:
        resp = request("GET", f"/rest/api/content?{q}")
        results = resp.get("results", [])
        return results[0] if results else None
    except urllib.error.HTTPError as e:
        api_error(e)
        return None


def delete_page(page_id):
    print(f"    Kustutan vana lehe (ID: {page_id})...")
    try:
        request("DELETE", f"/rest/api/content/{page_id}")
        return True
    except urllib.error.HTTPError as e:
        api_error(e)
        return False


def create_page(title, description, md_url, docx_url):
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
    try:
        resp = request("POST", "/rest/api/content", data=data, headers={"Content-Type": "application/json"})
        print(f"    Leht loodud, ID: {resp['id']}")
    except urllib.error.HTTPError as e:
        api_error(e)
        sys.exit(1)


def ensure_page(title, description, md_url, docx_url):
    print(f'==> Loon/kustutan lehe "{title}"...')
    existing = find_page(title)
    if existing:
        if not delete_page(existing["id"]):
            print("    Ei saanud vana lehte kustutada. Katkestan.")
            sys.exit(1)
    create_page(title, description, md_url, docx_url)


ensure_page(
    "LJVIS2 kasutajajuhend",
    "LJVIS2 kasutajajuhend kirjeldab süsteemi kasutamist järelevalveametnikele ja ettevõtja esindajatele.",
    f"{GITHUB_BASE}/user-guide.md",
    f"{GITHUB_BASE}/user-guide.docx",
)

ensure_page(
    "LJVIS2 administraatorijuhend",
    "LJVIS2 administraatorijuhend kirjeldab kasutajahaldust, kasutajagruppe, klassifikaatoreid, auditilogi, S3 failihoidlat ja API lõpp-punkte.",
    f"{GITHUB_BASE}/admin-guide.md",
    f"{GITHUB_BASE}/admin-guide.docx",
)

print("")
print(f"Valmis! Vaata tulemust: {BASE}/pages/viewpage.action?pageId={PARENT_ID}")
PY
