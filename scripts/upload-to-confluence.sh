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
    print("Usage: CONFLUENCE_TOKEN=<your-token> bash scripts/upload-to-confluence.sh")
    sys.exit(1)

BASE = "https://wiki.kemit.ee"
SPACE = "LIA"
USER_PARENT_ID = 258229842   # LJVIS+2+Kasutusjuhend
ADMIN_PARENT_ID = 258229822  # LJVIS+2+-+Juhendid
INDEX_PAGE_ID = 258229822    # linkide leht
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
        body = resp.read().decode("utf-8")
        return json.loads(body) if body.strip() else None


def api_error(e):
    print(f"    Viga: HTTP {e.code}")
    try:
        print(e.read().decode("utf-8"))
    except Exception:
        pass


def delete_page(page_id):
    print(f"    Kustutan lehe ID: {page_id}...")
    try:
        request("DELETE", f"/rest/api/content/{page_id}")
        print("    Kustutatud.")
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print("    Lehte ei leitud (juba kustutatud).")
            return True
        api_error(e)
        return False


def create_page(title, description, md_url, docx_url, parent_id):
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
        "ancestors": [{"id": parent_id}],
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
        return resp["id"]
    except urllib.error.HTTPError as e:
        api_error(e)
        sys.exit(1)


def update_index(user_id, admin_id):
    print(f'==> Uuendan linkide lehte (ID: {INDEX_PAGE_ID})...')
    try:
        current = request("GET", f"/rest/api/content/{INDEX_PAGE_ID}?expand=version,body.storage")
    except urllib.error.HTTPError as e:
        api_error(e)
        sys.exit(1)

    current_version = current["version"]["number"]
    title = current["title"]

    new_body = (
        f'<p>Siin leiad LJVIS2 juhendid.</p>'
        f'<p>LJVIS2 kasutajajuhend Confluence\'is: '
        f'<a href="{BASE}/pages/viewpage.action?pageId={user_id}">LJVIS2 kasutajajuhend</a> ; '
        f'GitHubis: '
        f'<a href="{GITHUB_BASE}/user-guide.md">Markdown</a></p>'
        f'<p>LJVIS2 Administraatorijuhend Confluence\'is: '
        f'<a href="{BASE}/pages/viewpage.action?pageId={admin_id}">LJVIS2 Administraatorijuhend</a> ; '
        f'GitHubis: '
        f'<a href="{GITHUB_BASE}/admin-guide.md">Markdown</a></p>'
    )

    payload = {
        "id": str(INDEX_PAGE_ID),
        "type": "page",
        "title": title,
        "body": {
            "storage": {
                "value": new_body,
                "representation": "storage",
            }
        },
        "version": {"number": current_version + 1},
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    try:
        request("PUT", f"/rest/api/content/{INDEX_PAGE_ID}", data=data, headers={"Content-Type": "application/json"})
        print("    Linkide leht uuendatud.")
    except urllib.error.HTTPError as e:
        api_error(e)
        sys.exit(1)


print('==> Kustutan vana kasutajajuhendi (333202413)...')
if not delete_page(333202413):
    sys.exit(1)

print('==> Kustutan vana administraatorijuhendi (333202414)...')
if not delete_page(333202414):
    sys.exit(1)

print('==> Loon kasutajajuhendi lehe (258229842 alla)...')
user_id = create_page(
    "LJVIS2 kasutajajuhend",
    "LJVIS2 kasutajajuhend kirjeldab süsteemi kasutamist järelevalveametnikele ja ettevõtja esindajatele.",
    f"{GITHUB_BASE}/user-guide.md",
    f"{GITHUB_BASE}/user-guide.docx",
    USER_PARENT_ID,
)

print('==> Loon administraatorijuhendi lehe (258229822 alla)...')
admin_id = create_page(
    "LJVIS2 Administraatorijuhend",
    "LJVIS2 administraatorijuhend kirjeldab kasutajahaldust, kasutajagruppe, klassifikaatoreid, auditilogi, S3 failihoidlat ja API lõpp-punkte.",
    f"{GITHUB_BASE}/admin-guide.md",
    f"{GITHUB_BASE}/admin-guide.docx",
    ADMIN_PARENT_ID,
)

update_index(user_id, admin_id)

print("")
print("Valmis!")
print(f"  Kasutajajuhend: {BASE}/pages/viewpage.action?pageId={user_id}")
print(f"  Administraatorijuhend: {BASE}/pages/viewpage.action?pageId={admin_id}")
print(f"  Linkide leht: {BASE}/pages/viewpage.action?pageId={INDEX_PAGE_ID}")
PY
