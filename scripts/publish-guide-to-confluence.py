#!/usr/bin/env python3
"""
Publitseerib LJVIS2 kasutus- ja administraatorijuhendi Confluence'i (wiki.kemit.ee)
navigeeritava lehepuuna, mis järgib docs/SUMMARY.md loogilist järjekorda.

- Iga peatükk saab oma lehe; pealkirjad on nummerdatud ("LJVIS2 03 · Sisselogimine"),
  nii et Confluence'i tähestikuline alamlehtede järjestus vastab lugemisjärjekorrale.
- Iga lehe all on lingid eelmisele ja järgmisele peatükile (nimega).
- Sisu teisendatakse Markdownist storage-formaati (pandoc); pildid ja mermaid-diagrammid
  laaditakse manustena.
- Siselingid teisendatakse Confluence'i lehelinkideks.

Kasutus:
    CONFLUENCE_TOKEN=<token> python3 scripts/publish-guide-to-confluence.py [--dry-run]

Idempotentne: olemasolevad lehed uuendatakse (versioon +1). Vanad meie prefiksiga
lehed, mida uues struktuuris pole, tõstetakse prügikasti.
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

BASE = os.environ.get("CONFLUENCE_BASE", "https://wiki.kemit.ee")
SPACE = os.environ.get("CONFLUENCE_SPACE", "LIA")
TOKEN = os.environ.get("CONFLUENCE_TOKEN", "")
DRY_RUN = "--dry-run" in sys.argv

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / "docs"
BUILD = REPO / "build" / "confluence-media"
TITLE_PREFIX = "LJVIS2"          # nummerdatud lehtede eesliide
ROOT_TITLE = "LJVIS2 kasutusjuhend"

# SUMMARY.md sektsioonid, mida avaldame (Töödokumendid jäetakse välja).
SECTIONS = ["Kasutusjuhend", "Administraatori juhend", "Andmehaldus"]

CHROME = next(
    iter(sorted(Path.home().glob(
        "Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell"
    ))),
    None,
)

if not TOKEN:
    sys.exit("CONFLUENCE_TOKEN puudub. Kasuta: CONFLUENCE_TOKEN=<token> python3 scripts/publish-guide-to-confluence.py")


# ─────────────────────────────────────────────────────────────── HTTP abifn ──
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
        return pid
    if DRY_RUN:
        return f"DRY-{hashlib.md5(title.encode()).hexdigest()[:8]}"
    return api("POST", "/rest/api/content", payload)["id"]


def descendants(page_id):
    out = []
    try:
        r = api("GET", f"/rest/api/content/{page_id}/descendant/page?limit=300")
        out = r.get("results", [])
        if out:
            return out
    except RuntimeError:
        pass
    stack = [page_id]
    while stack:
        pid = stack.pop()
        r = api("GET", f"/rest/api/content/{pid}/child/page?limit=200")
        for c in r.get("results", []):
            out.append(c)
            stack.append(c["id"])
    return out


def existing_attachments(page_id):
    if DRY_RUN or str(page_id).startswith("DRY-"):
        return set()
    r = api("GET", f"/rest/api/content/{page_id}/child/attachment?limit=200")
    return {a["title"] for a in r.get("results", [])}


def upload_attachment(page_id, file_path, name):
    if DRY_RUN or str(page_id).startswith("DRY-"):
        return
    ctype = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
             ".svg": "image/svg+xml"}.get(file_path.suffix.lower(), "application/octet-stream")
    boundary = "----ljvisguide" + hashlib.md5(name.encode()).hexdigest()[:12]
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


# ──────────────────────────────────────────────────────────── SUMMARY parse ──
def parse_summary():
    """Nested puu: [{title, path|None, children:[...]}] SUMMARY.md järjekorras."""
    text = (DOCS / "SUMMARY.md").read_text()
    link_re = re.compile(r"^(?P<indent>\s*)- \[(?P<title>[^\]]+)\]\((?P<path>[^)]+)\)")
    tree = []
    cur_section = None
    stack = []  # (indent, node)
    for line in text.splitlines():
        h = re.match(r"^# (.+)$", line)
        if h:
            name = h.group(1).strip()
            cur_section = None
            stack = []
            if name in SECTIONS:
                cur_section = {"title": name, "path": None, "children": []}
                tree.append(cur_section)
            elif name == "LJVIS2 dokumentatsioon":
                cur_section = {"__root__": True, "children": tree}
            continue
        m = link_re.match(line)
        if not m or cur_section is None:
            continue
        indent = len(m.group("indent").replace("\t", "  "))
        node = {"title": m.group("title").strip(), "path": m.group("path").strip(), "children": []}
        while stack and stack[-1][0] >= indent:
            stack.pop()
        parent_children = stack[-1][1]["children"] if stack else (
            tree if cur_section.get("__root__") else cur_section["children"]
        )
        parent_children.append(node)
        stack.append((indent, node))
    return tree


def flatten(tree):
    """DFS pre-order -> [{num,title,name,path,parent_num,child_nums}] + relpath->title."""
    pages = []

    def walk(node, parent_num):
        num = len(pages) + 1
        name = node["title"]
        title = f"{TITLE_PREFIX} {num:02d} · {name}"
        rec = {"num": num, "title": title, "name": name, "path": node.get("path"),
               "parent_num": parent_num, "child_nums": []}
        pages.append(rec)
        if parent_num:
            pages[parent_num - 1]["child_nums"].append(num)
        for ch in node["children"]:
            walk(ch, num)

    for node in tree:
        walk(node, None)

    title_by_relpath = {p["path"]: p["title"] for p in pages if p["path"]}
    return pages, title_by_relpath


# ───────────────────────────────────────────────── Markdown → storage format ──
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


def convert(md_path, title_by_relpath):
    md_dir = md_path.parent
    html = sh(["pandoc", str(md_path), "-f", "gfm", "-t", "html", "--wrap=none"])
    attachments = []

    def mermaid_sub(m):
        code = (m.group(1).replace("&gt;", ">").replace("&lt;", "<").replace("&amp;", "&")
                .replace("&quot;", '"').replace("&#39;", "'"))
        name = f"diagram-{hashlib.md5(code.encode()).hexdigest()[:10]}.svg"
        svg = BUILD / name
        if not svg.exists():
            try:
                render_mermaid(code, svg)
            except Exception as e:  # noqa: BLE001
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
        flat = src.replace("images/", "").replace("/", "__")
        attachments.append((flat, f))
        ta = f' ac:title="{alt}" ac:alt="{alt}"' if alt else ""
        return f'<ac:image ac:align="center"{ta}><ri:attachment ri:filename="{flat}" /></ac:image>'

    html = re.sub(r'<img src="(?P<src>[^"]+)"(?:\s+alt="(?P<alt>[^"]*)")?\s*/?>', img_sub, html)
    html = re.sub(r"<p>\s*(<ac:image\b.*?</ac:image>)\s*</p>", r"\1", html, flags=re.DOTALL)

    def link_sub(m):
        href = m.group("href")
        text = re.sub(r"<[^>]+>", "", m.group("text")).strip() or href
        if href.startswith(("http://", "https://", "#", "mailto:")):
            return m.group(0)
        cand = (md_dir / href.split("#")[0]).resolve()
        try:
            rel = str(cand.relative_to(DOCS))
        except ValueError:
            rel = href.split("#")[0].lstrip("./")
        target = title_by_relpath.get(rel)
        if not target:
            base = rel.split("/")[-1]
            target = next((v for k, v in title_by_relpath.items()
                           if k.endswith("/" + base) or k == base), None)
        if not target:
            return text
        return (f'<ac:link><ri:page ri:content-title="{target}" />'
                f"<ac:plain-text-link-body><![CDATA[{text}]]></ac:plain-text-link-body></ac:link>")

    html = re.sub(r'<a href="(?P<href>[^"]+)"[^>]*>(?P<text>.*?)</a>', link_sub, html, flags=re.DOTALL)
    html = re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", html, count=1, flags=re.DOTALL)
    return html, attachments


def page_link(title, text):
    return (f'<ac:link><ri:page ri:content-title="{title}" />'
            f"<ac:plain-text-link-body><![CDATA[{text}]]></ac:plain-text-link-body></ac:link>")


def nav_footer(prev_rec, next_rec):
    left = f"⬅ <strong>Eelmine:</strong> {page_link(prev_rec['title'], prev_rec['name'])}" if prev_rec else ""
    right = f"<strong>Järgmine:</strong> {page_link(next_rec['title'], next_rec['name'])} ➡" if next_rec else ""
    return (
        "<hr />"
        '<table><colgroup><col /><col /></colgroup><tbody><tr>'
        f"<td>{left}</td><td style=\"text-align: right;\">{right}</td>"
        "</tr></tbody></table>"
    )


# ─────────────────────────────────────────────────────────────────── main ──
def main():
    tree = parse_summary()
    pages, title_by_relpath = flatten(tree)
    by_num = {p["num"]: p for p in pages}
    ordered = sorted(pages, key=lambda p: p["num"])

    print(f"==> Juurleht: {ROOT_TITLE}")
    root_body = (
        "<p>LJVIS2 (Liiklusjärelevalve infosüsteem 2) kasutus- ja administraatorijuhend. "
        'Allikas: <a href="https://github.com/kemit-ee/ljvis-2">kemit-ee/ljvis-2</a> '
        "(<code>docs/</code>). Lehed on genereeritud automaatselt "
        "(<code>scripts/publish-guide-to-confluence.py</code>) ja nummerdatud lugemis"
        "järjekorras.</p>"
        '<p><ac:structured-macro ac:name="children"><ac:parameter ac:name="all">true</ac:parameter>'
        '<ac:parameter ac:name="sort">title</ac:parameter></ac:structured-macro></p>'
    )
    root_id = upsert_page(ROOT_TITLE, root_body, None)

    id_by_num = {}
    new_titles = {ROOT_TITLE}
    for i, p in enumerate(ordered):
        new_titles.add(p["title"])
        parent_id = id_by_num.get(p["parent_num"], root_id)
        prev_rec = ordered[i - 1] if i > 0 else None
        next_rec = ordered[i + 1] if i < len(ordered) - 1 else None

        if p["path"] is None:  # sektsioon / grupp
            body = (
                f"<p>Selle jaotise peatükid:</p>"
                '<p><ac:structured-macro ac:name="children">'
                '<ac:parameter ac:name="sort">title</ac:parameter></ac:structured-macro></p>'
            )
            attachments = []
        else:
            body, attachments = convert(DOCS / p["path"], title_by_relpath)

        body += nav_footer(prev_rec, next_rec)
        print(f"==> {p['title']}" + (f"  ({p['path']})" if p["path"] else "  [jaotis]"))
        pid = upsert_page(p["title"], body or "<p></p>", parent_id)
        id_by_num[p["num"]] = pid

        have = existing_attachments(pid)
        for name, f in attachments:
            if name in have:
                continue
            print(f"    + manus {name}")
            upload_attachment(pid, f, name)
            have.add(name)
            time.sleep(0.2)
        if attachments and not DRY_RUN:
            upsert_page(p["title"], body, parent_id)

    # Vanade lehtede koristus: meie juure alla jäänud varasemad lehed,
    # mida uues nummerdatud struktuuris pole.
    if not DRY_RUN:
        for d in descendants(root_id):
            t = d["title"]
            stale = t.startswith("LJVIS2 · ") or re.match(r"^LJVIS2 \d\d · ", t)
            if stale and t not in new_titles:
                print(f"    – prügikasti: {t}")
                try:
                    api("DELETE", f"/rest/api/content/{d['id']}")
                except RuntimeError as e:
                    print(f"      ! ei õnnestunud kustutada: {e}")

    print(f"\nValmis. {BASE}/pages/viewpage.action?pageId={root_id}"
          if not DRY_RUN else "\n[dry-run] valmis")


if __name__ == "__main__":
    main()
