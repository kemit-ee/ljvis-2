# LJVIS 2 API info

> See juhend käsitleb administraatori vaatenurgast peamisi HTTP-lõpp-punkte, mida kasutatakse kasutajate, kasutajagruppide, klassifikaatorite ja auditilogide haldamiseks.

## 1. Autentimine

Kõik lõpp-punktid eeldavad kehtivat TARA (TIM) sessiooniküpsist. Päringu vastu võetakse ainult siis, kui küpsis sisaldab kehtivat JWT-d. Testikeskkonnas võivad mõned mokklõpp-punktid olla saadaval ilma TARA autentimata — need on eraldi dokumenteeritud.

Järgmistes näidetes kasutatakse kohatäiteid:

- `https://<base-url>` — rakenduse baasaadress (nt `https://dev.liiklusvalve.ee`)
- `<COOKIE>` — TARA/TIM sessiooniküpsise väärtus

## 2. Kasutajate lõpp-punktid

`{scope}` võib olla `admin` (kõik asutused) või `local` (ainult oma asutus).

| Meetod | Tee | Nõutav õigus | Parameetrid | Kirjeldus |
|--------|-----|--------------|-------------|-----------|
| GET | `/v1/users/{scope}` | `user.read.admin` või `user.read.local` | `q` (UUID, päringus) | Tagastab ühe kasutaja detailandmed koos aktiivsete gruppidega. |
| POST | `/v1/users/{scope}` | `user.edit.admin` või `user.edit.local` | Päringu keha: `firstName`, `lastName`, `personalCode`, `organisationId`, `structuralUnit`, `jobTitle`, `email`, `phone` (valikuline), `accessStart`, `accessEnd` (valikuline) | Loob uue kasutajakonto. |
| PUT | `/v1/users/{scope}` | `user.edit.admin` või `user.edit.local` | Päringu keha: `id` ja uuendatavad väljad | Uuendab kasutaja isikuandmeid ja ligipääsuaega. |
| GET | `/v1/users/{scope}/search` | `user.list.admin` või `user.list.local` | `q` (otsing), `page`, `pageSize`, `sorting` | Tagastab leheküljestatud kasutajate nimekirja. |
| GET | `/v1/users/{scope}/groups` | `user.read.admin` või `user.read.local` | `q` (kasutaja UUID) | Tagastab kasutaja aktiivsed grupiliikmelisused. |
| PUT | `/v1/users/{scope}/groups` | `user.edit.admin` või `user.edit.local` | Päringu keha: `userId` ja gruppide nimekiri | Salvestab kasutaja grupiliikmelisused ühekorraga. |
| POST | `/v1/users/{scope}/check-personal-code` | `user.edit.admin` või `user.edit.local` | Päringu keha: `personalCode` | Kontrollib, kas isikukood on juba süsteemis olemas. |

### Näited

Kasutajate nimekirja otsing administraatori skoobis:

```bash
curl -X GET "https://<base-url>/v1/users/admin/search?q=M&page=1&pageSize=20" \
  -H "Cookie: <COOKIE>"
```

Uue kasutaja loomine:

```bash
curl -X POST "https://<base-url>/v1/users/admin" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Siim",
    "lastName": "Tamm",
    "personalCode": "39001010001",
    "organisationId": 7,
    "structuralUnit": "PÕHJA PREFEKTUUR",
    "jobTitle": "Senior analyst",
    "email": "siim.tamm@ppa.ee",
    "phone": "5555 1234",
    "accessStart": "2026-01-01",
    "accessEnd": null
  }'
```

Isikukoodi olemasolu kontroll:

```bash
curl -X POST "https://<base-url>/v1/users/admin/check-personal-code" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{"personalCode": "39001010001"}'
```

## 3. Kasutajagruppide lõpp-punktid

`{scope}` võib olla `admin` või `local`.

| Meetod | Tee | Nõutav õigus | Parameetrid | Kirjeldus |
|--------|-----|--------------|-------------|-----------|
| GET | `/v1/user-groups/{scope}` | `user_group.read.admin` või `user_group.read.local` | `q` (grupi ID) | Tagastab ühe kasutajagrupi detailvaate. |
| GET | `/v1/user-groups/{scope}/search` | `user_group.list.admin` või `user_group.list.local` | `q` (otsing), `page`, `pageSize`, `sorting` | Otsib ja loetleb kasutajagrupid. |
| POST | `/v1/user-groups` | `user_group.create` | Keha: `name`, `organisationIds`, `permissionCodes` | Loob uue kasutajagrupi koos asutuste ja õiguste seostega. |
| PUT | `/v1/user-groups` | `user_group.update` | Keha: `id`, `name` | Uuendab kasutajagrupi nime. |
| GET | `/v1/user-groups/{scope}/organisations` | `user_group.read.admin` või `user_group.read.local` | `q` (grupi ID) | Tagastab grupiga seotud asutused. |
| PUT | `/v1/user-groups/organisations` | `user_group.update` | Keha: `id`, `organisationIds` | Seab grupi asutused. |
| GET | `/v1/user-groups/{scope}/permissions` | `user_group.read.admin` või `user_group.read.local` | `q` (grupi ID) | Tagastab grupi õigused. |
| PUT | `/v1/user-groups/permissions` | `user_group.update` | Keha: `id`, `permissionIds` | Seab grupi õigused. |
| GET | `/v1/user-groups/{scope}/users` | `user_group.list_users.admin` või `user_group.list_users.local` | `q` (grupi ID), `page`, `pageSize`, `sorting`, `search` | Loetleb grupi liikmed. |
| PUT | `/v1/user-groups/users` | `user_group.add_user` | Keha: `userGroupId`, `userAccountIds` | Lisab kasutajaid gruppi. |
| DELETE | `/v1/user-groups/user` | `user_group.remove_user` | `q` (grupi ID), `userId` | Eemaldab kasutaja grupist. |
| POST | `/v1/user-groups/available-users` | `user_group.search_eligible_users` | Keha: grupi ID ja otsinguparameetrid | Otsib gruppi lisamiseks sobivaid kasutajaid. |

