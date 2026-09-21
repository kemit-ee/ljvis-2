#!/usr/bin/env python3
"""
Loob Confluence'i ühe lehe "LJVIS2 kasutusjuhend ühel lehel", mis sisaldab
kogu kasutusjuhendi sisu loogilises järjekorras (vastavalt SUMMARY.md).

Leht luuakse "LJVIS2 kasutusjuhend" juurlehe alla (ID 333210904).
Iga peatükk algab <h1> pealkirjaga ja on jagatud horisontaalse joonega.
Kõik pildid laaditakse manustena samale lehele.

Kasutus:
    CONFLUENCE_TOKEN=<token> python3 scripts/publish-single-page.py [--dry-run] [--force-images]

Idempotentne: olemasolev leht uuendatakse.
"""
import os
import re
import sys
import json
import time
import hashlib
import subprocess
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

BASE          = os.environ.get("CONFLUENCE_BASE", "https://wiki.kemit.ee")
SPACE         = os.environ.get("CONFLUENCE_SPACE", "LIA")
TOKEN         = os.environ.get("CONFLUENCE_TOKEN", "")
DRY_RUN       = "--dry-run" in sys.argv
FORCE_IMAGES  = "--force-images" in sys.argv

REPO  = Path(__file__).resolve().parent.parent
DOCS  = REPO / "docs"
BUILD = REPO / "build" / "confluence-media-single"

ROOT_ID    = "333210904"   # "LJVIS2 kasutusjuhend"
PAGE_TITLE = "LJVIS2 kasutusjuhend ühel lehel"

# Kasutusjuhendi failid SUMMARY.md järjestuses.
USER_GUIDE_FILES = [
    "user-guide/01-sissejuhatus.md",
    "user-guide/02-sisselogimine.md",
    "user-guide/03-menyy.md",
    "user-guide/04-toolaud.md",
    "user-guide/20-teavitused.md",
    "user-guide/19-vaate-vahetamine.md",
    "user-guide/05-vormide-uldine.md",
    "user-guide/06-vorm-valisrikkumine.md",
    "user-guide/07-vorm-liitvorm.md",
    "user-guide/18-vorm-tram-kontrollkaart.md",
    "user-guide/08-vorm-tooinspektsioon.md",
    "user-guide/09-vorm-tehniline-kontroll.md",
    "user-guide/10-vorm-vedude-katkestamine.md",
    "user-guide/11-vorm-adr.md",
    "user-guide/12-vorm-hea-maine.md",
    "user-guide/13-vorm-soidu-puhkeaeg.md",
    "user-guide/21-erru-rsi.md",
    "user-guide/22-erru-ncr.md",
    "user-guide/23-erru-nu.md",
    "user-guide/14-failide-lisamine.md",
    "user-guide/15-vormide-vaatamine-ajalugu.md",
    "user-guide/16-riskihindamine.md",
    "user-guide/17-auditilogi.md",
]

CHROME = next(
    iter(sorted(Path.home().glob(
        "Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell"
    ))),
    None,
)

if not TOKEN:
    sys.exit("CONFLUENCE_TOKEN puudub. Kasuta: CONFLUENCE_TOKEN=<token> python3 scripts/publish-single-page.py")


# ──────────────────────────────────────────────────── HTTP abifn ──

def api(method, path, data=None, headers=None, raw=False, _tries=4):
    url = path if path.startswith("http") else f"{BASE}{path}"
    h = {"Authorization": f"Bearer {TOKEN}"}
    body = None
    if data is not None and not raw:
        h["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    elif raw:
        body = data
    if headers:
        h.update(headers)
    for attempt in range(_tries):
        req = urllib.request.Request(url, data=body, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                txt = resp.read().decode()
                return json.loads(txt) if txt else {}
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < _tries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"{method} {url} -> {e.code}\n{e.read().decode()[:500]}") from None
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if attempt < _tries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"{method} {url} -> {e}") from None


def find_page(title):
    q = urllib.parse.quote(title)
    r = api("GET", f"/rest/api/content?spaceKey={SPACE}&title={q}&expand=version")
    res = r.get("results", [])
    return res[0] if res else None


