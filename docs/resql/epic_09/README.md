---
epic: EPIC 09 - Klassifikaatorite haldamine
document_type: resql_queries
generated: 2026-05-27
version: 1.0
mode: create
---

> **Paigaldusjuhend:** [paigaldusjuhend.md](./paigaldusjuhend.md) — siit leiad täpsed juhised failide kopeerimiseks tootmiskeskkonda.

# EPIC 09 — RESQL Päringud ja Ruuter Ruutingud

## 1. Ülevaade

Loodud 24 SQL faili ja 16 Ruuter DSL faili klassifikaatorite haldamiseks. Kasutatavad tabelid: `classifier_latest`, `classifier_value_latest` (lugemine), `classifier_name_state`, `classifier_value`, `classifier_value_validity_state` (kirjutamine), `classifier_latest`, `classifier_value_latest` (snapshot rebuild). Kõik päringud kasutavad HTTP POST meetodit. Uue klassifikaatori loomine ja kustutamine on väljaspool scope'i.
Ruuteri sisemine leping kasutab kuju `/ljvis2/iam/<entiteet>/v1/<operatsioon>`; source failid paiknevad kujul `DSL/Resql/<MEETOD>/iam/<entiteet>/v1/*.sql` ja runtime laeb need projekti all kujul `/DSL/ljvis2/<MEETOD>/iam/<entiteet>/v1/*.sql`.

## 2. Kaustastruktuur

```
DSL/Resql/
  POST/
    iam/
      classifier/
        v1/
          list.sql
          mock_list.sql
          get.sql
          mock_get.sql
          update.sql
          mock_update.sql
          get_latest_name_state.sql
          mock_get_latest_name_state.sql
      classifier_value/
        v1/
          list.sql
          mock_list.sql
          check_code_exists.sql
          mock_check_code_exists.sql
          create.sql
          mock_create.sql
          create_validity_state.sql
          mock_create_validity_state.sql
          update.sql
          mock_update.sql
          get_latest_validity_state.sql
          mock_get_latest_validity_state.sql
    state_updater/
      classifier_latest/
        build.sql
        mock_build.sql
      classifier_value_latest/
        build.sql
        mock_build.sql
DSL/Ruuter/
  api/
    POST/
      v1/admin/
        classifiers/
          .guard
          list.yml
          mock_list.yml
          get.yml
          mock_get.yml
          update.yml
          mock_update.yml
        classifier-values/
          .guard
          list.yml
          mock_list.yml
          check_code_exists.yml
          mock_check_code_exists.yml
          create.yml
          mock_create.yml
          update.yml
          mock_update.yml
docs/resql/epic_09/
  README.md
  paigaldusjuhend.md
```

## 3. Päringute ja ruutingute nimekiri

### 3.1 `.guard` — classifiers

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Ruuter/api/POST/v1/admin/classifiers/.guard` |
| **Rakendub** | Kõigile `classifiers/` kausta endpointidele |
| **Nõutud permission** | Baastase: `classifier.list` OR `classifier.read` OR `classifier.edit`; `update` endpoint teeb lisaks range `classifier.edit` kontrolli |
| **Anonüümne lubatud** | Ei |

### 3.2 `POST /v1/admin/classifiers/list`

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Resql/POST/iam/classifier/v1/list.sql` |
| **Mock failitee** | `DSL/Resql/POST/iam/classifier/v1/mock_list.sql` |
| **HTTP meetod** | POST |
| **Kirjeldus** | Klassifikaatorite pagineeritud nimekiri otsingu ja sortimisega |
| **Sisendparameetrid** | `:page` (INTEGER), `:pageSize` (INTEGER), `:search` (VARCHAR, optional) |
| **Väljundväljad** | `id`, `classifierId`, `code`, `name`, `description`, `createdAt`, `createdBy`, `totalCount` |
| **Seotud tabelid** | `classifier_latest` |
| **Versioon** | v1 |

