# LJVIS2 – Arhitektuuridokument

**Versioon:** 0.1  
**Kuupäev:** 2026-07-07  

---

## Sisukord

1. [Süsteemi ülevaade](#1-süsteemi-ülevaade)
2. [Arhitektuuristiil](#2-arhitektuuristiil)
3. [Süsteemi arhitektuuridiagramm](#3-süsteemi-arhitektuuridiagramm)
4. [Komponendid](#4-komponendid)
5. [Andmevood](#5-andmevood)
6. [API loogika](#6-api-loogika)
7. [Autentimine ja autoriseerimine](#7-autentimine-ja-autoriseerimine)
8. [Audit-logimine](#8-audit-logimine)
9. [X-tee integratsioon ja andmejälgija](#9-x-tee-integratsioon-ja-andmejälgija)
10. [Andmemudel](#10-andmemudel)
11. [Viited](#11-viited)

---

## 1. Süsteemi ülevaade

LJVIS2 on liiklusvalve infosüsteem, mis võimaldab:

- kasutajate ja kasutajagruppide haldust (admin ja lokaalne ulatus)
- klassifikaatorite haldust
- kontrollvormide sisestamist
- audit-logimist kõigi oluliste toimingute kohta

Süsteem töötab Docker Compose põhises dev/test keskkonnas ja on kavandatud AWS EKS-i deployment'iks. Avalik aadress dev-keskkonnas: `https://dev.liiklusvalve.ee/`.

---

## 2. Arhitektuuristiil

**DSL-põhine mikroteenuste orkestratsioon** — backend äriloogika on kirjutatud YAML DSL failidena (Ruuter), mida Ruuter engine täidab reaalajas. Ei kasutata traditsioonilist rakendusserverit ega raamistiku äriloogikat.

| Omadus | Väärtus |
|--------|---------|
| Frontend | React + Vite + TypeScript |
| API gateway | Ruuter (YAML DSL) |
| SQL kiht | RESQL (SQL failid → REST endpointid) |
| Andmebaas | PostgreSQL 17 |
| Skeemihaldus | Liquibase |
| Autentimine | TIM + TARA (OIDC) |
| Andmete transformatsioon | DMapper (Handlebars mallid) |

---

## 3. Süsteemi arhitektuuridiagramm

```mermaid
graph TD
    User["Kasutaja (ametnik / admin)"]

    subgraph PublicZone["Avalik tsoon (HTTPS :443)"]
        Frontend["Frontend\nReact + Vite + Nginx\nport 443"]
    end

    subgraph AppZone["Rakendustsoon (sisemine võrk)"]
        Ruuter["Ruuter\nAPI gateway + DSL\nport 8086"]
        RuuterInternal["Ruuter Internal\nSisemised vood\nport 8089"]
        RESQL["RESQL\nSQL → REST\nport 8090"]
        DMapper["DMapper\nAndmete transformatsioon\nport 3005"]
        TIM["TIM\nAutentimine + sessioonid\nport 8085"]
    end

    subgraph DataZone["Andmetsoon"]
        DB[("PostgreSQL\nLJVIS DB\nport 5432")]
        TIMDB[("PostgreSQL\nTIM DB\nport 5432")]
        Liquibase["Liquibase\nSkeemimigratsioonid"]
    end

    subgraph External["Välised teenused"]
        TARA["TARA / OIDC\n(dev: TARA Mock)"]
    end

    User -->|HTTPS| Frontend
    Frontend -->|/api/v1/...| Ruuter
    Frontend -->|/tim/...| TIM

    Ruuter -->|JWT valideerimine| TIM
    Ruuter -->|SQL päringud| RESQL
    Ruuter -->|Transformatsioon| DMapper
    RuuterInternal -->|SQL päringud| RESQL

    RESQL -->|JDBC| DB
    Liquibase -->|Migratsioonid| DB

    TIM -->|Sessioon| TIMDB
    TIM -->|OIDC| TARA
```

---

## 4. Komponendid

### 4.1 Frontend

- **Tehnoloogia:** React 18, Vite, TypeScript, i18next (et/en)
- **Asukoht:** `frontend/src/`
- **Struktuur:** feature-based (`features/users/`, `features/user-groups/`, `features/classifiers/`, jne)
- **API suhtlus:** `shared/api/client.ts` — kõik `get/post/put/delete` kutsed käivad läbi ühtse kliendi
- **Autentimine:** TIM sessiooniküpsis; sessiooni kontroll `AuthContext` kaudu
- **Marsruutimine:** React Router v6; kaitstud marsruudid `ProtectedRoute` komponendiga

Põhifunktsionaalsused:

| Moodul | Kirjeldus |
|--------|-----------|
| `features/users/` | Kasutajate nimekiri, detailvaade, loomine, muutmine |
| `features/user-groups/` | Kasutajagruppide haldus, asutused, õigused, liikmed |
| `features/classifiers/` | Klassifikaatorite ja väärtuste haldus |
| `features/audit-logs/` | Audit-logi vaatamine |
| `features/auth/` | Sisselogimine, sessiooni kontroll, väljalogimine |
| `features/control-forms/` | Kontrollvormide marsruutimine (LJVIS-133) |

### 4.2 Ruuter (API gateway + äriloogika)

- **Asukoht:** `DSL/Ruuter/ljvis/`
- **Meetodid:** `GET/`, `POST/`, `PUT/`, `DELETE/`
- **Struktuur:** HTTP meetod → versiooni tee → ressurss → toiming

Iga `.yml` fail on üks endpoint. Failitee = URL path:

```
DSL/Ruuter/ljvis/GET/v1/users/admin.yml   →   GET /v1/users/admin
DSL/Ruuter/ljvis/PUT/v1/users/admin.yml   →   PUT /v1/users/admin
```

Jagatud alamvoogud (ei ole HTTP endpointid):
- `DSL/Ruuter/ljvis/GET/templates/` — valideerimine, kasutajate autentimine, andmete arvutamine

Lähemalt: [`DSL/ARCHITECTURE.md`](../DSL/ARCHITECTURE.md)

### 4.3 Ruuter Internal (X-tee gateway)

- **Asukoht:** `DSL/Ruuter.internal/ljvis/`
- **Roll:** Sisemiste ja X-tee kaudu saabuvaute päringute käsitlemine — **ei ole nginx-ist proxitud**, ligipääsetav ainult X-tee turvaserveri ja konteinerivõrgu kaudu
- **Teenused:** X-tee inbound päringud (isiku andmed, töökontrollid), andmejälgija REST API (DUMonitor v2), cron-päringud

### 4.4 RESQL

- **Asukoht:** `DSL/Resql/ljvis/`
- **Roll:** SQL failid muudetakse automaatselt REST endpointideks
- **Kutsumisviis:** Ruuter kutsub HTTP POST-iga `[#LJVIS_RESQL]/ressurss/päringunimi`
- **Andmebaas:** PostgreSQL, JDBC ühendus

### 4.5 DMapper

- **Asukoht:** `DSL/DMapper/`
- **Roll:** Andmete transformatsioon Handlebars mallide kaudu
- **Kasutus:** Ruuter kutsub DMapper-it, kui vastuse kuju vajab ümberkujundamist

### 4.6 TIM

- **Roll:** Autentimine ja sessioonihaldus
- **Protokoll:** OIDC (dev-s TARA Mock, prod-s päris TARA)
- **Suhtlus Ruuteriga:** Ruuter valideerib igal päringul JWT küpsise TIM-i vastu (`check-user-authority` mall)

### 4.7 Liquibase

- **Asukoht:** `DSL/Liquibase/`
- **Roll:** Andmebaasi skeemi versioonihaldus ja migratsioonid
- **Käivitamine:** Docker Compose'is pärast PostgreSQL healthcheck'i

---

## 5. Andmevood

### 5.1 Tüüpiline API päring (autenditud lugemine)

```
Brauser
  → HTTPS :443 → Frontend (Nginx)
  → /api/v1/... → Ruuter :8086
  → TIM: kontrolli JWT küpsis (check-user-authority)
  → RESQL :8090: SQL päring → PostgreSQL :5432
  → vastus tagasi Ruuteri kaudu Frontendile
```

### 5.2 Kirjutamisoperatsioon (nt kasutaja loomine)

```
Frontend (POST /v1/users/admin)
  → Ruuter: check-user-authority (TIM)
  → Ruuter: väljaväljade valideerimine (GET/templates/)
  → RESQL: insert_user_account (PostgreSQL)
  → RESQL: insert_audit_event (PostgreSQL)
  → vastus Frontendile
```

### 5.3 Autentimisvoog

```
Brauser → Frontend → TIM (OIDC login)
  → TARA Mock (dev) / päris TARA (prod)
  → TIM tagastab JWT küpsise
  → Frontend salvestab sessiooni
```

### 5.4 Andmevoo diagramm

```mermaid
sequenceDiagram
    participant B as Brauser
    participant FE as Frontend
    participant R as Ruuter
    participant TIM as TIM
    participant RS as RESQL
    participant DB as PostgreSQL

    B->>FE: HTTPS päring
    FE->>R: /api/v1/...
    R->>TIM: kontrolli JWT küpsis
    TIM-->>R: kasutaja + õigused
    R->>RS: SQL päring
    RS->>DB: JDBC
    DB-->>RS: andmed
    RS-->>R: JSON vastus
    R-->>FE: JSON vastus
    FE-->>B: UI uuendus
```

### 5.5 X-tee inbound päring (andmejälgija logi)

```
X-tee turvaserver (eesti.ee / teise asutuse infosüsteem)
  → ruuter-internal:8089/ljvis/xroad/provide/isiku-kontroll (POST)
  → Ruuter: valideeri isikukood
  → RESQL: päri kontrollid (PostgreSQL)
  → RESQL: lisa xroad.xroad_integration_log kirje
  → RESQL: lisa xroad.aj_usage_log kirje (andmejälgija)
  → vastus X-tee turvaserverile
```

### 5.6 Andmejälgija findUsage (eesti.ee pärib isiku kasutusteabe)

```
eesti.ee → X-tee turvaserver (LJVIS, findUsage teenus)
  → ruuter-internal:8089/ljvis/xroad/v2/findUsage (GET)
  → Ruuter: valideeri X-Road-UserId == userCode
  → RESQL: SELECT xroad.aj_usage_log WHERE user_code = :userCode
  → vastus eesti.ee-le (DUMonitor OpenAPI v2 formaat)
```

---

## 6. API loogika

### 6.1 URL-i konventsioon

Ruuter DSL kasutab **staatilisi path segmente** — dünaamilised identifikaatorid edastatakse **query parameetrina**.

| Muster | Näide | Selgitus |
|--------|-------|----------|
| Üksiku ressursi lugemine | `GET /v1/users/admin?q=<uuid>` | `?q=` on de facto standard ID-paramina |
| Nimekiri / otsing | `GET /v1/users/admin/search?q=Mari&page=0` | `/search` eraldi endpoint |
| Loomine | `POST /v1/users/admin` | body JSON |
| Muutmine | `PUT /v1/users/admin` | `id` body-s |
| Kustutamine | `DELETE /v1/user-groups/user?q=<id>` | `?q=` parameetrina |

Scope (`admin` \| `local`) on **staatiline path segment** — see määrab äriloogika ja õigustekontrolli ulatuse.

Lähemalt: [`docs/rest-api-design-guide.md`](rest-api-design-guide.md)

### 6.2 Ressursside kaupa

| Ressurss | Lugemine | Nimekiri | Loomine | Muutmine |
|----------|----------|----------|---------|----------|
| Kasutajad | `GET /v1/users/{scope}?q=` | `GET /v1/users/{scope}/search` | `POST /v1/users/{scope}` | `PUT /v1/users/{scope}` |
| Kasutajagrupid | `GET /v1/user-groups/{scope}?q=` | `GET /v1/user-groups/{scope}/search` | `POST /v1/user-groups` | `PUT /v1/user-groups` |
| Klassifikaatorid | `GET /v1/classifiers/classifier?id=` | `GET /v1/classifiers` | — | `PUT /v1/classifiers` |
| Audit-logi | `GET /v1/logs/log?q=` | `GET /v1/logs` | — | — |

Täielik loetelu: [`api-endpoints.md`](api-endpoints.md)
OpenAPI spetsifikatsioon: [`openapi.yaml`](../openapi.yaml)

### 6.3 Valideerimise loogika

Kõik kasutajaandmete sisestamise ja muutmise päringud läbivad:

1. `check-user-authority` — autentimine + õiguste kontroll
2. `user/validate-user-fields` — väljavalideerimine (kohustuslikud väljad, isikukood, e-post)
3. RESQL insert/update — andmebaasi kirjutamine
4. `log/insert_audit_event` — audit-sündmuse kirjutamine

Vea vorming (422) — RFC 7807 Problem Details:
```json
{
  "type": "https://ljvis.kemit.ee/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "code": "ERR-422-004",
  "errors": [
    { "field": "personalCode", "code": "invalid_estonian_personal_code", "message": "Vigane isikukood" }
  ]
}
```

Frontend käsitleb automaatselt `applyValidationError` kaudu (`shared/api/errors.ts`).

Lähemalt: [`docs/db_errorhandling_rules.md`](db_errorhandling_rules.md)

---

## 7. Autentimine ja autoriseerimine

### 7.1 Autentimine

- **Projektiülene guard** `DSL/Ruuter/ljvis/.guard.yml` (Ruuter issue #39) kaitseb
  KÕIKI `ljvis` route'e igal HTTP-meetodil kõige välimise guardina. Kontrollib
  sessiooniküpsist TIM-i vastu (`templates/check-user-authority`) täpselt üks kord.
- Ebaõnnestunud autentimine → HTTP 401.
- Guard annab tulemuse muutujas **`auth_user`** edasi nii alamkausta permission-
  guardidele kui handleritele — seega ei autendi ükski handler enam ise.
- Erandid (`declaration.override_ancestors: true`, bypass'ivad projektiülese guardi):
  `auth/**` (avalik login), `**/mock/**` (dev/CI), `v1/citizen/**` (TARA
  kodaniku-sessioon, `templates/citizen-authority`), ERRU verbi-guardid (autendivad ise).

### 7.2 Autoriseerimine

- Ressursipõhised õigused koodidega `ressurss.tegevus[.ulatus]`
- Näited: `user.list.admin`, `user_group.update`, `classifier.edit`
- Scope (`admin`/`local`) jõustab nii õiguse koodi kui ka andmefiltri (organisatsioon)
- Iga alamkausta `.guard.yml` on puhas õiguse-kontroll (`auth_user` juba olemas):

```yaml
# DSL/Ruuter/ljvis/GET/v1/classifiers/.guard.yml
check:
  switch:
    - condition: ${auth_user.permissions != null && auth_user.permissions.includes('classifier.list')}
      next: allow
  next: deny

allow: { status: 200, return: "ok", next: end }
deny:  { status: 403, return: "forbidden", next: end }
```

Guardid **stackivad** (kõik ülemad peavad läbima, väljast sisse):
projektiülene `*` → meetodi-juur → tee-esivanemad → siht. `override_ancestors: true`
asendab kõik ülemad selle alampuu jaoks.

CI **guard-audit** job bootib pinnitud Ruuteri image'i ja nõuab, et
`GET /_/unguarded` näitaks 0 valveta route'i.

Lähemalt: [`docs/rest-api-design-guide.md §6.4`](rest-api-design-guide.md)

Täielik maatriks: [`docs/permissions-matrix.md`](permissions-matrix.md)

---

## 8. Audit-logimine

Kõik olulised lugemis- ja kirjutamisoperatsioonid logitakse `audit_event` tabelisse.

| Väli | Kirjeldus |
|------|-----------|
| `event_id` | ULID (26 märki, Crockford base32). Primaarvvõti. Genereeritakse `log-audit-event` template'is enne INSERT-i. |
| `event_type` | Sündmuse tüüp, nt `user.update`, `user_group.create` |
| `event_category` | Kategooria, nt `user_management` |
| `actor_name` | Toimingu tegija nimi |
| `actor_personal_code_hash` | Toimingu tegija isikukoodi SHA-256 räsi (salted) — selgetekstilist isikukoodi ei salvestata |
| `description` | Inimloetav kirjeldus |
| `log_content` | JSONB detailid (muudetud väljad, ID-d) |
| `created_at` | Sündmuse aeg (UTC), serveri poolne timestamp |

Logimine toimub Ruuteri DSL lõpus (`logAuditEvent` samm läbi `GET/templates/audit/log-audit-event.yml`) pärast edukat andmebaasi kirjutamist.

Lähemalt: [`docs/audit-logging.md`](audit-logging.md)

---

## 9. X-tee integratsioon ja andmejälgija

### 9.1 X-tee arhitektuur

LJVIS kasutab X-teed kahes suunas:

| Suund | Kirjeldus | Näited |
|-------|-----------|--------|
| **Outbound** (tarbija) | LJVIS küsib andmeid teistest registritest | Rahvastikuregister, e-Toimik, Äriregister, Liiklusregister |
| **Inbound** (pakkuja) | Teised asutused küsivad andmeid LJVIS-ist | isiku-kontroll, isiku-ettevote-kontrollid, register-job-inspection-v3 |

Kõik X-tee päringud käivad läbi Ruuter Internal konteinerist. Ruuter Internal ei ole nginx-ist avalikult eksponeeritud — ainult X-tee turvaserver pääseb ligi.

### 9.2 Andmejälgija (DUMonitor)

Andmejälgija on RIA koordineeritud infrastruktuur (IKS § 19, § 25), mis võimaldab isikul eesti.ee portaalis näha, kes tema andmeid LJVIS-is on töödelnud.

**Viide:** [RIA Andmejälgija GitHub](https://github.com/e-gov/AJ/) · [DUMonitor OpenAPI v2.1.0](https://github.com/e-gov/AJ/blob/master/doc/spetsifikatsioonid/dumonitor-openapi.yaml)

LJVIS implementeerib DUMonitor OpenAPI v2.1.0 kolme endpointiga:

| Endpoint | URL | Kirjeldus |
|----------|-----|-----------|
| `heartbeat` | `GET /ljvis/xroad/v2/heartbeat` | Elutuukse |
| `usagePeriod` | `GET /ljvis/xroad/v2/usagePeriod` | Ajavahemik mille kohta on kasutusteave |
| `findUsage` | `GET /ljvis/xroad/v2/findUsage` | Isiku kasutusteabe kirjed (paginated) |

**Mis sündmused logitakse AJ-sse:**

| Sündmus | Tingimus |
|---------|----------|
| `isiku-kontroll` X-tee päring | Iga edukas päring |
| `isiku-ettevote-kontrollid` X-tee päring | Iga edukas päring |
| `register-job-inspection-v3` X-tee sisestus | Ainult kui `juhi_isikukood` esitati |

**Arhitektuuriotsus (ADR-005):** `xroad_integration_log` jääb puutumata — AJ kirjed lähevad eraldi append-only tabelisse `xroad.aj_usage_log`. Vt [`docs/andmejalgija-seadistamine.md`](../andmejalgija-seadistamine.md).

---

## 10. Andmemudel

Põhilised tabelid:

| Tabel | Kirjeldus |
|-------|-----------|
| `user_account` | Kasutaja põhiandmed |
| `user_account_data_state` | Kasutaja andmete ajalugu (snapshot-põhine) |
| `user_group` | Kasutajagrupp |
| `user_group_user_account` | Kasutaja ↔ grupp seos |
| `user_group_organisation` | Grupp ↔ asutus seos |
| `user_group_permission` | Grupp ↔ õigus seos |
| `organisation` | Asutus |
| `permission` | Õigus |
| `classifier` | Klassifikaatori päis |
| `classifier_value` | Klassifikaatori väärtus (kehtivusperioodiga) |
| `audit_event` | Audit-logi sündmused |

**X-tee skeema (`xroad`):**

| Tabel | Kirjeldus |
|-------|-----------|
| `xroad.xroad_integration_log` | Kõigi X-tee päringute integratsioonilogi (outbound + inbound) |
| `xroad.aj_usage_log` | Andmejälgija kasutusteabe logi — **append-only** (IKS § 19, § 25) |

Lähemalt: [`docs/data_model.md`](data_model.md)

---

## 11. Viited

| Dokument | Sisu |
|----------|------|
| [`DSL/ARCHITECTURE.md`](../DSL/ARCHITECTURE.md) | DSL failide struktuur, mallid, valideerimine |
| [`api-endpoints.md`](api-endpoints.md) | Kõik API endpointid ja mock-teed |
| [`openapi.yaml`](../openapi.yaml) | OpenAPI 3 spetsifikatsioon |
| [`docs/rest-api-design-guide.md`](rest-api-design-guide.md) | REST API kujundamise reeglid |
| [`docs/permissions-matrix.md`](permissions-matrix.md) | Ressursside õiguste maatriks |
| [`docs/audit-logging.md`](audit-logging.md) | Audit-logimise loogika ja sündmused |
| [`docs/data_model.md`](data_model.md) | Andmemudel ja tabelite kirjeldused |
| [`docs/infrastructure-diagram.md`](infrastructure-diagram.md) | Taristu diagrammid (dev + AWS prod + C4) |
| [`docs/infrastructure-access-view.md`](infrastructure-access-view.md) | Ligipääsupiirangud ja võrgutsoonid |
| [`docs/logging-spec.md`](logging-spec.md) | Logimise vorming ja reeglid |
| [`docs/db_errorhandling_rules.md`](db_errorhandling_rules.md) | Andmebaasivigade käsitlus |
| [`docs/use-cases-ljvis.md`](use-cases-ljvis.md) | Kasutuslood (EPIC 02, EPIC 04) |
| [`docs/andmejalgija-seadistamine.md`](../andmejalgija-seadistamine.md) | Andmejälgija X-tee turvaserveri seadistusjuhend |
| [RIA Andmejälgija GitHub](https://github.com/e-gov/AJ/) | AJ spetsifikatsioon, rakendusjuhend, OpenAPI (väline) |
