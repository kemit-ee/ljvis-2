# Rust-teenuste versiooniuuenduse megaplaan

**Koostatud:** 2026-09-07
**Skoop:** Ruuter, Resql, TIM (+ kaasnevalt DataMapper, XTR, CronManager)
**Eesmärk:** viia ljvis-2 turnerrainer'i teenuste uusimatele avaldatud
versioonidele nii, et kõik jääks tööle. Iga komponendi kohta: mis on praegu
pinnitud, mis on uusim, mis muutub katkendlikult, mida ljvis-2-s muuta.

> Allikas: `/code/{Ruuter,Resql}/CLAUDE.md`, `/code/{Ruuter,Resql,TIM,DataMapper,XTR}/CHANGELOG.md`
> (origin/dev seisuga 2026-09-07), Docker Hub tag-päringud.

---

## 0. Kokkuvõttev tabel

| Komponent | ljvis-2 praegu | Uusim **avaldatud** | dev-is (avaldamata) | Katkendlikkuse risk |
|---|---|---|---|---|
| **Ruuter** | `turnerrainer/ruuter:0.9.9-rc` (digest, `docker/ruuter*/Dockerfile`) | **`0.9.10-rc`** (= liikuv `:rc`) | `0.9.11-rc` (tag+publish tegemata; README juba viitab) | 0.9.10: **madal**. 0.9.11: **KÕRGE** (H1 template-guardid, H2 WS-guardid) |
| **Resql** | ✅ **migreeritud** `turnerrainer/resql:0.2.0-alpha` (`feat/resql-turnerrainer-0.2.0`; oli `askendest/resql:0.1.0-alpha.5`) | `turnerrainer/resql:0.2.0-alpha` | — | ~~KESKMINE~~ tehtud: 212 SQL `params:` kujule, ID-param `type: integer`, config-vaikeväärtused, Newman roheline |
| **TIM** | `turnerrainer/tim:0.2.0-alpha.2` (`docker/tim/Dockerfile`); release-Dockerfile juba `0.2.1-alpha` | **`0.3.0-alpha`** | — | **KESKMINE** (OIDC discovery fail-closed plain-HTTP peal; PKCE nüüd saadetakse; token-exchange `client_secret_basic`) |
| **DataMapper** | ✅ **migreeritud** `turnerrainer/datamapper:0.1.3-alpha` (`feat/datamapper-0.1.3-alpha`; oli `0.1.0-alpha.2`) | `0.1.3-alpha` | — | ~~MADAL~~ tehtud: ainult Dockerfile digesti-bump, Newman roheline |
| **XTR** | harbor digest = `turnerrainer/xtr:0.1.0-rc.2` (`docker/xtr/Dockerfile`); compose `:rc` | **`0.2.0-rc.1`** (= liikuv `:rc`) | — | **KESKMINE** (SOAP-fault vastuse kuju; `xroad_protocol_version` enum-valideerimine; HTTP no-decompress) |
| **CronManager** | `turnerrainer/cronmanager:alpha` (= `0.1.4-alpha`) | `0.1.4-alpha` | — | **puudub** (juba uusim) |

**Soovitatav teostusjärjekord:** Resql → DataMapper → Ruuter 0.9.10 → TIM → XTR
→ (hiljem, kui avaldatakse) Ruuter 0.9.11. Iga samm eraldi PR + roheline
`docker-compose.ci.yml` E2E enne järgmist.

---

## 1. Ruuter

### 1.1 Seis

- **Pinn:** `docker/ruuter/Dockerfile` ja `docker/ruuter-internal/Dockerfile`:
  `FROM turnerrainer/ruuter:0.9.9-rc@sha256:eb251a17…`
- **Uusim avaldatud:** `0.9.10-rc` (Docker Hub `:0.9.10-rc` ja liikuv `:rc`
  osutavad samale digestile `sha256:45c37025…`, avaldatud 2026-09-04).
- **`0.9.11-rc`:** ainult `dev`-harus (`Cargo.toml = 0.9.11-rc`, commit
  `ecbfe1b`/`1087d93`). **Git-tag ja konteiner puuduvad** — Docker Hub annab
  `:0.9.11-rc` peale 404. README/CHANGELOG viitavad juba 0.9.11-le, aga
  `publish.yml` käivitub `vX.Y.Z-suffix` tag-i peale, mida pole tehtud.

### 1.2 Config — ljvis `ruuter.yaml` / `ruuter-internal.yaml`

Rust Ruuteri config-skeem on **sama stiiliga** mis praegune ljvis
`ruuter.yaml` (`config_path`, `http_request_timeout`, `incoming_requests`,
`http_codes_allow_list`, `logging.display_request_content`,
`dsl.allow_dsl_reloading`) — faili **ei pea ümber kirjutama**. Kontrollitud
0.9.11 skeemi (`src/config/mod.rs`) vastu.

