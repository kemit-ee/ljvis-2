# Riskiskoori moodul (LJVIS2-150 / 151 / 152)

Automaatne, valemipõhine veoettevõtete riskihindamine EL rakendusmääruse
2022/695 lisa alusel, riskitaseme edastamine ERRU CTUD-liidesesse ning
riskitaseme kuvamine administraatoritele ja ettevõtte esindajale.

## 1. Valem

```
R = ((Σᵢ ((nMSI×90 + nVSI×30 + nSI×10 + nMI×1) / Nᵢ)) / r) × g
```

| Tähis | Tähendus | Väärtus |
|---|---|---|
| nMSI/VSI/SI/MI | Rikkumiste arv raskusastme järgi kontrolli *i* kohta | Loendatud SP-alamvormide JSONB rikkumismassiividest |
| Nᵢ | Kontrollitud sõidukite arv kontrollis *i* | Teekontrollil 1; TI kontrollil vormi `vehicle_count` |
| r | Arvesse võetud kontrollide koguarv (sh nullpunktilised) | — |
| g | Aruka sõidumeeriku kaalutegur | **1.0** (algoritmi versioon `2022-695-v2`) |
| R | Koondriskiskoor | Arvutustulemus, `NULL` kui `r = 0` |

Iga kontrolli punktid jagatakse selle kontrolli sõidukite arvuga enne kontrollide keskmise leidmist.

## 2. Riskitaseme koodid ja värvid

| r / R väärtus | `risk_band_code` (DB) | Kuvatav tekst (ET) | ERRU wire-väärtus |
|---|---|---|---|
| r = 0 | `Hall` | "Kontrollimata" | `Grey` |
| 0 ≤ R ≤ 100 | `Roheline` | "Roheline" | `Green` |
| 101 ≤ R ≤ 200 | `Kollane` | "Kollane" | **`Amber`** (mitte `Yellow`!) |
| R ≥ 201 | `Punane` | "Punane" | `Red` |

`Amber` on kinnitatud õige väärtus `classifier.classifier_value` tabeli
`RISK_BAND` klassifikaatorist (ERRU 3.5 XSD-l puudub `Yellow` väärtus).

**TÄHTIS — kaks eraldi sõnavara, mitte üks rikutud:** `risk.company_risk_score
.risk_band_code` (Hall/Roheline/Kollane/Punane) ja `classifier.classifier_
value` kood `RISK_BAND` (Grey/Green/Amber/Red, nimed eestikeelsed) EI OLE
sama asi ja need ei peagi kokku käima 1:1 väärtuste kaupa:

- `risk_band_code` (meie tabelis) on **sisemine, eestikeelne enum**, mis on
  otse tuletatud task-spekist (LJVIS2-151 §"Riskitaseme koodid" tabel —
  seal on `risk_band_code (andmebaasis)` veerg eraldi "Kuvatav tekst (ET)"
  ja "ERRU väärtus" veergudest; kolm eraldi väärtust, mitte üks).
