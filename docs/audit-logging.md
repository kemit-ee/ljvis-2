# Audit sündmuste logimine

## Ülevaade

Kõik audit sündmused kirjutatakse `audit.audit_event` tabelisse RESQL kaudu (`POST [LJVIS_RESQL]/log/insert_audit_event`). Tabel on **INSERT-only** — kirjeid ei kustutata ega uuendata.

---

## Logitavad väljad

| Väli | Kirjeldus |
|---|---|
| `event_type` | Toimingu tüüp (vt loend allpool) |
| `event_category` | Valdkond: `user_management`, `user_group_management`, `classifier_management` |
| `actor_name` | Toimingu tegija nimi (hangib JWT-st) |
| `actor_personal_code` | Toimingu tegija isikukood (hangib JWT-st) |
| `description` | Inimloetav eestikeelne kirjeldus |
| `log_content` | JSON-objekt täiendavate andmetega |
| `created_by` | Sama mis `actor_name` |

---

## Sündmuse tüübid ja tingimused

| `event_type` | `event_category` | Millal logitakse |
|---|---|---|
| `user.view` | `user_management` | **Alati** kasutaja detailvaate avamisel |
| `user.list.view` | `user_management` | **Alati** kasutajate nimekirja vaatamisel |
| `user.list.search` | `user_management` | **Ainult** kui `search.length >= 3` |
| `user.create` | `user_management` | **Alati** uue kasutaja loomisel |
| `user.update` | `user_management` | **Alati** kasutajaandmete muutmisel |
| `user.set_groups` | `user_management` | **Alati** grupiliikmesuste salvestamisel (ka tühja muudatuse korral) |
| `user_group.update` | `user_group_management` | **Alati** grupi muutmisel (kasutajad, organisatsioonid, õigused) |
| `classifier.view` | `classifier_management` | **Alati** klassifikaatori detailvaate avamisel |
| `classifier.list.search` | `classifier_management` | **Ainult** kui `search.length >= 3` |
| `classifier_value.update` | `classifier_management` | **Alati** klassifikaatori väärtuse kehtivuse muutmisel |

---

## Logimise töövoog

Iga Ruuter YML järgib sama malli:

```
1. get_user_context    → hangib JWT-st kasutajaandmed
2. Äriloogika          → RESQL päring (INSERT/UPDATE)
3. buildAuditLog       → kirjelduse ja log_content JSON-i koostamine
4. logAuditEvent       → INSERT audit.audit_event (RESQL kaudu)
5. mapResponse         → vastuse teisendus (DMAPPER)
6. returnSuccess       → vastus kliendile
```



> **NB!** Kirjutamisoperatsioonidel logitakse **enne** vastuse tagastamist (samm 4 enne 5).  
> Lugemisoperatsioonidel (list, view) logitakse **pärast** RESQL vastuse saamist, kasutades vastuses olevaid andmeid (nt isikukoodid, nimed).

---

## Tingimuslik logimine

Mõned operatsioonid logitakse ainult teatud tingimusel:

```
search.length >= 3  →  user.list.search      (kasutajate otsing)
search.length >= 3  →  classifier.list.search (klassifikaatorite otsing)
```

Ilma otsinguta nimekirjavaatamine logib `user.list.view`, aga mitte eraldi otsingusündmust.

---

## `log_content` välja struktuur näidete kaupa

**`user.view`**
```json
{
  "targetPersonalCode": "60001017727",
  "targetName": "Kairi Sepp",
  "scope": "allOrganisations",
  "organisationId": null
}
```

**`user.update`** (organisatsiooni muutusega)
```json
{
  "targetPersonalCode": "60001017727",
  "targetName": "Kairi Sepp",
  "changedFields": ["organisation_id", "email"],
  "previousOrganisationId": 1,
  "newOrganisationId": 2,
  "removedGroupIds": [10, 11]
}
```

**`user.set_groups`**
```json
{
  "targetPersonalCode": "60001017727",
  "targetName": "Kairi Sepp",
  "addedGroupIds": [3, 5],
  "removedGroupIds": [1]
}
```

**`user_group.update`** (kasutajate lisamine)
```json
{
  "targetGroupId": 7,
  "changedFields": [],
  "addedOrganisationIds": [],
  "removedOrganisationIds": [],
  "addedPermissionCodes": [],
  "removedPermissionCodes": [],
  "addedUserPersonalCodes": ["60001017727", "38501220002"],
  "removedUserPersonalCodes": [],
  "cascadeRemovedPersonalCodes": []
}
```

**`classifier.view`**
```json
{
  "classifierId": "42",
  "classifierCode": "RTK"
}
```

