# Pakutavad teenused

Kõik näited on sünteetilised. Päris teenuste taust, SQL ja turvaserveri seadistus: [senine juhend](../xtee/00-xtee-teenused-publikatsiooni-juhend.md).

Mock matkib rakenduse valideerimist ja vastusekuju, mitte turvaserveri krüptograafiat või õiguste konfiguratsiooni. `X-Mock-Scenario` on ainult mocki päis.

## IsikuKontroll

- Meetod: `POST`; mock: `/developer/xroad/v1/isiku-kontroll`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/IsikuKontroll/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/isiku-kontroll`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/isiku-kontroll.yml).
- Sisend: [JSON näidis](examples/isiku-kontroll-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/isiku-kontroll-success.json); [vead koos staatustega](examples/isiku-kontroll-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/isiku-kontroll' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/isiku-kontroll-request.json
```

HTTP 200, keha:

```json
{
  "response": "{\"kontrollid\":{\"item\":[{\"asutus\":\"Mockvedaja OÜ\",\"juhi_nimi\":\"Test\",\"juhi_perekonnanimi\":\"Juht\",\"kontrolli_nimetus\":\"KOONDVORM\",\"kuupaev\":\"2026-06-15\",\"nimetus\":\"MOCK-KV-001\",\"rikkumise_liik\":\"extraordinary_inspection\",\"rikkumised\":null,\"rikkumised_lopetatud\":null,\"soiduki_reg_nr\":\"MOCK123\"},{\"asutus\":\"Mockvedaja OÜ\",\"juhi_nimi\":\"Test\",\"juhi_perekonnanimi\":\"Juht\",\"kontrolli_nimetus\":\"TOOINSPEKTION\",\"kuupaev\":\"2026-06-14\",\"nimetus\":\"MOCK-TI-002\",\"rikkumise_liik\":null,\"rikkumised\":null,\"rikkumised_lopetatud\":\"Mock lõpetamine\",\"soiduki_reg_nr\":null}]}}"
}
```

`JSON.parse(response)` tulemus:

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

Veastsenaariumi käivitatav näide:

```bash
curl -i -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/isiku-kontroll' -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' -d '{}'
```

HTTP 400:

```json
{
  "response": "{\"error\": \"MISSING_PARAMETER\", \"message\": \"isikukood is required\"}"
}
```

## IsikuEttevoteKontrollid

- Meetod: `POST`; mock: `/developer/xroad/v1/isiku-ettevote-kontrollid`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/IsikuEttevoteKontrollid/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/isiku-ettevote-kontrollid`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/isiku-ettevote-kontrollid.yml).
- Sisend: [JSON näidis](examples/isiku-ettevote-kontrollid-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/isiku-ettevote-kontrollid-success.json); [vead koos staatustega](examples/isiku-ettevote-kontrollid-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/isiku-ettevote-kontrollid' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/isiku-ettevote-kontrollid-request.json
```

HTTP 200, keha:

```json
{
  "response": "{\"kontrollid\":{\"item\":[{\"asutus\":\"Mockvedaja OÜ\",\"ettevote_reg_nr\":\"00000001\",\"juhi_nimi\":\"Test\",\"juhi_perekonnanimi\":\"Juht\",\"kontrolli_nimetus\":\"KOONDVORM\",\"kuupaev\":\"2026-06-15\",\"nimetus\":\"MOCK-KV-001\",\"rikkumise_liik\":\"extraordinary_inspection\",\"rikkumised\":null,\"rikkumised_lopetatud\":null,\"soiduki_reg_nr\":\"MOCK123\"},{\"asutus\":\"Mockvedaja OÜ\",\"ettevote_reg_nr\":\"00000001\",\"juhi_nimi\":\"Test\",\"juhi_perekonnanimi\":\"Juht\",\"kontrolli_nimetus\":\"TOOINSPEKTION\",\"kuupaev\":\"2026-06-14\",\"nimetus\":\"MOCK-TI-002\",\"rikkumise_liik\":null,\"rikkumised\":null,\"rikkumised_lopetatud\":\"Mock lõpetamine\",\"soiduki_reg_nr\":null}]}}"
}
```

`JSON.parse(response)` tulemus:

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

Veastsenaariumi käivitatav näide:

```bash
curl -i -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/isiku-ettevote-kontrollid' -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' -d '{}'
```

HTTP 400:

```json
{
  "response": "{\"error\": \"MISSING_PARAMETER\", \"message\": \"isikukood is required\"}"
}
```

## ErakorralineYVquery

- Meetod: `POST`; mock: `/developer/xroad/v1/erakorraline-yv-query`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/ErakorralineYVquery/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/erakorraline-yv-query`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/erakorraline-yv-query.yml).
- Sisend: [JSON näidis](examples/erakorraline-yv-query-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/erakorraline-yv-query-success.json); [vead koos staatustega](examples/erakorraline-yv-query-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/erakorraline-yv-query' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/erakorraline-yv-query-request.json
```

