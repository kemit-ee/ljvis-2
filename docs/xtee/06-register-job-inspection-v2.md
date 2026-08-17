# RegisterJobInspection_v2

Uuem versioon töökontrolli andmete vastuvõtmisest X-tee kaudu — rikkam struktuur sõiduki, juhi ja menetluse andmetega.

---

## 1. Eesmärk

V2 laiendab v1 lepingut järgmiste lisaandmetega: sõiduki identifikaatorid (registreerimisnumber, VIN), juhi isikukood, menetluse täiendavad väljad. V2 ja v1 jagavad sama `forms.labour_inspection_form` tabelit, kuid v2 päringu `external_inspection_id`-le lisatakse prefiks `v2-` et eristada versioone.

---

## 2. X-tee identiteet

| Väli | Väärtus |
|------|---------|
| Teenuse kood | `RegisterJobInspection_v2` |
| Endpoint | `POST /ljvis/xroad/provide/register-job-inspection-v2` |
| Versioon | v2 |
| DSL fail | `DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection-v2.yml` |
| SQL fail | `DSL/Resql/ljvis/POST/xroad/provide/register-job-inspection-v2-insert.sql` |

---

## 3. Request

### 3.1 Päised

| Päis | Kohustuslik | Kirjeldus |
|------|-------------|-----------|
| `X-Road-Client` | Jah | Tarbija turvaserveri identiteet |
| `Content-Type` | Jah | `application/json` |

### 3.2 Keha väljad — v2 täiendused v1-le

V2 sisaldab kõiki v1 välju (vt [05-register-job-inspection.md](./05-register-job-inspection.md)) ning lisaks:

#### Kontrolli metaandmed
| JSON väli | Tüüp | Kohustuslik | DB mapping |
|-----------|------|-------------|-----------|
| `kontrollija` | string | Jah | `inspector_name` |
| `kontrolli_id` | integer | Jah | `external_inspection_id` (prefiks `v2-`) |
| `kontrolli_kp` | string (ISO date) | Jah | `inspection_date` |
| `kontrolli_number` | string | Ei | `external_inspection_id` täiendus |

#### Tööandja andmed
| JSON väli | Tüüp | Kohustuslik | DB mapping |
|-----------|------|-------------|-----------|
| `tooandja_nimi` | string | Jah | `company_name` |
| `tooandja_reg_kood` | string | Jah | `company_reg_code` |

#### Sõiduki andmed (v2 lisandus)
| JSON väli | Tüüp | Kohustuslik | DB mapping |
|-----------|------|-------------|-----------|
| `soiduki_reg_nr` | string | Ei | `controls_matrix` JSONB lisaväli |
| `soiduki_vin` | string | Ei | `controls_matrix` JSONB lisaväli |
| `soidukite_arv` | integer | Ei | `vehicle_count` |

#### Juhi andmed (v2 lisandus)
| JSON väli | Tüüp | Kohustuslik | DB mapping |
|-----------|------|-------------|-----------|
| `juhi_isikukood` | string | Ei | `punished_person_id_code` |
| `juhi_eesnimi` | string | Ei | `punished_person_first_name` |
| `juhi_perekonnanimi` | string | Ei | `punished_person_last_name` |

#### Menetluse andmed (v2 lisandus)
| JSON väli | Tüüp | Kohustuslik | DB mapping |
|-----------|------|-------------|-----------|
| `menetluse_liik` | string (enum) | Ei | `proceeding_reference_number` lisainfo |
| `menetluse_number` | string | Ei | `proceeding_reference_number` |

#### Kontrollimised ja rikkumised (sama mis v1)
| JSON väli | Tüüp | Kohustuslik | DB mapping |
|-----------|------|-------------|-----------|
| `kontrollimised` | object | Jah | `controls_matrix` JSONB |
| `rikkumised` | object | Jah | `violations` JSONB |
| `koostatatud_ettekirjutus` | boolean | Jah | `prescription_composed` |
| `vaarteomenetlus` | string | Ei | menetluse väljad |

### 3.3 `menetluse_liik` enum

| Väärtus | Tähendus |
|---------|----------|
| `lyhimenetlus` | Lühimenetlus |
| `kiirmenetlus` | Kiirmenetlus |
| `uldmenetlus` | Üldmenetlus |

### 3.4 Näide

