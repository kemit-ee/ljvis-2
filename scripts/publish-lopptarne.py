#!/usr/bin/env python3
"""
Loob/uuendab Confluence'i Lõpptarne lehe (ID 346498787).

Leht sisaldab projekti üleandmiseks vajaliku dokumentatsiooni kokkuvõtte,
lingid GitHubi dokumentidele ja teadaolevad probleemid.

Kasutus:
    CONFLUENCE_TOKEN=<token> python3 scripts/publish-lopptarne.py [--dry-run]
"""
import html
import os
import re
import sys
import json
import time
import hashlib
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

BASE   = os.environ.get("CONFLUENCE_BASE", "https://wiki.kemit.ee")
SPACE  = os.environ.get("CONFLUENCE_SPACE", "LIA")
TOKEN  = os.environ.get("CONFLUENCE_TOKEN", "")
DRY_RUN = "--dry-run" in sys.argv

LOPPTARNE_ID = "346498787"
# X-tee juhendite Confluence'i lehed (LIA ruum): 346489411, 346494941, 346503597
XTEE_JUHEND = "LJVIS2 X-tee pakutavad teenused (REST)"
XTEE_LIIDESTUMINE = "LJVIS2 · X-tee liidestumine"
AJ_JUHEND = "LJVIS2 · Andmejälgija (AJ) seadistamine"
GH_BASE = "https://github.com/kemit-ee/ljvis-2/blob/dev"

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / "docs"
BUILD = REPO / "build" / "confluence-lopptarne"

if not TOKEN:
    sys.exit("CONFLUENCE_TOKEN puudub.")


# ──────────────────────────────────────────────── HTTP abifn ──

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


def get_page_version(page_id):
    r = api("GET", f"/rest/api/content/{page_id}?expand=version")
    return r.get("version", {}).get("number", 1)


def update_page(page_id, title, body, version):
    payload = {
        "type": "page",
        "title": title,
        "version": {"number": version + 1, "minorEdit": True},
        "body": {"storage": {"value": body, "representation": "storage"}},
    }
    if not DRY_RUN:
        api("PUT", f"/rest/api/content/{page_id}", payload)
    print(f"  {'[DRY-RUN] ' if DRY_RUN else ''}uuendatud: {page_id}")


def upload_attachment(page_id, file_path, name):
    if DRY_RUN:
        print(f"  [DRY-RUN] manus: {name}")
        return
    existing = api("GET", f"/rest/api/content/{page_id}/child/attachment?limit=200")
    have = {a["title"]: a["id"] for a in existing.get("results", [])}
    if name in have:
        api("DELETE", f"/rest/api/content/{have[name]}")
        time.sleep(0.1)
    ctype = {".png": "image/png", ".svg": "image/svg+xml"}.get(file_path.suffix.lower(), "application/octet-stream")
    boundary = "----ljvislp" + hashlib.md5(name.encode()).hexdigest()[:12]
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
    print(f"  + {name}")


CHROME = next(
    iter(sorted(Path.home().glob(
        "Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell"
    ))),
    None,
)


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


