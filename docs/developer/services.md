# Pakutavad teenused

Kõik näited on sünteetilised. Päris teenuste taust, SQL ja turvaserveri seadistus: [senine juhend](../xtee/00-xtee-teenused-publikatsiooni-juhend.md).

Mock matkib rakenduse valideerimist ja vastusekuju, mitte turvaserveri krüptograafiat või õiguste konfiguratsiooni. `X-Mock-Scenario` on ainult mocki päis.

## IsikuKontroll

- Meetod: `POST`; mock: `/developer/xroad/v1/isiku-kontroll`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/IsikuKontroll/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/isiku-kontroll`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/isiku-kontroll.yml).
- Sisend: [JSON näidis](examples/isiku-kontroll-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/isiku-kontroll-success.json); [vead koos staatustega](examples/isiku-kontroll-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/isiku-kontroll' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/isiku-kontroll-request.json
```

HTTP 200:

```json
{
  "kontrollid": {
    "item": [
      {
        "kuupaev": "2026-06-15",
        "nimetus": "MOCK-KV-001",
        "asutus": "Mockvedaja OÜ",
        "soiduki_reg_nr": "MOCK123",
        "rikkumise_liik": "extraordinary_inspection",
        "kontrolli_nimetus": "KOONDVORM",
        "juhi_nimi": "Test",
        "juhi_perekonnanimi": "Juht",
        "rikkumised": null,
        "rikkumised_lopetatud": null
      },
      {
        "kuupaev": "2026-06-14",
        "nimetus": "MOCK-TI-002",
        "asutus": "Mockvedaja OÜ",
        "soiduki_reg_nr": null,
        "rikkumise_liik": null,
        "kontrolli_nimetus": "TOOINSPEKTION",
        "juhi_nimi": "Test",
        "juhi_perekonnanimi": "Juht",
        "rikkumised": null,
        "rikkumised_lopetatud": "Mock lõpetamine"
      }
    ]
  }
}
```

Vigane päring: kohustuslik keha-väli puudub. HTTP 500:

```json
{
  "error": "SERVER_ERROR",
  "message": "Internal error"
}
```

## IsikuEttevoteKontrollid

- Meetod: `POST`; mock: `/developer/xroad/v1/isiku-ettevote-kontrollid`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/IsikuEttevoteKontrollid/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/isiku-ettevote-kontrollid`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/isiku-ettevote-kontrollid.yml).
- Sisend: [JSON näidis](examples/isiku-ettevote-kontrollid-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/isiku-ettevote-kontrollid-success.json); [vead koos staatustega](examples/isiku-ettevote-kontrollid-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/isiku-ettevote-kontrollid' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/isiku-ettevote-kontrollid-request.json
```

HTTP 200:

```json
{
  "kontrollid": {
    "item": [
      {
        "kuupaev": "2026-06-15",
        "nimetus": "MOCK-KV-001",
        "asutus": "Mockvedaja OÜ",
        "soiduki_reg_nr": "MOCK123",
        "rikkumise_liik": "extraordinary_inspection",
        "kontrolli_nimetus": "KOONDVORM",
        "juhi_nimi": "Test",
        "juhi_perekonnanimi": "Juht",
        "rikkumised": null,
        "rikkumised_lopetatud": null,
        "ettevote_reg_nr": "00000001"
      },
      {
        "kuupaev": "2026-06-14",
        "nimetus": "MOCK-TI-002",
        "asutus": "Mockvedaja OÜ",
        "soiduki_reg_nr": null,
        "rikkumise_liik": null,
        "kontrolli_nimetus": "TOOINSPEKTION",
        "juhi_nimi": "Test",
        "juhi_perekonnanimi": "Juht",
        "rikkumised": null,
        "rikkumised_lopetatud": "Mock lõpetamine",
        "ettevote_reg_nr": "00000001"
      }
    ]
  }
}
```

Vigane päring: kohustuslik keha-väli puudub. HTTP 500:

```json
{
  "error": "SERVER_ERROR",
  "message": "Internal error"
}
```

## ErakorralineYVquery

- Meetod: `POST`; mock: `/developer/xroad/v1/erakorraline-yv-query`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/ErakorralineYVquery/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/erakorraline-yv-query`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/erakorraline-yv-query.yml).
- Sisend: [JSON näidis](examples/erakorraline-yv-query-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/erakorraline-yv-query-success.json); [vead koos staatustega](examples/erakorraline-yv-query-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/erakorraline-yv-query' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/erakorraline-yv-query-request.json
```

HTTP 200:

```json
{
  "targeted_for_inspection": {
    "item": [
      {
        "licence_plate_no": "MOCK123",
        "trailer_no": null,
        "inspection_id": "900001",
        "inspection_no": "MOCK-KV-001",
        "inspection_date": "2026-06-15",
        "inspection_type": "extraordinary_inspection",
        "inspection_unit": "Mockvedaja OÜ",
        "inspection_notes": "Sünteetiline näidiskontroll",
        "inspector": null,
        "issues": {
          "item": [
            {
              "code": "B01",
              "value": "defect_minor"
            }
          ]
        },
        "notes": {
          "item": []
        },
        "inspection_refine_options": {
          "item": [
            "REGNR",
            "VINTIN",
            "AXLES",
            "PLACES",
            "REBUILT"
          ]
        }
      },
      {
        "licence_plate_no": "MOCK456",
        "trailer_no": null,
        "inspection_id": "900002",
        "inspection_no": "MOCK-KV-002",
        "inspection_date": "2026-06-14",
        "inspection_type": "extraordinary_inspection_ta",
        "inspection_unit": "Mockvedaja OÜ",
        "inspection_notes": null,
        "inspector": null,
        "issues": {
          "item": []
        },
        "notes": {
          "item": []
        },
        "inspection_refine_options": {
          "item": []
        }
      }
    ]
  }
}
```

