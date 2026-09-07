# Resql spike: `turnerrainer/resql:0.2.0-alpha` katkendlikkuse mõõtmine

**Haru:** `chore/resql-turnerrainer-spike`
**Kuupäev:** 2026-09-07
**Eesmärk:** enne 212 SQL-faili puutumist mõõta, mis *tegelikult* katki läheb
`turnerrainer/resql:0.2.0-alpha` juures — mitte 2026-08-26 (vananenud,
`turnerrainer/resql:alpha` ≈ 0.1.0-alpha.4) analüüsi põhjal, mille tõttu
migratsioon tookord täielikult reverditi (`a3b8f11`).

> **Taust:** vt `migration_guide_to_rust_ruuter.md` §"Resql versiooni valik".
> ljvis Resql on ainus teenus veel `askendest/*` fork'il
> (`askendest/resql:0.1.0-alpha.5`, viimane askendest-tag `.6` on 11. aug —
> liin on külmutatud). Kõik muud Rust-teenused on `turnerrainer/*`.

---

## Seis (2026-09-07)

| Osa | Staatus |
|---|---|
| **Offline deklaratsiooniaudit** (kõik 212 faili) | ✅ **tehtud** |
| **Auto-konversioon** (`declaration:` → `params:`) | ✅ **tehtud** — 212/212, 0 parse-viga |
| **6 deklaratsiooni-drift faili paranda** | ✅ **tehtud** (commit `6d58319`) |
| **Boot-kontroll** | ✅ **tehtud** vahepealse `turnerrainer/resql:0.1.1-alpha` vastu (cached) — **koondus 1. iteratsioonil**, ainus viga "cannot connect datasource" = kõik 212 deklaratsiooni kehtivad. 0.1.1 jagab 0.2.0-ga `params:` vormingut + `deny_unknown_fields` + `validate_against_sql`. |
| **Täis-Newman** (26 kollektsiooni) vs **`turnerrainer/resql:0.2.0-alpha`** + `turnerrainer/ruuter:0.9.9-rc` | ✅ **tehtud** — CI-stack `-p ljvis-ci`, `resql version="0.2.0-alpha"` `endpoints=212`. **16/26 puhast, 12 katki, 176 assert-viga** → ~5 juurpõhjust (§7). Verdikt §8. |

Haru `chore/resql-turnerrainer-spike`:
- `c87a360`, `39733e4`, `dd25a59` — auditi/konverteri skriptid + see doc (**PR-1 merge'itav**)
- `79bce44`, `6d58319` — teisendatud SQL-puu + `Dockerfile`
  (`FROM turnerrainer/resql:0.2.0-alpha`) + `resql.yaml` (R1/R2) +
  6 drift-parandust (**"DO NOT MERGE" — PR-2 sisu**)

---

## 1. Offline deklaratsiooniaudit (`scripts/resql-audit-declarations.py`)

Skript kordab `turnerrainer/resql` `declaration.rs` + `query.rs` parsimist
offline'is (juhtiv `/* … */` blokk + `:name` ekstraktimine samade
skip-reeglitega mis `rewrite_named_params`), et saada kõigi 212 faili seis
ilma iteratiivse boot-loopita (0.2.0 loader katkeb esimese vigase faili
peale).

### Vormingu variatiivsus

| Kuju | Failide arv |
|---|---|
| `declaration:` wrapper (vana) | **212 / 212** |
| `allowlist.body` param-list | 197 |
| `accepts:` listina (`{field,type}`) | 2 (`ehak/list_cities_parishes.sql`, `structure-units/list_structure_units.sql`) |
| parameetrita (`params: {}` uues) | 13 |
| `allowlist.params` (GET-stiil) | 0 |
| YAML-parse vigu | 0 |
| Mitte-ASCII deklaratsiooniblokis (eesti tekst) | 120 — 0.1.1-alpha parandas mitmebaidise-UTF-8 rewriteri, seega **OK** |

**Järeldus:** vorming on 100% ühtlane → mehaaniline konversioon
(`scripts/resql-convert-declarations.py`) katab kõik 212 faili. Käsitsi
tähelepanu vajab ainult allpool loetletu.

### `type: json` → `type: object` (1 fail)

