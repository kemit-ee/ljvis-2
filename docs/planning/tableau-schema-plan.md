# `tableau` analüütikaskeem — teostusplaan

Eraldi `tableau` skeem hallatud (Liquibase) vaadetega, mis annavad Tableau
kasutajale valmis kuju: koodid nimedeks, üks rida per olem, PII maskitud.
Autoriteetne otsus: **ADR-009** (`docs/workingdocs/architecture-decisions.md`).

**Staatus:**
- **PR1 (#305, merged)** — skeem, roll `tableau_ro`, dimensioonivaated,
  `form_overview`. Loodi materialiseeritud vaadetena.
- **PR #307** — materialiseeritud → **tavalised vaated**, öine refresh eemaldatud,
  aluslaua osalised indeksid (`idx_*_tableau_active`).
- **PR2 / PR3** — lahtised (allpool).

---

## 1. Miks tavalised vaated

Analüütika loeb ainult iga olemi viimast mittekustutatud snapshot'i. Tavaline
vaade arvutab `DISTINCT ON (<key>) ... WHERE status <> 'deleted' ORDER BY <key>,
created_at DESC` päringu ajal; kiiruse annab **aluslaua osaline indeks ainult
aktiivsel hulgal** (`(<key>, created_at DESC) WHERE status <> 'deleted'`).
Andmed on reaalajas — Tableau enda öine Extract-refresh annab vahemälu.

Materialiseeritud vaateid kaaluti (väiksem füüsiline hulk, `UNIQUE`-indeks), aga
need tõid öise `REFRESH`-i, luku ja `refresh_all()` funktsiooni. Osalised
indeksid katavad kiirusevajaduse ilma selle keerukuseta.

---

## 2. Skeem ja roll

```sql
CREATE SCHEMA tableau;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableau_ro') THEN
    CREATE ROLE tableau_ro NOLOGIN;   -- LOGIN + parool annab DevOps eraldi
  END IF;
END $$;
```

`tableau_ro` saab ainult `USAGE` + `SELECT` `tableau` skeemis. Tavaline
Postgres vaade jookseb VAIKIMISI **omaniku** (liquibase-kasutaja) õigustega
(`security_invoker` pole seatud), seega roll ei vaja `forms.*` / `classifier.*` /
`users.organisation` grante — ja neid ei anta, sest see laseks lugeda maskimata
isikukoode `forms.compound_form.drivers`-ist. PII maskimine vaadetes (§3) on
tegelik turvapiir.

---

## 3. PII — variant A (maskitud isikukood, nimed jäävad)

| Väli | Teisendus |
|---|---|
| isikukood (`personal_code*`, `drivers[].personalCodeEe`, `punished_person_id_code`, `handler_personal_code`) | `left(md5(<kood>), 12)` — stabiilne pseudonüüm |
| sünnikuupäev (`drivers[].birthDate`) | `EXTRACT(YEAR ...)::int AS birth_year` |
| isikunimed (inspektor, juht, karistatu, käsitleja) | **jäävad** (demograafia / koormus) |
| `forms.form_search.driver_search` (sisaldab isikukoode) | ei ekspordita — asemel `driver_search_names` (regexp'iga eemaldatud numbrijadad) |

Vaadetes ei kasutata `SELECT *` — veerud loetletakse, `drivers` JSONB asendatakse
maskitud kujuga.

---

## 4. Vaadete kiht

### 4a. Dimensioonid (PR1 — olemas)

| Vaade | Allikas | Sisu |
|---|---|---|
| `tableau.classifier_value_current` | `classifier.classifier_value` + `classifier.classifier` | `classifier_code`, `value_code`, `value_name`, `parent_value_code`, `parent_value_name`, `is_valid` (arvutatud `valid_from`/`valid_until`-ist) |
| `tableau.ehak` | ↑ `WHERE classifier_code='EHAK'` | maakond → linn/vald hierarhia lamedaks (`county_code`, `county_name`) |
| `tableau.organisation` | `users.organisation` | `id` → `name`, `code` |

### 4b. `tableau.form_overview` (PR1 — olemas)

Üks rida per kontrollvorm (kõik tüübid), ehitatud `forms.form_search` peale:
`form_type`, `form_key`, `compound_form_key`, `authority` (**PPA / TRAM**),
`form_number`, `status`, `is_published`, `main_date`, `main_year`, `county_key`,
`county_name`, `vehicle_reg_nr`, `company_reg_code`, `company_name`,
`inspector_org_id`, `inspector_organisation_name`, `inspector_name`,
`has_violation`, `driver_search_names`, `vr_reporting_country_code`,
`vr_sanction_code`, `created_at`. Dashboardide alusvaade.

### 4c. `tableau.<olem>_current` — üks rida per olem (PR2)

11 vaadet: `compound_form_current` (`WHERE authority='PPA'`),
`tram_control_card_current`, `sp_driver_form_current`, `sp_teammate_form_current`,
`vehicle_technical_form_current`, `trailer_technical_form_current`,
`adr_form_current`, `kv_form_current`, `foreign_violation_form_current`,
`labour_inspection_form_current`, `good_repute_form_current`.

Iga:
- `DISTINCT ON (<key>) ... WHERE status <> 'deleted' ORDER BY <key>, created_at DESC`
- kõik äriväljad loetletud (mitte `*`)
- `LEFT JOIN tableau.classifier_value_current` iga `*_code` veeru kohta → `*_name`
- inspektori org → `inspector_organisation_name`
- PII maskitud (§3)
- `is_published BOOLEAN`, `days_to_publish INT`
- aluslaua osaline indeks `idx_<t>_tableau_active` (PR #307-s juba loodud)

### 4d. Fakt-vaated (PR2)

`violation_line`, `driver_line`, `trailer_line`, `document_check_line`,
`erru_point_line` — `CROSS JOIN LATERAL jsonb_array_elements(...)`, koodid
nimedeks joinitud, PII maskitud.

### 4e. `*_history` (PR3)

Iga olemi täisajalugu (kõik snapshot'id) analüütikule, kes seda küsib.

---

## 5. Liquibase

- `20261115100000-tableau-schema-01-core.*` — skeem, roll, dimensioonid,
  `form_overview` (PR1).
- `20261117100000-tableau-schema-02-plain-views.*` — matview → tavaline vaade,
  aluslaua osalised indeksid `idx_*_tableau_active` (PR #307).
- Edaspidi: veeru muutus vaates → changeset teeb `CREATE OR REPLACE VIEW`
  (või `DROP VIEW ... CASCADE; CREATE VIEW`, kui veerukuju muutub).
- Timestamp-prefiks > uusim `forms.*` migratsioon → `includeAll` garanteerib
  aluslaudade olemasolu.

---

## 6. CI / triivi vastu

`scripts/validate-dsl.py` (PR2): WARN, kui PR diff muudab `forms.<tabel>` DDL-i
(`CREATE TABLE forms.` / `ALTER TABLE forms.`) ega puuduta ühtki
`changelog/*tableau*` faili → „võib lõhkuda vastava `tableau` vaate".

E2E jooksutab `liquibase update` + `rollback` → katab vaadete süntaksi.

---

## 7. Rollout

| PR | Sisu | Risk |
|---|---|---|
| **PR1 (#305)** | skeem + roll + dimensioonid + `form_overview` | madal — puhtalt lisav |
| **PR #307** | matview → tavaline vaade + aluslaua indeksid | madal — rollback taastab matview'd |
| **PR2** | `<olem>_current` (11) + fakt-vaated + `validate-dsl.py` triivi-check | madal |
| **PR3** | `*_history` + jõudlustuunimine tegeliku Tableau SQL-i põhjal | keskmine |

---

## 8. Lahtised

- `tableau_ro` **LOGIN + parool** annab DevOps (changeset teeb NOLOGIN rolli + grantid).
- Read-replica: vaated on definitsioonina mõlemal, päringud jooksevad replikal.
- Kui mõne vaate `DISTINCT ON` muutub aeglaseks reaalse Tableau koormuse all →
  PR3 jõudlustuunimine (lisaindeksid, vajadusel üksik matview selle vaate jaoks).