### 3.3 `POST /v1/admin/classifiers/get`

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Resql/POST/iam/classifier/v1/get.sql` |
| **Mock failitee** | `DSL/Resql/POST/iam/classifier/v1/mock_get.sql` |
| **HTTP meetod** | POST |
| **Kirjeldus** | Klassifikaatori detailvaade snapshot põhjal |
| **Sisendparameetrid** | `:classifierId` (BIGINT) |
| **Väljundväljad** | `id`, `classifierId`, `code`, `name`, `description`, `createdAt`, `createdBy` |
| **Seotud tabelid** | `classifier_latest` |
| **Versioon** | v1 |

### 3.4 `POST /v1/admin/classifiers/update`

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Resql/POST/iam/classifier/v1/update.sql` |
| **Mock failitee** | `DSL/Resql/POST/iam/classifier/v1/mock_update.sql` |
| **HTTP meetod** | POST |
| **Kirjeldus** | INSERT classifier_name_state — nimi/kirjeldus muutus |
| **Sisendparameetrid** | `:classifierId` (BIGINT), `:name` (VARCHAR), `:description` (VARCHAR, optional), `:createdBy` (BIGINT) |
| **Väljundväljad** | `id`, `classifierId`, `name`, `description`, `createdAt`, `createdBy` |
| **Seotud tabelid** | `classifier_name_state` |
| **Versioon** | v1 |

**Ruuter voog:** require_edit_permission → check_exists → write_name_state → rebuild_snapshot → verify_snapshot → respond

### 3.5 `.guard` — classifier-values

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Ruuter/api/POST/v1/admin/classifier-values/.guard` |
| **Rakendub** | Kõigile `classifier-values/` kausta endpointidele |
| **Nõutud permission** | Baastase: `classifier.read` OR `classifier_value.edit`; write/check endpointid teevad lisaks range `classifier_value.edit` kontrolli |
| **Anonüümne lubatud** | Ei |

### 3.6 `POST /v1/admin/classifier-values/list`

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Resql/POST/iam/classifier_value/v1/list.sql` |
| **Mock failitee** | `DSL/Resql/POST/iam/classifier_value/v1/mock_list.sql` |
| **HTTP meetod** | POST |
| **Kirjeldus** | Klassifikaatori väärtuste pagineeritud nimekiri |
| **Sisendparameetrid** | `:classifierId` (BIGINT), `:page` (INTEGER), `:pageSize` (INTEGER) |
| **Väljundväljad** | `id`, `classifierValueId`, `classifierId`, `classifierCode`, `code`, `name`, `validFrom`, `validUntil`, `isValid`, `createdAt`, `createdBy`, `totalCount` |
| **Seotud tabelid** | `classifier_value_latest` |
| **Versioon** | v1 |

### 3.7 `POST /v1/admin/classifier-values/check_code_exists`

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Resql/POST/iam/classifier_value/v1/check_code_exists.sql` |
| **Mock failitee** | `DSL/Resql/POST/iam/classifier_value/v1/mock_check_code_exists.sql` |
| **HTTP meetod** | POST |
| **Kirjeldus** | Väärtuse koodi unikaalsuse eelkontroll |
| **Sisendparameetrid** | `:classifierId` (BIGINT), `:code` (VARCHAR) |
| **Väljundväljad** | `exists` (BOOLEAN) |
| **Seotud tabelid** | `classifier_value` |
| **Versioon** | v1 |

### 3.8 `POST /v1/admin/classifier-values/create`

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Resql/POST/iam/classifier_value/v1/create.sql` |
| **Mock failitee** | `DSL/Resql/POST/iam/classifier_value/v1/mock_create.sql` |
| **HTTP meetod** | POST |
| **Kirjeldus** | INSERT classifier_value (kood + nimi) |
| **Sisendparameetrid** | `:classifierId` (BIGINT), `:code` (VARCHAR), `:name` (VARCHAR), `:createdBy` (BIGINT) |
| **Väljundväljad** | `id`, `classifierId`, `code`, `name`, `createdAt`, `createdBy` |
| **Seotud tabelid** | `classifier_value` |
| **Versioon** | v1 |