- `RISK_BAND` klassifikaator (laaditud failiga `20260801100000-erru-ctud-classifier-
  seed.sql`, kommentaar "Eesti tagastab Grey kuni riskihindamise mooduli
  (EPIC 16) valmimiseni") on mõeldud **CTUD ERRU-sõnumi riskiband-välja
  kuvamiseks** frontend'is (`CtudResponseBlock.tsx`) — nii sissetulevate
  välisriikide vastuste jaoks kui ka (LJVIS2-144 valmimisel) meie oma
  väljamineva vastuse jaoks. See on inglise traatkoodiga (ERRU 3.5 XSD
  formaadis), sest CTUD-sõnumid liiguvad rahvusvaheliselt.

`current.yml`'i `band_erru_map` on TEADLIK sild nende kahe sõnavara vahel
(sisemine Eesti kood → ERRU inglise kood), mitte klassifikaatoripäring —
see on korrektne disainiotsus, mitte lahtine ots. **Väike, meie moodulist
sõltumatu ebakõla:** `RISK_BAND` klassifikaatori `Amber` väärtuse `name` on
`"Kollakas"`, mitte `"Kollane"` (nagu meie `risk_band_code` ja kõik muu
selles moodulis kasutab) — potentsiaalne tulevane parandusvajadus CTUD/
LJVIS2-144 klassifikaatori algandmetes, väljaspool selle mooduli ulatust.

## 3. Kaasamise ja välistamise reeglid

Arvesse võetakse `forms.compound_form` kirjeid, mille `status='published'`,
`company_reg_code` vastab mustrile `^[0-9]{8}$` (Eesti ettevõtja) ja
jõustumiskuupäev jääb 2-aastasesse aknasse (`now() - 2 aastat` .. `now()`).

**Jõustumiskuupäev** = `MIN(created_at) FILTER (WHERE status='published')
GROUP BY compound_form_key` — hetk, mil koondvorm esimest korda `published`
olekusse jõudis.

Iga kvalifitseeruva koondvormi kõiki SP-alamvorme (`sp_driver_form` +
`sp_teammate_form`, uusimad versioonid, `selection_status='active'`)
hinnatakse eraldi ja klassifitseeritakse:

- **Täielik välistamine** (ei lähe `r`-i ega valemisse):
  `sp_applicability IN ('EI_RAKENDATA','EI_KONTROLLITUD')` JA `result_type = 'KORRAS'`.
  Koondvorm, millel pole ühtegi arvesse minevat SP-, tehnilise kontrolli või ADR-alamvormi, jääb samuti välja.
- **Nullpunktiline kontroll** (`r++`, kaalupunkte 0):
  - `sp_applicability = 'RAKENDATAKSE'` JA `proceeding_type IN ('KIIR','YLD','LYHI')` JA rikkumisi ei tuvastatud, VÕI
  - `result_type = 'HOIATUS'` JA `sp_applicability = 'RAKENDATAKSE'` JA rikkumisi ei tuvastatud.
- **Normaalne kontroll kaaludega** (`r++`, kaalupunktid lisanduvad): kõik muu.

Koondvorm ise loetakse täielikult välistatuks ainult siis, kui *kõik* selle
SP-alamvormid on "täielik välistamine" kategoorias.

### 3.1 VR-vormi (`forms.foreign_violation_form`) kaasamine

LJVIS2-151 algses teostuses jäi `forms.foreign_violation_form` (välisriigi
rikkumise vorm — teise liikmesriigi poolt Eesti vedaja kohta teatatud
rikkumine) riskiskoori valemist täielikult välja, vastuolus
`docs/user-guide/06-vorm-valisrikkumine.md` lubadusega, et "EL rikkumiste
raskusastmed (MSI/VSI/SI/MI) mõjutavad ettevõtte riskiskoori" — ettevõttel,
kelle ainus/uusim kontroll oli VR-vorm, ei tekkinud kunagi rida
`risk.company_risk_score`-i ja esindaja vaade kuvas vaikimisi halli
"Kontrollimata". Parandatud: VR-vorm on nüüd teine, `compound_form`-ist
sõltumatu kontrolliallikas, mis kasutab sama `status='published'` +
`^[0-9]{8}$` + 2-aastase akna + "jõustumiskuupäev = esimene `published`
hetk" reegleid (vt `calculate_risk_score.sql` `vr_*` CTE-sid).

Erinevused koondvormi reeglitest:

- VR-vormil pole PPA koondvormi `sp_applicability`-ga analoogset "ei
  rakendu/ei kontrollitud" seisundit (iga VR-vorm esindab päriselt toimunud
  välisriigi kontrolli) — seega VR-kontrollidel **pole "täielik välistamine"
  kategooriat**, ainult kaks: **nullpunktiline** (`violations=[]`, `r++`,
  0 kaalupunkti) ja **normaalne kontroll kaaludega** (`r++`, kaalupunktid
  lisanduvad).
