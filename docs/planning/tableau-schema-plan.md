# Megaplan: `tableau` analüütikaskeem — hallatud materialiseeritud vaated

> **Staatus:** PR1 teostamisel. Otsus fikseeritud ADR-009-s.
> **Kontekst:** `docs/planning/Tableau_guidlines.md` §3 pakkus juba `tableau.*_current`
> vaadete komplekti, aga **kopeeri-kleebi kujul, mille DBA jooksutab käsitsi**. See
> triivib iga `forms.*` skeemimuudatusega. Käesolev plaan viib need versioonihaldusse
> (Liquibase), teeb neist **materialiseeritud** vaated ja lisab öise värskenduse.

---

## 1. Miks materialiseeritud, mitte tavalised vaated

Analüütika jaoks **ajalugu ei ole oluline** — loeb ainult iga olemi viimane
mittekustutatud snapshot. INSERT-only mudelis tähendab tavaline vaade
`SELECT DISTINCT ON (key) ... ORDER BY key, created_at DESC` **kogu ajaloo-tabeli
skaneerimist iga päringu kohta**.

**Materialiseeritud vaade salvestab füüsiliselt ainult ~N aktiivset rida** (üks per
loogiline võti) — 5–50× väiksem kui baastabel. Selle peale saab panna **täpselt
need indeksid mida Tableau vajab** (`UNIQUE(key)`, `company_reg_code`,
`control_date`, `authority`, `status`, `inspector_organisation_id`) ja need
indeksid katavad **ainult aktiivseid andmeid** → punktipäringud ja JOIN-id on
välkkiired, isegi täisskaneering on odav.

| | Tavaline vaade | Materialiseeritud vaade |
|---|---|---|
| Päringu kulu | `DISTINCT ON` kogu ajaloo peal iga kord | skaneering kompaktsest indekseeritud tabelist |
| Indekseeritavus | ei saa (arvutatakse päringu ajal) | **jah — kõva indeks aktiivsel hulgal** |
| Värskus | reaalajas | kuni 24h vana (öine `REFRESH`) |
| Tableau extract | loeb aeglaselt | loeb kiiresti |

Tableau ühendub niikuinii **öise Extract-refresh'iga** (Tableau_guidlines §10) —
24h värskus on täiesti piisav. Kui kunagi vaja reaalaega mõne olemi jaoks: lisada
kõrvale tavaline `tableau.<olem>_live` vaade (faas 3).

`REFRESH MATERIALIZED VIEW CONCURRENTLY` ei tohi joosta funktsiooni/transaktsiooni
sees → `tableau.refresh_all()` teeb **mitte-concurrent** `REFRESH`-i (lühike
ACCESS EXCLUSIVE lukk per vaade, 03:00 replika peal — keegi ei pärii).

### Miks mitte inkrementaalne matview?

PostgreSQL-il **ei ole** sisseehitatud inkrementaalset matview-hooldust (IVM).

- **`pg_ivm` laiendus** (SRA OSS) annab `CREATE INCREMENTAL MATERIALIZED VIEW` +
  trigger-põhise inkrementaalse hoolduse — aga **ei ole AWS RDS toetatud
  laienduste nimekirjas**. Meie toodang on RDS → ei sobi.
- **Käsitsi inkrementaalne** (baastabelid on append-only, seega `INSERT INTO
  tableau.X SELECT ... WHERE created_at > <viimane_refresh>` + muutunud võtmete
  DELETE/re-INSERT) = IVM käsitsi taasehitamine — habras, ja „asenda muutunud
  võti" samm vajab niikuinii `DISTINCT ON` loogikat. Marginaalne võit.
- **Täisrefresh on niikuinii odav.** `tableau.form_overview` refresh = üks
  `DISTINCT ON` skaneering `forms.form_search` peal (~tuhandeid–kümneid tuhandeid
  ridu → sekundid). 03:00, replika, keegi ei pärii.
- **Kui lugemine refresh'i ajal muutub probleemiks:** vaheta per-matview
  `REFRESH … CONCURRENTLY` kutseteks (vajab `UNIQUE` indeksit, mis `*_current`-l
  juba on) — cron kutsub siis iga matview eraldi, mitte `refresh_all()` kaudu.
  Faas 3, ainult vajadusel.