**Vaikeväärtused, mis ljvis jaoks juba õiged (jäta nii):**

- `response.default_wrapper` **= `true`** (Rust vaikeväärtus). ljvis DSL-id
  eeldavad `{"response": …}` mähkimist → **ei pea configis seadma**.
- `internal_requests.block_private_networks` **= `true`** (Rust vaikeväärtus),
  aga ljvis `ruuter.yaml` seab **`false`** — ja **peab jääma `false`**.
  Kõik ljvis-i sisekutsed käivad Dockeri privaatvõrgus (`database:5432`,
  `ruuter-internal:8080`, `resql-ljvis:8090`, `tim:8085`, `data-mapper:3005`,
  `xtr:8080`, `nysiis:…`). `CLAUDE.md` üldine "production always `true`" **ei
  kehti** selle topoloogia jaoks.
  - **Valikuline karmistus (eraldi task):** jäta `block_private_networks:
    false`, aga täida `internal_requests.allowed_urls` nende ~8 hosti
    prefiksitega — siis on lubatud ainu­loend, mitte "kõik privaat-IP-d".

**Uued sektsioonid, mida ljvis EI kasuta ja ei pea lisama** (kõik ohutu
vaikeväärtusega): `proxy.trusted` (`[]`), `csrf.allowed_origins` (`[]` =
kontroll bypassitud — ljvis toetub SameSite-küpsisele), `idempotency`
(vaikimisi sees, TTL 24h — ljvis DSL-idempotents on juba niikuinii käsitsi),
`optimistic_concurrency.require_if_match` (`false`), `response_default_headers`.

### 1.3 `0.9.9-rc → 0.9.10-rc` — MADAL risk

Viis @angryziber'i leidu. ljvis-i mõju:

| Leid | Muutus | ljvis-i mõju |
|---|---|---|
| **#56** | Mitme action-võtmega samm (nt `log:` + `call:`) → **load-time viga** | **Puudub** — ljvis-is pole ühtki `log:` sammu. |
| **#61** | `next:` olematule sammule → runtime-viga (varem vaikne tühi 200) | **Puudub** — `scripts/validate-dsl.py` juba keelab dangling `next:` ("no `next` reference dangles"), CI roheline. |
| **#63** | Tühi upstream-vastuse keha seotakse `""`, mitte `null` | **Madal.** ljvis kontrollid on kirjutatud kaitsvalt: `response.body == null \|\| response.body.length === 0` / `.length != 1` — `""` läheb `.length` haru alla. Üle vaadata: `DSL/Ruuter.internal/ljvis/POST/erru/cgr/lookup-mtr.yml:73,96` ja `DSL/Ruuter/ljvis/POST/v1/xroad/mtr/check-transport-manager-good-repute.yml:104` — kasutavad `response.body == null` **ilma** `.length` haruta (aga eelnevalt `status !== 200` kontroll → praktikas ohutu). Soovitus: lisa `\|\| ....length === 0`. |
| **#64** | `switch:` tingimus JS-truthy, mitte range boolean | **Positiivne.** `${a && b}` töötab nüüd otse; olemasolevad `${x === y}` jäävad boolean'iks. |
| **#62** | `??` / `?.` deklareerimata identifikaatoril töötab | **Positiivne** — parandab `${x?.y ?? 'vaikimisi'}` mustri. |

**Teha:**
1. `docker/ruuter/Dockerfile` + `docker/ruuter-internal/Dockerfile`:
   `0.9.9-rc@sha256:eb251a17…` → `0.9.10-rc@sha256:45c370254ce44d8fd947e89d1ad87df4be72ef5ab0e69a025f43de90419649f2`
   (kontrolli digest: `docker buildx imagetools inspect turnerrainer/ruuter:0.9.10-rc`).
2. Üle vaadata #63 — 3 faili ülal.
3. `docker compose -f docker-compose.ci.yml -p ljvis-ci up -d --build` → E2E roheline.

### 1.4 `0.9.10-rc → 0.9.11-rc` — **KÕRGE risk** (kui/kui avaldatakse)

