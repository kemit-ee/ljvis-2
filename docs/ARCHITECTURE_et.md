# LJVIS2 – Arhitektuuridokument

**Versioon:** 0.1  
**Kuupäev:** 2026-07-07  
**Staatus:** Ajakohane (`feature/api-structure-rewrite` järgi)

---

## Sisukord

1. [Süsteemi ülevaade](#1-süsteemi-ülevaade)
2. [Arhitektuuristiil](#2-arhitektuuristiil)
3. [Komponendid](#3-komponendid)
4. [Andmevood](#4-andmevood)
5. [API loogika](#5-api-loogika)
6. [Autentimine ja autoriseerimine](#6-autentimine-ja-autoriseerimine)
7. [Audit-logimine](#7-audit-logimine)
8. [Andmemudel](#8-andmemudel)
9. [Viited](#9-viited)

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
| Andmebaas | PostgreSQL 14 |
| Skeemihaldus | Liquibase |
| Autentimine | TIM + TARA (OIDC) |
| Andmete transformatsioon | DMapper (Handlebars mallid) |

---

## 3. Komponendid

### 3.1 Frontend

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

### 3.2 Ruuter (API gateway + äriloogika)

- **Asukoht:** `DSL/Ruuter/ljvis/`
- **Meetodid:** `GET/`, `POST/`, `PUT/`, `DELETE/`
- **Struktuur:** HTTP meetod → versiooni tee → ressurss → toiming

Iga `.yml` fail on üks endpoint. Failitee = URL path:

```
DSL/Ruuter/ljvis/GET/v1/users/admin.yml   →   GET /v1/users/admin
DSL/Ruuter/ljvis/PUT/v1/users/admin.yml   →   PUT /v1/users/admin
```

Jagatud alamvoogud (ei ole HTTP endpointid):
- `DSL/Ruuter/ljvis/TEMPLATES/` — valideerimine, kasutajate autentimine, andmete arvutamine

Lähemalt: [`DSL/ARCHITECTURE.md`](../DSL/ARCHITECTURE.md)

### 3.3 RESQL

- **Asukoht:** `DSL/Resql/ljvis/`
- **Roll:** SQL failid muudetakse automaatselt REST endpointideks
- **Kutsumisviis:** Ruuter kutsub HTTP POST-iga `[#LJVIS_RESQL]/ressurss/päringunimi`
- **Andmebaas:** PostgreSQL, JDBC ühendus

### 3.4 DMapper

- **Asukoht:** `DSL/DMapper/`
- **Roll:** Andmete transformatsioon Handlebars mallide kaudu
- **Kasutus:** Ruuter kutsub DMapper-it, kui vastuse kuju vajab ümberkujundamist

### 3.5 TIM

- **Roll:** Autentimine ja sessioonihaldus
- **Protokoll:** OIDC (dev-s TARA Mock, prod-s päris TARA)
- **Suhtlus Ruuteriga:** Ruuter valideerib igal päringul JWT küpsise TIM-i vastu (`check-user-authority` mall)

### 3.6 Liquibase

- **Asukoht:** `DSL/Liquibase/`
- **Roll:** Andmebaasi skeemi versioonihaldus ja migratsioonid
- **Käivitamine:** Docker Compose'is pärast PostgreSQL healthcheck'i

---

## 4. Andmevood

### 4.1 Tüüpiline API päring (autenditud lugemine)

```
Brauser
  → HTTPS :443 → Frontend (Nginx)
  → /api/v1/... → Ruuter :8086
  → TIM: kontrolli JWT küpsis (check-user-authority)
  → RESQL :8090: SQL päring → PostgreSQL :5432
  → vastus tagasi Ruuteri kaudu Frontendile
```

### 4.2 Kirjutamisoperatsioon (nt kasutaja loomine)

```
Frontend (POST /v1/users/admin)
  → Ruuter: check-user-authority (TIM)
  → Ruuter: väljaväljade valideerimine (TEMPLATES)
  → RESQL: insert_user_account (PostgreSQL)
  → RESQL: insert_audit_event (PostgreSQL)
  → vastus Frontendile
```

### 4.3 Autentimisvoog

```
Brauser → Frontend → TIM (OIDC login)
  → TARA Mock (dev) / päris TARA (prod)
  → TIM tagastab JWT küpsise
  → Frontend salvestab sessiooni
```

### 4.4 Andmevoo diagramm

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

---

## 5. API loogika

### 5.1 URL-i konventsioon

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

### 5.2 Ressursside kaupa

| Ressurss | Lugemine | Nimekiri | Loomine | Muutmine |
|----------|----------|----------|---------|----------|
| Kasutajad | `GET /v1/users/{scope}?q=` | `GET /v1/users/{scope}/search` | `POST /v1/users/{scope}` | `PUT /v1/users/{scope}` |
| Kasutajagrupid | `GET /v1/user-groups/{scope}?q=` | `GET /v1/user-groups/{scope}/search` | `POST /v1/user-groups` | `PUT /v1/user-groups` |
| Klassifikaatorid | `GET /v1/classifiers/classifier?id=` | `GET /v1/classifiers` | — | `PUT /v1/classifiers` |
| Audit-logi | `GET /v1/logs/log?q=` | `GET /v1/logs` | — | — |

Täielik loetelu: [`docs/api-endpoints.md`](api-endpoints.md)  
OpenAPI spetsifikatsioon: [`docs/openapi.yaml`](openapi.yaml)

### 5.3 Valideerimise loogika

Kõik kasutajaandmete sisestamise ja muutmise päringud läbivad:

1. `check-user-authority` — autentimine + õiguste kontroll
2. `user/validate-user-fields` — väljavalideerimine (kohustuslikud väljad, isikukood, e-post)
3. RESQL insert/update — andmebaasi kirjutamine
4. `log/insert_audit_event` — audit-sündmuse kirjutamine

Vea vorming (422):
```json
{ "type": "VALIDATION_ERROR", "field": "personalCode", "code": "invalid_estonian_personal_code" }
```

Frontend käsitleb automaatselt `applyValidationError` kaudu (`shared/api/errors.ts`).

Lähemalt: [`docs/db_errorhandling_rules.md`](db_errorhandling_rules.md)

---

## 6. Autentimine ja autoriseerimine

### 6.1 Autentimine

- Kõik API endpointid on kaitstud `.guard` failidega
- Guard kontrollib JWT küpsist TIM-i vastu (`check-user-authority` mall)
- Ebaõnnestunud autentimine → HTTP 403

### 6.2 Autoriseerimine

- Ressursipõhised õigused koodidega `ressurss.tegevus[.ulatus]`
- Näited: `user.list.admin`, `user_group.update`, `classifier.edit`
- Scope (`admin`/`local`) jõustab nii õiguse koodi kui ka andmefiltri (organisatsioon)

Guard-fail näide (`GET/v1/users/admin/.guard`):
```yaml
check:
  switch:
    - condition: ${u.permissions != null && u.permissions.includes('user.list.admin')}
      next: allow
  next: deny
```

Täielik maatriks: [`docs/permissions-matrix.md`](permissions-matrix.md)

---

## 7. Audit-logimine

Kõik olulised lugemis- ja kirjutamisoperatsioonid logitakse `audit_event` tabelisse.

| Väli | Kirjeldus |
|------|-----------|
| `event_type` | Sündmuse tüüp, nt `user.update`, `user_group.create` |
| `event_category` | Kategooria, nt `user_management` |
| `actor_name` | Toimingu tegija nimi |
| `actor_personal_code` | Toimingu tegija isikukood |
| `description` | Inimloetav kirjeldus |
| `log_content` | JSON detailid (muudetud väljad, ID-d) |

Logimine toimub Ruuteri DSL lõpus (`logAuditEvent` samm) pärast edukat andmebaasi kirjutamist.

Lähemalt: [`docs/audit-logging.md`](audit-logging.md)

---

## 8. Andmemudel

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

Lähemalt: [`docs/data_model.md`](data_model.md)

---

## 9. Viited

| Dokument | Sisu |
|----------|------|
| [`DSL/ARCHITECTURE.md`](../DSL/ARCHITECTURE.md) | DSL failide struktuur, mallid, valideerimine |
| [`docs/api-endpoints.md`](api-endpoints.md) | Kõik API endpointid ja mock-teed |
| [`docs/openapi.yaml`](openapi.yaml) | OpenAPI 3 spetsifikatsioon |
| [`docs/rest-api-design-guide.md`](rest-api-design-guide.md) | REST API kujundamise reeglid |
| [`docs/permissions-matrix.md`](permissions-matrix.md) | Ressursside õiguste maatriks |
| [`docs/audit-logging.md`](audit-logging.md) | Audit-logimise loogika ja sündmused |
| [`docs/data_model.md`](data_model.md) | Andmemudel ja tabelite kirjeldused |
| [`docs/infrastructure-diagram.md`](infrastructure-diagram.md) | Taristu diagrammid (dev + AWS prod + C4) |
| [`docs/infrastructure-access-view.md`](infrastructure-access-view.md) | Ligipääsupiirangud ja võrgutsoonid |
| [`docs/logging-spec.md`](logging-spec.md) | Logimise vorming ja reeglid |
| [`docs/db_errorhandling_rules.md`](db_errorhandling_rules.md) | Andmebaasivigade käsitlus |
| [`docs/use-cases-ljvis.md`](use-cases-ljvis.md) | Kasutuslood (EPIC 02, EPIC 04) |