**Ruuter voog:** require_edit_permission → check_code_exists → create_value → create_validity_state → rebuild_snapshot → respond

### 3.9 `POST /v1/admin/classifier-values/update`

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Resql/POST/iam/classifier_value/v1/update.sql` |
| **Mock failitee** | `DSL/Resql/POST/iam/classifier_value/v1/mock_update.sql` |
| **HTTP meetod** | POST |
| **Kirjeldus** | INSERT classifier_value_validity_state — kehtivusperiood muutus |
| **Sisendparameetrid** | `:classifierValueId` (BIGINT), `:validFrom` (DATE), `:validUntil` (DATE, optional), `:createdBy` (BIGINT) |
| **Väljundväljad** | `id`, `classifierValueId`, `validFrom`, `validUntil`, `createdAt`, `createdBy` |
| **Seotud tabelid** | `classifier_value_validity_state` |
| **Versioon** | v1 |

**Ruuter voog:** require_edit_permission → check_exists → write_validity_state → rebuild_snapshot → respond

## 4. Arhitektuuri vastavus

| Reegel | Staatus |
|--------|---------|
| Ainult INSERT ja SELECT | ✅ |
| JOIN keelatud (sub-query asemel) | ✅ |
| Üks fail = üks päring | ✅ |
| POST parameetritega päringutele | ✅ |
| camelCase väljumisnimed | ✅ |
| INSERT tagastab RETURNING kinnituse | ✅ |
| State muutus → INSERT `_state` tabelisse | ✅ |
| Mock failid olemas kõigile päringutele | ✅ |
| Verify-after-write on kirjeldatud | ✅ |
| Rollback / recovery voog on kirjeldatud | ✅ |
| Partial success on kaetud | ✅ |
| Latest state reegel on määratud | ✅ |

## 5. Mock andmed

### mock_list (classifier)
Tagastab 3 rida: RIIK, DOKL, SUGU klassifikaatorid realistlike eesti nimedega.

### mock_list (classifier_value)
Tagastab 3 rida: EE (Eesti, kehtiv), FI (Soome, kehtiv), LV (Läti, aegunud) klassifikaatori RIIK väärtused.

### mock_create
Tagastab ühe rea: NO (Norra) väärtuse kinnituse.

### mock_build (state_updater)
Tagastab kinnitusrea uuendatud snapshot andmetega.

## 6. Versioonimine

| Fail | Versioon | Staatus |
|------|---------|---------|
| `POST/iam/classifier/v1/list.sql` | v1 | aktiivne |
| `POST/iam/classifier/v1/get.sql` | v1 | aktiivne |
| `POST/iam/classifier/v1/update.sql` | v1 | aktiivne |
| `POST/iam/classifier/v1/get_latest_name_state.sql` | v1 | aktiivne |
| `POST/iam/classifier_value/v1/list.sql` | v1 | aktiivne |
| `POST/iam/classifier_value/v1/check_code_exists.sql` | v1 | aktiivne |
| `POST/iam/classifier_value/v1/create.sql` | v1 | aktiivne |
| `POST/iam/classifier_value/v1/create_validity_state.sql` | v1 | aktiivne |
| `POST/iam/classifier_value/v1/update.sql` | v1 | aktiivne |
| `POST/iam/classifier_value/v1/get_latest_validity_state.sql` | v1 | aktiivne |
| `POST/state_updater/classifier_latest/build.sql` | — | aktiivne |
| `POST/state_updater/classifier_value_latest/build.sql` | — | aktiivne |

## 7. Muudatuste logi

| Versioon | Kuupäev | Muudatus | Autor |
|---------|---------|---------|-------|
| 1.0 | 2026-05-27 | Esialgne loomine | cascade |