---

## 2. Skeem ja roll

```sql
CREATE SCHEMA tableau;
-- Roll luuakse changeset'is (guarditud DO-blokk — CREATE ROLE IF NOT EXISTS PG-s puudub)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    CREATE ROLE tableau_ro NOLOGIN;   -- LOGIN + parool annab DevOps eraldi
  END IF;
END $$;
GRANT USAGE ON SCHEMA tableau TO tableau_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA tableau TO tableau_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA tableau GRANT SELECT ON TABLES TO tableau_ro;
```

`tableau_ro` **ei saa** `SELECT`-i üheski teises skeemis. `users` / `audit` /
`notifications` / `xroad` jäävad täielikult kättesaamatuks — vajalik id→nimi
(nt organisatsioon) **materialiseeritakse `tableau` skeemi** (matview on
turvapiir).

---

## 3. PII — variant A (maskeeritud isikukood, nimed jäävad)

Kõigis `tableau` vaadetes:

| Väli | Teisendus |
|---|---|
| isikukood (`personal_code*`, `drivers[].personalCodeEe`, `punished_person_id_code`, `handler_personal_code`) | `left(md5(<kood>), 12)` — stabiilne pseudonüüm, ei taastuv |
| sünnikuupäev (`drivers[].birthDate`) | `EXTRACT(YEAR ...)::int AS birth_year` |
| isikunimed (inspektor, juht, karistatu, käsitleja) | **jäävad** (demograafia/koormus) |
| `forms.form_search.driver_search` (sisaldab isikukoode) | **ei ekspordita** — asemel `driver_search_masked` (ainult nimed) |

`*_current` matview'des **ei kasuta `SELECT *`** — veerud loetletakse, `drivers`
JSONB asendatakse maskeeritud kujuga, `driver_search` jäetakse välja.

---

## 4. Vaadete kiht

### 4a. Dimensioonid (kõigi faktide jagatud)
| Matview | Allikas | Sisu |
|---|---|---|
| `tableau.classifier_value_current` | `classifier.classifier_value` + `classifier.classifier` | `classifier_code`, `value_code`, `value_name`, `parent_code`, `parent_name`, `is_valid` (arvutatud `valid_from`/`valid_until`-ist) |
| `tableau.ehak` | ↑ `WHERE classifier_code='EHAK'` | maakond → linn/vald hierarhia lamedaks (`county_code`, `county_name`, `city_code`, `city_name`) |
| `tableau.organisation` | `users.organisation` (ainult `id`, `name`, `reg_code`) | id→nimi ilma `users` grant'ita |

### 4b. `tableau.<olem>_current` — üks rida per olem, kõik ärivälja + `_name` veerud
```
compound_form_current          -- WHERE authority='PPA' AND status<>'deleted'
tram_control_card_current
sp_driver_form_current / sp_teammate_form_current
vehicle_technical_form_current / trailer_technical_form_current
adr_form_current / kv_form_current
foreign_violation_form_current / labour_inspection_form_current / good_repute_form_current
```
Iga:
- `DISTINCT ON (<key>) ... WHERE status <> 'deleted' ORDER BY <key>, created_at DESC`
- kõik äriväljad (loetletud, mitte `*`)
- `LEFT JOIN tableau.classifier_value_current` iga `*_code` veeru kohta → `*_name`
- inspektori org → `inspector_organisation_name` (`tableau.organisation` kaudu)
- PII maskeeritud (§3)
- `is_published BOOLEAN` (`status = 'published'`), `days_to_publish INT`
- **Indeksid:** `UNIQUE (<key>)` + `(company_reg_code)`, `(control_date)`,
  `(inspector_organisation_id)`, `(status)`, alamvormidel `(compound_form_key)`

