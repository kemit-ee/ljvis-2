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
| Nᵢ | Kontrollitud sõidukite arv kontrollis *i* | Alati 1 (üks sõiduk teekontrolli kohta) |
| r | Arvesse võetud kontrollide koguarv (sh nullpunktilised) | — |
| g | Aruka sõidumeeriku kaalutegur | **1.0** (algoritmi versioon `2022-695-v1`) |
| R | Koondriskiskoor | Arvutustulemus, `NULL` kui `r = 0` |

Kuna Nᵢ = 1 alati, taandub valem praktikas `R = (Σᵢ kaalupunktidᵢ) / r × g`.

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
- `RISK_BAND` klassifikaator (seeditud `20260801100000-erru-ctud-classifier-
  seed.sql`-is, kommentaar "Eesti tagastab Grey kuni riskihindamise mooduli
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
LJVIS2-144 klassifikaatoriseedis, väljaspool selle mooduli skoopi.

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
  Samuti kui koondvormil pole ühtegi SP-alamvormi üldse.
- **Nullpunktiline kontroll** (`r++`, kaalupunkte 0):
  - `sp_applicability = 'RAKENDATAKSE'` JA `proceeding_type IN ('KIIR','YLD','LYHI')` JA rikkumisi ei tuvastatud, VÕI
  - `result_type = 'HOIATUS'` JA `sp_applicability = 'RAKENDATAKSE'` JA rikkumisi ei tuvastatud.
- **Normaalne kontroll kaaludega** (`r++`, kaalupunktid lisanduvad): kõik muu.

Koondvorm ise loetakse täielikult välistatuks ainult siis, kui *kõik* selle
SP-alamvormid on "täielik välistamine" kategoorias.

## 4. Rikkumiste JSONB väljad — TÄHTIS väljanimede märkus

Rikkumised loetakse `sp_driver_form`/`sp_teammate_form` seitsmest JSONB
väljast: `violations_561_2006`, `violations_165_2014`, `violations_2002_15`,
`violations_593_2008`, `violations_2020_1057`, `document_checks`,
`cabotage_violations`.

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
| 3 | `ruuter-internal:8089/risk-scores/recalculate` | POST | Docker-network-only | Arvutab + salvestab. Kutsub koondvormi avaldamine (fire-and-forget) ja cronmanager. |
| 4 | `ruuter-internal:8089/risk-scores/current` | POST | Docker-network-only | Tagastab viimase salvestatud skoori + `riskBandErru` (ERRU jaoks). CTUD ja kodanikuotspunkti allikas. |
| 5 | `GET /v1/admin/risk-scores/list` | GET | `risk_report.list` | Pagineeritud, filtreeritud administraatori loend. |
| 6 | `GET /v1/citizen/risk-scores/my-company?q=<regcode>` | GET | TARA sessioon + AR esindaja kontroll | Ettevõtte esindaja riskiskoori vaade, ilma `riskBandErru` väljata. |
| 7 | `GET /v1/citizen/me` | GET | TARA sessioon | Kodaniku sessiooniandmed JWT-st (ilma DB-ta). Plaanitud: #168. |
| 8 | `GET /v1/citizen/my-companies` | GET | TARA sessioon | AR esindusõiguse päring → esindatavad ettevõtted. Plaanitud: #168. |
| 9 | `GET /v1/citizen/risk-scores/controls?q=<regcode>` | GET | TARA sessioon + AR esindaja kontroll | Ettevõtte avaldatud kontrollide loend kodanikule. Plaanitud: #168. |
| 10 | `GET /v1/citizen/my-protocols` | GET | TARA sessioon | Kõik avaldatud protokollid kus isik on osaline (juht/karistatu). Plaanitud: #168. |

### Ruuter.internal teekonventsioon

`Ruuter.internal` failid ei kanna `/v1/` prefiksit (nt
`DSL/Ruuter.internal/ljvis/POST/risk-scores/recalculate.yml`, mitte
`POST/v1/risk-scores/...`) — sama muster nagu `xroad/provide/*` ja
`erru/*` failidel.

## 7. Kontrollvormi avaldamine → automaatne ümberarvutus

Koondvormi elutsükkel: `saved → confirmed → published`.
`calculate_risk_score.sql` arvestab ainult `status='published'` kirjeid.

`publish.yml` (`DSL/Ruuter/ljvis/POST/v1/control-forms/compound-form/edit/publish.yml`)
kutsub pärast edukat avaldamist fire-and-forget viisil `risk-scores/recalculate`'i
(`calculation_trigger: kontrollvorm`) — ükski selle kutse viga ei blokeeri
vormi avaldamist. Ainult Eesti 8-kohalise registrikoodiga ettevõtjad
käivitavad ümberarvutuse (regex `^[0-9]{8}$`); välismaised ettevõtjad jäetakse vahele.

## 8. ERRU CTUD integratsioon (LJVIS2-144, väljaspool skoopi)

Kui CTUD-i sissetuleva päringu töötleja ehitatakse, kutsub see:

```
POST ruuter-internal:8089/risk-scores/current
Body: { "company_reg_code": "<8-kohaline kood>" }
```

ja kaardistab vastuse `riskScore → riskRating`, `riskBandErru → riskBand`.
Kui ettevõtjal skoori pole, tagastatakse `null`/`Grey` ("hindamata").

## 9. Testimine

Testfixture'id: `DSL/Liquibase/test/20260827100001-risk-score-test-fixtures.sql`
(3 fiktiivset ettevõtjat, kood `900000{01,02,03}`, katab Punane/Roheline
(nullpunktiline)/Hall (välistatud) stsenaariumid — vt ka
`.ai/ljvis-tasks/LJVIS2-150/test-cases.md`).

## 10. Viited

- Jira/GitHub: LJVIS2-150 (epic), LJVIS2-151 (arvutus), LJVIS2-152 (loend), LJVIS2-144 (CTUD, väljaspool skoopi), #168 (kodaniku töölaud — uued kodaniku endpointid)
- Confluence: 11-1 Riskiskoori arvutamine, 11-2 Riskitasemete vaade, 10-3-3 CTUD ERRU integratsioon
- `.ai/ljvis-tasks/LJVIS2-150/riskihindamine.md` — täielik ärianalüüs