### Näited

Kasutajagruppide otsing:

```bash
curl -X GET "https://<base-url>/v1/user-groups/admin/search?q=analyst&page=1&pageSize=20" \
  -H "Cookie: <COOKIE>"
```

Uue kasutajagrupi loomine:

```bash
curl -X POST "https://<base-url>/v1/user-groups" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PPA analüütik",
    "organisationIds": [7],
    "permissionCodes": ["user.list.local", "user.read.local"]
  }'
```

Kasutajate lisamine gruppi:

```bash
curl -X PUT "https://<base-url>/v1/user-groups/users" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{
    "userGroupId": 12,
    "userAccountIds": [101, 102, 103]
  }'
```

## 4. Klassifikaatorite lõpp-punktid

| Meetod | Tee | Nõutav õigus | Parameetrid | Kirjeldus |
|--------|-----|--------------|-------------|-----------|
| GET | `/v1/classifiers` | `classifier.list` | `search`, `page`, `pageSize`, `sorting` | Tagastab klassifikaatorite leheküljestatud nimekirja. |
| GET | `/v1/classifiers/classifier` | `classifier.read` | `id` (päringus) | Tagastab ühe klassifikaatori päise. |
| PUT | `/v1/classifiers/classifier` | `classifier.edit` | Keha: `classifierId`, `name`, `description`, `code` | Uuendab klassifikaatori nime ja kirjeldust. |
| GET | `/v1/classifiers/values` | `classifier.read` | `classifierId`, `search`, `page`, `pageSize`, `sorting`, `activeOnly` | Tagastab klassifikaatori väärtuste nimekirja. |
| GET | `/v1/classifiers/value` | `classifier.read` | `id`, `valueId` | Tagastab ühe väärtuse detailid. |
| POST | `/v1/classifiers/value` | `classifier_value.edit` | Keha: `classifierId`, `code`, `name`, `validFrom`, `validUntil` | Lisab klassifikaatorile uue väärtuse. |
| PUT | `/v1/classifiers/value` | `classifier_value.edit` | Keha: `classifierValueId`, `validFrom`, `validUntil` | Uuendab väärtuse kehtivusperioodi. |
| POST | `/v1/classifiers/check-code` | `classifier_value.edit` | Keha: `classifierId`, `code` | Kontrollib, kas väärtuse kood on juba olemas. |
| GET | `/v1/classifiers/catalogue` | `classifier.list` | — | Tagastab kõik klassifikaatorikoodid ja nimed. |
| GET | `/v1/classifiers/bundle` | `classifier.read` | — | Tagastab kõik klassifikaatorid koos väärtustega. |

### Näited

Klassifikaatorite nimekiri:

```bash
curl -X GET "https://<base-url>/v1/classifiers?page=1&pageSize=20" \
  -H "Cookie: <COOKIE>"
```

Klassifikaatori nime uuendamine:

```bash
curl -X PUT "https://<base-url>/v1/classifiers/classifier" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{
    "classifierId": 1,
    "name": "Riikide ja territooriumide klassifikaator",
    "description": "ISO 3166 alusel",
    "code": "RTK"
  }'
```

Uue klassifikaatori väärtuse loomine:

```bash
curl -X POST "https://<base-url>/v1/classifiers/value" \
  -H "Cookie: <COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{
    "classifierId": 1,
    "code": "DE",
    "name": "Saksamaa",
    "validFrom": "2026-01-01",
    "validUntil": null
  }'
```

## 5. Auditilogide lõpp-punktid

| Meetod | Tee | Nõutav õigus | Parameetrid | Kirjeldus |
|--------|-----|--------------|-------------|-----------|
| GET | `/v1/logs` | `audit.read` | `search`, `page`, `pageSize`, `sorting` | Tagastab auditilogi kirjed lehekülgedena. |
| GET | `/v1/logs/log` | `audit.read` | `q` (sündmuse ID) | Tagastab ühe auditilogi kirje. |
| GET | `/v1/logs/export` | `audit.read` | `search`, `page`, `pageSize`, `sorting` | Ekspordib auditilogi CSV-failina. |
| GET | `/v1/logs/verify` | `audit.verify` | `from` (valikuline), `to` (valikuline) | Kontrollib auditilogi hash-ahela terviklikkust. |

### Näited

Auditilogi nimekiri:

```bash
curl -X GET "https://<base-url>/v1/logs?search=login&page=1&pageSize=50" \
  -H "Cookie: <COOKIE>"
```

Hash-ahela verifitseerimine:

```bash
curl -X GET "https://<base-url>/v1/logs/verify?from=01JAB2C3D4E5F6G7H8J9K0M1N2" \
  -H "Cookie: <COOKIE>"
```
