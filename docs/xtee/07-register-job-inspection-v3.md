# RegisterJobInspection_v3

Uuem versioon töökontrolli andmete vastuvõtmisest X-tee kaudu — rikkam struktuur sõiduki, juhi ja menetluse andmetega.

---

## 1. Eesmärk

V3 laiendab v1 lepingut sõiduki identifikaatorite (reg.nr, VIN), juhi isikukoodi ja menetluse lisaväljadega. Salvestatakse samasse `forms.labour_inspection_form` tabelisse — idempotentsuse võti on `v3-` + `kontrolli_id`.

---

## 2. X-tee identiteet

| Väli | Väärtus |
|------|---------|
| Teenuse kood | `RegisterJobInspection_v3` |
| Endpoint | `POST /ljvis/xroad/provide/register-job-inspection-v3` |
| Versioon | v3 |
| DSL fail | `DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection-v3.yml` |
| SQL fail | `DSL/Resql/ljvis/POST/xroad/provide/register-job-inspection-v3-insert.sql` |

---

## 3. V3 lisandused v1-le

| Väli | Tüüp | DB mapping | Valideerimine |
|------|------|-----------|---------------|
| `soiduki_reg_nr` | string | `controls_matrix.v2_soiduki_reg_nr` | valikuline |
| `soiduki_vin` | string | `controls_matrix.v2_soiduki_vin` | valikuline |
| `juhi_isikukood` | string | `punished_person_id_code` | valikuline, aga regex kui esitatud |
| `juhi_eesnimi` | string | `punished_person_first_name` | valikuline |
| `juhi_perekonnanimi` | string | `punished_person_last_name` | valikuline |
| `menetluse_liik` | enum | `controls_matrix.v2_menetluse_liik` | lyhimenetlus/kiirmenetlus/uldmenetlus |
| `menetluse_number` | string | `proceeding_reference_number` | valikuline |

---

## 4. V1 vs V3 erinevused

| Aspekt | V1 | V3 |
|--------|----|----|
| Sõiduki andmed | puuduvad | soiduki_reg_nr, soiduki_vin |
| Juhi isikukood | puudub | juhi_isikukood (valideeritav regex) |
| Menetluse liik | puudub | menetluse_liik (enum) |
| Idempotentsuse võti | `kontrolli_id` | `v3-kontrolli_id` |
| DB tabel | `labour_inspection_form` | `labour_inspection_form` (sama) |

---

## 5. Loogika

```mermaid
sequenceDiagram
    participant VS as X-tee turvaserver
    participant RI as Ruuter.internal
    participant RS as Resql
    participant DB as PostgreSQL

    VS->>RI: POST /ljvis/xroad/provide/register-job-inspection-v3
    RI->>RI: Guard: X-Road-Client formaat (4-osaline, puudub/vale → 403)
    RI->>RI: Valideeri v1 kohustuslikud väljad
    RI->>RI: Valideeri juhi_isikukood (regex, valikuline)
    RI->>RI: Valideeri menetluse_liik (enum, valikuline)
    RI->>RI: Lisa 'v3-' prefiks kontrolli_id-le
    RI->>RI: Kogu controls_matrix (kontrollimised + v3 sõiduki andmed)
    RI->>RS: POST /xroad/provide/register-job-inspection-v3-insert
    RS->>DB: WITH existing ... INSERT WHERE NOT EXISTS
    DB-->>RS: {id, form_number, skipped}
    RS-->>RI: JSON
    RI->>RS: POST /xroad/log_integration (juhi isikukood ei ole logikirjes)
    RI-->>VS: {"message": "Success"}
```

---

## 6. Valideerimine

| Väli | Reegel | Viga |
|------|--------|------|
| `X-Road-Client` | Kohustuslik, 4-osaline formaat | 403 FORBIDDEN |
| (v1 kohustuslikud) | samad mis v1-s | 400 |
| `juhi_isikukood` | Kui esitatud: `/^[1-6][0-9]{10}$/` | 400 INVALID_PARAMETER |
| `menetluse_liik` | Kui esitatud: enum | 400 INVALID_PARAMETER |

---

## 7. Testimisjuhud

| # | Sisend | Oodatav tulemus |
|---|--------|-----------------|
| T1 | Kõik v3 väljad | HTTP 200 |
| T2 | Ainult v1 kohustuslikud (v3 lisandused puuduvad) | HTTP 200 |
| T3 | Korduspäring sama kontrolli_id | HTTP 200, duplikaati ei looda |
| T4 | Vale juhi_isikukood formaat | HTTP 400 |
| T5 | Lubamatu menetluse_liik | HTTP 400 |
| T6 | V1 ja v3 sama kontrolli_id | Mõlemad HTTP 200 (prefiks eristab) |
| T7 | juhi_isikukood logis | Ei tohi olla selge tekstina |
| T8 | Puuduv X-Road-Client header | HTTP 403 FORBIDDEN |
| T9 | Vale X-Road-Client formaat | HTTP 403 FORBIDDEN |