Viis h2ck.me karmistust (commit `ecbfe1b`, PR #72). **Mitte upgrade'ida enne
kui:** (a) konteiner avaldatud ja (b) allolev H1/H2 töö tehtud.

#### H1 — `template:` samm käivitab nüüd sihi-DSL-i guardid

ljvis-is on **242 `template:` kutset** ja **projektiülene guard**
`DSL/Ruuter/ljvis/.guard.yml` (kutsub `templates/check-user-authority`,
nõuab küpsist). Mallid on `DSL/Ruuter/ljvis/GET/templates/**` all — nende
kataloogis **oma guardi pole**, seega ainus kattev guard on projektiülene.

0.9.11-l: kui nt `publish.yml` (juba autenditud) teeb
`template: templates/audit/log-audit-event`, käivitab template-samm
`ljvis/.guard.yml` **lapse-konteksti vastu**. Laps saab päised ainult
`template.headers` kaudu.

- **Audit-mallid** (`templates/audit/**`) — enamik **edastab juba**
  `headers: { cookie: ${incoming.headers.cookie} }` → guard läbib.
- **Valideerimis-/arvutus-mallid** (`templates/validate/estonian-personal-code`,
  `templates/form/**/calculate-*-changed-fields`, `templates/form/**/validate-*`)
  — **EI edasta küpsist** → guard `check_cookie` → 401 → kutsuja `${result}`
  seotakse 401-ga → **iga vormi save/confirm katki**.

**Lahendusvariandid (vali enne 0.9.11-le minekut):**

- **A (soovitatud) — jaga mallid kaheks:**
  - Puhtad arvutus-/valideerimismallid → `GET/templates/pure/**` +
    `GET/templates/pure/.guard.yml` `declaration.override_ancestors: true`
    + allow-all. (Book: `override_ancestors` alampuu bypassib projektiguardi.)
    Uuenda ~N kutset uuele teele.
  - Kõrvalmõjuga mallid (`audit/**` — Resql insert; `files/**` — failiops)
    jäävad projektiguardi alla; **veendu**, et **kõik** nende kutsujad
    edastavad `template.headers.cookie` (audit-mallidel enamik juba teeb;
    üle grep'ida).
- **B — lisa `GET/templates/.guard.yml` `override_ancestors: true` +
  allow-all.** Kiire, aga muudab **kõik** mallid HTTP-liinil
  autentimata kättesaadavaks (`GET /ljvis/templates/audit/log-audit-event?…`
  → audit-kirje võltsimine; `templates/files/**` → failiops). **Ei
  soovita** ilma malli-HTTP-route'ide blokeerimiseta reverse-proxys.
- **C — edasta küpsis kõigis 242 kutses.** Kõige kindlam, kõige töömahukam.

**Enne 0.9.11:** `grep -rE "^\s*template:" DSL/Ruuter*/ljvis` → iga kutse
juurde kontrolli, kas `headers.cookie` on edastatud; kaardista puhtad vs.
kõrvalmõjuga mallid.

#### H2 — WebSocket-upgrade käivitab nüüd guardi

`DSL/Ruuter/ljvis/WS/inbound/notifications/connect.yml` on `ljvis`
projektis → 0.9.11-l käivitab `ljvis/.guard.yml` **WS-handshake'i ajal**,
sünteesitud konteksti vastu (päised + query, **keha puudub**).

- `ljvis/.guard.yml` `check_cookie` loeb `incoming.headers.cookie` — WS
  handshake **kannab küpsist** (brauser saadab), seega `check_cookie`
  läbib. `authenticate` → `templates/check-user-authority` küpsisega → OK.
- **Risk:** kui `check-user-authority` mall või `ljvis/.guard.yml` mõni
  haru dereferentsib `incoming.body` — WS-kontekstis keha puudub → viga.
  (`ljvis/.guard.yml` praegu ei kasuta `incoming.body` → tõenäoliselt OK,
  aga üle kontrollida `templates/check-user-authority`.)
- **connect.yml ise** kutsub juba `templates/check-user-authority` (H1
  probleem kehtib ka siin — see mall peab olema `pure`-guardi all VÕI
  connect.yml peab küpsise edastama; **edastab juba**: `headers: { cookie:
  ${incoming.headers.cookie} }`).
- **Kui projektiguard ei tohiks WS-i katta** (nt kui tahame et
  autentimata WS-upgrade õnnestub ja alles esimene frame autendib —
  praegune disain): lisa `DSL/Ruuter/ljvis/WS/.guard.yml`
  `override_ancestors: true` + allow-all. **Praegune connect.yml juba
  autendib igat frame'i ise** → allow-all WS-guard on siin loogiliselt
  õige.

#### H2 lisamõju — `/_/unguarded` loeb nüüd WS-route'e

Kui ljvis CI/monitooring loeb `GET /_/unguarded` "0 = kõik kaitstud"
verdiktina, siis 0.9.11-l ilmuvad sinna WS-route'id (kuni guard lisatud).

#### M1 — `/_/openapi.json` admin-gate'i taha

ljvis ei ekspordi `/_/*` avalikult (kontrolli reverse-proxy configi). Kui
midagi seda scrape'ib, katkeb. `RUUTER_ADMIN_ENABLED` jääb seadmata (off).
**Tõenäoliselt mõju puudub.**

#### M2 — `RUUTER_HTTP_REWRITE`

`grep -rE "RUUTER_HTTP_REWRITE" .` ljvis-is → **tühi**. Mõju puudub.

#### M3 — WS outbound-kanalid bounded (256)

`ws_send` võib nüüd `Err` tagastada, kui aeglane lugeja täidab järjekorra.
`broadcast_where` jätab täis-järjekorraga peerid vahele.
- `DSL/Ruuter/ljvis/POST/v1/ws-broadcast/send.yml` — `ws_send broadcast_where`
  — kui mõni samm eeldas et `ws_send` alati õnnestub, lisa `error:` haru
  **või** aktsepteeri "framework logib ja jätkab". ljvis push on sisutu
  signaal (`{"type":"notification_update"}`) → kaotus talutav, `error:`
  haru pole hädavajalik.

---

## 2. Resql — **org muutus + config-vaikeväärtused**

> **Seis 2026-09-07: MIGREERITUD** harul `feat/resql-turnerrainer-0.2.0`.
> `askendest/resql:0.1.0-alpha.5` → `turnerrainer/resql:0.2.0-alpha`.
> 212 SQL-deklaratsiooni teisendatud `params:` kujule; ~125 ID-parameetrit
> `type: string` → `type: integer` (`:param::BIGINT` cast); numbriväljad, mis
> lähevad `NULLIF(:x,'')::INTEGER` kaudu, hoiavad `type: string` + Ruuteri
> kutsujad stringivad väärtuse. Täis-Newman (26 kollektsiooni) roheline.
> Spike'i leiud: `docs/workingdocs/resql-0.2.0-spike-findings.md`.

### 2.1 Seis

- **Pinn (enne):** `docker/resql-ljvis/Dockerfile`: `FROM askendest/resql:0.1.0-alpha.5`
- **Uusim:** **`turnerrainer/resql:0.2.0-alpha`** (2026-09-06, cosign-signeeritud,
  Docker Hub + GHCR). **Publisher liikus `askendest` → `turnerrainer`.**
  `askendest/resql:0.1.0-alpha.5` on veel Docker Hub-is olemas, aga
  edaspidi ei uuene.
- `turnerrainer/Resql` `Cargo.toml` (origin/dev) = `0.2.0-alpha`; järgmine
  `Cargo.toml`-i bump auto-tag'ib + auto-publitseerib.

### 2.2 Katkendlikud config-muudatused `0.1.x-alpha → 0.2.0-alpha`

ljvis `docker/resql-ljvis/resql.yaml` praegu:

```yaml
server: { bind: "0.0.0.0:8090", max_body_bytes: 1048576, request_timeout_seconds: 30 }
sql_dir: "/DSL"
project_datasource_map: { ljvis: ljvis }
allow_datasource_header: true          # ← PROBLEEM
datasources:
  - { name: ljvis, url: "postgres://database:5432/ljvis_db", username: ljvis,
      password_env: RESQL_DB_PASSWORD, max_connections: 10, acquire_timeout_seconds: 5 }
cors: { allowed_origins: "*" }
logging: { level: "info,resql=debug", format: "text" }
```

| Audit-leid | Muutus | ljvis-i mõju + parandus |
|---|---|---|
| **R1** — `allow_datasource_header` vaikeväärtus `true → false`; + kui `true`, nõutav `datasource_header_allowlist`, muidu **403** iga override'i puhul | ljvis seab **`allow_datasource_header: true`** ja **allowlist puudub** | ljvis **ei saada** kuskilt `X-Datasource` päist (grep DSL/ + kood → 0 vastet). **Parandus: `allow_datasource_header: false`** (kustuta rida või sea false). Turvalisem ja lihtsam. |
| **R2** — `cors.allowed_origins` vaikeväärtus `"*" → ""` (CORS-kiht üldse maha) | ljvis seab **eksplitsiitselt `"*"`** | Toimib edasi. Resql on Dockeri sisevõrgus (Ruuter kutsub, mitte brauser) → CORS pole tegelikult vaja. **Soovitus: `cors.allowed_origins: ""`** (eemalda kiht). Kui jätta `"*"` — töötab, aga "smell". |
| **R3** — CORS meetodid/päised kitsendatud `GET`+`POST` + 4 päist | Ei ole configitav | ljvis Resql-liiklus on ainult GET/POST + `content-type`/`traceparent` → mõju puudub. |
| **R5** — `/datasources` vaikimisi **404**; lubatud korral redigeeritud | ljvis-il pole `admin:` blokki | ljvis ei fingerprindi Resql-i selle kaudu → **404-vaikeväärtus OK, ära lisa `admin.datasources_public`**. |
| **R6+R7** — `request_timeout_seconds: 0` → **boot-fail**; middleware annab nüüd `504`; PG-pool `SET statement_timeout` | ljvis seab **`30`** | OK, muutust ei vaja. (Boonus: aeglased päringud saavad nüüd 504 + PG kill.) |
| **R4** — sümlingid `sql_dir` all keelatud load-time | `sql_dir: /DSL` (bind-mount) | Kontrolli et `DSL/Resql` all pole sümlinke: `find DSL/Resql -type l`. |
| **R9** — batch-endpoint veateade üldistatud | ljvis ei kasuta `/batch` URL-kuju | Mõju puudub. |

### 2.3 Muu — DSL-pind

**camelCase jääb.** Rust Resql tagastab kõik veerud camelCase kujul (ka
snake_case aliasitud) — see on ljvis DSL-ide alus juba `0.1.0-alpha.5`-st.
`0.2.0-alpha` ei muuda seda. Kõik teadaolevad kvirkid (BOOLEAN-parameetri
sidumine `COALESCE(...::BOOLEAN)` konteksti kukub → string `"true"/"false"/""`
+ `NULLIF(...,'')::BOOLEAN`; `type: json` väli võtab JSON-**stringi**, mitte
bare objekti — vt `send-postkast.yml` fix) **kehtivad edasi**, seega
DSL-muudatusi ei vaja.

### 2.4 Tehtud (`feat/resql-turnerrainer-0.2.0`)

1. ✅ `docker/resql-ljvis/Dockerfile`: `FROM turnerrainer/resql:0.2.0-alpha`.
2. ✅ `docker/resql-ljvis/resql.yaml`: `allow_datasource_header: false`,
   `cors.allowed_origins: ""`.
3. ✅ 212 `.sql` deklaratsiooni `declaration:`/`allowlist` → `params:`/`returns:`
   (`scripts/resql-audit-declarations.py` + `scripts/resql-convert-declarations.py`).
4. ✅ Tüübivalideerimine (blokeerija 2): ID-parameetrid `:param::BIGINT` castiga
   → `type: integer` (`coerce_to` võtab nii numbri kui numbrilise stringi).
   Numbriväljad `NULLIF(:x,'')::INTEGER` → jäävad `type: string`, Ruuteri
   save/confirm/**publish** DSL-id stringivad (`String(...)`).
5. ✅ `log/get_logs_verify.sql`: `WITH window` → `WITH chain` (reserv-sõna).
6. ✅ `user/list_users.sql`: `COALESCE(:organisation_id::TEXT,'')=''` optional-filter
   → `:organisation_id IS NULL`.
7. ✅ Blokeerija 3 & 4 (`:param::TYPE` cast, null-bait): 0.2.0-s **lahendatud**
   (`rewrite_named_params` säilitab castid, stabiilne prepared-statement OID).
8. ✅ Täis-Newman roheline (26 kollektsiooni, ~1940 assertit).

---

## 3. TIM

### 3.1 Seis

- **Pinn:** `docker/tim/Dockerfile`: `FROM turnerrainer/tim:0.2.0-alpha.2`
  (kasutab `docker-compose.yml` + `docker-compose.ci.yml`).
  `docker/tim/Dockerfile.release`: `turnerrainer/tim:0.2.1-alpha@sha256:9f2bc8e7…`
  (jagatud release-build, mitte lokaalne/CI).
- **Uusim:** **`0.3.0-alpha`** (2026-09-06). Vahepealne `0.2.1-alpha`
  (2026-08-31).

### 3.2 `0.2.0-alpha.2 → 0.2.1-alpha` — TARA-parandused (ljvis jaoks **vajalikud**)

Mõlemad TARA (`tara-test.ria.ee`) vastu leitud:

- **Token-exchange `client_secret_basic`** (varem `client_secret_post`).
  TARA registreering on "vaikimisi" → nõuab Basic-i, lükkas `_post`-i
  `401 invalid_client`-iga tagasi. **ljvis-i mõju:** lokaalne `tara-mock`
  peab **aktsepteerima HTTP Basic** klient-autentimist token-endpointil.
  **Kontrolli `tara-mock/service/` OIDC-teenust.**
- **Dot-separated claim-path'id** (`resolve_claim_path`). TARA kannab
  `given_name`/`family_name` ainult `profile_attributes` all. ljvis
  `tim.yaml` juba kasutab:
  ```yaml
  claim_mappings:
    first_name: "profile_attributes.given_name"
    last_name:  "profile_attributes.family_name"
  ```
  → `0.2.0-alpha.2`-l need **ei tööta** (flat lookup → `None` → tühjad
  nimed). **`0.2.1-alpha` parandab.** ⇒ **ljvis vajab vähemalt 0.2.1-alpha't**
  et nimed sessiooni jõuaksid. (Kui praegu töötab, siis tänu sellele et
  `tara-mock` annab nime top-level — päris TARA vastu katkeks.)

### 3.3 `0.2.1-alpha → 0.3.0-alpha` — **1 katkendlik + 2 pehmet**

#### Katkendlik — OIDC discovery fail-closed plain-HTTP peal

`provider.discovery_url` **ja** discovery-dokumendi sees olevad endpointid
(`authorization_endpoint`, `token_endpoint`, `jwks_uri`) **peavad** olema
`https://`, muidu boot/login keeldub. Erand: `oauth2.providers.<id>.allow_http_discovery: true`.

**ljvis `docker/tim/tim.yaml`:**
```yaml
discovery_url: "https://tara-mock:8080/oidc/.well-known/openid-configuration"   # ✅ https
allowed_redirect_uris: ["http://localhost:3001/auth/callback"]                  # redirect_uri, mitte discovery → OK
```

- `discovery_url` on juba `https://` ✅
- **AGA:** discovery-**dokumendi sees** — kui `tara-mock` publitseerib oma
  `.well-known`-is `http://tara-mock:8080/...` endpointid, keeldub login
  ikka. **Kontrolli `tara-mock` genereeritud discovery-dokumenti** — kui
  endpointid on `http://`, siis kas (a) muuda `tara-mock` andma `https://`
  endpointe, või (b) sea `allow_http_discovery: true` ljvis `tim.yaml`-is
  tara provideri all (dev/CI-only, mitte prod).

**Kontroll enne upgrade'i:**
```bash
grep -rnE 'discovery_url:\s*http://' docker/tim/tim.yaml
docker compose exec tara-mock curl -sk https://localhost:8080/oidc/.well-known/openid-configuration | python3 -m json.tool | grep -E 'endpoint|jwks'
```

#### Pehme 1 — PKCE nüüd saadetakse

`src/oauth2/flow.rs` saadab nüüd `code_challenge` + `code_challenge_method=S256`
igas autoriseerimispäringus. **`tara-mock` peab PKCE parameetreid taluma**
(kas kasutama või vähemalt ignoreerima ilma veata). Enamik OIDC-mocke
talub. **Kontrolli `tara-mock` authorize-endpointi.** Päris TARA/Google
mandaadid, mis PKCE-t nõuavad, hakkavad **nüüd tööle** (positiivne).

#### Pehme 2 — legacy `?session_id=` → WARN (oli DEBUG); JWT `reason` väärtused

- ljvis kasutab küpsist (`customJwtCookie`), mitte `?session_id=` → mõju
  puudub, kui logi-alarmid pole WARN-loenduri peal.
- JWT-validate `reason` string-väärtused võivad muutuda varem valesti
  klassifitseeritud vigadel. ljvis DSL-id ei branch'i `reason` stringi
  peal (kontrolli: `grep -rn "reason" DSL/Ruuter/ljvis` seoses TIM-iga).

#### Migratsioon

**Skeemimigratsiooni ei vaja** — `pkce_verifier` veerg on
`migrations/0001_init.sql`-is reserveeritud algusest.

### 3.4 Uued 0.3.0 valikulised võimalused (ei pea kasutama)

- `oauth2.providers.<id>.jwks_uri` — pin discovery-dokumendi JWKS-URI-le
  (MITM-kaitse). Soovitatav prod-is tara jaoks.
- `POST /introspect` Basic-auth klientidele (`introspection.required_client_auth`).
  ljvis ei kasuta `/introspect` → jäta seadmata.
- Boot-diagnostika: hoiatab CORS-wildcard + HSTS-ilma-preload puhul. ljvis
  `security.cors_allowed_origins: []` → wildcard-hoiatust ei tule.

### 3.5 Teha

1. `docker/tim/Dockerfile`: `0.2.0-alpha.2` → `0.3.0-alpha`
   (`docker/tim/Dockerfile.release` juba `0.2.1` — vii sama `0.3.0`-le).
2. **`tara-mock` kontrollid (kriitilised):**
   - discovery-dokument annab `https://` endpointid (või sea
     `allow_http_discovery: true` dev-is)
   - token-endpoint aktsepteerib HTTP Basic klient-autentimist
   - authorize-endpoint talub `code_challenge` / `code_challenge_method`
     query-parameetreid
   - Kui `tara-mock` ei täida → paranda `tara-mock/service/` **või**
     lisa `allow_http_discovery: true` + veendu Basic-i toes.
3. `tim.yaml`: kaalu tara provideri alla `jwks_uri:` pinni (prod).
4. Full login-flow test lokaalses stackis (`Ametnik → Sisene → TARA-mock →
   kinnita → töölaud`), veendu et **nimi** jõuab sessiooni.
5. E2E roheline (Postmani auth-login testid).

---

## 4. DataMapper — **MADAL risk**

> **Seis 2026-09-07: MIGREERITUD** harul `feat/datamapper-0.1.3-alpha`.
> Ainult Dockerfile digesti-bump. Täis-Newman (26 kollektsiooni) roheline.

### 4.1 Seis

- **Pinn (enne):** `docker/data-mapper/Dockerfile`:
  `FROM turnerrainer/datamapper:0.1.0-alpha.2@sha256:c02c550b…`
- **Uus:** `turnerrainer/datamapper:0.1.3-alpha@sha256:cc73f953…` (2026-09-06).

### 4.2 `0.1.0-alpha.2 → 0.1.3-alpha`

CHANGELOG: **"DSL ja HTTP-pind on byte-identne alpha.2-ga."** Ainult
turvakarmistused:

| Leid | Muutus | ljvis-i mõju |
|---|---|---|
| **M2** | Fallback-vastuse `Content-Type` = `text/plain` kui `Accept` ei nimeta eksplitsiitselt `text/html`. `*/*` **ei loe** HTML-opt-in-iks. | ljvis kutsub DMapperit `[#LJVIS_DMAPPER_HBS]/map_*` üle `http.post` `type: json` — Ruuter parsib vastuse JSON-ina sõltumata `Content-Type`-ist. **Mõju puudub.** |
| **M3** | Vastuse mahupiirang jõustatakse render'i AJAL | Ainult hiid-mallidel. ljvis mallid väiksed. Mõju puudub. |
| **I1** | Deprekeeritud `cors_origin` config-väli → **boot-fail** | ljvis-il **on** config-fail (`docker/data-mapper/datamapper.yaml`), aga ainult `port: 3005` + `dsl_path: /app/DSL` — **`cors_origin` puudub**. Mõju puudub. |
| **L1** | Boot-probe: WARN kui `dsl_path` kirjutatav | ljvis **baked-in** template'id (`COPY --from=prep`), mitte bind-mount → jääb kirjutatavaks, **kosmeetiline WARN** boot-logis. `chmod -R a-w` katse ebaõnnestus (mitte-root user ei oma `/app/DSL/samples`). Eraldi task, kui vaja. |
| **M1** | Ainult dokumentatsioon | — |

### 4.3 Teha

1. `docker/data-mapper/Dockerfile`: `0.1.0-alpha.2@sha256:c02c550b…` →
   `0.1.3-alpha@<uus digest>`
   (`docker buildx imagetools inspect turnerrainer/datamapper:0.1.3-alpha`).
2. E2E roheline. **Muud ei vaja.**

---

## 5. XTR — **KESKMINE risk**

### 5.1 Seis

- **Pinn:** `docker/xtr/Dockerfile`: harbor-digest `sha256:61d441d00f75…`
  = `turnerrainer/xtr:0.1.0-rc.2` (XTR CLAUDE.md kinnitab digesti).
  `docker-compose.yml` `xtr` teenus: `image: turnerrainer/xtr:rc` (liikuv).
- **Uusim:** **`0.2.0-rc.1`** (= liikuv `:rc`, avaldatud 2026-09-06).
- ljvis kasutab **käsitsi kirjutatud SOAP-envelope DSL-e**
  (`DSL/xtr/*/*.yml` `<soapenv:Envelope>` mallidega) — **WSDL-faile ei ole**.
  Seega WSDL-põhised leiud (H2 sidecar-identiteet, C1 WSDL-URL-guard) **ei
  kohaldu**.

### 5.2 `0.1.0-rc.2 → 0.2.0-rc` katkendlikud

| Leid | Muutus | ljvis-i mõju |
|---|---|---|
| **H3 — SOAP-fault vastuse kuju** | `502 upstream_soap_fault` JSON-keha: `detail` väli **kadus**; `string` (faultstring) capitud 200 märgini; `message` lühem | **Kontrolli ljvis ERRU/X-tee inbound-handlereid** (`DSL/Ruuter.internal/ljvis/POST/xroad/**`, `erru/**`) — kas parsivad XTR 502-vastusest `detail` välja. Kui jah: kas (a) sea `expose_soap_fault_detail: true` `xtr.yaml`-is (täpne ekvivalents), või (b) uuenda parsimist. |
| **M1 — `xroad_protocol_version` enum-valideerimine** | Ainult `"4.0"` või `"4.1"`, muidu **boot-fail** | ljvis `xtr.yaml`: `xroad_protocol_version: "4.0"` ✅ **Mõju puudub.** |
| **H2 — sidecar-identiteet** | `.meta.yaml` `member_code` peab võrduma `client_data` omaga | ljvis-il **pole `.meta.yaml`** faile. Mõju puudub. |
| **C1 — WSDL-URL-guard** | `<soap:address>` URL-id valideeritakse; `http://` + privaat-IP-d keelatud | ljvis-il **pole WSDL-e**. `xtr.yaml` `security_server.url: "https://cammy.ml.ee/"` = https ✅. Mõju puudub. |

### 5.3 Käitumismuudatused (mitte-katkendlik, aga jälgi)

- **HTTP-klient ei dekompresseeri enam vastuse keha** (`.no_gzip()` jne).
  Kui mõni X-tee upstream saadab tingimusteta `Content-Encoding: gzip`,
  annab XTR nüüd pakitud baidid XML-parserile → viga. **Risk madal**
  (X-tee turvaserverid ei paki tavaliselt tingimusteta). Jälgi
  cammy.ml.ee vastuseid peale upgrade'i.
- **XML sügavuse cap 512 → 128.** Päris X-tee envelope'id on <10 sügavad.
  Mõju puudub.
- Schema-include failinimed piiratud `[A-Za-z0-9._-]+`, sümlingid keelatud.
  ljvis-il pole XSD-include'e. Mõju puudub.

### 5.4 Teha

1. Jooksuta **XTR doctor** vana configi vastu (uus subkäsk 0.2.0-s):
   `docker run --rm -v $(pwd)/xtr.yaml:/app/xtr.yaml turnerrainer/xtr:0.2.0-rc.1 doctor`
   → per-leid tabel (FATAL/BREAK/WEAK/INFO) taasteliputidega.
2. `docker/xtr/Dockerfile`: harbor-digest `61d441d00f75…` →
   `0.2.0-rc.1` digest (kontrolli:
   `docker buildx imagetools inspect turnerrainer/xtr:0.2.0-rc.1`).
   Uuenda ka refresh-kommentaar Dockerfile-is.
3. Grep ERRU/X-tee handlerid `detail` / `faultstring` parsimise osas →
   otsusta `expose_soap_fault_detail: true` vs. parsimise uuendus.
4. E2E roheline (ERRU inbound + MTR + Äriregister testid CI mock'ide vastu;
   päris cammy vastu ainult deploy'tud dev-keskkonnas).

---

## 6. CronManager

`turnerrainer/cronmanager:alpha` = **`0.1.4-alpha`** (2026-09-06) = uusim.
**Muudatust ei vaja.** Soovi korral pin digestiga liikuva `:alpha` asemel:
`docker buildx imagetools inspect turnerrainer/cronmanager:0.1.4-alpha`.

---

## 7. Üldised sammud iga PR juures

1. Muuda 1 komponendi Dockerfile-pinn + config.
2. `docker compose -f docker-compose.ci.yml -p ljvis-ci down -v`
3. `docker compose -f docker-compose.ci.yml -p ljvis-ci up -d --build`
4. `python3 scripts/validate-dsl.py` → exit 0
5. `tests/postman/run-all.sh` → 0 failed (kõik kollektsioonid)
6. Frontend: `cd frontend && npm run build && npm test`
7. Käsitsi smoke: login-flow, ühe vormi save+publish, ühe ERRU-päringu
   saatmine, teavituste WS.
8. PR `dev` vastu, oota roheline CI (E2E + Quality Gate).
9. Uuenda `docs/muudatused.md` (kui kasutajale nähtav — enamasti pole,
   v.a kui TARA nime-fix vms).
10. `docs/workingdocs/migration_guide_to_rust_ruuter.md` — täienda kui
    Ruuter-samm.

## 8. Riskijärjestus (kõrgeim ees)

1. **Ruuter 0.9.11 H1** — 242 template-kutset, projektiguard. **Ära mine
   0.9.11-le enne malli-jaotust.** (0.9.11 pole veel avaldatudki.)
2. **TIM 0.2.1 dot-claim-path** — ilma selleta katkevad TARA nimed päris
   keskkonnas. TIM 0.3.0 discovery-fail-closed — `tara-mock` peab andma
   `https://` endpointe.
3. **Resql org + R1** — `askendest` → `turnerrainer`, `allow_datasource_header:
   false`.
4. **XTR H3** — SOAP-fault `detail` kadumine, kui ERRU-handlerid seda parsivad.
5. **Ruuter 0.9.10 #63** — 3 faili üle vaadata (madal).
6. **DataMapper** — sisuliselt no-op upgrade.