def md_to_html(md_path):
    """Teisendab Markdown-faili Confluence storage HTML-iks. Tagastab (html, [(name, path)])."""
    md_dir = md_path.parent
    html = subprocess.run(
        ["pandoc", str(md_path), "-f", "gfm", "-t", "html", "--wrap=none"],
        check=True, capture_output=True, text=True,
    ).stdout
    attachments = []

    def mermaid_sub(m):
        code = (m.group(1).replace("&gt;", ">").replace("&lt;", "<").replace("&amp;", "&")
                .replace("&quot;", '"').replace("&#39;", "'"))
        name = f"lp-diagram-{hashlib.md5(code.encode()).hexdigest()[:10]}.svg"
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
        flat = "lp-" + src.replace("images/", "").replace("/", "__")
        attachments.append((flat, f))
        ta = f' ac:title="{alt}" ac:alt="{alt}"' if alt else ""
        return f'<ac:image ac:align="center"{ta}><ri:attachment ri:filename="{flat}" /></ac:image>'

    html = re.sub(r'<img src="(?P<src>[^"]+)"(?:\s+alt="(?P<alt>[^"]*)")?\s*/?>', img_sub, html)
    html = re.sub(r"<p>\s*(<ac:image\b.*?</ac:image>)\s*</p>", r"\1", html, flags=re.DOTALL)

    # Välised lingid jäävad; repo-sisesed suhtelised lingid → GitHubi fail
    # (sama haru kui gh_link), et Lõpptarne lehelt saaks iga viidatud
    # dokumendi avada. Repost väljapoole viitavad lingid → lihttekst.
    def link_sub(m):
        href, text = m.group("href"), m.group("text")
        if href.startswith(("http://", "https://", "#", "mailto:")):
            return m.group(0)
        path, _, anchor = href.partition("#")
        target = (md_dir / path).resolve()
        try:
            rel = target.relative_to(REPO).as_posix()
        except ValueError:
            return re.sub(r"<[^>]+>", "", text).strip() or href
        url = f"{GH_BASE}/{rel}" + (f"#{anchor}" if anchor else "")
        return f'<a href="{url}">{text}</a>'

    html = re.sub(r'<a href="(?P<href>[^"]+)"[^>]*>(?P<text>.*?)</a>', link_sub, html, flags=re.DOTALL)
    # Eemalda esimene <h1>
    html = re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", html, count=1, flags=re.DOTALL)
    return html, attachments


def gh_link(relpath, text=None):
    url = f"{GH_BASE}/{relpath}"
    label = text or relpath.split("/")[-1]
    return f'<a href="{url}">{label}</a>'


def confluence_link(page_title, text):
    # Confluence Server ei toeta ri:content-id viidet (salvestub tühja <ri:page />-na),
    # seega viidatakse lehe pealkirja ja ruumi järgi.
    return (f'<ac:link><ri:page ri:space-key="{SPACE}" ri:content-title="{html.escape(page_title)}" />'
            f'<ac:plain-text-link-body><![CDATA[{text}]]></ac:plain-text-link-body></ac:link>')


def info_box(body_html):
    return (
        '<ac:structured-macro ac:name="info">'
        '<ac:rich-text-body>'
        + body_html +
        '</ac:rich-text-body>'
        '</ac:structured-macro>'
    )


def warning_box(body_html):
    return (
        '<ac:structured-macro ac:name="warning">'
        '<ac:rich-text-body>'
        + body_html +
        '</ac:rich-text-body>'
        '</ac:structured-macro>'
    )


# ─────────────────────────────────────────────────────── main ──

