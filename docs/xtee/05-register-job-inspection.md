# RegisterJobInspection (v1)

Võtab vastu vana töökontrolli andmed X-tee kaudu ja salvestab need LJVIS-i `labour_inspection_form` tabelisse.

---

## 1. Eesmärk

Tööinspektsioon saab saata LJVIS-ile tehtud töökontrolli andmeid. V1 leping vastab vanale WSDL-i `RegisterJobInspectionRequestType` struktuurile, mis on teisendatud REST-JSON-iks. Andmed salvestatakse olemasolevasse `forms.labour_inspection_form` tabelisse koos välise identifikaatoriga.

---

## 2. X-tee identiteet

| Väli | Väärtus |
|------|---------|
| Teenuse kood | `RegisterJobInspection` |
| Endpoint | `POST /ljvis/xroad/provide/register-job-inspection` |
| Versioon | v1 |
| DSL fail | `DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection.yml` |
| SQL fail | `DSL/Resql/ljvis/POST/xroad/provide/register-job-inspection-insert.sql` |

---

## 3. Request

### 3.1 Päised

| Päis | Kohustuslik | Kirjeldus |
|------|-------------|-----------|
| `X-Road-Client` | Jah | Tarbija turvaserveri identiteet |
| `Content-Type` | Jah | `application/json` |

### 3.2 Keha väljad (v1 WSDL mapping)

| WSDL väli | JSON väli | Tüüp | Kohustuslik | DB veerg |
|-----------|-----------|------|-------------|----------|
| `kontrollija` | `kontrollija` | string | Jah | `inspector_name` |
| `kontrolli_id` | `kontrolli_id` | integer | Jah | `external_inspection_id` |
| `kontrolli_kp` | `kontrolli_kp` | string (ISO date) | Jah | `inspection_date` |
| `tooandja_nimi` | `tooandja_nimi` | string | Jah | `company_name` |
| `tooandja_reg_kood` | `tooandja_reg_kood` | string | Jah | `company_reg_code` |
| `soidukite_arv` | `soidukite_arv` | integer | Ei | `vehicle_count` |
| `koostatatud_ettekirjutus` | `koostatatud_ettekirjutus` | boolean | Jah | `prescription_composed` |
| `kontrollimised` | `kontrollimised` | object | Jah | `controls_matrix` (JSONB) |
| `rikkumised` | `rikkumised` | object | Jah | `violations` (JSONB) |
| `vaarteomenetlus` | `vaarteomenetlus` | string (enum) | Ei | `proceeding_reference_number` jt |

### 3.3 `kontrollimised` struktuur (KontrollimisteArvud)

```json
{
  "kontrollitud_kokku": { "arv_analoogmeerik": 0, "arv_digitaalmeerik": 5, "tp_analoogmeerik": 0, "tp_digitaalmeerik": 2 },
  "kontrollitud_soitjate_veol": { "arv_analoogmeerik": 0, "arv_digitaalmeerik": 2, "tp_analoogmeerik": 0, "tp_digitaalmeerik": 1 },
  "kontrollitud_veose_veol": { "arv_analoogmeerik": 0, "arv_digitaalmeerik": 3, "tp_analoogmeerik": 0, "tp_digitaalmeerik": 1 },
  "kontrollitud_ok_veol": { "arv_analoogmeerik": 0, "arv_digitaalmeerik": 0, "tp_analoogmeerik": 0, "tp_digitaalmeerik": 0 },
  "kontrollitud_tasulisel_veol": { "arv_analoogmeerik": 0, "arv_digitaalmeerik": 0, "tp_analoogmeerik": 0, "tp_digitaalmeerik": 0 }
}
```

Salvestatakse `controls_matrix` JSONB-na täpselt sellisena (ei normaliseerita).

### 3.4 `rikkumised` struktuur (RikkumisteArvud)

Lame objekt täisarvulistest rikkumisloendajatest vastavalt regulatsioonile. Salvestatakse `violations` JSONB-na täpselt sellisena. Näide:

```json
{
  "r_561_2006_art_6": 0,
  "r_561_2006_art_7": 1,
  "r_561_2006_art_8": 0,
  "r_561_2006_kokku": 1
}
```

### 3.5 `vaarteomenetlus` enum väärtused

| Väärtus | Tähendus |
|---------|----------|
| `alustamata` | Menetlust ei alustatud |
| `alustatud` | Menetlus alustatud |
| `lopetatud` | Menetlus lõpetatud |

### 3.6 Näide

