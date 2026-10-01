# Postkast 2.0 — LJVIS-2 teavitusmallid

## Eesmärk

See kaust sisaldab LJVIS-2 väliste e-kirja teavituste malle, mis tuleb Postkast 2.0-s
luua enne toodangus kasutuselevõttu. Mallid katavad neli välist teavituse tüüpi:

| Mall | Fail | Saaja | Trigger |
|---|---|---|---|
| `carrier_violation` | `carrier_violation.json` | Veoettevõtja (äriregistrist, `ar/detailandmed_v1`) | `notifyCarrier` linnukese "flip" avalikustatud välisriigi rikkumise vormil; PPA (sõidu-puhkeaeg, TRAM-kaart) ja Transpordiameti (tehnovormid) vormidel linnuke kinnitamisel, saatmine avalikustamisel (MSI/VSI/SI rikkumise korral) |
| `labor_kabotage` | `labor_kabotage.json` | Tööinspektsioon (fikseeritud aadress) | TBD — trigger DSL puudub veel |
| `labor_tachograph_not_downloaded` | `labor_tachograph_not_downloaded.json` | Tööinspektsioon (fikseeritud aadress, muudetav Haldus-vaates) | Avalikustatud autojuhi/meeskonnaliikme sõidu- ja puhkeaja kontrollkaart, millel on märge „andmed alla laadimata“ |
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

### `carrier_violation` ("vedajale-saadetav-teavitus")

| Muutuja | Kirjeldus | Allikas DSL-is |
|---|---|---|
| `{{formNumber}}` | Kontrollvormi number | `notify-transition-and-send.yml`, `publishRes.formNumber` |
| `{{companyName}}` | Veoettevõtja nimi | välisriigi rikkumise vorm, `companyName` |
| `{{companyRegCode}}` | Veoettevõtja registrikood | välisriigi rikkumise vorm, `companyRegCode` |
| `{{inspectionDateTime}}` | Kontrolli aeg (kuupäev ja kellaaeg) | vorm, `inspectionDate` + `inspectionTime` |
| `{{inspectionCountry}}` | Kontrolli koht (riigi nimetus) | vorm, `inspectionCountryCode` lahendatud `COUNTRY` klassifikaatorist (`classifier/get_country_name`); koodi ei leidmisel jääb väärtuseks kood |
| `{{inspectionCountryCode}}` | Kontrolli koha ISO riigikood (alles tagasiühilduvuseks, mall seda ei kasuta) | vorm, `inspectionCountryCode` |
| `{{vehicleRegNr}}` | Kontrollitud sõiduki registreerimisnumber; PPA/TA vormidel sõiduk ja haagised komaga eraldatult | vorm, `vehicleRegNr` (+ koondvormi `trailers[].regNr`) |
| `{{violationSeverities}}` | Rikkumise raskusastmed (nt "MSI, VSI") | vorm, `violations[].code` unikaalsed `MSI`/`VSI`/`SI` prefiksid |
| `{{violationDescription}}` | VR-vormil rikkumise vabatekst; PPA/TA vormidel kõik rikkumised (MSI, VSI, SI) korraga, üks rea kohta | VR: `violationDescription`; PPA/TA: rikkumiste kood + nimetus |
| `{{MSIViolationsList}}` | MSI rikkumised, üks rida iga rikkumise kohta kujul „kood — nimetus", ridade vahel `<br>` (HTML). Tühi, kui sellist rikkumist ei ole | vorm, `violations[].code` + nimetus klassifikaatorist (`EU_INFRINGEMENT`, kabotaaži klassifikaatorid) |
| `{{VSIViolationsList}}` | VSI rikkumised, sama vorming | sama |
| `{{SIViolationsList}}` | SI rikkumised, sama vorming | sama |

**Lahtised kohad:** `{{violationSeverities}}` näitab ainult esinevaid raskusastmeid, mitte iga rikkumiskoodi täistekstilist kirjeldust — see nõuaks eraldi `EU_INFRINGEMENT` klassifikaatori päringut (teadlik lihtsustus).