```
DSL/Resql/ljvis/POST/notification/insert_outbound_log.sql  →  template_variables, payload_json
```
0.2.0-s ei ole `json` tüüpi; JSONB-parameeter on `type: object`. Konverter
teeb selle automaatselt. **Kontrollida runtime'is:** `type: object` seob
JSONB-ina — `send-postkast.yml` saadab `JSON.stringify`-tud stringi
(Postkast-töö fix), mis `coerce_to (Object, String)` → JSON-parse →
objekt → OK (lähtekood kinnitab).

### `:name` / deklaratsiooni MISMATCH — **6 faili, parandatud** (`6d58319`)

Need on **päris varjatud vead**, mida `askendest .5` talub (ei valideeri
`:name` vs deklareeritud), aga `turnerrainer 0.2.0` keeldub boot'il
(`declaration::validate_against_sql`). **Kõik 6 parandatud spike'i haru
peal** — deklaratsioon sünkroniseeritud SQL-i tegeliku `:name` hulgaga.
Peale seda: **boot koondub, 0 vigast deklaratsiooni.**

> **PR-2 järelmõju:** kuna `askendest .5` sallib undeclared-key'sid ja
> `turnerrainer 0.2.0` annab `400 UnknownParameterException`, tuleb
> kontrollida et nende 6 endpointi Ruuter-DSL kutsujad saadavad **täpselt**
> parandatud deklaratsiooni-hulga (mitte eemaldatud `spDriverFormKey` jne).
> Newman-mõõtmine (kui tehtav) näitab.

| Fail | Puudub deklaratsioonis | Orphan deklaratsioonis |
|---|---|---|
| `classifier/list_classifiers.sql` | `:pageSize` | `page_size` — **camelCase/snake mismatch**, SQL `LIMIT :pageSize::INTEGER` vs decl `page_size`. Ilmselt pagineerimise param **ei seondu praegu õigesti**. |
| `control-forms/drive-rest-form/driver/insert.sql` | `:created_by` | `spDriverFormKey`, `subFormNumber`, `templateVersion` — SQL-keha uuendati, deklaratsioon jäi vanaks |
| `control-forms/drive-rest-form/driver/update-xroad-fields.sql` | — | `created_by` |
| `control-forms/drive-rest-form/teammate/insert.sql` | `:created_by` | `spDriverFormKey`, `subFormNumber`, `templateVersion` |
| `control-forms/tram-form/sp-driver/insert.sql` | `:created_by` | `atpViolationFound`, `massDimensionNonCompliant`, `spApplicability`, `spDriverFormKey`, `subFormNumber`, `templateVersion` |
| `control-forms/tram-form/sp-driver/update.sql` | — | `atpViolationFound`, `massDimensionNonCompliant`, `spApplicability` |

**PR-2 tegevus:** sünkroniseeri iga faili deklaratsioon tegeliku SQL-iga
(lisa puuduvad, kustuta orphanid). Kontrolli et Ruuteri kutsuja saadab
õiged väljad. `list_classifiers.sql` — kontrolli kas `:pageSize` või
`page_size` on õige (mida Ruuter DSL saadab).

---

## 2. Konverteri väljund (`scripts/resql-convert-declarations.py`)

- 212 / 212 teisendatud, 0 parse-viga.
- Teisendus: `declaration:` wrapper eemaldatud; `version`/`method`/
  `accepts: json`/`returns: json` kustutatud; `allowlist.body[]` +
  `accepts:`(list) → `params: {<name>: {type, required: false}}`;
  `response.fields[]` → `returns: [{name, type, nullable: true}]`;
  `type: json` → `type: object`; `description` + `namespace` alles;
  per-välja `description` alles (0.2.0 `DeclaredParam` lubab).
- **NB:** konverter EI paranda ülal loetletud 6 mismatch-faili — need
  jäävad boot'il vigaseks kuni käsitsi parandatud.

---

## 3. Nelja augusti-blokeerija ümberhindamine (lähtekoodi `/code/Resql` origin/dev)