HTTP 200, keha:

```json
{
  "response": "{\"targeted_for_inspection\":{\"item\":[{\"inspection_date\":\"2026-06-15\",\"inspection_id\":\"900001\",\"inspection_no\":\"MOCK-KV-001\",\"inspection_notes\":\"Sünteetiline näidiskontroll\",\"inspection_refine_options\":{\"item\":[\"REGNR\",\"VINTIN\",\"AXLES\",\"PLACES\",\"REBUILT\"]},\"inspection_type\":\"extraordinary_inspection\",\"inspection_unit\":\"Mockvedaja OÜ\",\"inspector\":null,\"issues\":{\"item\":[{\"code\":\"B01\",\"value\":\"defect_minor\"}]},\"licence_plate_no\":\"MOCK123\",\"notes\":{\"item\":[]},\"trailer_no\":null},{\"inspection_date\":\"2026-06-14\",\"inspection_id\":\"900002\",\"inspection_no\":\"MOCK-KV-002\",\"inspection_notes\":null,\"inspection_refine_options\":{\"item\":[]},\"inspection_type\":\"extraordinary_inspection_ta\",\"inspection_unit\":\"Mockvedaja OÜ\",\"inspector\":null,\"issues\":{\"item\":[]},\"licence_plate_no\":\"MOCK456\",\"notes\":{\"item\":[]},\"trailer_no\":null}]}}"
}
```

`JSON.parse(response)` tulemus:

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

Veastsenaariumi käivitatav näide:

```bash
curl -i -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/erakorraline-yv-query' -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' -d '{}'
```

HTTP 400:

```json
{
  "response": "{\"error\": \"MISSING_PARAMETER\", \"message\": \"alates is required\"}"
}
```

## ErakorralineYVconfirm

- Meetod: `POST`; mock: `/developer/xroad/v1/erakorraline-yv-confirm`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/ErakorralineYVconfirm/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/erakorraline-yv-confirm`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/erakorraline-yv-confirm.yml).
- Sisend: [JSON näidis](examples/erakorraline-yv-confirm-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/erakorraline-yv-confirm-success.json); [vead koos staatustega](examples/erakorraline-yv-confirm-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/erakorraline-yv-confirm' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/erakorraline-yv-confirm-request.json
```

HTTP 200, keha:

```json
{
  "response": "{\"confirmed\":1}"
}
```

`JSON.parse(response)` tulemus:

```json
{
  "confirmed": 1
}
```

Veastsenaariumi käivitatav näide:

```bash
curl -i -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/erakorraline-yv-confirm' -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' -d '{}'
```

HTTP 400:

```json
{
  "response": "{\"error\": \"MISSING_PARAMETER\", \"message\": \"confirmed.item must be a non-empty array\"}"
}
```

## RegisterJobInspection

- Meetod: `POST`; mock: `/developer/xroad/v1/register-job-inspection`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/RegisterJobInspection/v1`.
- Pakkuja sisetee: `/ljvis/xroad/provide/register-job-inspection`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection.yml).
- Sisend: [JSON näidis](examples/register-job-inspection-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/register-job-inspection-success.json); [vead koos staatustega](examples/register-job-inspection-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/register-job-inspection' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/register-job-inspection-request.json
```

HTTP 200, keha:

```json
{
  "response": "{\"message\": \"Success\"}"
}
```

`JSON.parse(response)` tulemus:

```json
{
  "message": "Success"
}
```

Veastsenaariumi käivitatav näide:

```bash
curl -i -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/register-job-inspection' -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' -d '{}'
```

HTTP 400:

```json
{
  "response": "{\"error\": \"MISSING_PARAMETER\", \"message\": \"kontrollija is required\"}"
}
```

## RegisterJobInspection_v3

- Meetod: `POST`; mock: `/developer/xroad/v1/register-job-inspection-v3`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/RegisterJobInspection_v3/v3`.
- Pakkuja sisetee: `/ljvis/xroad/provide/register-job-inspection-v3`; [workflow](../../DSL/Ruuter.internal/ljvis/POST/xroad/provide/register-job-inspection-v3.yml).
- Sisend: [JSON näidis](examples/register-job-inspection-v3-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/register-job-inspection-v3-success.json); [vead koos staatustega](examples/register-job-inspection-v3-errors.json).

```bash
curl --fail-with-body -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/register-job-inspection-v3' \
  -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' \
  --data-binary @docs/developer/examples/register-job-inspection-v3-request.json