### `labor_foreign_proposal` ("ljvis2-labor-foreign-proposal")

| Muutuja | Kirjeldus | Allikas DSL-is |
|---|---|---|
| `{{formNumber}}` | Kontrollvormi number | `notify-transition-and-send.yml` |
| `{{companyName}}` | Veoettevõtja nimi | vorm, `companyName` |
| `{{companyRegCode}}` | Veoettevõtja registrikood | vorm, `companyRegCode` |

### `labor_kabotage` ("ljvis2-labor-kabotage")

| Muutuja | Kirjeldus | Allikas DSL-is |
|---|---|---|
| `{{formNumber}}` | Kontrollvormi (alamvormi) number | `tram-card/edit/publish.yml`, `drive-rest-form/{driver,teammate}/edit/publish.yml` |
| `{{companyName}}` | Veoettevõtja nimi | vorm, `companyName` |
| `{{companyRegCode}}` | Veoettevõtja registrikood | vorm, `companyRegCode` |
| `{{resultType}}` | Kontrolli tulemus (klassifikaatori kood) | vorm, `resultType` |

### `labor_tachograph_not_downloaded` ("ljvis2-labor-tachograph-not-downloaded")

| Muutuja | Kirjeldus | Allikas DSL-is |
|---|---|---|
| `{{formNumber}}` | Kontrollvormi (alamvormi) number | `drive-rest-form/{driver,teammate}/edit/publish.yml` |
| `{{companyName}}` | Veoettevõtja nimi | vorm, `companyName` |
| `{{companyRegCode}}` | Veoettevõtja registrikood | vorm, `companyRegCode` |

### Reeglid muutujate kohta

- Muutujate nimed **peavad täpselt ühtima** DSL-i `template_variables` võtmetega
  (tõstutundlik). Mall, mis viitab tundmatule nimele, saadetakse Postkastist
  välja tühja väärtusega. Nimekiri on kolmes kohas, mida tuleb muuta koos:
  1. DSL-i `template_variables` omistus (`notify-transition-and-send.yml`,
     `*/edit/publish.yml`);
  2. mallifail selles kaustas (`{{...}}` viited);
  3. `frontend/src/features/notificationTemplateMapping/notificationTypeMeta.ts`
     (`NOTIFICATION_TYPE_TEMPLATE_VARIABLES`) + i18n kirjeldused —
     nimekiri kuvatakse Haldus → „Postkasti mallide ja vastuvõtjate seaded" →
     teavituse liigi vaates kaardil „Malli muutujad".
- Lisaks saadetakse alati muutuja `recipient` (adressaadi e-post), mille
  `send-postkast.yml` lisab ise. Malli tekst ega teema ei tule LJVIS-ist —
  need peavad olema Postkastis olemas (Samm 2).
- LJVIS-i varasemad, mallidest erinevad nimed (`controlFormId`, `carrierName`,
  `carrierCode`, `violationDate`, `fromCountry`) on eemaldatud. Varem saadetud
  ridade `template_variables` (`notifications.outbound_log`) võivad neid veel
  sisaldada — „uuesti saatmine" edastab need muutmata kujul.

## Viited

- [PK-Doku §7 Tüüpilised kasutuslood](https://github.com/e-gov/PK-Doku/blob/main/07-Tuupilised-kasutuslood/README.md)
- [PK-Doku §11 Haldusliidese REST API-d](https://github.com/e-gov/PK-Doku/blob/main/11-Haldusliidese-REST-API-d/README.md)
- [Confluence: 12 - Teavituste moodul](https://wiki.kemit.ee/display/LIA/12+-+Teavituste+moodul)
- [Jira LJVIS2-156](https://help.kemit.ee/browse/LJVIS2-156) — PK 2.0 haldusliidese credentials, kolmanda osapoole käes (Maris Albrecht)