Vigane päring: kohustuslik keha-väli puudub. HTTP 500:

```json
{
  "error": "SERVER_ERROR",
  "message": "Internal error"
}
```

## ErakorralineYVconfirm

- Meetod: `POST`; mock: `/developer/xroad/v1/erakorraline-yv-confirm`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/ErakorralineYVconfirm/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/erakorraline-yv-confirm`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/erakorraline-yv-confirm.yml).
- Sisend: [JSON näidis](examples/erakorraline-yv-confirm-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/erakorraline-yv-confirm-success.json); [vead koos staatustega](examples/erakorraline-yv-confirm-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/erakorraline-yv-confirm' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/erakorraline-yv-confirm-request.json
```

HTTP 200:

```json
{
  "confirmed": 1
}
```

Vigane päring: kohustuslik keha-väli puudub. HTTP 400:

```json
{
  "error": "MISSING_PARAMETER",
  "message": "confirmed.item must be a non-empty array"
}
```

## RegisterJobInspection

- Meetod: `POST`; mock: `/developer/xroad/v1/register-job-inspection`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/RegisterJobInspection/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/register-job-inspection`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection.yml).
- Sisend: [JSON näidis](examples/register-job-inspection-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/register-job-inspection-success.json); [vead koos staatustega](examples/register-job-inspection-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/register-job-inspection' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/register-job-inspection-request.json
```

HTTP 200:

```json
{
  "message": "Success"
}
```

Vigane päring: kohustuslik keha-väli puudub. HTTP 500:

```json
{
  "error": "SERVER_ERROR",
  "message": "Internal error"
}
```

## RegisterJobInspection_v3

- Meetod: `POST`; mock: `/developer/xroad/v1/register-job-inspection-v3`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/RegisterJobInspection_v3/v3`.
- Pakkuja sisetee: `/ljvis/xroad/provide/register-job-inspection-v3`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection-v3.yml).
- Sisend: [JSON näidis](examples/register-job-inspection-v3-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/register-job-inspection-v3-success.json); [vead koos staatustega](examples/register-job-inspection-v3-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/register-job-inspection-v3' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/register-job-inspection-v3-request.json
```

HTTP 200:

```json
{
  "message": "Success"
}
```

Vigane päring: kohustuslik keha-väli puudub. HTTP 500:

```json
{
  "error": "SERVER_ERROR",
  "message": "Internal error"
}
```

## findUsage

- Meetod: `GET`; mock: `/developer/xroad/v2/findUsage`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/findUsage/v2`.
- Pakkuja sisetee: `/ljvis/xroad/v2/findUsage`; [workflow](../../DSL/Ruuter.internal/ljvis/GET/xroad/v2/findUsage.yml).
- Sisend: [JSON näidis](examples/findUsage-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/findUsage-success.json); [vead koos staatustega](examples/findUsage-errors.json).

```bash
curl --fail-with-body -X GET 'https://dev.liiklusvalve.ee/developer/xroad/v2/findUsage?userCode=60001019906&offset=0&limit=1' -H 'X-Road-UserId: 60001019906'
```

HTTP 200:

```json
{
  "totalUsages": 3,
  "usages": [
    {
      "logtime": "2026-06-15T12:00:00Z",
      "action": "Mock kontrollipäring",
      "receiverCode": "70001490",
      "receiverName": "Mock tarbija",
      "receiverSystem": "liiklusregister"
    },
    {
      "logtime": "2026-06-14T12:00:00Z",
      "action": "Mock töökontroll",
      "receiverCode": "70001969",
      "receiverName": null,
      "receiverSystem": null
    },
    {
      "logtime": "2026-06-13T12:00:00Z",
      "action": "Mock korduspäring",
      "receiverCode": "70001490",
      "receiverName": "Mock tarbija",
      "receiverSystem": "liiklusregister"
    }
  ]
}
```

Vigane päring: AJ päis puudub või ei vasta userCode-le. HTTP 400:

```json
{
  "error": "MISSING_HEADER",
  "message": "X-Road-UserId header is required"
}
```

## usagePeriod

- Meetod: `GET`; mock: `/developer/xroad/v2/usagePeriod`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/usagePeriod/v2`.
- Pakkuja sisetee: `/ljvis/xroad/v2/usagePeriod`; [workflow](../../DSL/Ruuter.internal/ljvis/GET/xroad/v2/usagePeriod.yml).
- Sisend: [JSON näidis](examples/usagePeriod-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/usagePeriod-success.json); [vead koos staatustega](examples/usagePeriod-errors.json).

```bash
curl --fail-with-body -X GET 'https://dev.liiklusvalve.ee/developer/xroad/v2/usagePeriod'
```

HTTP 200:

```json
{
  "periodStart": "2026-06-13T12:00:00Z"
}
```

Vigane päring: AJ päis puudub või ei vasta userCode-le. HTTP 500:

```json
{
  "error": "SERVER_ERROR",
  "message": "Internal error"
}
```

## heartbeat

- Meetod: `GET`; mock: `/developer/xroad/v2/heartbeat`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/heartbeat/v2`.
- Pakkuja sisetee: `/ljvis/xroad/v2/heartbeat`; [workflow](../../DSL/Ruuter.internal/ljvis/GET/xroad/v2/heartbeat.yml).
- Sisend: [JSON näidis](examples/heartbeat-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas JSON](examples/heartbeat-success.json); [vead koos staatustega](examples/heartbeat-errors.json).

```bash
curl --fail-with-body -X GET 'https://dev.liiklusvalve.ee/developer/xroad/v2/heartbeat'
```

HTTP 200:

```json
{
  "status": "OK",
  "message": "API is ready"
}
```
