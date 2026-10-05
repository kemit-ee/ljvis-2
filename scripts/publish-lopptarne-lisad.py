#!/usr/bin/env python3
"""Avaldab hanke lisadokumendid Confluence'i Lõpptarne lehe alamlehtedena.

Lehtede loend ja vanem-laps seos: scripts/lopptarne_lehed.py. Iga leht luuakse (või uuendatakse)
Lõpptarne lehe (ID 346498787) all; migratsioon ja integratsioonid saavad oma vanemlehe.
Lehtede omavahelised viited muudetakse Confluence'i lingiks, muud repo-viited GitHubi lingiks.
Lõpptarne lehe enda sisu (viited nendele lehtedele) uuendab `publish-lopptarne.py`:
käivita SEE skript ENNE, siis `publish-lopptarne.py`.

Kasutus:
    CONFLUENCE_TOKEN=<token> python3 scripts/publish-lopptarne-lisad.py [--dry-run]

--dry-run ei kutsu Confluence'i: renderdab HTML-i kausta build/confluence-lopptarne/lisad/.
(Ka --dry-run vajab CONFLUENCE_TOKEN väärtust, kuid suvalist.)
Idempotentne.
"""
import importlib.util
import re
import sys
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from lopptarne_lehed import PAGES, BY_PATH  # noqa: E402

spec = importlib.util.spec_from_file_location("lp", HERE / "publish-lopptarne.py")
lp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lp)

DRY = lp.DRY_RUN
OUT = lp.BUILD / "lisad"


def find_page(title):
    q = urllib.parse.quote(title)
    r = lp.api("GET", f"/rest/api/content?spaceKey={lp.SPACE}&title={q}&expand=version")
    res = r.get("results", [])
    return res[0] if res else None


def upsert(title, body, parent_id):
    existing = find_page(title)
    payload = {
        "type": "page", "title": title, "space": {"key": lp.SPACE},
        "ancestors": [{"id": str(parent_id)}],
        "body": {"storage": {"value": body, "representation": "storage"}},
    }
    if existing:
        pid = existing["id"]
        payload["version"] = {"number": existing["version"]["number"] + 1, "minorEdit": True}
        lp.api("PUT", f"/rest/api/content/{pid}", payload)
        return pid, "uuendatud"
    return lp.api("POST", "/rest/api/content", payload)["id"], "loodud"


def relink(html):
    """Repo-viited lisalehtedele -> Confluence'i link; ülejäänud jäävad GitHubi linkideks."""
    base = re.escape(lp.GH_BASE)

    def sub(m):
        rel = m.group("rel")
        if rel in BY_PATH:
            text = re.sub(r"<[^>]+>", "", m.group("text")).strip()
            if text.endswith(".md") or not text:
                text = BY_PATH[rel]
            return lp.confluence_link(BY_PATH[rel], text)
        return m.group(0)

    return re.sub(rf'<a href="{base}/(?P<rel>[^"#]+)(?:#[^"]*)?">(?P<text>.*?)</a>', sub, html, flags=re.DOTALL)


def main():
    lp.BUILD.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    ids = {None: lp.LOPPTARNE_ID}
    print(f"==> {len(PAGES)} lehte Lõpptarne ({lp.LOPPTARNE_ID}) alla{' [DRY-RUN]' if DRY else ''}")
    for path, title, parent in PAGES:
        md = lp.REPO / path
        html, atts = lp.md_to_html(md)
        html = relink(html)
        if DRY:
            (OUT / (re.sub(r"[^\w]+", "-", title) + ".html")).write_text(html, encoding="utf-8")
            print(f"  [dry] {title}  ({len(html)//1024} KB, {len(atts)} manust)")
            continue
        pid, what = upsert(title, html, ids[parent])
        ids[title] = pid
        seen = set()
        for name, f in atts:
            if name not in seen:
                lp.upload_attachment(pid, f, name)
                seen.add(name)
        if atts:  # manuste viited töötavad alles pärast üleslaadimist
            upsert(title, html, ids[parent])
        print(f"  {what}: {title}  -> {lp.BASE}/pages/viewpage.action?pageId={pid}")
    print("Valmis. Nüüd käivita publish-lopptarne.py, et Lõpptarne leht viitaks neile lehtedele.")


if __name__ == "__main__":
    main()
