# Postkast 2.0 teavitusmallid

## Eesmärk

Kaustas on LJVIS-2 e-kirjateavituste mallide sisu. Postkast 2.0 haldur loob
mallid käsitsi Postkast 2.0 haldusliideses ja edastab LJVIS-2 haldurile iga
aktiivse malliversiooni tunnuse (`templateId`).

| Teavituse liik | Mallifail | Saaja | Saatmise tingimus |
|---|---|---|---|
| `carrier_violation` | `carrier_violation.json` | veoettevõtja | vormi avalikustamisel, kui vedaja teavitamine on märgitud ja vormil on MSI-, VSI- või SI-rikkumine |
| `labor_foreign_proposal` | `labor_foreign_proposal.json` | Tööinspektsioon | välisriigi rikkumise vormi avalikustamisel, kui tööinspektori teavitamine on märgitud |
| `labor_kabotage` | `labor_kabotage.json` | Tööinspektsioon | TRAM-kaardi või sõidu- ja puhkeaja kontrollvormi avalikustamisel, kui kontroll hõlmab kabotaaži |
| `labor_tachograph_not_downloaded` | `labor_tachograph_not_downloaded.json` | Tööinspektsioon | sõidu- ja puhkeaja kontrollvormi avalikustamisel, kui sõidumeeriku andmeid ei laaditud alla |

Veoettevõtja e-posti aadress päritakse äriregistrist. Tööinspektsiooni aadress
võetakse LJVIS-2 haldusliideses määratud vaikimisi vastuvõtja väljast.

## Seadistamine LJVIS-2-s

Kui mall on Postkast 2.0 haldusliideses loodud, ava LJVIS-2-s **Haldus →
Postkasti mallide ja vastuvõtjate seaded** ning määra vastava teavituse liigi
juures:

- aktiivse malliversiooni ID (`templateId`);
- vaikimisi keel;
- vajaduse korral vaikimisi vastuvõtja e-posti aadress;
- olek „Aktiivne“.

Vaikimisi vastuvõtja on vajalik Tööinspektsioonile saadetavate teavituste
jaoks. `carrier_violation` teavituse saaja leitakse äriregistrist.

LJVIS-2 saadab teavituse Postkast 2.0-le X-tee kaudu. Saatmise tulemus
kuvatakse teavituste logis.

## Mallimuutujad

Muutuja nimi on tõstutundlik ja peab täpselt vastama alltoodud nimele.
Postkast 2.0-le saadetakse alati ka `recipient`, mis sisaldab adressaadi
e-posti aadressi.

### `carrier_violation`

| Muutuja | Väärtus |
|---|---|
| `{{formNumber}}` | kontrollvormi number |
| `{{companyName}}` | veoettevõtja nimi |
| `{{companyRegCode}}` | veoettevõtja registrikood |
| `{{inspectionDateTime}}` | kontrolli kuupäev ja kellaaeg |
| `{{inspectionCountry}}` | kontrolli riigi nimetus |
| `{{inspectionCountryCode}}` | kontrolli riigi kood |
| `{{vehicleRegNr}}` | sõiduki ja haagiste registreerimisnumbrid |
| `{{violationSeverities}}` | rikkumiste raskusastmed |
| `{{violationDescription}}` | rikkumiste kirjeldus |
| `{{MSIViolationsList}}` | MSI-rikkumiste loetelu |
| `{{VSIViolationsList}}` | VSI-rikkumiste loetelu |
| `{{SIViolationsList}}` | SI-rikkumiste loetelu |

### `labor_foreign_proposal`

| Muutuja | Väärtus |
|---|---|
| `{{formNumber}}` | kontrollvormi number |
| `{{companyName}}` | veoettevõtja nimi |
| `{{companyRegCode}}` | veoettevõtja registrikood |
| `{{vehicleRegNr}}` | sõiduki registreerimisnumber |
| `{{vehicleMake}}` | sõiduki mark |
| `{{vehicleModel}}` | sõiduki mudel |
| `{{vehicleVin}}` | sõiduki VIN-kood |
| `{{inspectionCountry}}` | kontrolli riigi kood |
| `{{inspectionDate}}` | kontrolli kuupäev |
| `{{inspectionTime}}` | kontrolli kellaaeg |

### `labor_kabotage`

| Muutuja | Väärtus |
|---|---|
| `{{formNumber}}` | kontrollvormi või alamvormi number |
| `{{companyName}}` | veoettevõtja nimi |
| `{{companyRegCode}}` | veoettevõtja registrikood |
| `{{resultType}}` | kontrolli tulemuse kood |

### `labor_tachograph_not_downloaded`

| Muutuja | Väärtus |
|---|---|
| `{{formNumber}}` | alamvormi number |
| `{{companyName}}` | veoettevõtja nimi |
| `{{companyRegCode}}` | veoettevõtja registrikood |

Malli muutujate muutmisel tuleb hoida kooskõlas:

1. saatmisvoo `template_variables` väärtused;
2. selle kausta mallifailide `{{...}}` viited;
3. haldusliideses kuvatav muutujate loend failis
   `frontend/src/features/notificationTemplateMapping/notificationTypeMeta.ts`.