- `violations` on lihtne JSONB string-massiiv rikkumiskoodidest (nt
  `["MSI101","VSI800"]`), mitte §4 kirjeldatud objektide massiiv — raskusaste
  loetakse koodi enda prefiksist (`MSI`/`VSI`/`SI`).
- VR-vorm toetab ainult kolme raskusastet (MSI/VSI/SI) — `n_mi` on VR-kontrolli
  puhul alati 0.

### 3.2 Täiendavad kontrolliallikad (`2022-695-v2`)

Arvutus ja kontrollide loend kasutavad sama funktsiooni `risk.additional_controls`.

| Allikas | Arvestus |
|---|---|
| TRAM-i iseseisev kontrollkaart | SP-rikkumised, dokumendid ja kabotaaž. Kehtib SP välistamise erand. |
| Tööinspektsiooni kontroll | Klassifikaatori EL raskusaste × rikkumiste kogus. Punktid jagatakse vormi `vehicle_count` väärtusega. Puuduv või vigane sõidukite arv peatab arvutuse; uut skoori ei salvestata. |
| Sõiduki ja haagise tehnokontroll | Välja `violations` EL raskusastmega koodid. Tehnilise puuduse ohtlikkus ei ole iseenesest EL raskusaste. |
| ADR-kontroll | Vedaja vastutusega tuvastatud rikkumiste `reg2016403Severity`. Riskikategooria I/II/III ei anna riskipunkte. |

Koondvormi SP-, tehnilise kontrolli ja ADR-alamvormide punktid liidetakse.
Üks koondvorm suurendab kontrollide arvu ühe võrra. Kui koondvormil on ainult
tehnilise kontrolli või ADR-alamvorm, läheb see samuti arvesse. Avalikustamata,
kustutatud ja eemaldatud alamvormid ei lisa punkte. Autoveo katkestamise vorm
kirjeldab sama kontrolli lisameedet; see ei lisa eraldi kontrolli ega dubleeri rikkumisi.
Hea maine vorm kirjeldab isiku sobimatust; see ei ole veoettevõtja kontroll.

Jõustumiskuupäev on vormi esimese avalikustamise kuupäev. Sama reegel kehtib
kõigile kontrolliallikatele. Kordusavalikustamine ei alusta uut kaheaastast perioodi.

## 4. Rikkumiste JSONB väljad — TÄHTIS väljanimede märkus

Rikkumised loetakse `sp_driver_form`/`sp_teammate_form` kaheksast JSONB
väljast: `violations_561_2006`, `violations_165_2014`, `violations_2002_15`,
`violations_593_2008`, `violations_2020_1057`, `document_checks`,
`cabotage_violations`, `mass_dimension_measurements`. Viimase kirje raskusaste
on väljas `severity` (nt `VSI`, kood `VSI843`), mitte `severityCode`, ja
`isDetected` välja pole — iga kirje loeb.

**Massiivi elementide väljanimed on camelCase, mitte snake_case** —
`violationCode`, `severityCode`, `isDetected` — sest need on toorelt
salvestatud frontend'i Formik-vormi JSON-kujul
(`frontend/src/features/control-forms/types.ts`, tüüp `Violation` /
`DocumentCheck` / `CabotageViolation`), mitte teisendatud andmebaasi
tulba-nimekonventsiooni järgi. `violations_*` väljadel loetakse kirje ainult
kui `isDetected = 'true'` (string, mitte boolean!) VÕI väli puudub täielikult;
`document_checks` ja `cabotage_violations` massiividel `isDetected` välja ei
olegi, seega loetakse kõik nende kirjed tingimusteta.

## 5. Andmebaas

`risk.company_risk_score` — **ainult lisamisega** (insert-only, ajalooline)
tabel: sama ettevõtja skoori EI UUENDATA kunagi kohapeal, iga ümberarvutus
lisab uue rea. Nii annavad administraatori loend, kodanikuvaade ja tulevane
ERRU CTUD-vastus alati sama tulemuse ning varasemad tulemused jäävad koos
neid loonud `algorithm_version`'iga jälgitavaks.

