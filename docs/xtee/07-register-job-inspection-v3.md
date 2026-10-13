# RegisterJobInspection_v3

Uuem versioon töökontrolli andmete vastuvõtmisest X-tee kaudu — rikkam struktuur sõiduki, juhi ja menetluse andmetega.

---

## 1. Eesmärk

V3 laiendab v1 lepingut sõiduki identifikaatorite (reg.nr, VIN), juhi isikukoodi ja menetluse lisaväljadega. Salvestatakse samasse `forms.labour_inspection_form` tabelisse — idempotentsuse võti on leping `xroad-v3` + `kontrolli_id` (`forms.labour_inspection_external_ref`); `external_inspection_id` veerus `v3-` + `kontrolli_id`. Korduspäring tagastab olemasoleva akti ega rakenda muudatusi; samaaegsed päringud loovad ühe akti (atomaarne funktsioon `forms.register_external_labour_inspection`).

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

### 3.1. `rikkumised` struktuur

V3 (ja v2) `rikkumised` väli kasutab WSDL tüüpi `RikkumisteArv_v2` (`docker/xtr-inbound/wsdl/ljvis/ljvis.wsdl`) — **erineb v1-st**, mis kasutab vana fikseeritud nimega `RikkumisteArvud` tüüpi (üks int-väli konkreetse määruse artikli kohta, ilma koodideta — v1 `rikkumised` salvestub muutmata kujul, koodi-vastendust ei rakendata):

```json
{
  "rikkumised": {
    "rikkumiste_arv": [
      { "rikkumise_kood": "E5", "arv": 2 },
      { "rikkumise_kood": "B1" }
    ]
  }
}
```

| Väli | Tüüp | Kohustuslik | Kirjeldus |
|------|------|-------------|-----------|
| `rikkumiste_arv` | object või array | Jah | Üks kirje ⇒ objekt; mitu ⇒ massiiv (SOAP-silla XML→JSON teisendus annab objekti ühe korduse korral — Resql normaliseerib mõlemad kujud). REST-kliendid peaksid alati saatma massiivi. |
| `rikkumiste_arv[].rikkumise_kood` | string | Jah | Tööinspektsiooni täht+number rikkumiskood (nt `"E5"`, `"B1"`) — vastab `LABOUR_INSPECTION_VIOLATION` klassifikaatori `TI_<kood>` kirjele. |
| `rikkumiste_arv[].arv` | integer | Ei (vaikimisi 1) | Rikkumise esinemiste arv. |

LJVIS vastendab iga koodi `LABOUR_INSPECTION_VIOLATION` klassifikaatori kirjega (Resql `resolve-labour-inspection-violations`) ja salvestab `violations` veergu kuju `[{level1ValueKey, level2ValueKey, level3ValueKey?, quantity}]`, mida kontrollvormi UI oskab kuvada. Tundmatu `rikkumise_kood` lükatakse tagasi `400 UNKNOWN_VIOLATION_CODE`.

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
    RI->>RS: POST /xroad/provide/resolve-labour-inspection-violations
    RS-->>RI: {total_count, matched_count, violations_json, unmatched_codes_json}
    RI->>RI: Kui matched_count != total_count → 400 UNKNOWN_VIOLATION_CODE
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
| `rikkumiste_arv[].rikkumise_kood` | Peab vastama olemasolevale `LABOUR_INSPECTION_VIOLATION` koodile | 400 UNKNOWN_VIOLATION_CODE |

---

## 7. Testimisjuhud

| # | Sisend | Oodatav tulemus |
|---|--------|-----------------|
| T1 | Kõik v3 väljad | HTTP 200 |
| T2 | Ainult v1 kohustuslikud (v3 lisandused puuduvad) | HTTP 200 |
| T3 | Korduspäring sama kontrolli_id | HTTP 200, duplikaati ei looda |
| T3a | Samaaegsed korduspäringud sama kontrolli_id | Kõik HTTP 200, üks akt |
| T3b | Muudetud korduspäring | HTTP 200, olemasolev akt jääb muutmata (v3 senine leping) |
| T4 | Vale juhi_isikukood formaat | HTTP 400 |
| T5 | Lubamatu menetluse_liik | HTTP 400 |
| T6 | V1 ja v3 sama kontrolli_id | Mõlemad HTTP 200 (prefiks eristab) |
| T7 | juhi_isikukood logis | Ei tohi olla selge tekstina |
| T8 | Puuduv X-Road-Client header | HTTP 403 FORBIDDEN |
| T9 | Vale X-Road-Client formaat | HTTP 403 FORBIDDEN |
| T10 | `rikkumiste_arv` sisaldab tundmatut koodi (nt `"Z99"`) | HTTP 400 `UNKNOWN_VIOLATION_CODE` |
| T11 | `rikkumiste_arv` sisaldab tuntud koode (nt `"E5"`, `"B1"`) | HTTP 200, vorm tekib `violations` väljaga korrektselt vastendatuna |
