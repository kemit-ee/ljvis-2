#!/usr/bin/env python3
"""
Loob/uuendab Confluence'i Lõpptarne lehe (ID 346498787).

Leht sisaldab projekti üleandmiseks vajaliku dokumentatsiooni kokkuvõtte,
lingid GitHubi dokumentidele ja teadaolevad probleemid.

Kasutus:
    CONFLUENCE_TOKEN=<token> python3 scripts/publish-lopptarne.py [--dry-run]
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
from pathlib import Path

BASE   = os.environ.get("CONFLUENCE_BASE", "https://wiki.kemit.ee")
SPACE  = os.environ.get("CONFLUENCE_SPACE", "LIA")
TOKEN  = os.environ.get("CONFLUENCE_TOKEN", "")
DRY_RUN = "--dry-run" in sys.argv

LOPPTARNE_ID = "346498787"
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

    # Välised lingid jäävad; siselingid → plain tekst
    html = re.sub(
        r'<a href="(?P<href>[^"]+)"[^>]*>(?P<text>.*?)</a>',
        lambda m: m.group(0) if m.group("href").startswith(("http://", "https://", "#", "mailto:"))
                  else re.sub(r"<[^>]+>", "", m.group("text")).strip() or m.group("href"),
        html, flags=re.DOTALL,
    )
    # Eemalda esimene <h1>
    html = re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", html, count=1, flags=re.DOTALL)
    return html, attachments


def gh_link(relpath, text=None):
    url = f"{GH_BASE}/{relpath}"
    label = text or relpath.split("/")[-1]
    return f'<a href="{url}">{label}</a>'


def confluence_link(page_id, text):
    return (f'<ac:link><ri:page ri:content-id="{page_id}" />'
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
    conf_ug   = confluence_link("333210904", "LJVIS2 kasutusjuhend (lehepuu)")
    conf_ugsp = confluence_link("346498942", "LJVIS2 kasutusjuhend ühel lehel")
    conf_pm   = confluence_link("346489830", "LJVIS2 õiguste maatriks")  # permissions page if it exists
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
      <td>{gh_link("docs/xtee/00-xtee-teenused-publikatsiooni-juhend.md")}</td>
      <td>Kõik 9 X-tee teenust (IsikuKontroll, ErakorralineYV, RegisterJobInspection, AJ), turvaserveri seadistus ja masinloetav {gh_link("docs/xtee/XroadOpenapi.yaml", "XroadOpenapi.yaml")}.</td>
    </tr>
    <tr>
      <td><strong>Andmejälgija seadistamine</strong></td>
      <td>{gh_link("docs/andmejalgija-seadistamine.md")}</td>
      <td>AJ (DUMonitor) liidestuse seadistus — /v2/findUsage, /v2/usagePeriod, /v2/heartbeat.</td>
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
  <li><strong>Andmejälgija:</strong> AJ (DUMonitor) liides eesti.ee-le isikuandmete töötluse jälgimiseks</li>
  <li><strong>X-tee:</strong> IsikuKontroll, ErakorralineYV, RegisterJobInspection; andmejälgija /v2 teenused</li>
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
<p>LJVIS2 pakub 9 X-tee teenust REST/JSON protokolliga. Täielik dokumentatsioon: {gh_link("docs/xtee/00-xtee-teenused-publikatsiooni-juhend.md", "xtee-teenused-publikatsiooni-juhend.md")}.</p>
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
    <tr><td>7–9</td><td><code>findUsage / usagePeriod / heartbeat</code></td><td>Andmejälgija (AJ / DUMonitor) teenused eesti.ee-le</td></tr>
  </tbody>
</table>
{info_box("<p>Masinloetav OpenAPI leping (kõik 9 teenust): " + gh_link("docs/xtee/XroadOpenapi.yaml") + "</p><p>Turvaserver saab seda URL-i kasutada lepingu automaatseks uuendamiseks (vt juhend §4.8).</p>")}
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
  LJVIS2 peab implementeerima DUMonitor OpenAPI v2.1.0 spetsifikatsiooni,
  et isikud saaksid eesti.ee kaudu kontrollida, kes nende andmeid on töödelnud (IKS §19, §25).
  Täielik juhend: {gh_link("docs/andmejalgija-seadistamine.md", "andmejalgija-seadistamine.md")}.
</p>
<ul>
  <li><strong>Endpointid:</strong> <code>/v2/findUsage</code>, <code>/v2/usagePeriod</code>, <code>/v2/heartbeat</code></li>
  <li><strong>Allikas:</strong> kolm inbound X-tee teenust + väljaminevad RR-päringud kirjutavad automaatselt <code>xroad.aj_usage_log</code> tabelisse</li>
  <li><strong>Turvaserveri seadistus:</strong> REST teenus URL-iga <code>http://ruuter-internal:8080</code>, teenuse kood <code>DUMonitor</code></li>
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