```sql
CREATE TABLE risk.company_risk_score (
    id                   BIGSERIAL      PRIMARY KEY,
    company_reg_code     VARCHAR(20)    NOT NULL,
    company_name         VARCHAR(300),
    risk_score           NUMERIC(12,4),               -- NULL kui r=0
    risk_band_code       VARCHAR(20)    NOT NULL,      -- Hall|Roheline|Kollane|Punane
    total_controls       INTEGER        NOT NULL DEFAULT 0,
    g_factor             NUMERIC(4,2)   NOT NULL DEFAULT 1.0,
    window_start         DATE           NOT NULL,
    window_end           DATE           NOT NULL,
    calculation_trigger  VARCHAR(50)    NOT NULL,      -- kontrollvorm|admin|ooine_ymberarvutus
    algorithm_version    VARCHAR(30)    NOT NULL DEFAULT '2022-695-v1',
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_by           VARCHAR(100)   NOT NULL DEFAULT 'system'
);
```

Migratsioon: `DSL/Liquibase/changelog/20260827100000-initial-risk-score.sql`.

## 6. Otspunktid

| # | Otspunkt | Meetod | Auth | Kirjeldus |
|---|---|---|---|---|
| 1 | `[LJVIS_RESQL]/risk_score/calculate_risk_score` | POST (ResQL) | — | Arvutab R jooksvalt, EI salvesta. |
| 2 | `[LJVIS_RESQL]/risk_score/save_risk_score` | POST (ResQL) | — | Lisab ühe ajaloolise kirje. |
| 3 | `ruuter-internal:8089/risk-scores/recalculate` | POST | Docker-network-only | Arvutab + salvestab. Kutsub kontrollvormi kinnitamine (fire-and-forget) ja öine cron (`cron/risk-score-recalc-sync`). |
| 4 | `ruuter-internal:8089/risk-scores/current` | POST | Docker-network-only | Tagastab viimase salvestatud skoori + `riskBandErru` (ERRU jaoks). CTUD ja kodanikuotspunkti allikas. |
| 5 | `GET /v1/admin/risk-scores/list` | GET | `risk_report.list` | Pagineeritud, filtreeritud administraatori loend. |
| 6 | `GET /v1/citizen/risk-scores/my-company?q=<regcode>` | GET | TARA seanss + AR esindaja kontroll | Ettevõtte esindaja riskiskoori vaade, ilma `riskBandErru` väljata. |
| 7 | `GET /v1/citizen/me` | GET | TARA seanss | Kodaniku seansiandmed JWT-st (ilma DB-ta). Plaanitud: #168. |
| 8 | `GET /v1/citizen/my-companies` | GET | TARA seanss | AR esindusõiguse päring → esindatavad ettevõtted. Plaanitud: #168. |
| 9 | `GET /v1/citizen/risk-scores/controls?q=<regcode>` | GET | TARA seanss + AR esindaja kontroll | Ettevõtte avaldatud kontrollide loend kodanikule. Plaanitud: #168. |
| 10 | `GET /v1/citizen/my-protocols` | GET | TARA seanss | Kõik avaldatud protokollid kus isik on osaline (juht/karistatu). Plaanitud: #168. |

### Ruuter.internal teekonventsioon

`Ruuter.internal` failid ei kanna `/v1/` prefiksit (nt
`DSL/Ruuter.internal/ljvis/POST/risk-scores/recalculate.yml`, mitte
`POST/v1/risk-scores/...`) — sama muster nagu `xroad/provide/*` ja
`erru/*` failidel.

## 6.1 Öine täisümberarvutus (cronmanager)