---

## Andmevoo sequence diagrammid

### Kirjutamisoperatsioon (nt `user.create`, `user.update`)

```mermaid
sequenceDiagram
    participant K as Klient
    participant R as Ruuter
    participant T as TIM (JWT)
    participant DB as RESQL / DB
    participant DM as DMAPPER

    K->>R: POST /v1/users/admin/edit/insert {body}
    R->>T: check-user-authority (cookie)
    T-->>R: auth_user {firstname, lastname, personalcode}
    R->>R: extractRequestData
    R->>R: validate-user-fields (template)
    alt Valideerimise viga
        R-->>K: HTTP 422 {field_error}
    else Isikukoodi konflikt
        R->>DB: check_personal_code_conflict
        DB-->>R: [{id}]
        R-->>K: HTTP 409 "personal code already exists"
    else OK
        R->>DB: insert_user_account
        DB-->>R: {new user row}
        R->>R: buildAuditLog — koosta description ja log_content
        R->>DB: insert_audit_event {event_type:"user.create", ...}
        DB-->>R: ok
        R->>DM: map_user {users}
        DM-->>R: {mapped user}
        R-->>K: HTTP 200 {user detail}
    end
```

### Lugemisoperatsioon nimekirjaga (nt `user.list.*`)

```mermaid
sequenceDiagram
    participant K as Klient
    participant R as Ruuter
    participant T as TIM (JWT)
    participant DB as RESQL / DB
    participant DM as DMAPPER

    K->>R: POST /v1/users/admin/list {search, page, pageSize}
    R->>T: check-user-authority (cookie)
    T-->>R: auth_user
    R->>R: extractRequestData
    R->>DB: list_users {search, page, pageSize, sorting, organisation_id}
    DB-->>R: [{user rows}]
    R->>DM: map_users_list {users}
    DM-->>R: {content:[], total:N}
    R->>DM: map_personal_codes {users}
    DM-->>R: "60001..., 38501..."
    alt search.length >= 3
        R->>DB: insert_audit_event {event_type:"user.list.search", searchTerm, resultCount}
        DB-->>R: ok
    end
    R->>DB: insert_audit_event {event_type:"user.list.view", page, resultCount, displayedPersonalCodes}
    DB-->>R: ok
    R-->>K: HTTP 200 {content, total}
```

### Lugemisoperatsioon detailvaatega (nt `user.view`, `classifier.view`)

```mermaid
sequenceDiagram
    participant K as Klient
    participant R as Ruuter
    participant T as TIM (JWT)
    participant DB as RESQL / DB
    participant DM as DMAPPER

    K->>R: POST /v1/users/admin/read/get {id}
    R->>T: check-user-authority (cookie)
    T-->>R: auth_user
    R->>R: extractRequestData
    R->>DB: get_user {id, organisation_id:""}
    DB-->>R: [{user row}]
    R->>R: buildAuditLog — hangib nime ja isikukoodi vastusest
    R->>DB: insert_audit_event {event_type:"user.view", targetPersonalCode, targetName}
    DB-->>R: ok
    R->>DM: map_user {users}
    DM-->>R: {mapped user}
    R-->>K: HTTP 200 {user detail}
```

### Grupi kasutajate muutmine (nt `user_group.update`)

```mermaid
sequenceDiagram
    participant K as Klient
    participant R as Ruuter
    participant T as TIM (JWT)
    participant DB as RESQL / DB

    K->>R: POST /v1/user-groups/write/add-users {id, userIds}
    R->>T: check-user-authority (cookie)
    T-->>R: auth_user
    R->>R: extractRequestData
    R->>DB: get_user_group {id} — hangib grupi nime
    DB-->>R: [{name:"..."}]
    alt userIds on tühi
        R->>R: buildEmptyAuditEvent
    else
        R->>DB: set_user_group_users {user_group_id, user_ids, status:"active"}
        DB-->>R: ok
        R->>DB: get_users_by_ids {user_ids} — hangib isikukoodid
        DB-->>R: [{personalCode}, ...]
        R->>R: buildAuditEvent — koosta addedUserPersonalCodes
    end
    R->>DB: insert_audit_event {event_type:"user_group.update", addedUserPersonalCodes, ...}
    DB-->>R: ok
    R-->>K: HTTP 200 "ok"
```

---

## Viited

- Audit tabeli definitsioon: `DSL/Liquibase/changelog/20260605100000-initial-audit.sql`
- Audit lugemise otspunktid: `DSL/Ruuter/ljvis/POST/v1/logs/read/`
- OpenAPI: `docs/openapi.yaml` — tag `logs`