```

HTTP 200, keha:

```json
{
  "response": "{\"message\": \"Success\"}"
}
```

`JSON.parse(response)` tulemus:

```json
{
  "message": "Success"
}
```

Veastsenaariumi käivitatav näide:

```bash
curl -i -X POST 'https://dev.liiklusvalve.ee/developer/xroad/v1/register-job-inspection-v3' -H 'Content-Type: application/json' -H 'X-Road-Client: ee-dev/GOV/70001490/liiklusregister' -d '{}'
```

HTTP 400:

```json
{
  "response": "{\"error\": \"MISSING_PARAMETER\", \"message\": \"kontrollija is required\"}"
}
```

## findUsage

- Meetod: `GET`; mock: `/developer/xroad/v2/findUsage`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/findUsage/v2`.
- Pakkuja sisetee: `/ljvis/xroad/v2/findUsage`; [workflow](../../DSL/Ruuter.internal/ljvis/GET/xroad/v2/findUsage.yml).
- Sisend: [JSON näidis](examples/findUsage-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/findUsage-success.json); [vead koos staatustega](examples/findUsage-errors.json).

```bash
curl --fail-with-body -X GET 'https://dev.liiklusvalve.ee/developer/xroad/v2/findUsage?userCode=60001019906&offset=0&limit=1' -H 'X-Road-UserId: 60001019906'
```

HTTP 200, keha:

```json
{
  "response": "{\"totalUsages\":3,\"usages\":[{\"action\":\"Mock kontrollipäring\",\"logtime\":\"2026-06-15T12:00:00Z\",\"receiverCode\":\"70001490\",\"receiverName\":\"Mock tarbija\",\"receiverSystem\":\"liiklusregister\"},{\"action\":\"Mock töökontroll\",\"logtime\":\"2026-06-14T12:00:00Z\",\"receiverCode\":\"70001969\",\"receiverName\":null,\"receiverSystem\":null},{\"action\":\"Mock korduspäring\",\"logtime\":\"2026-06-13T12:00:00Z\",\"receiverCode\":\"70001490\",\"receiverName\":\"Mock tarbija\",\"receiverSystem\":\"liiklusregister\"}]}"
}
```

`JSON.parse(response)` tulemus:

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

Veastsenaariumi käivitatav näide:

```bash
curl -i 'https://dev.liiklusvalve.ee/developer/xroad/v2/findUsage?userCode=60001019906'
```

HTTP 400:

```json
{
  "response": "{\"error\": \"MISSING_HEADER\", \"message\": \"X-Road-UserId header is required\"}"
}
```

## usagePeriod

- Meetod: `GET`; mock: `/developer/xroad/v2/usagePeriod`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/usagePeriod/v2`.
- Pakkuja sisetee: `/ljvis/xroad/v2/usagePeriod`; [workflow](../../DSL/Ruuter.internal/ljvis/GET/xroad/v2/usagePeriod.yml).
- Sisend: [JSON näidis](examples/usagePeriod-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/usagePeriod-success.json); [vead koos staatustega](examples/usagePeriod-errors.json).

```bash
curl --fail-with-body -X GET 'https://dev.liiklusvalve.ee/developer/xroad/v2/usagePeriod'
```

HTTP 200, keha:

```json
{
  "response": "{\"periodStart\":\"2026-06-13T12:00:00Z\"}"
}
```

`JSON.parse(response)` tulemus:

```json
{
  "periodStart": "2026-06-13T12:00:00Z"
}
```

Veastsenaariumi käivitatav näide:

```bash
curl -i 'https://dev.liiklusvalve.ee/developer/xroad/v2/usagePeriod' -H 'X-Mock-Scenario: server-error'
```

HTTP 500:

```json
{
  "response": "{\"error\": \"SERVER_ERROR\", \"message\": \"Internal error\"}"
}
```

## heartbeat

- Meetod: `GET`; mock: `/developer/xroad/v2/heartbeat`.
- Päris turvaserveri tarbija URL: `https://<tarbija-turvaserver>/r1/{instance}/GOV/70001231/ljvis2/heartbeat/v2`.
- Pakkuja sisetee: `/ljvis/xroad/v2/heartbeat`; [workflow](../../DSL/Ruuter.internal/ljvis/GET/xroad/v2/heartbeat.yml).
- Sisend: [JSON näidis](examples/heartbeat-request.json) (GET puhul query parameetrid, mitte keha).
- Vastus: [edukas HTTP-keha](examples/heartbeat-success.json); [vead koos staatustega](examples/heartbeat-errors.json).

```bash
curl --fail-with-body -X GET 'https://dev.liiklusvalve.ee/developer/xroad/v2/heartbeat'
```

HTTP 200, keha:

```json
{
  "response": "{\"status\": \"OK\", \"message\": \"API is ready\"}"
}
```

`JSON.parse(response)` tulemus:

```json
{
  "status": "OK",
  "message": "API is ready"
}
```