```json
{
  "kontrollija": "Mari Mets",
  "kontrolli_id": 7890,
  "kontrolli_kp": "2026-06-15",
  "tooandja_nimi": "OÜ Kiirkaubaveos",
  "tooandja_reg_kood": "12345678",
  "soidukite_arv": 12,
  "koostatatud_ettekirjutus": false,
  "kontrollimised": {
    "kontrollitud_kokku": { "arv_analoogmeerik": 0, "arv_digitaalmeerik": 5, "tp_analoogmeerik": 0, "tp_digitaalmeerik": 2 }
  },
  "rikkumised": { "r_561_2006_art_6": 0 },
  "vaarteomenetlus": "alustamata"
}
```

---

## 4. Response

### 4.1 Väljad

| Väli | Tüüp | Kirjeldus |
|------|------|-----------|
| `message` | string | `"Success"` edu korral |

### 4.2 Näide

```json
{
  "message": "Success"
}
```

---

## 5. Andmevoog ja salvestusloogika

**Samm-sammuline:**
1. Kontrolli `X-Road-Client` header.
2. Valideeri kohustuslikud väljad (`kontrollija`, `kontrolli_id`, `kontrolli_kp`, `tooandja_nimi`, `tooandja_reg_kood`, `koostatatud_ettekirjutus`, `kontrollimised`, `rikkumised`).
3. **Idempotentsus**: kontrolli, kas sama `external_inspection_id` on juba olemas → `INSERT ON CONFLICT (external_inspection_id) DO NOTHING`. Korduspäring tagastab `{"message": "Success"}` ilma uue rea loomiseta.
4. Loo `form_number`: `'ti-' || YEAR || '-' || LPAD(sequence, 5, '0')`.
5. `inspection_type` tuletamine: kui `kontrollimised.kontrollitud_soitjate_veol` on täidetud → `passenger`, muul juhul → `cargo`.
6. Salvesta `INSERT INTO forms.labour_inspection_form`.
7. Logi.
8. Tagasta `{"message": "Success"}`.

---

## 6. Valideerimine

| Väli | Reegel | Viga |
|------|--------|------|
| `X-Road-Client` | Ei tohi puududa | 400 `MISSING_HEADER` |
| `kontrollija` | Kohustuslik, mittenegatiivne string | 400 `MISSING_PARAMETER` |
| `kontrolli_id` | Kohustuslik, täisarv > 0 | 400 `MISSING_PARAMETER` |
| `kontrolli_kp` | Kohustuslik, parsitav kuupäev | 400 `INVALID_PARAMETER` |
| `tooandja_nimi` | Kohustuslik | 400 `MISSING_PARAMETER` |
| `tooandja_reg_kood` | Kohustuslik | 400 `MISSING_PARAMETER` |
| `koostatatud_ettekirjutus` | Kohustuslik, boolean | 400 `INVALID_PARAMETER` |
| `kontrollimised` | Kohustuslik, objekt | 400 `MISSING_PARAMETER` |
| `rikkumised` | Kohustuslik, objekt | 400 `MISSING_PARAMETER` |

---

## 7. Testimisjuhud

| # | Sisend | Oodatav tulemus |
|---|--------|-----------------|
| T1 | Kõik kohustuslikud väljad õiged | HTTP 200, `{"message": "Success"}` |
| T2 | Korduspäring sama `kontrolli_id`-ga | HTTP 200, uut rida ei loo |
| T3 | `kontrollija` puudub | HTTP 400 `MISSING_PARAMETER` |
| T4 | `kontrolli_id` puudub | HTTP 400 `MISSING_PARAMETER` |
| T5 | `kontrolli_kp` vale formaat | HTTP 400 `INVALID_PARAMETER` |
| T6 | `kontrollimised` puudub | HTTP 400 `MISSING_PARAMETER` |
| T7 | `X-Road-Client` puudub | HTTP 400 `MISSING_HEADER` |
| T8 | `vaarteomenetlus` vale väärtus | HTTP 400 `INVALID_PARAMETER` |

---

## 8. Implementatsiooni viited

- DSL: [`DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection.yml`](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection.yml)
- SQL: [`DSL/Resql/ljvis/POST/xroad/provide/register-job-inspection-insert.sql`](../../DSL/Resql/ljvis/POST/xroad/provide/register-job-inspection-insert.sql)
- Sarnane SQL: [`DSL/Resql/ljvis/POST/control-forms/labour-inspection/insert.sql`](../../DSL/Resql/ljvis/POST/control-forms/labour-inspection/insert.sql)
