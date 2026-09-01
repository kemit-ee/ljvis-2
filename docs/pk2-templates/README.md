# Postkast 2.0 — LJVIS-2 teavitusmallid

## Eesmärk

See kaust sisaldab LJVIS-2 väliste e-kirja teavituste malle, mis tuleb Postkast 2.0 haldusliideses
seadistada enne toodangus kasutuselevõttu. Mallid katavad kolm välist teavituse tüüpi:

| Mall | Fail | Saaja | Trigger (TBD) |
|---|---|---|---|
| `carrier_violation` | `carrier_violation.json` | Veoettevõtja (äriregistrist) | Raske rikkumise kinnitamine |
| `labor_kabotage` | `labor_kabotage.json` | Tööinspektsioon | Kabotaaži kontrolliakt avalikustamine |
| `labor_foreign_proposal` | `labor_foreign_proposal.json` | Tööinspektsioon | Välisriigi ettepaneku saabuvus |

## Eeltingimused

1. PK 2.0 credentials RIA-lt (Jira: LJVIS2-156 — Maris Albrecht):
   - `PK_URL` — haldusliidese base URL (nt `https://postkast.riaint.ee`)
   - `PK_TOKEN` — Bearer token (`Authorization: Bearer <token>`)
2. Kubernetes-es seadistatud keskkonnamuutujad (Jira: LJVIS2-157 — Ermo Mägi):
   - `PK_URL`
   - `PK_TOKEN`
   - `PK_TEMPLATE_CARRIER_VIOLATION` — loodud malli ID
   - `PK_TEMPLATE_LABOR_KABOTAGE` — loodud malli ID
   - `PK_TEMPLATE_LABOR_FOREIGN_PROPOSAL` — loodud malli ID

## Malli loomise töövoog (PK-Doku §7 haldusliidese töövoog)

### Samm 1 — Loo mall

```bash
curl -X POST "{PK_URL}/template/v1/templates" \
  -H "Authorization: Bearer {PK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @carrier_violation.json | jq '.id'
```

Tagastatav `id` → seadista Kubernetes-es `PK_TEMPLATE_CARRIER_VIOLATION`.

### Samm 2 — Lisa malli tekst

Mall ja malli tekst on eraldi päringud. Malli tekst (`template-messages`) sisaldab e-kirja sisu
HTML-kujul koos `{{muutuja}}` kohaplatsidega.

```bash
# Asenda TEMPLATE_ID sammust 1 saadud väärtusega
curl -X POST "{PK_URL}/template/v1/template-messages" \
  -H "Authorization: Bearer {PK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "TEMPLATE_ID",
    "channel": "EMAIL",
    "language": "et",
    "subject": "...",
    "content": "..."
  }'
```

Iga malli JSON-failis on `template` (Samm 1 body) ja `templateMessage` (Samm 2 body, ilma templateId-ta — lisa peale Samm 1).

### Samm 3 — Aktiveeri DSL

Kui PK_URL, PK_TOKEN ja template ID-d on Kubernetes-es olemas, eemalda kommentaar
`DSL/Ruuter.internal/ljvis/POST/notification/send-postkast.yml` jaotises `callPkApi`:

```yaml
# TODO(PK2.0): Eemалda kommentaar + eemalda stub assign
callPkApi:
  call: http.post
  args:
    url: "[#PK_URL]/notification-management/v1/notifications"
    ...
```

## Malli muutujaviited

| Muutuja | Kirjeldus | Allikas DSL-is |
|---|---|---|
| `{{carrierName}}` | Veoettevõtja nimi | `related_entity_type` järgi RESQL-ist |
| `{{carrierCode}}` | Registrikood | `person_code` recipients-is |
| `{{violationDate}}` | Rikkumise kuupäev | `related_entity_id` vorm → `created_at` |
| `{{controlFormId}}` | Kontrolliakti võti | `related_entity_id` |
| `{{inspectorName}}` | Ametniku nimi | `created_by` → TIM lookup |
| `{{fromCountry}}` | Välisriigi kood | CGR payload |
| `{{vehicleRegNr}}` | Sõiduki registreerimisnumber | SP-kaardi väli |
| `{{driverName}}` | Juhi nimi | SP-kaardi väli |

## Viited

- [PK-Doku §7 Tüüpilised kasutuslood](https://github.com/e-gov/PK-Doku/blob/main/07-Tuupilised-kasutuslood/README.md)
- [PK-Doku §11 Haldusliidese REST API-d](https://github.com/e-gov/PK-Doku/blob/main/11-Haldusliidese-REST-API-d/README.md)
- [Confluence: 12 - Teavituste moodul](https://wiki.kemit.ee/display/LIA/12+-+Teavituste+moodul)
- [Jira LJVIS2-156](https://help.kemit.ee/browse/LJVIS2-156) — PK 2.0 credentials (Maris Albrecht)
- [Jira LJVIS2-157](https://help.kemit.ee/browse/LJVIS2-157) — Kubernetes seadistus (Ermo Mägi)