def build_page():
    """Koostab lehe sisu ja tagastab (html, [(name, path)])."""
    all_atts = []
    sections = []

    # ── Sissejuhatus ──────────────────────────────────────────────────────────
    sections.append(f"""
<h1>Üleandmise kokkuvõte</h1>
<p>
  See leht koondab kõik projekti lõppetapis üleandmiseks vajaliku informatsiooni:
  dokumentatsiooni asukohad, teadaolevad piirangud ja järgmised sammud.
  Kõik viited avalduvad kas Confluence'i lehepuus (siin samas) või
  {gh_link("", "GitHub repositooriumis")} (<code>kemit-ee/ljvis-2</code>).
</p>
""")

    # ── Dokumentatsioon ───────────────────────────────────────────────────────
    conf_ug   = confluence_link("LJVIS2 kasutusjuhend", "LJVIS2 kasutusjuhend (lehepuu)")
    conf_ugsp = confluence_link("LJVIS2 kasutusjuhend ühel lehel", "LJVIS2 kasutusjuhend ühel lehel")
    conf_pm   = confluence_link("LJVIS2 õiguste maatriks", "LJVIS2 õiguste maatriks")  # permissions page if it exists
    sections.append(f"""
<h1>Dokumentatsioon</h1>
<table>
  <colgroup><col /><col /><col /></colgroup>
  <thead>
    <tr><th>Dokument</th><th>Asukoht</th><th>Kirjeldus</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Kasutusjuhend (lehepuu)</strong></td>
      <td>{conf_ug}</td>
      <td>Kasutajajuhend navigeeritava Confluence lehepuuna — iga peatükk eraldi lehel.</td>
    </tr>
    <tr>
      <td><strong>Kasutusjuhend ühel lehel</strong></td>
      <td>{conf_ugsp}</td>
      <td>Kogu kasutusjuhend ühel lehel koos sisukorraga — sobib printimiseks ja kiirotsinguks.</td>
    </tr>
    <tr>
      <td><strong>Administraatori paigaldus- ja seadistusjuhend</strong></td>
      <td>{gh_link("docs/workingdocs/admin-deployment-guide.md")}</td>
      <td>Andmebaasid, Kubernetes Secrets, GitLab CI/CD, X-tee seadistus, käivitusjärjekord.</td>
    </tr>
    <tr>
      <td><strong>Õiguste maatriks</strong></td>
      <td>{gh_link("docs/workingdocs/permissions-matrix.md")}</td>
      <td>Kõik resource.action koodid, kasutajagrupid ja API endpointide ligipääsureeglid.</td>
    </tr>
    <tr>
      <td><strong>OpenAPI spetsifikatsioon</strong></td>
      <td>{gh_link("docs/openapi.yaml")}</td>
      <td>LJVIS2 REST API täielik leping (78 endpointi). Sisaldab x-permissions välja iga operatsiooni kohta.</td>
    </tr>
    <tr>
      <td><strong>X-tee pakutavad teenused</strong></td>
      <td>{confluence_link(XTEE_JUHEND, "LJVIS2 X-tee pakutavad teenused (REST)")}<br />{confluence_link(XTEE_LIIDESTUMINE, "LJVIS2 · X-tee liidestumine")}<br />{gh_link("docs/xtee/00-xtee-teenused-publikatsiooni-juhend.md")}</td>
      <td>Kuus LJVIS2 X-tee teenust (IsikuKontroll, ErakorralineYV, RegisterJobInspection) ja Andmejälgija teenus findUsage, turvaserveri seadistus, masinloetavad lepingud {gh_link("docs/xtee/XroadOpenapi.yaml", "XroadOpenapi.yaml")} ja {gh_link("docs/xtee/FindUsageOpenapi.yaml", "FindUsageOpenapi.yaml")}. Arendaja juhendid, mock ja testikogumikud: X-tee liidestumise lehed ja {gh_link("docs/developer/README.md", "docs/developer")}.</td>
    </tr>
    <tr>
      <td><strong>Andmejälgija seadistamine</strong></td>
      <td>{confluence_link(AJ_JUHEND, "LJVIS2 · Andmejälgija (AJ) seadistamine")}<br />{gh_link("docs/andmejalgija-seadistamine.md")}</td>
      <td>Andmejälgija kasutusteabe teenus (RIA protokoll v1.6.1): üks X-tee teenus findUsage otspunktidega /v2/findUsage, /v2/usagePeriod, /v2/heartbeat; turvaserveri seadistus.</td>
    </tr>
    <tr>
      <td><strong>Infra ligipääsuvaade</strong></td>
      <td>{gh_link("docs/workingdocs/infrastructure-access-view.md")}</td>
      <td>Avalik vs sisemine ligipääs, Load Balancer → Frontend → Ruuter voog, infra kontrollnimekiri.</td>
    </tr>
    <tr>
      <td><strong>Arhitektuuriotsused (ADR-d)</strong></td>
      <td>{gh_link("docs/workingdocs/architecture-decisions.md")}</td>
      <td>10+ arhitektuuriotsust põhjendustega: andmemudel, X-tee, PDF, auditi sool, arhiivibaas jt.</td>
    </tr>
    <tr>
      <td><strong>Testiplaan</strong></td>
      <td>{gh_link("docs/testimine/testiplaan.md")}</td>
      <td>Testimise eesmärgid, ulatus, testitasemed ja tööriistad, keskkonnad, testkasutajad, sisenemis- ja väljumiskriteeriumid, defektihaldus.</td>
    </tr>
    <tr>
      <td><strong>Testilood</strong></td>
      <td>{gh_link("docs/testimine/testilood.md")}<br />{gh_link("docs/testimine/testilood-ui.md")}</td>
      <td>Testilugude ülesehitus ja moodulite koond; kõik UI-testilood (Playwright) sammude ja viimase tulemusega.</td>
    </tr>
    <tr>
      <td><strong>Testiraport</strong></td>
      <td>Allpool (§ Testimine)<br />{gh_link("docs/testimine/testiraport.md")}</td>
      <td>Eesmärgid, tegevused, tulemused, testitud nõuete nimekiri, leitud ja parandatud vead, avatud kohad.</td>
    </tr>
    <tr>
      <td><strong>API-testide nimekiri ja tulemused</strong></td>
      <td>{gh_link("docs/testimine/apitestid.md")}</td>
      <td>Kõik API-testid (Newman, Ruuteri DSL-stsenaariumid, X-tee arendaja-mock, lepingutestid) iga kontrolli tulemusega.</td>
    </tr>
    <tr>
      <td><strong>X-tee testprotokoll</strong></td>
      <td>Allpool (§ X-tee pakutavad teenused)<br />{gh_link("docs/xtee/08-testprotokoll.md")}</td>
      <td>Pakutavate (9 otspunkti) ja kasutatavate X-tee teenuste testid ja tulemused, arendaja-mocki kontrollid.</td>
    </tr>
    <tr>
      <td><strong>Teadaolevad probleemid</strong></td>
      <td>Allpool (§ Teadaolevad probleemid)</td>
      <td>KI-001: PostgreSQL JDBC ceiling; KI-002: Liquibase 5.0.x ühilduvusemure.</td>
    </tr>
  </tbody>
</table>
""")

    # ── Süsteemi ülevaade ─────────────────────────────────────────────────────
    sections.append(f"""
<h1>Süsteemi ülevaade</h1>
<p>
  <strong>LJVIS 2</strong> (Liiklusjärelevalve infosüsteem 2) on Transpordiamet, Tööinspektsioon
  ja teiste järelevalveasutuste maanteetranspordi kontrolli vormide digiteerimise ja ERRU
  (European Registers of Road Transport Undertakings) andmevahetuse süsteem.
</p>
<h2>Tehniline stack</h2>
<table>
  <colgroup><col /><col /></colgroup>
  <tbody>
    <tr><td><strong>Andmebaas</strong></td><td>PostgreSQL 17 (kaks eraldi instantsi: ljvis_db + tim)</td></tr>
    <tr><td><strong>Migratsioonid</strong></td><td>Liquibase 4.29.2 (<code>DSL/Liquibase/</code>)</td></tr>
    <tr><td><strong>SQL päringud</strong></td><td>Resql (<code>DSL/Resql/</code>)</td></tr>
    <tr><td><strong>Andmekaardistus</strong></td><td>DMapper / Handlebars (<code>DSL/DMapper/</code>)</td></tr>
    <tr><td><strong>API / workflow</strong></td><td>Ruuter YAML + Ruuter.internal (<code>DSL/Ruuter/</code>)</td></tr>
    <tr><td><strong>Frontend</strong></td><td>React 18 + TypeScript + Vite (<code>frontend/</code>)</td></tr>
    <tr><td><strong>Autentimine</strong></td><td>TIM + TARA (ID-kaart, Mobiil-ID, Smart-ID)</td></tr>
    <tr><td><strong>X-tee</strong></td><td>REST/JSON (9 pakutavat teenust)</td></tr>
    <tr><td><strong>CI/CD</strong></td><td>GitLab CI → Kubernetes (Helm)</td></tr>
  </tbody>
</table>
<h2>Põhifunktsionaalsus</h2>
<ul>
  <li><strong>Kontrollivormid:</strong> Välisriigi rikkumine (VR), Koondvorm (SP/TH), Transpordiameti kontrollkaart (TRAM), Tööinspektsiooni kontrollakt, Tehniline kontroll, Autoveo katkestamine, ADR, Hea maine, Sõidu- ja puhkeaeg</li>
  <li><strong>ERRU andmevahetus:</strong> CTUD (tegevusloa kontroll), CGR (hea maine), RSI (teeäärne kontroll), NCR (kontrollitulemus), NU (vedaja teavitamine)</li>
  <li><strong>Riskihindamine:</strong> automaatne riskiskooride arvutamine (EU 2022/695), administraatori ja kodaniku vaated</li>
  <li><strong>Andmejälgija:</strong> kasutusteabe teenus findUsage eesti.ee-le isikuandmete töötluse jälgimiseks (RIA kasutusteabe esitamise protokoll v1.6.1)</li>
  <li><strong>X-tee:</strong> IsikuKontroll, ErakorralineYV, RegisterJobInspection; Andmejälgija teenus findUsage</li>
  <li><strong>Automaatne öine protsessing:</strong> e-toimikust jõustunud otsuste lugemine (TI, SP, TRAM); liiklusregistrist tehnoülevaatuse kontrollimine; NCR autodispatch</li>
</ul>
""")

    # ── Repositoorium ja keskkond ─────────────────────────────────────────────
    sections.append(f"""
<h1>Repositoorium ja keskkond</h1>
<table>
  <colgroup><col /><col /></colgroup>
  <tbody>
    <tr>
      <td><strong>GitHub (arendus)</strong></td>
      <td><a href="https://github.com/kemit-ee/ljvis-2">github.com/kemit-ee/ljvis-2</a> — kõik arendused läbivad PR-i <code>dev</code> harusse</td>
    </tr>
    <tr>
      <td><strong>GitLab (deploy)</strong></td>
      <td><a href="https://gitlab.kemitaws.ee/services/ljvis2/ljvis2">gitlab.kemitaws.ee/services/ljvis2/ljvis2</a> — CI/CD pipeline ja Kubernetes deploy</td>
    </tr>
    <tr>
      <td><strong>Dev/test URL</strong></td>
      <td><a href="https://dev.liiklusvalve.ee/">https://dev.liiklusvalve.ee/</a></td>
    </tr>
    <tr>
      <td><strong>Container registry</strong></td>
      <td>GitLab Container Registry (ghcr.io baasimaged: Buerostack)</td>
    </tr>
    <tr>
      <td><strong>Secrets haldus</strong></td>
      <td>Kubernetes Secrets (GitLab CI kaudu) — vt {gh_link("docs/workingdocs/admin-deployment-guide.md", "admin-deployment-guide.md §2")}</td>
    </tr>
  </tbody>
</table>
""")

    # ── X-tee teenused ────────────────────────────────────────────────────────
    sections.append(f"""
<h1>X-tee pakutavad teenused</h1>
<p>LJVIS2 pakub REST/JSON protokolliga kuut X-tee teenust ja Andmejälgija teenust <code>findUsage</code> (kolm otspunkti). Juhendid Confluence'is: {confluence_link(XTEE_JUHEND, "LJVIS2 X-tee pakutavad teenused (REST)")}, {confluence_link(XTEE_LIIDESTUMINE, "LJVIS2 · X-tee liidestumine")} (arendajale: liidestumine, mock, OpenAPI ja testikogumikud) ja {confluence_link(AJ_JUHEND, "LJVIS2 · Andmejälgija (AJ) seadistamine")}. Täielik dokumentatsioon GitHubis: {gh_link("docs/xtee/00-xtee-teenused-publikatsiooni-juhend.md", "xtee-teenused-publikatsiooni-juhend.md")}.</p>
<table>
  <colgroup><col /><col /><col /></colgroup>
  <thead><tr><th>#</th><th>Teenuse kood</th><th>Kirjeldus</th></tr></thead>
  <tbody>
    <tr><td>1</td><td><code>IsikuKontroll</code></td><td>Isiku aktiivsete kontrollimiste päring ({gh_link("docs/xtee/01-isiku-kontroll.md", "spec")})</td></tr>
    <tr><td>2</td><td><code>IsikuEttevoteKontrollid</code></td><td>Isiku ja ettevõtte kontrollimiste päring ({gh_link("docs/xtee/02-isiku-ettevote-kontrollid.md", "spec")})</td></tr>
    <tr><td>3</td><td><code>ErakorralineYVquery</code></td><td>Erakorralise tehnoülevaatuse päring ({gh_link("docs/xtee/03-erakorraline-yv-query.md", "spec")})</td></tr>
    <tr><td>4</td><td><code>ErakorralineYVconfirm</code></td><td>Erakorralise tehnoülevaatuse kinnitus ({gh_link("docs/xtee/04-erakorraline-yv-confirm.md", "spec")})</td></tr>
    <tr><td>5</td><td><code>RegisterJobInspection</code></td><td>Tööinspektsiooni kontrolli registreerimine v1 ({gh_link("docs/xtee/05-register-job-inspection.md", "spec")})</td></tr>
    <tr><td>6</td><td><code>RegisterJobInspection_v3</code></td><td>Tööinspektsiooni kontrolli registreerimine v3 ({gh_link("docs/xtee/07-register-job-inspection-v3.md", "spec")})</td></tr>
    <tr><td>7</td><td><code>findUsage</code></td><td>Andmejälgija kasutusteabe teenus eesti.ee-le, otspunktid <code>/v2/findUsage</code>, <code>/v2/usagePeriod</code>, <code>/v2/heartbeat</code> ({confluence_link(AJ_JUHEND, "juhend")})</td></tr>
  </tbody>
</table>
{info_box("<p>Masinloetavad OpenAPI lepingud: " + gh_link("docs/xtee/XroadOpenapi.yaml") + " (kuus LJVIS2 teenust, <code>/ljvis/xroad/provide/openapi</code>) ja " + gh_link("docs/xtee/FindUsageOpenapi.yaml") + " (Andmejälgija teenus findUsage, <code>/ljvis/xroad/v2/openapi</code>).</p><p>Turvaserver saab neid URL-e kasutada lepingu automaatseks uuendamiseks (vt juhend §4.8).</p>")}
<h2>Arendaja-mock</h2>
<p>Liidestujatele on sünteetiliste andmetega mock aadressil <code>https://dev.liiklusvalve.ee/developer</code> (tervisekontroll <code>/developer/health/ready</code>); ligipääs ainult whitelistitud IP-aadressidelt (taotlus KeMIT-i teenuseomanikule). Juhendid: {confluence_link(XTEE_LIIDESTUMINE, "LJVIS2 · X-tee liidestumine")} ja {gh_link("docs/developer/README.md", "docs/developer")} (liidestumine ja turve, teenused ja näited, mock, lokaalne mock, vead, OpenAPI ja Postmani kogumik).</p>
""")

    # ── X-tee testprotokoll ───────────────────────────────────────────────────
    xt_path = DOCS / "xtee" / "08-testprotokoll.md"
    xt_html, xt_atts = md_to_html(xt_path)
    all_atts.extend(xt_atts)
    sections.append(f"""
<h2>X-tee testprotokoll</h2>
{xt_html}
""")

    # ── Testimine ─────────────────────────────────────────────────────────────
    tr_path = DOCS / "testimine" / "testiraport.md"
    tr_html, tr_atts = md_to_html(tr_path)
    all_atts.extend(tr_atts)
    sections.append(f"""
<h1>Testimine</h1>
{info_box("<p>Testidokumentatsioon: " + gh_link("docs/testimine/testiplaan.md", "testiplaan") + ", "
          + gh_link("docs/testimine/testilood.md", "testilood") + " ("
          + gh_link("docs/testimine/testilood-ui.md", "UI-testilood") + "), "
          + gh_link("docs/testimine/apitestid.md", "API-testide nimekiri ja tulemused") + ", "
          + gh_link("docs/xtee/08-testprotokoll.md", "X-tee testprotokoll") + ". "
          + "Newmani kollektsioonide detailtulemused: " + confluence_link("E2E testitulemused", "E2E testitulemused")
          + ". Allpool on testiraport.</p>")}
<h2>Testiraport</h2>
{tr_html}
""")

    # ── Teadaolevad probleemid ────────────────────────────────────────────────
    ki_path = DOCS / "workingdocs" / "known-issues.md"
    ki_html, ki_atts = md_to_html(ki_path)
    all_atts.extend(ki_atts)
    sections.append(f"""
<h1>Teadaolevad probleemid</h1>
{ki_html}
""")

    # ── Andmejälgija ─────────────────────────────────────────────────────────
    sections.append(f"""
<h1>Andmejälgija (AJ) seadistamine</h1>
<p>
  LJVIS2 realiseerib RIA Andmejälgija kasutusteabe esitamise protokolli v1.6.1, et isikud
  saaksid eesti.ee kaudu kontrollida, kes nende andmeid on töödelnud (IKS §19, §25).
  Juhend: {confluence_link(AJ_JUHEND, "LJVIS2 · Andmejälgija (AJ) seadistamine")}
  (GitHubis {gh_link("docs/andmejalgija-seadistamine.md", "andmejalgija-seadistamine.md")}).
</p>
<ul>
  <li><strong>X-tee teenus:</strong> üks REST teenus koodiga <code>findUsage</code> otspunktidega <code>/v2/findUsage</code>, <code>/v2/usagePeriod</code>, <code>/v2/heartbeat</code>; eesti.ee kutsub <code>…/ljvis2/findUsage/v2/findUsage</code></li>
  <li><strong>Turvaserveri seadistus:</strong> teenuse URL Ruuter.internal-i <code>/ljvis/xroad</code> (mitte <code>/ljvis/xroad/v2</code>), kirjeldus URL-ilt <code>/ljvis/xroad/v2/openapi</code> ({gh_link("docs/xtee/FindUsageOpenapi.yaml", "FindUsageOpenapi.yaml")})</li>
  <li><strong>Kirjete allikas:</strong> inbound X-tee teenused ning LJVIS2 väljaminevad päringud (rahvastikuregister, äriregister, MTR) ja koondvormi kinnitamine kirjutavad <code>xroad.aj_usage_log</code> tabelisse; LJVIS2 enda toimingute töötlejaks on vastutav töötleja Kliimaministeerium (70001231)</li>
</ul>
""")

    # ── Infra ligipääsuvaade ──────────────────────────────────────────────────
    ia_path = DOCS / "workingdocs" / "infrastructure-access-view.md"
    ia_html, ia_atts = md_to_html(ia_path)
    all_atts.extend(ia_atts)
    sections.append(f"""
<h1>Infra ligipääsuvaade</h1>
{ia_html}
""")

    # ── Andmehaldus üleandmiseks ──────────────────────────────────────────────
    sections.append(f"""
<h1>Andmehaldus üleandmiseks</h1>
<p>Pärast toodangusse minekut tuleb üle anda ja seadistada järgmised lähteandmed:</p>
<table>
  <colgroup><col /><col /><col /></colgroup>
  <thead><tr><th>Andmed</th><th>Asukoht</th><th>Märkused</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Õigused ja kasutajagrupid</strong></td>
      <td>{gh_link("docs/andmehaldus/oigused.md")}, {gh_link("DSL/Liquibase/changelog/", "Liquibase seed")}</td>
      <td>Seed-data rakendatakse Liquibase migratsiooni käigus. Toodangus tuleb kasutajad ja grupid TIM halduse kaudu luua.</td>
    </tr>
    <tr>
      <td><strong>Klassifikaatorid</strong></td>
      <td>{gh_link("docs/andmehaldus/klassifikaatorid.md")}</td>
      <td>Klassifikaatorite lähteandmed on Liquibase migratsioonides. Uusi väärtusi saab hallata adminvaates.</td>
    </tr>
    <tr>
      <td><strong>Asutused</strong></td>
      <td>{gh_link("docs/andmehaldus/organisatsioonid.md")}</td>
      <td>Asutuste seed-data on Liquibase migratsioonides.</td>
    </tr>
    <tr>
      <td><strong>E-posti mallid</strong></td>
      <td>{gh_link("docs/andmehaldus/")}</td>
      <td>Teavituste mallid (Postkast 2.0 + in-app) on hallatavad adminvaates.</td>
    </tr>
  </tbody>
</table>
""")

    # ── Järgmised sammud ──────────────────────────────────────────────────────
    sections.append(f"""
<h1>Järgmised sammud / avatud punktid</h1>
<ul>
  <li>
    <strong>NCR forwarding (LJVIS2-64 §5)</strong> — inbound NCR-i edastamine VR-vormiks (viewed ↔ forwarded) ei ole veel implementeeritud.
    Vt {gh_link("docs/workingdocs/permissions-matrix.md", "permissions-matrix.md §2.10")} märkus.
  </li>
  <li>
    <strong>RESQL + TIM JDBC upgrade</strong> — PostgreSQL 18 peale minek vajab Buerostack upstream uuendust JDBC ≥ 42.6.
    Vt KI-001 allpool.
  </li>
  <li>
    <strong>Liquibase 5.x ühilduvus</strong> — hetkel kasutatakse 4.29.2. Vt KI-002.
  </li>
  <li>
    <strong>Rust Ruuter üleminek</strong> — praegune Ruuter on Java-põhine;
    plaan on üle minna Rust Ruuterile. Vt {gh_link("docs/workingdocs/rust-services-upgrade-plan.md", "rust-services-upgrade-plan.md")}.
  </li>
  <li>
    <strong>Arhiiviandmebaas (ADR-010)</strong> — kustutatud kontrollvormide arhiveerimise eraldi andmebaas on arhitektuuris kavandatud aga veel täielikult implementeerimata.
  </li>
</ul>
""")

    body = "\n".join(sections)
    return body, all_atts


def main():
    BUILD.mkdir(parents=True, exist_ok=True)
    print(f"==> Koostan Lõpptarne lehte (ID {LOPPTARNE_ID})…")

    body, attachments = build_page()

    version = get_page_version(LOPPTARNE_ID)
    print(f"  Praegune versioon: {version}")

    update_page(LOPPTARNE_ID, "Lõpptarne", body, version)

    if not DRY_RUN:
        for name, path in attachments:
            upload_attachment(LOPPTARNE_ID, path, name)
        # Uuenda leht uuesti peale manuste üleslaadimist (manuse viited töötavad)
        version2 = get_page_version(LOPPTARNE_ID)
        update_page(LOPPTARNE_ID, "Lõpptarne", body, version2)

    print(f"\nValmis: {BASE}/pages/viewpage.action?pageId={LOPPTARNE_ID}"
          if not DRY_RUN else "\n[dry-run] valmis")


if __name__ == "__main__":
    main()
