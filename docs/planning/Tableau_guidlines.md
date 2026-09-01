# Tableau + LJVIS-2 andmebaas — juhend andmetiimile

> **Eesmärk:** anda andmetiimile piisav pilt LJVIS-2 PostgreSQL-i struktuurist, et
> Tableau peal saaks võimalikult kiiresti analüütikat ehitama hakata.
> Dokument on **keskmise detailsusega**: kirjeldab skeemid, analüütiliselt olulised
> tabelid ja nende võtmeveerud, seosed ning peamise komistuskivi (INSERT-only
> snapshot-mudel). Iga veeru ammendavat sõnastikku siin **ei ole** — see elab
> andmebaasis endas `COMMENT`-idena (vt [§9](#9-skeemi-ise-uurimine)).

Sisukord:

1. [Kuidas Tableau ühendub](#1-kuidas-tableau-ühendub)
2. [KRIITILINE: INSERT-only snapshot-mudel](#2-kriitiline-insert-only-snapshot-mudel)
3. [Valmis "latest" vaated — käivita see esimesena](#3-valmis-latest-vaated--käivita-see-esimesena)
4. [Skeemide ülevaade](#4-skeemide-ülevaade)
5. [Tabelid ja võtmeveerud](#5-tabelid-ja-võtmeveerud)
6. [Klassifikaatorite dekodeerimine](#6-klassifikaatorite-dekodeerimine)
7. [JSONB-väljade lahtivõtmine](#7-jsonb-väljade-lahtivõtmine)
8. [Isikuandmed (PII) — hoiatus](#8-isikuandmed-pii--hoiatus)
9. [Skeemi ise uurimine](#9-skeemi-ise-uurimine)
10. [Tableau-spetsiifilised soovitused](#10-tableau-spetsiifilised-soovitused)
11. [Näidisretseptid](#11-näidisretseptid)

---

## 1. Kuidas Tableau ühendub

**Ühendusviis:** Tableau **otse-ühendus PostgreSQL-iga** (Tableau natiivne PostgreSQL-konnektor).

Soovitused:

| Teema | Soovitus |
|---|---|
| **Instants** | Ühenduda **read-replica** vastu, mitte primaarbaasi. Analüütikapäringud (eriti `DISTINCT ON` + suured skaneeringud) ei tohi koormata OLTP-baasi. |
| **Andmebaasi kasutaja** | Eraldi **read-only roll** (`GRANT USAGE ON SCHEMA ... ; GRANT SELECT ON ALL TABLES ...`). Ei tohi olla `ljvis` rakenduse kasutaja. |
| **Skeemid** | Anna `SELECT` ainult analüütiliselt olulistele skeemidele: `forms`, `classifier`, `risk`, `erru`, pluss allpool loodav `tableau` vaadete-skeem. **Ära** anna ligipääsu `audit`, `users`, `notifications`, `xroad` skeemidele (vt [§4](#4-skeemide-ülevaade)). |
| **Ühendusmudel** | Kasuta Tableau's **Custom SQL** või allpool loodud `tableau.*` vaateid — **mitte** toorelt `forms.*` tabeleid (vt [§2](#2-kriitiline-insert-only-snapshot-mudel)). |
| **Live vs Extract** | Vt [§10](#10-tableau-spetsiifilised-soovitused). Vaikimisi: **Extract** öise värskendusega. |

Ühendusparameetrid (host, port, db-nimi, kasutaja/parool) küsi DevOps-ilt — neid siia ei kirjuta.

---

## 2. KRIITILINE: INSERT-only snapshot-mudel

**See on kõige olulisem asi selles dokumendis.** Kui seda valesti mõista, tuleb iga
arv topelt või mitmekordselt.

### Kuidas andmed salvestuvad

Enamik LJVIS-2 äritabeleid on **append-only / INSERT-only**. Rida ei uuendata ega
kustutata **kunagi**. Iga muudatus (parandus, staatuse muutus, öine ümberarvutus)
lisab **terve uue rea**, mis kannab muutmata väljad edasi.

Iga sellise tabeli struktuur:

| Veer | Tähendus |
|---|---|
| `id` (BIGSERIAL) | Füüsiline reavõti. **Unikaalne. Iga snapshot on eraldi `id`.** Kasuta seda Tableau extract'i incremental-refresh võtmena. |
| `<entity>_key` (BIGINT) | **Loogiline** olemi identiteet. Kõik ühe olemi snapshot-read jagavad sama `_key` väärtust. **EI ole unikaalne.** Kasuta seda gruppimiseks / joinimiseks. |
| `created_at` (TIMESTAMPTZ) | Snapshot'i tekkeaeg. Järjestusvõti "viimase seisu" leidmiseks. |
| `created_by` (VARCHAR) | Tegija isikukood või süsteemi-identifikaator. Lõtv audit-viide, **FK-d ei ole**. |

### "Praegune seis" = viimane snapshot iga loogilise võtme kohta

```sql
SELECT DISTINCT ON (compound_form_key) *
FROM forms.compound_form
ORDER BY compound_form_key, created_at DESC;
```

- **Praegune seis:** kasuta `DISTINCT ON (<key>) ... ORDER BY <key>, created_at DESC`.
- **Ajalugu / muutuste analüüs:** kasuta kogu tabelit (kõik snapshot-read).
- **Kunagi** ära tee `COUNT(*)` või `SUM(...)` otse toortabelil, kui tahad "praegust" numbrit — saad kõigi vahepealsete mustandite summa.

### Mis EI ole snapshot-tabelid

- `classifier.classifier` ja `classifier.classifier_value` — **on** samuti snapshot (sama muster, võtmed `classifier_key` / `classifier_value_key`).
- `forms.form_attachment` — tavaline tabel, `status` = `active`/`deleted`.
- `risk.company_risk_score` — snapshot, aga loogiline võti on `company_reg_code` (mitte eraldi `_key` veerg).

### Soft-delete

`forms.compound_form.status = 'deleted'` = kogu kontrollijuhtum on kustutatud
(admin). Selliseid ridu **ei tohi** analüütikas arvestada — filtreeri `status <> 'deleted'`.
Alamvormidele kustutamisel eraldi rida ei kirjutata — nende "kustutatus" tuleneb
vanema `compound_form`'i seisust.

---

## 3. Valmis "latest" vaated — käivita see esimesena

Kõige kiirem tee Tableau'ni: loo andmebaasi **eraldi `tableau` skeem**, kuhu paned
"viimane seis" vaated. Tableau ühendub ainult nende vastu ja terve snapshot-loogika
on peidetud.

> Käivitab DBA / DevOps read-replica peal (või primaaril, kui replikat pole).
> Vaated on kerged — päris töö tehakse päringu ajal. Kaalu `MATERIALIZED VIEW`
> + öist `REFRESH`-i, kui jõudlus kannatab (vt [§10](#10-tableau-spetsiifilised-soovitused)).

```sql
CREATE SCHEMA IF NOT EXISTS tableau;
COMMENT ON SCHEMA tableau IS 'Ainult-lugemiseks analüütikavaated (Tableau). Iga vaade = viimane snapshot iga loogilise võtme kohta. Vt docs/planning/Tableau_guidlines.md';

-- ── forms: koondvorm (kontrollijuhtum) ────────────────────────────────
CREATE OR REPLACE VIEW tableau.compound_form_current AS
SELECT DISTINCT ON (compound_form_key) *
FROM forms.compound_form
WHERE status <> 'deleted'
ORDER BY compound_form_key, created_at DESC;

-- ── forms: SP alamvormid ─────────────────────────────────────────────
CREATE OR REPLACE VIEW tableau.sp_driver_form_current AS
SELECT DISTINCT ON (sp_driver_form_key) *
FROM forms.sp_driver_form
ORDER BY sp_driver_form_key, created_at DESC;

CREATE OR REPLACE VIEW tableau.sp_teammate_form_current AS
SELECT DISTINCT ON (sp_teammate_form_key) *
FROM forms.sp_teammate_form
ORDER BY sp_teammate_form_key, created_at DESC;

-- ── forms: tehnovormid ───────────────────────────────────────────────
CREATE OR REPLACE VIEW tableau.vehicle_technical_form_current AS
SELECT DISTINCT ON (vehicle_technical_form_key) *
FROM forms.vehicle_technical_form
ORDER BY vehicle_technical_form_key, created_at DESC;

CREATE OR REPLACE VIEW tableau.trailer_technical_form_current AS
SELECT DISTINCT ON (trailer_technical_form_key) *
FROM forms.trailer_technical_form
ORDER BY trailer_technical_form_key, created_at DESC;

-- ── forms: ADR (ohtlik veos) ─────────────────────────────────────────
CREATE OR REPLACE VIEW tableau.adr_form_current AS
SELECT DISTINCT ON (adr_form_key) *
FROM forms.adr_form
ORDER BY adr_form_key, created_at DESC;

-- ── forms: autoveo katkestamine ──────────────────────────────────────
CREATE OR REPLACE VIEW tableau.kv_form_current AS
SELECT DISTINCT ON (kv_form_key) *
FROM forms.kv_form
ORDER BY kv_form_key, created_at DESC;

-- ── forms: eraldiseisvad vormid ──────────────────────────────────────
CREATE OR REPLACE VIEW tableau.foreign_violation_form_current AS
SELECT DISTINCT ON (foreign_violation_form_key) *
FROM forms.foreign_violation_form
WHERE status <> 'deleted'
ORDER BY foreign_violation_form_key, created_at DESC;

CREATE OR REPLACE VIEW tableau.labour_inspection_form_current AS
SELECT DISTINCT ON (labour_inspection_form_key) *
FROM forms.labour_inspection_form
WHERE status <> 'deleted'
ORDER BY labour_inspection_form_key, created_at DESC;

CREATE OR REPLACE VIEW tableau.good_repute_form_current AS
SELECT DISTINCT ON (good_repute_form_key) *
FROM forms.good_repute_form
WHERE status <> 'deleted'
ORDER BY good_repute_form_key, created_at DESC;

-- ── risk: ettevõtte riskiskoor ───────────────────────────────────────
CREATE OR REPLACE VIEW tableau.company_risk_score_current AS
SELECT DISTINCT ON (company_reg_code) *
FROM risk.company_risk_score
ORDER BY company_reg_code, created_at DESC;

-- ── erru: sõnumipered ────────────────────────────────────────────────
CREATE OR REPLACE VIEW tableau.erru_ctud_request_current AS
SELECT DISTINCT ON (ctud_request_key) *
FROM erru.ctud_request
ORDER BY ctud_request_key, created_at DESC;

CREATE OR REPLACE VIEW tableau.erru_cgr_request_current AS
SELECT DISTINCT ON (cgr_request_key) *
FROM erru.cgr_request
ORDER BY cgr_request_key, created_at DESC;

CREATE OR REPLACE VIEW tableau.erru_rsi_message_current AS
SELECT DISTINCT ON (rsi_message_key) *
FROM erru.rsi_message
ORDER BY rsi_message_key, created_at DESC;

CREATE OR REPLACE VIEW tableau.erru_ncr_message_current AS
SELECT DISTINCT ON (ncr_message_key) *
FROM erru.ncr_message
ORDER BY ncr_message_key, created_at DESC;

-- ── classifier: lame lahtivolditud klassifikaator ────────────────────
CREATE OR REPLACE VIEW tableau.classifier_value_current AS
SELECT
    c.code   AS classifier_code,
    c.name   AS classifier_name,
    cv.classifier_value_key,
    cv.code  AS value_code,
    cv.name  AS value_name,
    cv.parent_key,
    cv.valid_from,
    cv.valid_until,
    (cv.valid_from <= CURRENT_DATE
      AND (cv.valid_until IS NULL OR cv.valid_until > CURRENT_DATE)) AS is_valid
FROM (
    SELECT DISTINCT ON (classifier_value_key) *
    FROM classifier.classifier_value
    ORDER BY classifier_value_key, created_at DESC
) cv
JOIN (
    SELECT DISTINCT ON (classifier_key) *
    FROM classifier.classifier
    ORDER BY classifier_key, created_at DESC
) c ON c.classifier_key = cv.classifier_key;

-- ── forms.form_search — juba olemas, ristvormi otsinguvaade ───────────
-- forms.form_search projitseerib iga vormitüübi viimase mittekustutatud
-- snapshot'i ühisele veerukomplektile (form_type, form_number, status,
-- main_date, county, vehicle_reg_nr, company_reg_code, company_name,
-- driver_search, inspector_org_id, inspector_name, has_violation, ...).
-- Anna Tableau'le SELECT ka sellele: GRANT SELECT ON forms.form_search TO <tableau_role>;

GRANT USAGE ON SCHEMA tableau TO <tableau_role>;
GRANT SELECT ON ALL TABLES IN SCHEMA tableau TO <tableau_role>;
ALTER DEFAULT PRIVILEGES IN SCHEMA tableau GRANT SELECT ON TABLES TO <tableau_role>;
```

**Ajaloo/trendi analüüsiks** (nt "kui palju vorme oli mustandis igal kuul") ühenda
otse toortabeli külge — seal on kõik snapshot-read alles.

---

## 4. Skeemide ülevaade

| Skeem | Sisu | Analüütikas |
|---|---|---|
| **`forms`** | Kontrollivormid: koondvorm (`compound_form`) + tüübipõhised alamvormid + eraldiseisvad vormid. Põhiline analüütika-allikas. | ✅ **Jah** |
| **`classifier`** | Klassifikaatorid ja nende väärtused (koodide → nimede tõlge, EE keeles). | ✅ **Jah** (dimensioonitabelid) |
| **`risk`** | Ettevõtete riskiskoor (EL rakendusmäärus 2022/695): `company_risk_score`. | ✅ **Jah** |
| **`erru`** | ERRU (European Registers of Road Transport Undertakings) sõnumivahetus teiste liikmesriikidega: `ctud_request`, `cgr_request`, `rsi_message`, `ncr_message`. | ✅ **Jah** |
| ~~`xroad`~~ | X-tee integratsioonilogi (`xroad_integration_log`) ja andmejälgija kasutuslogi (`aj_usage_log`). | ❌ **Väljas** — tehniline monitooringu-logi, mitte äriandmed; `aj_usage_log` sisaldab isikukoode. Olemas, aga skoobist väljas. |
| ~~`audit`~~ | Räsiahelaga (hash-chain) sündmuste audit-logi. | ❌ **Väljas** — pole analüütiliselt oluline, muudab ainult raskeks. Mainitud, et teate, et on olemas. |
| ~~`users`~~ | Kasutajakontod, kasutajagrupid, õigused, asutused (`user_account`, `user_group`, `permission`, `organisation`). | ❌ **Väljas** — kasutajahaldus, mitte analüütika. Asutuste nimed lahendatakse vajadusel `classifier` kaudu. Olemas, aga skoobist väljas. |
| ~~`notifications`~~ | Rakendusesisesed ja väljaminevad teavitused. | ❌ **Väljas** — pole analüütiliselt oluline. Olemas, aga skoobist väljas. |

---

## 5. Tabelid ja võtmeveerud

Kõik `forms.*` ja `erru.*` tabelid järgivad [§2](#2-kriitiline-insert-only-snapshot-mudel)
snapshot-mustrit (`id`, `<entity>_key`, `created_at`, `created_by`). Allpool on
loetletud ainult **äriliselt olulised veerud**. Täisloend + tähendused:
`COMMENT`-id andmebaasis ([§9](#9-skeemi-ise-uurimine)).

### 5.1 `forms` — struktuur

```
compound_form (koondvorm / kontrollijuhtum)   ← 1 juhtum
   │  compound_form_key
   ├── sp_driver_form         (autojuhi sõidu- ja puhkeaja kontrollkaart)
   ├── sp_teammate_form       (kaassõitja SP kontrollkaart)
   ├── vehicle_technical_form (mootorsõiduki tehnonõuetele vastavus)
   ├── trailer_technical_form (haagise tehnonõuetele vastavus)
   ├── adr_form               (ohtliku veose kontroll)
   └── kv_form                (autoveo katkestamine)
        alamvormid viitavad vanemale veeruga compound_form_key (lõtv BIGINT, FK-d pole)

Eraldiseisvad vormid (vanemat pole):
   foreign_violation_form   (välisriigi rikkumise andmevorm)
   labour_inspection_form   (Tööinspektsiooni kontrollvorm)
   good_repute_form         (hea maine vorm)
```

> **`authority`** veerg `compound_form`'is: `PPA` (vaikimisi) või `TRAM`
> (Transpordiamet). Sama tabel teenindab mõlemat asutust; eristamiseks kasuta seda
> veergu. `forms.form_search` vaade toodab `form_type` väärtused `compound` vs
> `tram_compound`, `sp_driver` vs `tram_driver`.

### 5.2 `forms.compound_form` — võtmeveerud

| Veer | Tüüp | Tähendus |
|---|---|---|
| `compound_form_key` | BIGINT | Loogiline juhtumi identiteet (grupeeri selle järgi) |
| `form_number` | VARCHAR | `koond-AAAA-NNNNN` (TRAM: `tram-AAAA-NNNNN`) |
| `authority` | VARCHAR | `PPA` / `TRAM` |
| `status` | VARCHAR | `saved` / `confirmed` / `published` / `deleted` |
| `control_date`, `control_time` | DATE/TIME | Kontrolli aeg |
| `control_country_code`, `county`, `city`, `road` | VARCHAR | Kontrolli asukoht (`county` = maakond, klassifikaator) |
| `vehicle_reg_nr`, `vehicle_country_code`, `vehicle_make`, `vehicle_model`, `vehicle_category_code` | VARCHAR | Sõiduk |
| `company_reg_code`, `company_name`, `company_country_code`, `company_county` | VARCHAR | Vedaja |
| `inspector_first_name`, `inspector_last_name`, `inspector_organisation_id`, `inspector_unit` | VARCHAR | Kontrollija (**PII**) |
| `trailers` | JSONB | Haagiste massiiv (max 3) |
| `drivers` | JSONB | Juhtide massiiv (max 2) — sisaldab isikukoode (**PII**) |
| `files` | JSONB | Failimetaandmed (binaarid S3-s) |

### 5.3 `forms.sp_driver_form` / `sp_teammate_form` — võtmeveerud

Autojuhi/kaassõitja sõidu- ja puhkeaja kontrollkaart.

| Veer | Tüüp | Tähendus |
|---|---|---|
| `sp_driver_form_key` | BIGINT | Loogiline identiteet |
| `compound_form_key` | BIGINT | Vanem koondvorm |
| `sub_form_number` | VARCHAR | `sp-AAAA-NNNNN` |
| `status` | VARCHAR | `saved` / `confirmed` / `published` |
| `selection_status` | VARCHAR | `active` / `removed` (kontrollija eemaldas alamvormi) |
| `transport_type` | VARCHAR | `passenger` / `goods` |
| `result_type` | VARCHAR | Kontrolli tulemus: `ok`, `warning`, `precept`, `driving_ban`, `transport_interruption`, `arrest`, `misdemeanor_proceedings` (vt märkus allpool) |
| `additional_measure` | (uuem veer) | Lisameede; kasutatakse `has_violation` arvutuses |
| `proceeding_type` | VARCHAR | `none` / `summary` / `expedited` / `general` |
| `violations_561_2006`, `violations_165_2014`, `violations_2002_15`, `violations_593_2008`, `violations_2020_1057` | JSONB | Rikkumised EL määruse kaupa: `[{violation_code, severity_code, is_detected}]` |
| `erru_points` | JSONB | ERRU punktid: `[{erru_code, severity_category, source_type}]` |
| `checked_days_count`, `work_days_count` | INTEGER | Kontrollitud/tööpäevade arv |

> **Rikkumise reegel** (`forms.form_search.has_violation`): SP-alamvormil loeb
> rikkumiseks `result_type NOT IN ('ok','KORRAS','HOIATUS')` **VÕI** `additional_measure IS NOT NULL`.
> Puhas `KORRAS`/`HOIATUS` ilma lisameetmeta **ei** loe rikkumiseks. Frontend ei
> salvesta kunagi väärtust `ok` — see on ainult defaultväärtus.

### 5.4 `forms.vehicle_technical_form` / `trailer_technical_form` — võtmeveerud

Struktuurilt identsed. Mootorsõiduki / haagise tehnonõuetele vastavuse kontroll.

| Veer | Tüüp | Tähendus |
|---|---|---|
| `vehicle_technical_form_key` | BIGINT | Loogiline identiteet |
| `compound_form_key` | BIGINT | Vanem |
| `version` | INTEGER | Kuvatav versioon (`/V` sufiks); iga re-salvestus +1 |
| `status` | VARCHAR | `saved` / `confirmed` / `published` |
| `result_type` | VARCHAR | `ok`, `extraordinary_inspection`, `extraordinary_inspection_ta`, `driving_ban` |
| `parts_summary` | JSONB | `[{partCode, status}]` — 1. taseme osade nimekiri |
| `parts_defects` | JSONB | `[{partCode, defectCode, severity}]` — `severity` = `VO`/`OV`/`EOV` |
| `violations` | JSONB | EL rikkumise koodid, nt `["MSI302"]` |
| `result_transport_interruption` | BOOLEAN | Autovedu katkestatud |

### 5.5 `forms.adr_form` — võtmeveerud

Ohtliku veose (ADR) kontroll.

| Veer | Tähendus |
|---|---|
| `adr_form_key`, `compound_form_key`, `version`, `status` | Identiteet / lifecycle |
| `dangerous_goods` (JSONB) | Ohtlike ainete massiiv |
| `infringements` (JSONB) | Rikkumised |
| `result_type` | Kontrolli tulemus (default `ok`) |
| `driver_adr_certificate_number`, `crew_adr_certificate_number` | ADR-tunnistuste numbrid |
| `seal_opened`, `seal_opened_date`, `seal_installed_date` | Plommi info |

### 5.6 `forms.kv_form` — autoveo katkestamine

`kv_form_key`, `compound_form_key`, `version`, `status`, `residence_*` (elukoha
andmed), `legal_bases` (JSONB — õiguslikud alused). `has_violation` = alati `false`
(tulemusevälja pole).

### 5.7 `forms.foreign_violation_form` — eraldiseisev

Välisriigi rikkumise andmevorm. Luuakse ERRU NCR-sõnumist (`erru_message_id`),
olemasolevast politseivormist (`source_police_form_key`) või käsitsi.

| Veer | Tähendus |
|---|---|
| `foreign_violation_form_key` | Loogiline identiteet |
| `form_number` | `vr-AAAA-NNNNN` |
| `status` | `saved` / `confirmed` / `published` |
| `reporting_country_code` | Teate saatnud riik (klassifikaator) |
| `inspection_date`, `inspection_city`, `inspection_region` | Kontrolli aeg/koht |
| `vehicle_*`, `company_*`, `driver_first_name`, `driver_last_name` | Sõiduk / vedaja / juht (**PII**) |
| `sanction_code` | Klassifikaator, default `KORRAS` |
| `violations` | JSONB stringimassiiv, nt `["MSI101","VSI800"]` (EL 1071/2009 koodid) |
| `recommended_measure_code` | Klassifikaator, default `PUUDUVAD` |

> **Rikkumise reegel:** `sanction_code <> 'KORRAS' OR violations <> '[]'`.

### 5.8 `forms.labour_inspection_form` — eraldiseisev

Tööinspektsiooni kontrollvorm.

| Veer | Tähendus |
|---|---|
| `labour_inspection_form_key`, `form_number`, `version`, `status` | Identiteet / lifecycle |
| `inspector_name` | Kontrollija (**PII**) |
| `inspection_date`, `inspection_type` | Kontroll |
| `company_name`, `company_reg_code` | Ettevõte |
| `vehicle_count`, `total_drivers_count` | Mahunäitajad |
| `controls_matrix` (JSONB) | Kontrollide maatriks |
| `violations` (JSONB) | Rikkumised — `has_violation` = `violations <> '[]'` |
| `punished_person_*` | Karistatud isik (**PII**) |

### 5.9 `forms.good_repute_form` — eraldiseisev

Hea maine vorm.

| Veer | Tähendus |
|---|---|
| `good_repute_form_key`, `form_number`, `version`, `status` | Identiteet / lifecycle |
| `personal_code`, `first_name`, `last_name`, `date_of_birth`, `place_of_birth` | Isik (**PII**) |
| `certificate_number`, `certificate_issue_date`, `certificate_country_code` | Tunnistus |
| `fitness_status` | `fit` / `unfit` — `has_violation` = `fitness_status = 'unfit'` |
| `unfit_from_date`, `unfit_until_date` | Sobimatuse periood |

### 5.10 `forms.form_search` — VALMIS ristvormi otsinguvaade

Andmebaasis juba olemas. Projitseerib **iga vormitüübi viimase mittekustutatud
snapshot'i** ühisele veerukomplektile (10 vormitüüpi, sh alamvormid). Alamvormide
äriandmed (sõiduk/ettevõte/juht/asukoht/kuupäev) päritakse vanemalt `compound_form`'ilt.

Ühisveerud: `form_type`, `form_key`, `compound_form_key`, `form_number`, `status`,
`main_date`, `county`, `vehicle_reg_nr`, `company_reg_code`, `company_name`,
`driver_search`, `inspector_org_id`, `inspector_name`, `has_violation`,
`created_at`, `created_by`.

**See on parim lähtepunkt "kõik kontrollid kokku" dashboardile.**
`form_type` võimalikud väärtused: `compound`, `tram_compound`, `foreign_violation`,
`labour_inspection`, `good_repute`, `sp_driver`, `tram_driver`, `sp_teammate`,
`vehicle_technical`, `trailer_technical`, `adr`, `kv`.

### 5.11 `risk.company_risk_score`

| Veer | Tüüp | Tähendus |
|---|---|---|
| `company_reg_code` | VARCHAR | Ettevõtte registrikood (loogiline võti — grupeeri selle järgi) |
| `company_name` | VARCHAR | Nimi arvutuse hetkel |
| `risk_score` | NUMERIC(12,4) | Skoor; **NULL** kui kontrolle pole (`r=0`, riba `Hall`) |
| `risk_band_code` | VARCHAR | `Hall` / `Roheline` / `Kollane` / `Punane` |
| `total_controls` | INTEGER | Kontrollide arv aknas (`r`) |
| `g_factor` | NUMERIC(4,2) | Kaalutegur |
| `window_start`, `window_end` | DATE | Arvutusaken |
| `calculation_trigger` | VARCHAR | `kontrollvorm` / `admin` / `ooine_ymberarvutus` |
| `algorithm_version` | VARCHAR | Nt `2022-695-v1` |

**INSERT-only ajalootabel:** skoori kunagi kohapeal ei uuendata. Iga ümberarvutus
= uus rida. "Praegune skoor" = viimane rida `company_reg_code` kohta
(`tableau.company_risk_score_current`). Ajalugu / trendi analüüs → toortabel.
Vt `docs/risk-score/formula.md`.

### 5.12 `erru.*` — ERRU sõnumipered

Neli tabelit, kõik snapshot + `direction` veerg:

| Tabel | Sõnumitüüp | Suhtlus |
|---|---|---|
| `ctud_request` | Check Transport Undertaking Data (tegevusloa kontroll) | Sünkroonne, üks sihtriik |
| `cgr_request` | Check Good Repute (mainepäring) | Sünkroonne, võib olla broadcast (`cgr_to = ZZ`) |
| `rsi_message` | RoadSideInspection (tehnokontrolli teade) | Asünkroonne, üks sihtriik |
| `ncr_message` | NotifyCheckResult (kontrollitulemuse teade) | Kahepoolne workflow |

Ühised võtmeveerud: `<x>_key` (loogiline), `direction` (`outgoing` = Eesti küsib,
`incoming` = Eestilt küsitakse), `status`, `business_case_id`, `technical_id` (UUID),
`workflow_id` (UUID, korrelatsioonivõti päringu ja vastuse vahel), `sent_at`,
`<x>_from` / `<x>_to` (ISO 3166-1 alpha-2 riigikoodid, kuvatakse `COUNTRY`
klassifikaatori kaudu), `response_content` (JSONB — välissüsteemist saabuv, kunagi
ei muudeta), `handler_personal_code` / `handler_name` (**PII**), `error_message`.

`erru.ctud_request` staatused: outgoing `initiated → sent → responded`;
incoming `received → answered`; ühine `error`.

---

## 6. Klassifikaatorite dekodeerimine

Enamik `*_code` veerge `forms.*` ja `erru.*` tabelites hoiab **klassifikaatori
väärtuse koodi**, mitte inimloetavat teksti. Nimed (EE keeles) elavad
`classifier.classifier_value`'is.

### 6.1 Struktuur

```
classifier.classifier         ← klassifikaator (nt code='COUNTRY', name='Riigid')
   │  classifier_key
   └── classifier.classifier_value   ← väärtus (nt code='EE', name='Eesti')
        classifier_value_key, classifier_key, code, name, parent_key,
        valid_from, valid_until
```

Mõlemad on **snapshot-tabelid**. `parent_key` → hierarhilised klassifikaatorid
(nt osa → rikke kood). `is_valid` ei ole salvestatud — arvuta:
`valid_from <= CURRENT_DATE AND (valid_until IS NULL OR valid_until > CURRENT_DATE)`.

### 6.2 JOIN-muster (kasuta `tableau.classifier_value_current` vaadet)

```sql
-- Näide: koondvormide arv maakonna nime järgi
SELECT
    cv.value_name AS maakond,
    COUNT(*)      AS kontrolle
FROM tableau.compound_form_current cf
LEFT JOIN tableau.classifier_value_current cv
       ON cv.classifier_code = 'EHAK'          -- maakonna klassifikaator
      AND cv.value_code      = cf.county
GROUP BY cv.value_name
ORDER BY kontrolle DESC;
```

Tableau's: too `tableau.classifier_value_current` andmeallikasse ja tee
**relationship** iga koodiveeru jaoks, kalkuleeritud võtmega
`classifier_code + '|' + value_code`. Alternatiiv: kirjuta iga dashboardi jaoks
Custom SQL, mis teeb JOIN-id juba baasis (kiirem, vähem Tableau-poolset loogikat).

### 6.3 Olulisemad klassifikaatorid

| Kood | Sisu | Kus kasutusel |
|---|---|---|
| `EHAK` | Haldusüksused / maakonnad / omavalitsused | `compound_form.county`, `city` |
| `COUNTRY` | Riigid (ISO alpha-2) | `*_country_code`, ERRU `*_from`/`*_to` |
| `VEHICLE_CATEGORY` | Sõiduki kategooriad (N2, N3, M2, M3, O3, O4, ...) | `compound_form.vehicle_category_code` |
| `TRAILER_CATEGORY` | Haagise kategooriad | `trailers[].category_code` |
| `EU_INFRINGEMENT` | EL rikkumiste koodid (MSI/VSI/SI + number) | tehnovormide `violations`, `foreign_violation_form.violations` |
| `DRIVING_VIOLATION` | Sõidu- ja puhkeaja rikkumised | SP-vormide `violations_*` |
| `CARGO_CABOTAGE_VIOLATION`, `PASSENGER_CABOTAGE_VIOLATION` | Kabotaaži rikkumised | `sp_driver_form.cabotage_violations` |
| `TRANSPORT_CLASS` | Veoklassid | `sp_driver_form.transport_classes` |
| `TACHOGRAPH_TYPES` | Sõidumeeriku tüübid | `sp_driver_form.tachograph_type_code` |
| `DOC_RIGHT_CHECK` | Dokumendi/õiguse kontroll | `sp_driver_form.document_checks` |
| `OTHER_DOCUMENTS` | Muud dokumendid | `sp_driver_form.other_documents` |
| `MASS_DIMENSION` | Massi/mõõtmete rikkumised | `sp_driver_form.mass_dimension_measurements` |
| `TECHNICAL_CHECK` | Tehnoülevaatuse osad (1. tase) + rikked (2. tase, `parent_key` kaudu) | tehnovormide `parts_summary`, `parts_defects` |
| `FORM_TYPE` | Vormitüübid | üldine |
| `STRUCTURE_UNIT` / `STRUCTURE_UNIT` | Struktuuriüksused | inspektori plokk |
| `SANCTIONS` | Sanktsioonid (`KORRAS`, ...) | `foreign_violation_form.sanction_code` |
| `RECOMMENDED_MEASURES` | Soovitatud meetmed (`PUUDUVAD`, `MUU`, ...) | `foreign_violation_form.recommended_measure_code` |
| `CTUD_REQUEST_STATUS`, `CTUD_REQUEST_SOURCE`, `CTUD_REQUEST_PURPOSE` | ERRU CTUD staatuse/allika/eesmärgi kuva-sildid | `erru.ctud_request` |

> Täisnimekirja saad: `SELECT DISTINCT classifier_code, classifier_name FROM tableau.classifier_value_current ORDER BY 1;`

### 6.4 Raskusastme (severity) koodid

Rikkumistele omistatakse raskusaste. Kohtad kahte konventsiooni:

- **ERRU / EL:** `MSI` (kõige raskem), `VSI`, `SI`, `MI` (kergeim).
- **Tehnoülevaatus:** `VO` (väike), `OV` (oluline), `EOV` (eluohtlik).

---

## 7. JSONB-väljade lahtivõtmine

Paljud detailandmed (rikkumised, juhid, haagised, failid, mõõtmised) on **JSONB
massiivid** vormireal. Tableau ei oska neid natiivselt normaliseerida — kasuta
**Custom SQL** koos `jsonb_array_elements`-iga.

```sql
-- Näide: üks rida rikkumise kohta (EÜ 561/2006, autojuhi SP-vorm)
SELECT
    sd.sp_driver_form_key,
    sd.sub_form_number,
    cf.control_date,
    cf.county,
    cf.company_reg_code,
    v->>'violation_code'              AS violation_code,
    v->>'severity_code'               AS severity_code,
    (v->>'is_detected')::boolean      AS is_detected
FROM tableau.sp_driver_form_current sd
JOIN tableau.compound_form_current  cf ON cf.compound_form_key = sd.compound_form_key
CROSS JOIN LATERAL jsonb_array_elements(sd.violations_561_2006) AS v;
```

Levinud JSONB-massiivide kujud:

| Väli | Kuju |
|---|---|
| `compound_form.drivers` | `[{driver_role, personal_code_ee, personal_code_foreign, first_name, last_name, citizenship_code, birth_date}]` |
| `compound_form.trailers` | `[{trailer_index, reg_nr, country_code, make, model, vin, first_registration, body_type, category_code}]` |
| `compound_form.files` / `*.files` | `[{file_name, content_type, file_size_bytes, storage_key, uploaded_at, uploaded_by}]` |
| `sp_driver_form.violations_*` | `[{violation_code, severity_code, is_detected}]` |
| `sp_driver_form.erru_points` | `[{erru_code, severity_category, source_type}]` |
| `sp_driver_form.document_checks` | `[{document_code, document_name, severity_code, violation_code}]` |
| `vehicle_technical_form.parts_defects` | `[{partCode, defectCode, severity}]` |
| `foreign_violation_form.violations` | lihtne stringimassiiv: `["MSI101","VSI800"]` |
| `erru.*.response_content` | objekt, mitte massiiv — indekseeri võtme järgi (`->>'riskRating'` jne) |

**Soovitus:** loo iga sageli vajatava JSONB-detaili jaoks eraldi
`tableau.*_violations` / `tableau.*_drivers` vaade (LATERAL-iga nagu ülal), et
Tableau saaks lihtsalt tabelit lugeda.

---

## 8. Isikuandmed (PII) — hoiatus

> ⚠️ **LJVIS-2 sisaldab isikuandmeid. Analüütikas käsitle neid minimaalselt ja
> agregeeritult.** Ära ehita dashboarde, mis kuvavad tuvastatavaid üksikisikuid,
> kui selleks pole selget õiguslikku alust ja vajadust. Isikustatud read jäta
> extract'ist välja või pseudonümiseeri (nt hash isikukoodist) juba SQL-i tasemel.

PII-veerud skoobis olevates tabelites:

| Tabel | PII-veerud |
|---|---|
| `forms.compound_form` | `inspector_first_name`, `inspector_last_name`, `company_owner_first_name`, `company_owner_last_name`, `drivers` JSONB (isikukoodid, nimed, sünniaeg), `created_by` |
| `forms.sp_driver_form` / `sp_teammate_form` | `created_by`; kaudselt juht vanema `drivers`-massiivist |
| `forms.foreign_violation_form` | `inspector_*`, `driver_first_name`, `driver_last_name`, `created_by` |
| `forms.labour_inspection_form` | `inspector_name`, `punished_person_id_code`, `punished_person_first_name`, `punished_person_last_name`, `created_by` |
| `forms.good_repute_form` | `personal_code`, `first_name`, `last_name`, `date_of_birth`, `place_of_birth`, `created_by` |
| `forms.adr_form` | `driver_assistant` JSONB, tunnistuste numbrid, `created_by` |
| `erru.*` | `handler_personal_code`, `handler_name`, `response_content` (võib sisaldada isikuandmeid), `created_by` |
| `forms.form_search` | `driver_search` (koondab juhi isikukoodid + nimed otsinguks), `inspector_name` |

`created_by` on **kõikjal** — see on tegija isikukood või süsteemi-string. Grupeerimiseks
kasuta pigem `inspector_organisation_id` (asutus) kui `created_by` (isik).

**Soovituslik muster** pseudonümiseerimiseks Custom SQL-is:
```sql
SELECT ..., encode(sha256(created_by::bytea), 'hex') AS actor_hash FROM ...
```

---

## 9. Skeemi ise uurimine

Andmebaas on ise dokumentatsioon — iga tabel ja veer kannab `COMMENT`-i.

```sql
-- Kõik tabelid + kirjeldused ühes skeemis
SELECT c.relname AS table_name,
       obj_description(c.oid) AS table_comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'forms' AND c.relkind IN ('r','v')
ORDER BY 1;

-- Ühe tabeli veerud + tüübid + kirjeldused
SELECT a.attname AS column_name,
       format_type(a.atttypid, a.atttypmod) AS data_type,
       col_description(a.attrelid, a.attnum) AS column_comment
FROM pg_attribute a
WHERE a.attrelid = 'forms.compound_form'::regclass
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- Indeksid (mis veerud on filtreerimiseks/joinimiseks kiired)
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'forms' ORDER BY tablename;
```

Skeemi tõde elab siin repos:
`DSL/Liquibase/changelog/*.sql` (Liquibase formatted SQL, `CREATE TABLE` + `COMMENT ON`).

---

## 10. Tableau-spetsiifilised soovitused

### 10.1 Live vs Extract

| | Live | Extract (`.hyper`) |
|---|---|---|
| Millal | Reaalajas monitooring, väikesed päringud | **Vaikimisi valik** — dashboardid, agregeeritud analüütika |
| Miks | — | `DISTINCT ON` + JSONB LATERAL on kallid; extract puhverdab, ei koorma replikat, kiirem viz |
| Värskendus | — | Öine full refresh, või **incremental refresh** |

**Incremental refresh:** kasuta võtmena snapshot-tabeli `id` veergu (BIGSERIAL,
monotoonselt kasvav, iga snapshot uus `id`). **Mitte** `created_at` (ajavööndid,
kellanihked) ega `_key` (kordub). NB: incremental refresh **lisab** ainult uusi
ridu — kuna tabelid on append-only, on see täpselt õige mudel, aga see tähendab
et sinu extract sisaldab **kõiki snapshot'e**; "viimase seisu" filter tuleb teha
kas vaates (`tableau.*_current`) või Tableau arvutatud väljaga.

> Kui vajad extract'i, mis hoiab ainult viimast seisu ja on väike: tee extract
> `tableau.*_current` vaadetest full-refresh'iga. Kui vajad ajalugu: extract
> toortabelist incremental-refresh'iga `id` järgi.

### 10.2 Andmemudel Tableau's

- Eelista **Custom SQL**-i, mis kapseldab `DISTINCT ON` + klassifikaatori-JOIN-id,
  VÕI ühendu `tableau.*_current` vaadete külge. **Ära** too `forms.compound_form`
  toorelt.
- Kasuta **Relationships** (Tableau 2020.2+), mitte vanu joine, kui liidad
  `compound_form_current` ↔ alamvormid ↔ klassifikaatorid. Seosevõtmed:
  - `compound_form_current.compound_form_key` = `sp_driver_form_current.compound_form_key`
  - klassifikaatorid: kalkuleeritud võti `classifier_code + '|' + value_code`
- `forms.form_search` on juba tehtud "üks rida vormi kohta" — kasuta seda
  ülevaate-dashboardi baasina, detailvaated eraldi allikatest.

### 10.3 Jõudlus

- Filtreeri **alati** `status`/`selection_status`/`direction` võimalikult vara.
- Snapshot-tabelitel on indeks `(<key>, created_at DESC)` — `DISTINCT ON` kasutab
  seda. JSONB-väljadel on GIN-indeksid (`violations`, `drivers`, `trailers`, ...).
- Kui `tableau.*_current` vaated jäävad aeglaseks: tee neist **MATERIALIZED VIEW**
  + `REFRESH MATERIALIZED VIEW CONCURRENTLY` öises cron-is (nõuab unikaalset
  indeksit `_key` peal materialiseeritud vaates).
- Väldi Tableau-poolset `COUNTD([... key])` üle miljonite ridade — tee agregeerimine
  SQL-is/extract'is.

### 10.4 Read-level security

Kui erinevad kasutajad tohivad näha erineva asutuse andmeid: rakenda Tableau
**user filter** `inspector_organisation_id` peal (või `authority` PPA/TRAM peal),
või tee andmebaasi tasemel eraldi vaated asutuse kaupa. Isikuandmete tõttu ära
publitseeri isikustatud extract'e laiale auditooriumile.

### 10.5 Ajavöönd

`created_at` on `TIMESTAMPTZ` (UTC). Kuupäevaväljad (`control_date`, `inspection_date`,
`window_start`...) on `DATE` ilma vööndita. Määra Tableau's andmeallika ajavöönd
`Europe/Tallinn`, kui kuvad `created_at` põhjal tunni täpsusega.

---

## 11. Näidisretseptid

### Kontrollid maakonna ja kuu järgi
```sql
SELECT date_trunc('month', control_date)::date AS kuu,
       cv.value_name AS maakond,
       COUNT(*) AS kontrolle,
       COUNT(*) FILTER (WHERE fs.has_violation) AS rikkumisega
FROM forms.form_search fs
LEFT JOIN tableau.classifier_value_current cv
       ON cv.classifier_code = 'EHAK' AND cv.value_code = fs.county
WHERE fs.form_type IN ('compound','tram_compound')
GROUP BY 1, 2
ORDER BY 1, 2;
```

### Riskiribade jaotus (praegune seis)
```sql
SELECT risk_band_code, COUNT(*) AS ettevotteid, ROUND(AVG(risk_score), 2) AS keskmine_skoor
FROM tableau.company_risk_score_current
GROUP BY risk_band_code
ORDER BY array_position(ARRAY['Hall','Roheline','Kollane','Punane'], risk_band_code);
```

### Kõige sagedasemad SP-rikkumised
```sql
SELECT v->>'violation_code' AS kood, v->>'severity_code' AS raskusaste, COUNT(*) AS kordi
FROM tableau.sp_driver_form_current sd
CROSS JOIN LATERAL jsonb_array_elements(
    sd.violations_561_2006 || sd.violations_165_2014 || sd.violations_2002_15
    || sd.violations_593_2008 || sd.violations_2020_1057) AS v
WHERE (v->>'is_detected')::boolean IS TRUE
GROUP BY 1, 2
ORDER BY kordi DESC
LIMIT 30;
```

### ERRU päringute maht ja vastuseaeg suuna kaupa
```sql
SELECT direction,
       date_trunc('month', created_at)::date AS kuu,
       COUNT(*) AS sonumeid,
       COUNT(*) FILTER (WHERE status = 'error') AS vigu
FROM erru.ctud_request           -- kõik snapshot'id: maht ajas
GROUP BY 1, 2
ORDER BY 2, 1;
```

### Vormide läbivool staatuse kaupa (mustand → kinnitatud → avaldatud)
```sql
SELECT form_type, status, COUNT(*) AS vorme
FROM forms.form_search
GROUP BY 1, 2
ORDER BY 1, 2;
```

---

## Kokkuvõte — 5 asja mida meelde jätta

1. **INSERT-only:** iga muudatus = uus rida. "Praegu" = `DISTINCT ON (_key) ORDER BY _key, created_at DESC`.
2. **Kasuta `tableau.*_current` vaateid** (§3), mitte toortabeleid. Ajaloo jaoks toortabel.
3. **Koodid ≠ nimed:** `*_code` veerud tõlgi `classifier.classifier_value` kaudu (§6).
4. **Detailid on JSONB-s:** rikkumised/juhid/haagised — `jsonb_array_elements` Custom SQL-is (§7).
5. **PII:** minimaalselt, agregeeritult, pseudonümiseeritult (§8).