| # | Aug-blokeerija | 0.2.0-alpha seis (lähtekood) | Spike kontrollib |
|---|---|---|---|
| **1** | Vormingumuutus, 166 (nüüd 212) faili | Mehaaniline, konverter katab; 6 faili käsitsi | boot-loop |
| **2** | Range tüübivalideerimine — string/number segamini | **Osaliselt lahtunud.** `coerce_to`: `type:integer/number` + numbriline STRING → **teisendatakse** (`"42"`→42). AGA `type:string` + JSON number → **endiselt tagasi** ("family mismatch"). `type:number` + `""` → parse-viga → 400. | Newman: `InvalidParameterType` (400) — mis param/fail |
| **3** | `:param::TYPE` cast "ignoreeriti" → `bigint = text` | **Suures osas lahtunud.** `rewrite_named_params` säilitab `::` — `:id::BIGINT` → `$1::BIGINT` Postgresile tervena. 121 ljvis-faili kasutab param-caste. | Newman: `operator does not exist` |
| **4** | `::TEXT` cast `type:number` parameetril → null bait `0x00` | **Lahendatud (eeldus).** 0.1.1-alpha: `bind_pg` fikseeritud OID per deklareeritud tüüp. Muster `COALESCE(:x::TEXT,'')`: 2 faili (`get_user.sql`, `list_users.sql`); `::TEXT, '')` täpne: 5 faili. | Newman: `invalid byte sequence ... 0x00` |

### `coerce_to` täpne maatriks (0.2.0 `src/query.rs:619-676`)

| Deklareeritud | Sissetulev | Tulem |
|---|---|---|
| string/date/datetime/uuid | string | ✅ läbi |
| **string** | **number** | ❌ **tagasi lükatud** ("family mismatch") |
| integer | number (i64 või täisarvuline f64) | ✅ |
| integer | string `"42"` | ✅ (parsitud) |
| integer | `"42.5"` / `"nope"` / `""` | ❌ |
| number | number | ✅ |
| number | string `"3.14"` | ✅; `""` ❌ |
| boolean | bool või `"true"/"1"/"false"/"0"` | ✅ |
| object | object või JSON-stringitud objekt | ✅ |
| iga | null | ✅ → SQL NULL (`required:true`+null → 400) |

**PR-2 tagajärg:** BIGINT-ID parameetrid (`id`, `key`, `form_key`,
`compound_form_key`, `organisation_id`, `user_group_key`, …) tuleks
deklareerida **`type: integer`** — siis võtab `coerce_to` vastu nii
JSON-numbri kui numbrilise-stringi, ja **suur osa `c9ff992` + `79804b7`
~57-faili `Number()`-konversioonidest Ruuteri kutsujates muutub
tarbetuks**.

---

## 4. Config (turvaaudit R1–R9) — ljvis-i mõju

