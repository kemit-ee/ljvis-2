# Postkast 2.0 — LJVIS-2 teavitusmallid

## Eesmärk

See kaust sisaldab LJVIS-2 väliste e-kirja teavituste malle, mis tuleb Postkast 2.0-s
luua enne toodangus kasutuselevõttu. Mallid katavad kolm välist teavituse tüüpi:

| Mall | Fail | Saaja | Trigger |
|---|---|---|---|
| `carrier_violation` | `carrier_violation.json` | Veoettevõtja (äriregistrist, `ar/detailandmed_v1`) | `notifyCarrier` linnukese "flip" avalikustatud välisriigi rikkumise vormil |
| `labor_kabotage` | `labor_kabotage.json` | Tööinspektsioon (fikseeritud aadress) | TBD — trigger DSL puudub veel |
| `labor_foreign_proposal` | `labor_foreign_proposal.json` | Tööinspektsioon (fikseeritud aadress, muudetav Haldus-vaates) | `foreignAuthorityProposal` linnukese "flip" avalikustatud välisriigi rikkumise vormil |

## Kanalid: X-tee (meie) vs haldusliides (malli haldus) — MITTE SAMA KANAL

LJVIS-2 ühendub Postkast 2.0-ga **ainult üle X-tee** — REST-native kutse XTR-i
passthrough lane'i kaudu (`DSL/xtr/postkast/{notifications,sending-operations}.yml`)
X-tee alamsüsteemi `GOV/70006317/postkast` `notification-management/v1` vastu.
See on ainuke ligipääs, mis LJVIS2-l on (ja vajab): teavituste **saatmine** ja
saatmisstaatuse **pollimine**.

Malli **loomine/haldus** (`template/v1/templates`, `template/v1/template-messages`)
käib aga läbi hoopis teise, eraldiseisva kanali — PK-Doku §11 "Haldusliidese REST
API-d", mis dokumendi enda sõnul on **"mitte X-tee kataloogis avaldatud
alamsüsteeme"** (§11) — st X-tee subsüsteemi ligipääs GOV/70006317/postkast-ile
**ei annagi** õigust haldusliidese API-le. Haldusliides kasutab eraldi
kokkulepitud autentimist (Bearer `PK_TOKEN` otse `PK_URL` vastu, PK-Doku §7).

**Järeldus: LJVIS2 backend ei loo malle ise ega kunagi ei kutsu haldusliidese
API-t.** Malli loob kolmas osapool, kellel on haldusliidese ligipääs (nt
Transpordiameti PK 2.0 administraator, või RIA) — kas otse Postkast 2.0
haldusliidese veebis, või haldusliidese REST API kaudu (allolevad `.json`
failid on selleks otse üleslaaditavad). LJVIS2 saab lõpuks ainult valminud
malli **ID**, mille sisestame Haldus-vaatesse (vt allpool).

## Malli loomise töövoog (tehakse haldusliidese ligipääsuga, ÜKS KORD malli kohta)

Iga malli `.json` fail sisaldab kaht valmis, otse üleslaaditavat väljavõtet:
`template` (Samm 1 body) ja `templateMessage` (Samm 2 body, ilma `templateId`-ta
— see lisatakse Sammus 2 pärast Sammu 1 vastuse saamist).

### Samm 1 — Loo mall

```bash
jq '.template' carrier_violation.json | curl -X POST "{PK_URL}/template/v1/templates" \
  -H "Authorization: Bearer {PK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @- | jq '.id'
```

### Samm 2 — Lisa malli tekst

```bash
# Asenda TEMPLATE_ID sammust 1 saadud väärtusega
jq '.templateMessage + {templateId: "TEMPLATE_ID"}' carrier_violation.json | \
  curl -X POST "{PK_URL}/template/v1/template-messages" \
  -H "Authorization: Bearer {PK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @-
```

### Samm 3 — Persisteeri ID LJVIS-is

Sammust 1 tagastatud `id` → sisesta LJVIS-is Haldus → "Postkasti mallide ja
vastuvõtjate seaded" vaates vastava teavituse liigi rea "Malli tunnus" väljale
(`notifications.notification_template_mapping.original_template_id`,
`notification-template-mapping/save.yml`). Sellest hetkest saadab
`send-postkast.yml` X-tee kaudu reaalseid teavitusi selle malliga —
eraldi DSL-i aktiveerimist ei ole vaja.

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
- [Jira LJVIS2-156](https://help.kemit.ee/browse/LJVIS2-156) — PK 2.0 haldusliidese credentials, kolmanda osapoole käes (Maris Albrecht)