```json
{
  "kontrollija": "Mari Mets",
  "kontrolli_id": 9001,
  "kontrolli_kp": "2026-07-01",
  "kontrolli_number": "TI-2026-9001",
  "tooandja_nimi": "OÜ Kiirveos",
  "tooandja_reg_kood": "12345678",
  "soiduki_reg_nr": "456XYZ",
  "soiduki_vin": "WDB2030041A123456",
  "soidukite_arv": 5,
  "juhi_isikukood": "39001010001",
  "juhi_eesnimi": "Jaan",
  "juhi_perekonnanimi": "Tamm",
  "kontrollimised": {
    "kontrollitud_kokku": { "arv_analoogmeerik": 0, "arv_digitaalmeerik": 3, "tp_analoogmeerik": 0, "tp_digitaalmeerik": 1 }
  },
  "rikkumised": { "r_561_2006_art_6": 1 },
  "koostatatud_ettekirjutus": true,
  "vaarteomenetlus": "alustatud",
  "menetluse_liik": "kiirmenetlus",
  "menetluse_number": "4-22/1234"
}
```

---

## 4. Response

```json
{
  "message": "Success"
}
```

---

## 5. Andmevoog ja salvestusloogika

**Samm-sammuline:**
1. Kontrolli `X-Road-Client` header.
2. Valideeri kohustuslikud väljad.
3. Kui `juhi_isikukood` on täidetud, valideeri isikukoodi formaat (`/^[1-6][0-9]{10}$/`).
4. **Idempotentsus**: `external_inspection_id = 'v2-' || kontrolli_id` — `INSERT ON CONFLICT DO NOTHING`.
5. `controls_matrix` JSONB lisatakse sõiduki andmed (`reg_nr`, `vin`) v2 lisaväljana.
6. `inspection_type` tuletamine samuti kui v1.
7. Salvesta `INSERT INTO forms.labour_inspection_form`.
8. Logi (juhi isikukood maskituna).
9. Tagasta `{"message": "Success"}`.

---

## 6. V1 vs V2 erinevused

| Aspekt | V1 | V2 |
|--------|----|----|
| Sõiduki andmed | puuduvad | `soiduki_reg_nr`, `soiduki_vin` |
| Juhi isikukood | puudub | `juhi_isikukood` (valideeritav) |
| Menetluse liik | puudub | `menetluse_liik` (enum) |
| `external_inspection_id` prefiks | `<kontrolli_id>` | `v2-<kontrolli_id>` |
| DB tabel | `labour_inspection_form` | `labour_inspection_form` (sama) |

---

## 7. Valideerimine

| Väli | Reegel | Viga |
|------|--------|------|
| `X-Road-Client` | Ei tohi puududa | 400 `MISSING_HEADER` |
| `kontrollija` | Kohustuslik | 400 `MISSING_PARAMETER` |
| `kontrolli_id` | Kohustuslik, täisarv > 0 | 400 `MISSING_PARAMETER` |
| `kontrolli_kp` | Kohustuslik, parsitav kuupäev | 400 `INVALID_PARAMETER` |
| `tooandja_nimi` | Kohustuslik | 400 `MISSING_PARAMETER` |
| `tooandja_reg_kood` | Kohustuslik | 400 `MISSING_PARAMETER` |
| `kontrollimised` | Kohustuslik | 400 `MISSING_PARAMETER` |
| `rikkumised` | Kohustuslik | 400 `MISSING_PARAMETER` |
| `koostatatud_ettekirjutus` | Kohustuslik, boolean | 400 `INVALID_PARAMETER` |
| `juhi_isikukood` | Kui täidetud: `/^[1-6][0-9]{10}$/` | 400 `INVALID_PARAMETER` |
| `menetluse_liik` | Kui täidetud: lubatud enum | 400 `INVALID_PARAMETER` |

---

## 8. Testimisjuhud

| # | Sisend | Oodatav tulemus |
|---|--------|-----------------|
| T1 | Kõik v2 väljad korrektsed | HTTP 200, `{"message": "Success"}` |
| T2 | Ainult v1 kohustuslikud väljad (v2 lisandused puuduvad) | HTTP 200 (v2 lisandused valikulised) |
| T3 | Korduspäring sama `kontrolli_id`-ga | HTTP 200, uut rida ei loo |
| T4 | `juhi_isikukood` vale formaat | HTTP 400 `INVALID_PARAMETER` |
| T5 | `menetluse_liik` lubamatu väärtus | HTTP 400 `INVALID_PARAMETER` |
| T6 | `kontrollija` puudub | HTTP 400 `MISSING_PARAMETER` |
| T7 | `X-Road-Client` puudub | HTTP 400 `MISSING_HEADER` |
| T8 | V1 ja v2 sama `kontrolli_id` — ei tohi konflikti tekitada | HTTP 200 mõlemad (prefiks eristab) |

---

## 9. Implementatsiooni viited

- DSL: [`DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection-v2.yml`](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection-v2.yml)
- SQL: [`DSL/Resql/ljvis/POST/xroad/provide/register-job-inspection-v2-insert.sql`](../../DSL/Resql/ljvis/POST/xroad/provide/register-job-inspection-v2-insert.sql)
- V1 teenus: [`05-register-job-inspection.md`](./05-register-job-inspection.md)