def upsert_page(title, body, parent_id):
    existing = find_page(title)
    payload = {
        "type": "page",
        "title": title,
        "space": {"key": SPACE},
        "body": {"storage": {"value": body, "representation": "storage"}},
    }
    if parent_id:
        payload["ancestors"] = [{"id": str(parent_id)}]
    if existing:
        pid = existing["id"]
        payload["version"] = {"number": existing["version"]["number"] + 1, "minorEdit": True}
        if not DRY_RUN:
            api("PUT", f"/rest/api/content/{pid}", payload)
        print(f"  uuendatud: {pid}")
        return pid
    if DRY_RUN:
        return f"DRY-{hashlib.md5(title.encode()).hexdigest()[:8]}"
    pid = api("POST", "/rest/api/content", payload)["id"]
    print(f"  loodud: {pid}")
    return pid


def existing_attachments(page_id):
    if DRY_RUN or str(page_id).startswith("DRY-"):
        return {}
    r = api("GET", f"/rest/api/content/{page_id}/child/attachment?limit=500")
    return {a["title"]: a["id"] for a in r.get("results", [])}


def delete_attachment(att_id):
    if DRY_RUN:
        return
    try:
        api("DELETE", f"/rest/api/content/{att_id}")
    except Exception:
        pass


def upload_attachment(page_id, file_path, name):
    if DRY_RUN or str(page_id).startswith("DRY-"):
        return
    ctype = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
             ".svg": "image/svg+xml"}.get(file_path.suffix.lower(), "application/octet-stream")
    boundary = "----ljvissp" + hashlib.md5(name.encode()).hexdigest()[:12]
    parts = [
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{name}"\r\n'.encode(),
        f"Content-Type: {ctype}\r\n\r\n".encode(),
        file_path.read_bytes(),
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    api("POST", f"/rest/api/content/{page_id}/child/attachment", data=b"".join(parts),
        headers={"X-Atlassian-Token": "no-check",
                 "Content-Type": f"multipart/form-data; boundary={boundary}"}, raw=True)


# ──────────────────────────────────────────── Markdown → storage ──

def sh(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw).stdout


def render_mermaid(code, out_svg):
    out_svg.parent.mkdir(parents=True, exist_ok=True)
    src = out_svg.with_suffix(".mmd")
    src.write_text(code)
    env = dict(os.environ)
    if CHROME:
        env["PUPPETEER_EXECUTABLE_PATH"] = CHROME
    cfg = out_svg.parent / "puppeteer.json"
    cfg.write_text('{"args":["--no-sandbox"]}')
    subprocess.run(
        ["npx", "--yes", "@mermaid-js/mermaid-cli", "-i", str(src), "-o", str(out_svg),
         "-b", "transparent", "-p", str(cfg)],
        check=True, capture_output=True, text=True, env=env,
    )
    src.unlink(missing_ok=True)


def convert(md_path):
    """Teisendab Markdown HTML-iks (Confluence storage). Tagastab (html, attachments)."""
    md_dir = md_path.parent
    html = sh(["pandoc", str(md_path), "-f", "gfm", "-t", "html", "--wrap=none"])
    attachments = []

    def mermaid_sub(m):
        code = (m.group(1).replace("&gt;", ">").replace("&lt;", "<").replace("&amp;", "&")
                .replace("&quot;", '"').replace("&#39;", "'"))
        name = f"sp-diagram-{hashlib.md5(code.encode()).hexdigest()[:10]}.svg"
        svg = BUILD / name
        if not svg.exists():
            try:
                render_mermaid(code, svg)
            except Exception as e:
                print(f"      ! mermaid ebaõnnestus ({e})")
                return ('<ac:structured-macro ac:name="code">'
                        '<ac:parameter ac:name="language">text</ac:parameter>'
                        f"<ac:plain-text-body><![CDATA[{code}]]></ac:plain-text-body>"
                        "</ac:structured-macro>")
        attachments.append((name, svg))
        return f'<ac:image ac:align="center"><ri:attachment ri:filename="{name}" /></ac:image>'

    html = re.sub(r'<pre class="mermaid"><code>(.*?)</code></pre>', mermaid_sub, html, flags=re.DOTALL)

    def code_sub(m):
        lang = (m.group("lang") or "text").strip().split()[0] or "text"
        lang = {"sh": "bash", "shell": "bash", "js": "javascript", "yml": "yaml"}.get(lang, lang)
        code = (m.group("code").replace("&gt;", ">").replace("&lt;", "<")
                .replace("&quot;", '"').replace("&#39;", "'").replace("&amp;", "&"))
        return ('<ac:structured-macro ac:name="code">'
                f'<ac:parameter ac:name="language">{lang}</ac:parameter>'
                f"<ac:plain-text-body><![CDATA[{code}]]></ac:plain-text-body>"
                "</ac:structured-macro>")

    html = re.sub(
        r'<pre(?:\s+class="(?P<lang>[^"]*)")?><code(?:\s+class="[^"]*")?>(?P<code>.*?)</code></pre>',
        code_sub, html, flags=re.DOTALL,
    )

    def img_sub(m):
        src, alt = m.group("src"), (m.group("alt") or "")
        if src.startswith("http"):
            return m.group(0)
        f = (md_dir / src).resolve()
        if not f.exists():
            return ""
        # Unikaalne lamendatud nimi: "sp-" prefiksiga, et mitte segamini ajalehe manustega
        flat = "sp-" + src.replace("images/", "").replace("/", "__")
        attachments.append((flat, f))
        ta = f' ac:title="{alt}" ac:alt="{alt}"' if alt else ""
        return f'<ac:image ac:align="center"{ta}><ri:attachment ri:filename="{flat}" /></ac:image>'

    html = re.sub(r'<img src="(?P<src>[^"]+)"(?:\s+alt="(?P<alt>[^"]*)")?\s*/?>', img_sub, html)
    html = re.sub(r"<p>\s*(<ac:image\b.*?</ac:image>)\s*</p>", r"\1", html, flags=re.DOTALL)

    # Intra-doc lingid: jäta plain tekstina (ühe lehe sees ankerid ei tööta samuti)
    html = re.sub(
        r'<a href="(?P<href>[^"]+)"[^>]*>(?P<text>.*?)</a>',
        lambda m: m.group(0) if m.group("href").startswith(("http://", "https://", "#", "mailto:"))
                  else re.sub(r"<[^>]+>", "", m.group("text")).strip() or m.group("href"),
        html, flags=re.DOTALL,
    )

    return html, attachments


def extract_title(md_path):
    """Loeb esimese # pealkirja Markdownist."""
    for line in md_path.read_text().splitlines():
        m = re.match(r"^#\s+(.+)", line)
        if m:
            return m.group(1).strip()
    return md_path.stem


# ─────────────────────────────────────────────────────────── main ──

def main():
    BUILD.mkdir(parents=True, exist_ok=True)

    print(f"==> Koostan lehte: {PAGE_TITLE}")
    all_html = []
    all_attachments = []
    seen_names = set()

    for i, relpath in enumerate(USER_GUIDE_FILES):
        md_path = DOCS / relpath
        if not md_path.exists():
            print(f"  ! fail puudub, vahelan: {relpath}")
            continue
        title = extract_title(md_path)
        print(f"  [{i+1:02d}/{len(USER_GUIDE_FILES)}] {title}  ({relpath})")
        html, attachments = convert(md_path)

        # Eralda peatüki pealkiri HTML-ist (pandoc lisab selle <h1>-sse)
        html = re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", html, count=1, flags=re.DOTALL)

        # Peatüki päis ja eraldaja
        section_header = f'<h1 id="s{i+1}">{title}</h1>\n'
        separator = "<hr />" if i < len(USER_GUIDE_FILES) - 1 else ""

        all_html.append(section_header + html + separator)

        for name, path in attachments:
            if name not in seen_names:
                all_attachments.append((name, path))
                seen_names.add(name)

    body = "\n".join(all_html)

    # Lisame sisukorra lehe algusesse
    toc = (
        '<ac:structured-macro ac:name="toc">'
        '<ac:parameter ac:name="minLevel">1</ac:parameter>'
        '<ac:parameter ac:name="maxLevel">2</ac:parameter>'
        '<ac:parameter ac:name="printable">false</ac:parameter>'
        '</ac:structured-macro>\n<hr />\n'
    )
    body = toc + body

    print(f"\n==> Publitseerime ({len(all_attachments)} manust)…")
    pid = upsert_page(PAGE_TITLE, body, ROOT_ID)

    if not DRY_RUN:
        have = existing_attachments(pid)
        for name, fpath in all_attachments:
            if name in have:
                if FORCE_IMAGES:
                    print(f"  ~ uuenda {name}")
                    delete_attachment(have[name])
                    del have[name]
                    time.sleep(0.1)
                else:
                    continue
            if not DRY_RUN:
                print(f"  + {name}")
                upload_attachment(pid, fpath, name)
                have[name] = None
                time.sleep(0.15)

        # Uuenda leht uuesti (manuste järel viited töötavad)
        upsert_page(PAGE_TITLE, body, ROOT_ID)

    print(f"\nValmis: {BASE}/pages/viewpage.action?pageId={pid}"
          if not DRY_RUN else "\n[dry-run] valmis")


if __name__ == "__main__":
    main()