`DSL/CronManager/risk-score-recalc.yaml` (03:00) kutsub tööd
`cron/risk-score-recalc-sync`. Töö valib kõik Eesti ettevõtjad, kellel on
avalikustatud koondvorm, VR-vorm, TRAM-i kontrollkaart või TI kontrollakt.
Samuti valib töö kõik ettevõtjad, kellel on varasem riskiskoor. Viimane valik
võimaldab vanade kontrollide aegumisel riskiskoori nullida.

Iga käik arvutab skoori uuesti ja lisab ajaloolise rea ajendiga
`ooine_ymberarvutus`. Viimase kolme päeva filter ei piira enam valikut.
Nii parandab järgmine öine käik ka ebaõnnestunud avalikustamisjärgse arvutuse.

## 7. Kontrollvormi kinnitamine/avalikustamine → automaatne ümberarvutus

Koondvormi elutsükkel: `saved → confirmed → published`; VR-vormi elutsükkel
samamoodi `saved → confirmed → published` (vt `foreign-violation-form/edit/
publish.yml`). `calculate_risk_score.sql` arvestab ainult `status='published'`
kirjeid mõlemalt allikalt. Mõlema vormitüübi avalikustamine (ja kustutamine)
kutsub fire-and-forget `risk-scores/recalculate`-it (`calculation_trigger:
kontrollvorm`) — vt `edit/publish.yml` ja `edit/delete.yml` iga vormitüübi
kataloogis.

Avalikustatud vormi muutmine-salvestamine (`edit/save.yml`, uus avalikustatud
versioon) kutsub samuti `risk-scores/recalculate`-it (sammud `recalcRiskOnResave`
/ `callRiskRecalcOnResave`): koondvormi, TRAM-i, tööinspektsiooni ja VR-vormi
puhul ettevõtja koodiga, alamvormide (SP, tehnokontroll, ADR) puhul
`recalculate/from-form` kaudu koondvormi võtmega. Mustandi salvestamine ei
arvuta ümber, sest `risk.company_risk_score` on insert-only. Test:
`DSL-tests/risk-score/resave-recalculate.test.yml`.

## 8. ERRU CTUD integratsioon (LJVIS2-144)

Sissetuleva CTUD päringu töötleja (`DSL/Ruuter.internal/ljvis/POST/erru/ctud/
inbound-request.yml`) kutsub:

```
POST ruuter-internal:8089/risk-scores/current
Body: { "company_reg_code": "<8-kohaline kood>" }
```

ja kaardistab vastuse `riskScore → riskRating`, `riskBandErru → riskBand`.
Kui ettevõtjal skoori pole, tagastatakse `null`/`Grey` ("hindamata").

**Registrikoodi tuletamine:** MTR X-tee teenus `checkCommunityLicence` ei
taga­asta kunagi Eesti äriregistri koodi, ainult ühenduse tegevusloa/tõestatud
koopia numbrit. `inbound-request.yml` tuletab registrikoodi enne
`risk-scores/current`-i kutsumist `DSL/Resql/ljvis/POST/erru/ctud/
lookup-reg-code-by-licence.sql` abil — see otsib täpset vastet
`forms.compound_form`/`forms.foreign_violation_form`/`forms.tram_control_card`
tabelite juba salvestatud litsentsinumbrite hulgast (ametnikud on neid
varasemate kontrollide käigus kirja pannud). Kui vastet ei leita, pole
ettevõtjal niikuinii kunagi riskiskoori, nii et vaikeväärtus `riskRating=0,
riskBand=Grey` jääb kehtima.

## 9. Viited

- Jira/GitHub: LJVIS2-150 (epic), LJVIS2-151 (arvutus), LJVIS2-152 (loend), LJVIS2-144 (CTUD), #168 (kodaniku töölaud — uued kodaniku lõpp-punktid)
- Confluence: 11-1 Riskiskoori arvutamine, 11-2 Riskitasemete vaade, 10-3-3 CTUD ERRU integratsioon
- `.ai/ljvis-tasks/LJVIS2-150/riskihindamine.md` — täielik ärianalüüs