### 4c. `tableau.form_overview` — ristvormi „üks rida per vorm"
Laiem kui `forms.form_search`: `form_type`, `form_key`, `compound_form_key`,
`authority` (**PPA / TRAM**), `form_number`, `version`, `status`, `is_published`,
`main_date`, `control_year`, `county_name`, `vehicle_reg_nr`, `company_reg_code`,
`company_name`, `inspector_organisation_name`, `proceeding_type`, `has_violation`,
`created_at`. Ehitatud **otse baastabelitest** (mitte teistest matview'dest → refresh-järjekord ükskõik).

### 4d. (PR2) lahtivõetud fakt-matview'd
`violation_line`, `driver_line`, `trailer_line`, `document_check_line`,
`erru_point_line` — `CROSS JOIN LATERAL jsonb_array_elements(...)`, koodid
nimedeks joinitud, PII maskeeritud.

### 4e. (PR3) `tableau.<olem>_history` + `tableau.<olem>_live` — kui analüütik küsib

---

## 5. Öine värskendus

```sql
CREATE FUNCTION tableau.refresh_all() RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, matviewname FROM pg_matviews
           WHERE schemaname = 'tableau' ORDER BY matviewname LOOP
    EXECUTE format('REFRESH MATERIALIZED VIEW %I.%I', r.schemaname, r.matviewname);
  END LOOP;
END $$;
```
- Iga matview loeb **baastabeleid otse** → refresh-järjekord ükskõik, uued
  matview'd lisanduvad automaatselt.
- `DSL/Resql/ljvis/POST/tableau/refresh.sql` → `SELECT tableau.refresh_all();`
- `DSL/Ruuter.internal/ljvis/POST/cron/tableau-matview-refresh.yml` → kutsub Resql'i
- `DSL/CronManager/tableau-matview-refresh.yaml` → `0 0 3 * * ?` (03:00 Tallinn,
  pärast e-Toimiku ja riskiskoori cron'e)

---

## 6. Toimetusmehhanism (Liquibase)

- `DSL/Liquibase/changelog/20261115100000-tableau-schema-01-core.sql` (+ `.xml` + `-rollback.sql`)
  — skeem, roll, `refresh_all()`, dimensioonid, `*_current` matview'd, indeksid, grants.
  Rollback: `DROP SCHEMA tableau CASCADE; DROP ROLE IF EXISTS tableau_ro;`
- `20261115100001-tableau-schema-02-overview.sql` — `form_overview`.
- Timestamp-prefiks **> uusim `forms.*` tabeli migratsioon** (`20261112100000`) →
  `includeAll` garanteerib tabelite olemasolu.
- **Kuju muutus:** matview veeru eemaldamine/lisamine → changeset teeb
  `DROP MATERIALIZED VIEW ... CASCADE; CREATE MATERIALIZED VIEW ...` (mitte REPLACE).

---

## 7. CI / triivi vastu

`scripts/validate-dsl.py` uus kontroll (WARN, mitte FAIL):
> kui PR diff muudab `forms.<tabel>` DDL-i (`CREATE TABLE forms.` / `ALTER TABLE forms.`)
> ega puuduta ühtki `changelog/*tableau*` faili → hoiatus „võib lõhkuda
> tableau.<tabel>_current — kontrolli".

E2E jooksutab niikuinii `liquibase update` + `rollback` → katab matview'de
süntaksi ja `refresh_all()` toimimise (E2E-sse lisada üks `SELECT tableau.refresh_all();` smoke).

---

## 8. Rollout

| PR | Sisu | Risk |
|---|---|---|
| **PR1** | skeem + roll + `refresh_all()` + cron + dimensioonid + `*_current` (11) + `form_overview` + indeksid + grants + **ADR-009** + `Tableau_guidlines.md` §3 ümberkirjutus („need on nüüd olemas") | madal — puhtalt lisav, rollback = `DROP SCHEMA CASCADE` |
| **PR2** | fakt-matview'd (`violation_line` jne) + `validate-dsl.py` triivi-check | madal |
| **PR3** | `*_history` + `*_live` + jõudlustuunimine (`CLUSTER`, lisaindeksid tegeliku Tableau SQL-i põhjal) | keskmine |

---

## 9. Lahtised

- `tableau_ro` **LOGIN + parool** annab DevOps (changeset teeb ainult NOLOGIN rolli + grantid).
- Read-replica: matview'd on primaaril, replika saab need streaming'uga; `REFRESH` jookseb primaaril.
- Kui öine `REFRESH` venib > paar minutit → faas 3: split per-matview `CONCURRENTLY`
  kutseteks (vajab `UNIQUE` indeksit, mis `*_current`-l juba on).