| Muutus | ljvis praegu | ljvis vajab | Põhjus |
|---|---|---|---|
| `allow_datasource_header` `true→false` + allowlist | `true` | **`false`** (spike'is tehtud) | ljvis ei saada `X-Datasource` kuskilt (grep DSL/ + frontend/ = 0). Path-routing (`/ljvis`) on ainus. |
| `cors.allowed_origins` `"*"→""` | `"*"` | **`""`** (spike'is tehtud) | Resql on server-to-server (`[#LJVIS_RESQL]`), brauser ei kutsu otse. |
| `/datasources` 404 vaikimisi | `admin:` puudub | jäta nii | Fingerprint-kaitse; ljvis ei kasuta seda endpointi. |
| `request_timeout_seconds: 0` → boot-fail | `30` | jääb | OK. Boonus: 504 aeglastele + PG `statement_timeout`. |
| sümlingid `sql_dir`-is keelatud | — | — | `find DSL/Resql -type l` = tühi. |

---

## 5. ISO-8601 timestamp — **MADAL**

`TIMESTAMPTZ` UTC serialiseerub `2026-09-06T21:37:44Z` (askendest `.5`
annab juba `T` + `+00:00`; muutub ainult `+00:00` → `Z`).
- Frontend `formatDateTime` = `new Date(x)` → parsib mõlemat.
- Frontend `formatDate` (`dateUtils.ts`, splitib `-`) → ainult DATE-veergudel
  (`valid_from`, `accessStart`, riski-aknad, `inspectionDate`). Timestamp'i
  peal oli see juba katki — `OutboundLogTable.tsx` parandatud
  `formatDateTime`-le eelmises töös.
- **Spike kontrollib:** kas mõni Newman-assertion eeldab literaalselt `+00:00`.

---

## 6. Vahekokkuvõte — formaadi pool (mõõdetud)

| Küsimus | Vastus |
|---|---|
| Kas mehaaniline konversioon katab kõik? | ✅ **Jah** — 212/212, 0 parse-viga |
| Käsitsi-parandust vajavaid faile? | **6** (deklaratsiooni-drift, kõik lahendatud, ≪ augusti hirm) |
| Kas boot koondub? | ✅ **Jah** — 1 iteratsioon (0.1.1-alpha proxy vastu; formaadikontroll identne 0.2.0-ga) |
| `type: json` failid | 1 (`insert_outbound_log.sql`) → auto `type: object` |
| Boot-riski hinnang | **MADAL** — formaadi pool on sisuliselt lahendatud |

---

## 7. Runtime — **täis-Newman `turnerrainer/resql:0.2.0-alpha` + `turnerrainer/ruuter:0.9.9-rc` vastu**

Docker Hub taastus → tõmmatud **päris `turnerrainer/resql:0.2.0-alpha`** +
`turnerrainer/ruuter:0.9.9-rc`. CI-stack (`-p ljvis-ci`) tervelt üleval,
`resql version="0.2.0-alpha"` **`endpoints=212`**. Kõik 26 Postmani
kollektsiooni jooksutatud (`ci-stack-environment.json`, sama mis CI).

### Skoor: **16/26 kollektsiooni puhtad, 12 katki, 176 assert-viga**

`dev` (askendest .5) CI on **roheline** → kõik 176 viga on
0.2.0 + konversiooni regressioon.

| Puhtad (16) | Katki (assert-vigu) |
|---|---|
| audit-log, citizen-representation, foreign-violation-form, form-search, good-repute-form, labour-inspection, **notifications**, organisations, permissions, **risk-scores**, **technical-check-forms**, user-groups, xroad-provide-query, xroad-provide-write | adr-form (43), transport-interruption (33), dashboard (32), driverest-forms (24), cron-jobs (14), tram-form (14), erru-rsi (6), erru-ncr (4), erru-ctud (2), erru-cgr (1), classifiers (1), users (2) |

### 176 viga → **~5 juurpõhjust + kaskaad** (resql-logi taksonoomia, 100 error-rida)

| Kordi | Kind | Põhjus | Parandus |
|---|---|---|---|
| **32** | `InvalidParameterTypeException: expected string, got number` | **Blokeerija 2** — ID-param deklareeritud `type: string`, Ruuter saadab JSON-numbri. Parameetrid: `id`, `key`, `classifier_id`, `actor_org_id`, `organisation_id`, `user_group_id`. Endpointid: `compound-form/get`, `classifier/update_classifier`, `labour-inspection/update`, `dashboard/summary`, `user_group/get_user_group_permissions`, `user/list_users`, `erru/{cgr,ctud,rsi}/append-transition` | **`type: integer`** (~10 SQL-faili, ~15 param) |
| **8+1** | `invalid input syntax for type double precision: ""` / `expected number, got ""` | **Blokeerija 2 variant** — `type: number` param + Ruuter saadab `""`. `drive-rest-form/{driver,teammate}/{insert,update}` (`checkedDaysCount` jne) | Ruuter saadab `null`, VÕI SQL `NULLIF(:x,'')::float8`, VÕI decl muutus |
| **6** | `UnknownParameterException: Unexpected parameter 'X' not declared` | **6 drift-faili** — eemaldasin decl-ist parameetrid, aga Ruuter saadab neid ikka. `drive-rest-form/driver/insert`, `driver/update-xroad-fields`, `tram-form/sp-driver/insert` | decl ↔ SQL ↔ Ruuter-kutsuja sünkroon (per-fail SQL-ülevaatus) |
| **1** | `syntax error at or near "window"` on `log/get_logs_verify` | **`WITH window AS (…)`** — `window` on Postgres reserveeritud sõna. askendest .5 talus, 0.2.0 mitte | nimeta CTE ümber (`window` → `chain`) |
| **~50** | `invalid input syntax for type bigint: "undefined"` | **Kaskaad** — eelnev create kukkus (üks ülalolev) → test ei saanud id-d → saadab literaali `"undefined"` järgnevatesse `get`/`update`/`delete` päringutesse | laheneb ise kui create'id parandatud |
| **2** | check constraint `chk_ctud_*` | **Taotluslikud negatiivsed testid** — MITTE regressioon | — |

### Kaskaadi näide — `adr-form` 43 viga = **1 juurpõhjus**

1. `adr-form/insert` → resql **200 OK** ✅ (insert ise töötab!)
2. `getCompoundFormInsert` → `compound-form/get` `id`-ga **numbrina** → resql **400** (blokeerija 2)
3. Ruuter `extractDriverCodesInsert` (assign) loeb 400-vastust objektina →
   `TypeError: cannot convert 'null' or 'undefined' to object` → **500**
4. Kõik 41 järgnevat testi kaskaadis (vorm loomata → `GET` 404 → …)

⇒ **`compound-form/get` `id`+`key` → `type: integer`** parandab kogu
adr-form + suure osa teistest form-kollektsioonidest. Ruuteri
`extract*ResponseData` sammud võiksid ka 400 kaitsvamalt käsitleda
(propageeri 400, ära 500-ta) — pre-eksisteeriv habras muster.

### Blokeerijad 3 & 4 — **Newman kinnitab RESOLVED** ✅

`risk-scores` (103/0), `user-groups` (58/0), `technical-check-forms` (71/0)
puhtad — need kasutavad `:param::BIGINT` caste ja `COALESCE(:x::TEXT,'')`
optional-filter mustrit laialt. `operator does not exist: bigint = text`
= **0 vastet** logis. `invalid byte sequence 0x00` = **0 vastet**.

### `type: object` (ex `type: json`) → **notifications 59/0** ✅

`insert_outbound_log` `template_variables`/`payload_json` → `type: object`
töötab (Postkast-vool terve).

### Otsesed probe'id (0.1.1-alpha, sama `coerce_to`/`bind_pg`) — kinnitavad

| Test | Tulem |
|---|---|
| `type: string` + `{"x": 1}` | ❌ `expected string, got number` (kõik 3 probitud endpointi) |
| `type: string` + `{"x": "1"}` | ✅ töötab |
| **`type: integer` + `{"x": 1}` JA `{"x": "1"}`** | ✅✅ **mõlemad töötavad** — see on parandus |
| `:user_group_id::BIGINT` cast numbrilise stringiga | ✅ tagastab read (bl. 3 resolved) |
| `COALESCE(:organisation_id::TEXT,'')` filter tühi/set | ✅ ei `0x00` (bl. 4 resolved) |
| eesti täpitähed SQL-is + andmetes | ✅ korrektne |

### Blokeerija 2 — `type: string` param + JSON number → **STILL REAL** ❌

| Endpoint | Param (deklareeritud) | `{"x": 1}` (number) | `{"x": "1"}` (string) |
|---|---|---|---|
| `user/get_user` | `id` : string | `InvalidParameterTypeException: expected string, got number` | `[]` (OK) |
| `user/list_users` | `organisation_id` : string | sama viga | OK, tagastab read |
| `user_group/get_user_group_permissions` | `user_group_id` : string | sama viga | OK, tagastab õigused |

**See on peamine PR-2 runtime-töö.** Ruuter saadab BIGINT-veergude väärtusi
(`auth_user.organisationid`, vormivõtmed jne) sageli JSON-numbrina. Kõik
sellised parameetrid, mis konverter jätab `type: string`-iks, annavad 400.

### Blokeerija 2 lahendus — `type: integer` → **TÖÖTAB MÕLEMAT PIDI** ✅

Sama endpoint, `user_group_id` deklareeritud **`type: integer`** (SQL jääb
`:user_group_id::BIGINT`), resql-image ümber ehitatud:

| `{"user_group_id": 1}` (number) | `{"user_group_id": "1"}` (string) |
|---|---|
| ✅ tagastab read | ✅ tagastab read |

⇒ **PR-2: deklareeri BIGINT-ID parameetrid `type: integer`** → nii number
kui numbriline-string kutsujad töötavad. **`c9ff992` + `79804b7` ~57-faili
`Number()`-konversioonid Ruuteri kutsujates muutuvad tarbetuks.**

### Blokeerija 3 — `:param::BIGINT` cast → **RESOLVED** ✅

`get_user_group_permissions`: `user_group_id` : string, SQL
`WHERE user_group_key = :user_group_id::BIGINT`. `{"user_group_id": "1"}`
→ **tagastab read**. Augusti "operator does not exist: bigint = text" on
KADUNUD — `::` cast läheb Postgresile tervena (`'1'::bigint = ...`).
121 ljvis-faili kasutab param-caste → **puudutamata jätta**.

### Blokeerija 4 — `COALESCE(:x::TEXT,'') = ''` null-bait → **RESOLVED** ✅

`user/list_users`: `COALESCE(:organisation_id::TEXT, '') = ''` +
`l.organisation_id::TEXT = :organisation_id::TEXT`, `organisation_id` : string.
- `{}` (org-filter puudub) → **tagastab read, EI teki `0x00`**
- `{"organisation_id": "1"}` → tagastab filtreeritud read
Stabiilne OID (0.1.1 `bind_pg` fix) töötab. 5 faili selle mustriga —
**puudutamata jätta** (kui hiljem täis-Newman ei näita jääki).

### `type: object` (konverteeritud `type: json`-st) → **TÖÖTAB** ✅

`notification/insert_outbound_log`, `template_variables` : object:
- `"{}"` (JSON-string) → OK
- `{}` (bare objekt) → **ka OK**
⇒ Postkast-töö `JSON.stringify` workaround (`send-postkast.yml`) on **PR-2-s
võib-olla revert'itav** `type: object` + bare objekti kasuks (verifitseeri).

---

## 8. **GO / NO-GO verdikt: GO** ✅ — skoop nüüd täpne

| Blokeerija | Augusti hirm | Spike'i **mõõtmine** (täis-Newman, 2026-09) | PR-2 töö |
|---|---|---|---|
| **1** vorming | 166 faili + tundmatu | **212/212 mehaaniline**, boot koondub | konverter-skript + **6 drift-faili** review |
| **2a** `type:string` + number | ~30 Ruuter + ~15 SQL | **32 error-rida** → ~10 SQL-faili, ~15 ID-param `type: string` | **`type: integer`** neile parameetritele (greppitav) |
| **2b** `type:number` + `""` | (sama) | **9 error-rida** → `drive-rest-form/*` numbrilised väljad | Ruuter `null` VÕI SQL `NULLIF(:x,'')::float8` (~4 faili) |
| **3** `:param::BIGINT` cast | ~25 faili | **RESOLVED** — 0 vastet logis; `risk-scores`/`user-groups`/`technical-check-forms` puhtad | **0** |
| **4** `::TEXT` null-bait | ~10 faili | **RESOLVED** — 0 vastet; optional-filter mustrid töötavad | **0** |
| **5** (uus) `UnknownParameterException` | — | **6 error-rida** — 6 drift-faili Ruuter-kutsujad | 6 drift-faili decl ↔ SQL ↔ kutsuja sünkroon |
| **6** (uus) `WITH window AS` | — | **1 fail** `get_logs_verify` — `window` reserv-sõna | nimeta CTE ümber (1 rida) |
| kaskaad | — | ~50 `bigint: "undefined"` + `adr-form`/`transport-interruption`/`tram-form` 500-d | laheneb ise kui 2a/2b/5 parandatud |

### Reaalne PR-2 skoop (mõõdetud, mitte hinnatud)

1. **Konverteri lõplik + 212 faili** (skript olemas)
2. **~10 SQL-faili: ID-param `type: string` → `type: integer`** — konkreetne nimekirja §7-s
3. **~4 SQL/Ruuter-faili: `type: number` + `""` → `null`/`NULLIF`**
4. **6 drift-faili: decl + SQL + Ruuter-kutsuja sünkroon**
5. **1 rida: `get_logs_verify` CTE ümbernimetus**
6. **Opportunistlik:** ~57 `Number()`-konversiooni Ruuteri kutsujates **KUSTUTADA** (`type: integer` katab), Postkast boolean-workaround revert
7. `resql.yaml` R1/R2, `Dockerfile`, doc-uuendused

**Hinnang: ~1–2 päeva.** Augusti "9–20 h + oota" oli õige oma ajas
(`turnerrainer/resql:alpha` ≈ 0.1.0-alpha.4), aga 0.1.1 + 0.2.0 lahendasid
2 blokeerijat neljast ja `type: integer` teeb 3. lihtsaks + kaotab
`Number()`-churn'i.

### Ruuteri kõrvalmõju (mitte-blokeeriv, aga soovitatav)

`extract*ResponseData` (assign) sammud (`compound-form`, `adr-form`,
`tram-form` publish/save DSL-id) loevad Resql-vastust objektina ilma 400
kaitseta → 400 muutub 500-ks + kaotab veakoodi. **Soovitus PR-2 või eraldi:**
lisa `error:` haru VÕI kontrolli `res.response.status < 300` enne
`res.response.body[0]` lugemist.

---

## 9. Mida PR-1 merge'ib

- see fail (`resql-0.2.0-spike-findings.md`)
- `scripts/resql-audit-declarations.py`
- `scripts/resql-convert-declarations.py` (mustand, "SPIKE/THROWAWAY")

`Dockerfile` + `resql.yaml` + teisendatud SQL-puu (`79bce44`) jäävad harule
**merge'imata** — need on PR-2 sisu (`git checkout dev -- DSL/Resql
docker/resql-ljvis` enne PR-1 avamist, VÕI PR-1 on puhas research-haru).
