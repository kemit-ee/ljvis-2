# ADR (ohtliku veose) kontrollvorm — vastavusseviimine kliimaministri määrusega

Teostusplaan. Arhitektuuriotsused: [`architecture-decisions.md` → ADR-007](architecture-decisions.md).
Haru: `feat/adr-vorm-klassifikaatorid` (`dev` baasil).

Allikad:

* Kliimaministri määrus — RT I, 16.06.2026, 11 — <https://www.riigiteataja.ee/et/akt/116062026011> (lisa 1 = kontrollvorm, lisa 2 = kontrollkaart 12–27 ↔ 2016/403).
* „Kontrollkaardi ridade 12–27 seosed määruse 2016-403 rikkumisliikidega" (PDF, valdkonnalt).
* „ADR Kontrollkaardi tehniline suunis" (PDF) — rea 17 näidisel rikkumiste ploki täpne UI- ja andmeloogika (C/NC/NA, korratav rikkumiskirje, riskikategooria, vastutav osaleja, tingimuslik 2016/403 rikkumisliik, tuletatud raskusaste).
* Valdkonna 11 muudatusettepanekut (vt allpool „Muudatusettepanekute kaardistus").

## Sisendid — kõik käes

| Sisend | Allikas |
|---|---|
| Ühikute loend (koguse ühik) — 8 väärtust | valdkonna sõnum, vt F2 |
| 2016/403 rikkumisliik ↔ kontrollkaardi punkti seosed + raskusastmed + lisa 1 punktinimed | „Kontrollkaardi ridade 12–27 seosed…" PDF = Priit Tuuna tabel koos lisa 1 sõnastusega |
| Rikkumiste ploki UI/andmeloogika (rea 17 näidis) | „ADR Kontrollkaardi tehniline suunis" PDF |

> ADR-viited (nt „ADR 4.1–4.7") on tabelis toodud osaliselt näidetena — F0 all
> kontrolli lõpliku määruse lisa 1 vastu ja täienda vajadusel.

---

## Faasid

### F0 — Ettevalmistus (koodi ei muuda)

1. Kinnita ADR-007 (tehtud).
2. Selle plaani ülevaatus valdkonnaga.

### F1 — Klassifikaator `ADR_CONTROL_CHECKPOINT`

**Failid:**

* `DSL/Liquibase/changelog/20260903120000-adr-control-checkpoint-classifier.sql` (+ `.xml`)
* `DSL/Liquibase/changelog/20260903120000-rollback.sql`

> `DSL/Liquibase/changelog.yaml` kasutab `includeAll: changelog/` — uut faili ei pea registreerima, järjekord tuleb failinimest (kuupäev-prefiks). Hoia prefiks olemasolevatest hilisem.

**Sisu:**

**Tase 1** — 16 kirjet, `code` `P12`…`P27`, `name` = „Kontrollitav valdkond" (PDF / lisa 1), `description` = ADR-viide (kuvatakse pealkirjas sulgudes):

| code | name | description (ADR-viide) |
|---|---|---|
| P12 | Veodokumendid | — |
| P13 | Kirjalikud juhised | — |
| P14 | Sõiduki heakskiitmise nõuetele vastavus | — |
| P15 | Juhi koolitustunnistus ja isikut tõendav dokument | — |
| P16 | Kauba vedamiseks lubatavus | — |
| P17 | Mahuteid käsitlevad sätted | ADR 4.1–4.7 |
| P18 | Veole esitatavad nõuded | ADR 7.1–7.4 |
| P19 | Kooslaadimise keeld ja kogusepiirangud | — |
| P20 | Käitlemine ja veose paigutamine/kinnitamine | — |
| P21 | Pakendi / paagi / puistlasti tehniline märgistus | ADR osa 6 |
| P22 | Pakendite märgistamine ja ohumärgised | ADR osa 5 |
| P23 | Ohusildid, oranžid tahvlid ja muud tähised sõidukil/paagil | — |
| P24 | Sõidukile esitatavad nõuded | ADR osa 9 |
| P25 | Üld- ja erivarustus | ADR 8.1.4, 8.1.5 |
| P26 | Kahe-/mitmepoolsed kokkulepped, riigisisesed sätted, pädeva asutuse load | — |
| P27 | Muud rikkumised | — |

> Sulgudes toodud ADR-viited pärinevad PDF-i „Kontrollitav valdkond" veerust; F0 all kontrolli lisa 1 lõpliku sõnastuse vastu (kas viide on igal punktil ja millises kujus).

**Tase 2** — iga punkti alla selle punktiga seotud 2016/403 I lisa jaotise 9 rikkumisliigid (allikas: sama PDF). `code` = rikkumisliigi number, `name` = kirjeldus, `description` = raskusaste. Sama liik mitme punkti all = eraldi `classifier_value` kirje (`parent_key` erinev).

| punkt | 2016/403 rikkumisliigid (nr — raskusaste) |
|---|---|
| P12 | 11 — VSI |
| P13 | 24 — SI |
| P14 | 6 — VSI |
| P15 | 12 — VSI |
| P16 | 1 — MSI |
| P17 | 2 — MSI · 4 — VSI · 10 — VSI · 20 — SI · 22 — SI |
| P18 | 5 — VSI · 21 — SI |
| P19 | 9 — VSI · 10 — VSI |
| P20 | 8 — VSI |
| P21 | 23 — SI |
| P22 | 23 — SI |
| P23 | 3 — MSI · 23 — SI |
| P24 | 7 — VSI · 17 — SI |
| P25 | 18 — SI · 19 — SI |
| P26 | *(otsest eelmääratud vastet ei ole — ainult `NONE`)* |
| P27 | 13 — VSI · 14 — VSI · 15 — SI · 16 — SI |

Rikkumisliikide nimed (`name`), raskusaste (`description`):

| nr | name | raskusaste |
|---|---|---|
| 1 | Veetakse ohtlikku kaupa, mille vedu on keelatud | MSI |
| 2 | Keelatud või heakskiitmata mahuti/veovahend ja oht tingib sõiduki immobiliseerimise | MSI |
| 3 | Ohtlik kaup ei ole sõidukil ohtliku kaubana identifitseeritud ning oht tingib immobiliseerimise | MSI |
| 4 | Ohtliku aine leke | VSI |
| 5 | Puistlasti vedu konstruktsiooniliselt mittekorras konteineris | VSI |
| 6 | Vedu toimub sõidukiga, millel puudub nõutav heakskiidutunnistus | VSI |
| 7 | Sõiduk ei vasta enam heakskiitmise nõuetele ja kujutab endast vahetut ohtu | VSI |
| 8 | Veose kinnitamise ja paigutamise nõudeid ei ole järgitud | VSI |
| 9 | Pakendite kooslaadimise nõudeid ei ole järgitud | VSI |
| 10 | Veoühikus lubatud koguse piirangut / lubatud täiteastet on ületatud | VSI |
| 11 | Veetava aine kohta puudub rikkumise raskusastme määramiseks vajalik teave | VSI |
| 12 | Juhil puudub kehtiv ADR koolitustunnistus | VSI |
| 13 | Kasutatakse tuld või kaitsmata leeki | VSI |
| 14 | Suitsetamiskeelust ei peeta kinni | VSI |
| 15 | Sõiduk ei ole nõuetekohase järelevalve all või on valesti pargitud | SI |
| 16 | Veoühik sisaldab rohkem kui ühte haagist/poolhaagist | SI |
| 17 | Sõiduk ei vasta enam heakskiitmise nõuetele, kuid ei kujuta vahetut ohtu | SI |
| 18 | Sõidukis puuduvad nõutavad töökorras tulekustutid | SI |
| 19 | Sõidukis puudub ADRi või kirjalike juhiste kohaselt nõutav muu varustus | SI |
| 20 | Kahjustatud pakendi, IBC, suurpakendi või kahjustatud puhastamata tühja pakendi vedu | SI |
| 21 | Pakendatud kaupade vedu konstruktsiooniliselt mittekorras konteineris | SI |
| 22 | Paak või paakkonteiner (sh tühi puhastamata) ei ole nõuetekohaselt suletud | SI |
| 23 | Ebaõige märgistus, tähistus või ohumärgistus sõidukil ja/või mahutil | SI |
| 24 | ADR nõuetele vastavad kirjalikud juhised puuduvad või ei vasta veetavatele kaupadele | SI |

* Rippmenüü „puudub" valik (`NONE` — „Ei ole määruse 2016/403 p 9 rikkumisliik") **ei ole klassifikaatoris**, vaid frontendi konstant.
* Idempotentne (`IF EXISTS ... code = 'ADR_CONTROL_CHECKPOINT' THEN RETURN`), muster nagu `20260901120000-dangerous-goods-infringements-classifier.sql`.
* Raskusaste kuvatakse ka `name` lõpus sulgudes (nt „Lubatud täiteastme ületamine (VSI)"), et rippmenüü oleks loetav ilma eraldi veeruta — nagu tehnilise suunise rea 17 näites.

### F2 — Klassifikaator `ADR_QUANTITY_UNIT`

* `DSL/Liquibase/changelog/20260903130000-adr-quantity-unit-classifier.sql` (+ `.xml`, rollback).
* 1-tasemeline, 8 väärtust (`code` = `name`, kuna ühikutähised on juba lühikesed):

  | code | name |
  |---|---|
  | `l` | l |
  | `kg` | kg |
  | `t` | t |
  | `m3` | m³ |
  | `tk` | tk |
  | `pakendit` | pakendit |
  | `ballooni` | ballooni |
  | `nem_kg` | NEM kg |

* „Kogus" jääb arvväljaks (praegune `sanitizeDecimalInput`); „Ühik" `TextField` → `Select`.

### F3 — `DANGEROUS_GOODS_INFRINGEMENTS_NEW` eemaldamine

* Uus changeset `20260903140000-drop-dangerous-goods-infringements-new.sql` — `DROP`/`DELETE` klassifikaatori ja selle väärtuste kohta (sama loogika nagu olemasolevas `20260901120000-rollback.sql`), et olemasolev `dev`-keskkond puhastatakse. Alternatiiv: eemalda `20260901120000-dangerous-goods-infringements-classifier.*` failid täielikult, kui `dev`-i pole veel deploy'tud — kontrolli `DATABASECHANGELOG` tabelist.
* Kontrolli, et miski muu ei viita koodile: `git grep DANGEROUS_GOODS_INFRINGEMENTS`.

### F4 — Andmemudel `forms.adr_form`

**Fail:** `DSL/Liquibase/changelog/20260903150000-adr-form-maarus-alignment.sql` (+ `.xml`).

```sql
ALTER TABLE forms.adr_form
  ADD COLUMN other_infringements          JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN container_types              JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN exemption_notes              TEXT,
  ADD COLUMN driving_ban_applied          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN transport_interruption_applied BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE forms.adr_form DROP CONSTRAINT chk_adr_result_type;
ALTER TABLE forms.adr_form ADD  CONSTRAINT chk_adr_result_type
  CHECK (result_type IN ('ok', 'misdemeanor_proceedings', 'warning'));

COMMENT ON COLUMN forms.adr_form.other_infringements IS
  'JSONB array (§4.10 "Muu rikkumine", n+1): [{"title":…,"inspectionStatus":…,"notCheckedReason":…,"infringementDetected":…,"records":[…]}].';
-- (kommentaarid ülejäänud uutele veergudele analoogselt)
```

* `infringements` veeru **kuju** muutub koodis (vt Otsus 3 JSON), skeemi ei puuduta. Rikkumiskirje (`records[]`) väljad: `riskCategory` (I/II/III), `adrReference` (kohustuslik), `responsibleParticipants[]` (Ci/C/Ce/L/P/F/To/U), `reg2016403Code` (aktiivne kui `responsibleParticipants` sisaldab `C`; väärtus tase-2 klassifikaatorist või `NONE`), `reg2016403Severity` (tuletatud, salvestatud eraldi).
* `other_violations`, `container_type` veerud **jäävad alles** (append-only ajalugu), kuid backend/endpoint enam neisse ei kirjuta.

### F5 — Backend (Ruuter + Resql)

**Failid:**

* `DSL/Ruuter/ljvis/POST/v1/control-forms/adr-form/edit/save.yml`
* `DSL/Ruuter/ljvis/POST/v1/control-forms/adr-form/edit/confirm.yml`
* `DSL/Resql/ljvis/POST/control-forms/adr-form/insert.sql`
* `DSL/Resql/ljvis/POST/control-forms/adr-form/update.sql`
* `DSL/Resql/ljvis/POST/control-forms/adr-form/get.sql`, `get-by-compound-form-key.sql`, `get-snapshot(s).sql` — lisa uued veerud `SELECT`-i / väljundisse

**Muudatused:**

* `allowlist.body` + `extractRequestData`: lisa `otherInfringements` (string), `containerTypes` (string), `exemptionNotes` (string), `drivingBanApplied` (boolean), `transportInterruptionApplied` (boolean); eemalda `otherViolations`, `containerType` (või jäta ajutiselt vastu võtma, kuni frontend üle läinud — soovitus: eemalda korraga).
* Resql `insert.sql` / `update.sql`: uued veerud `NULLIF(...)::jsonb` / `::boolean` mustris; `update.sql` `latest` CTE-sse lisada uued veerud edasikandmiseks pole vaja (need tulevad alati kliendilt), aga `enforcement_decision` / `proceeding_closure_basis` muster jääb.
* `notes` pikkuse kontroll jääb; kaalu analoogset `other_infringements` pikkuse kontrolli Ruuteris.
* Audit-templatesid (`log-adr-form-create/update.yml`) ei pea muutma (ei logi neid välju).

### F6 — Frontend

**Tüübid** — `frontend/src/features/control-forms/types.ts`:

```ts
export type AdrRiskCategory = 'I' | 'II' | 'III';
export type AdrParticipant = 'Ci' | 'C' | 'Ce' | 'L' | 'P' | 'F' | 'To' | 'U';
export type AdrInspectionStatus = '' | 'C' | 'NC' | 'NA';
export type AdrRegSeverity = 'MSI' | 'VSI' | 'SI';

export type AdrInfringementRecord = {
  riskCategory: '' | AdrRiskCategory;
  adrReference: string;                   // kohustuslik sisestamisel
  responsibleParticipants: AdrParticipant[];
  reg2016403Code: string | null;          // tase-2 classifier code | 'NONE' | null
  reg2016403Severity: AdrRegSeverity | null; // tuletatud, salvestatud eraldi
};

export type AdrCheckpointEntry = {
  checkpointCode: string;                 // "P12".."P27"
  inspectionStatus: AdrInspectionStatus;
  notCheckedReason?: string;
  infringementDetected: boolean;
  records: AdrInfringementRecord[];
};

export type AdrOtherInfringementEntry = {
  title: string;
  inspectionStatus: AdrInspectionStatus;
  notCheckedReason?: string;
  infringementDetected: boolean;
  records: AdrInfringementRecord[];
};
```

* `AdrForm`: `infringements: AdrCheckpointEntry[]`; **uued** `otherInfringements: AdrOtherInfringementEntry[]`, `containerTypes: string[]`, `exemptionNotes`, `drivingBanApplied`, `transportInterruptionApplied`; eemalda `otherViolations`, `containerType`, vana `AdrInfringementEntry` / `AdrInfringementCheckStatus`.
* **Konstandid** (`AdrFormFields` või `constants`): `RISK_CATEGORIES = ['I','II','III']`, `PARTICIPANTS = ['Ci','C','Ce','L','P','F','To','U']`, `REG_CODE_NONE = 'NONE'`.

**Hook** — `useAdrForm.ts`:

* `initialValues.lastLoadAddress` / `nextLoadAddress`: `toObject(..., {})` (eemalda `{ countryCode: 'EE' }`).
* Uued väljad initialValues-se + payload-i (`JSON.stringify` massiividele).
* `getCheckpoint(code)` / `setCheckpoint(code, patch)`; `addRecord(code)` / `updateRecord(code, i, patch)` / `removeRecord(code, i)`.
* `updateRecord` juures: kui `reg2016403Code` muutub → tuleta `reg2016403Severity` tase-2 klassifikaatori `description`-ist (`getByCode('ADR_CONTROL_CHECKPOINT')`, `code === reg2016403Code`); kui `responsibleParticipants`-ist kaob `C` ja kood oli seatud → tühjenda kood + severity (tehniline suunis p 9.11: hoiatus + väärtuse eemaldamine).
* Analoogsed helperid `otherInfringements` jaoks; `toggleContainerType`.
* `onSubmit` payload: salvesta ainult read, kus `inspectionStatus` seatud; `records` alamvalideering (adrReference, riskCategory, ≥1 osaleja) enne kinnitamist.

**Komponendid:**

* `AdrInfringementsSection.tsx` — ümber kirjutada, `GroupedClassifierChecklist` (grupp = punkt P12–P27, pealkiri `<nr>. <nimi> (<ADR-viide>)`):
  * grupi tasemel `Card.Content` sees: `ChoiceGroup` „Kontroll" C/NC/NA (raadio, `direction="row"`, kuvab koodi + tähenduse); NC/NA korral valikuline `TextField` „Põhjus"; C korral `ChoiceGroup` „Rikkumine tuvastatud" Ei/Jah.
  * „Jah" korral `records` — iga kirje pesastatud `Card` (nagu `DangerousGoodsTable`): „Rikkumine {i+1}", `ChoiceGroup` riskikategooria I/II/III (**raadio**), `TextField` „Rikutud ADR punkt" (`required`), `Select` „Võimalik vastutav osaleja" (`multiple`, `PARTICIPANTS`, silt „Vedaja (C)"), `Select` „Määruse (EL) 2016/403 rikkumisliik" (`disabled` kui osalejaks pole `C`; options = grupi lapsed `renderRow` kaudu + `NONE`; hall-selgitus kui disabled), read-only tekst „2016/403 raskusaste: {severity} (automaatselt)".
  * `Button visualType="secondary"` „+ Lisa rikkumine"; `Button icon="delete" color="danger" size="small"` iga kirje juures.
  * NB: `GroupedClassifierChecklist renderRow(item, group)` annab `group` — seo punkti olek `group.code`-iga; tase-2 read (`item`) on rikkumisliigi rippmenüü valikud, mitte eraldi checkbox-loend.
* **Uus** `AdrOtherInfringementsSection.tsx` — n+1 plokid („+ Lisa uus muu rikkumine"), iga plokk = `TextField` vabatekst­pealkiri + sama väljakomplekt nagu punktiplokk; rikkumisliigi rippmenüü näitab kõiki 24 tase-2 koodi (unikaalsed) + `NONE`.
* `DangerousGoodsTable.tsx` — „Ühik" `TextField` → `Select` (`getByCode('ADR_QUANTITY_UNIT')`); i18n `unNumber` silt „ÜRO number".
* `AdrFormFields.tsx`:
  * vihjeteksti võti `forms.adr.hintOnlyOnViolation` → uus sõnastus (i18n, üks koht).
  * „Mahuti tüüp" `ChoiceGroup inputType="radio"` → `inputType="checkbox"`, `value={values.containerTypes}`, `toggleContainerType`.
  * „Erandi kohaldamine": Jah/Ei kohe pealkirja alla (juba nii); lisa lause „ADR erandi kohaldamine vastavalt ADR sättele:" + „ADRi punkt" väli (olemas) + **uus** „Märkus (direktiivi 2008/68/EÜ erandid)" `TextArea` (`exemptionNotes`).
  * „Kontrolli tulemus": `RESULT_OPTIONS` → `['ok','misdemeanor_proceedings','warning']`; **uued** eraldi märkeruudud „Sõidukeeld (direktiivi (EL) 2022/1999 artikkel 5)" (`drivingBanApplied`) ja „Autovedu on katkestatud" (`transportInterruptionApplied`) — sõltumatud tulemuse valikust.
  * Menetluse viitenumbri väli: silt/placeholder tingimuslik — `proceedingType === 'general'` → „Väärteoasja number".
* `AddressFields.tsx`:
  * riigi `Select` — lisa tühi esimene valik (`{ value: '', label: '' }` või `isClearable`), et valikut saaks tühjendada.
  * `!isEstonia` haru: `county` ja `city` `TextField` `disabled={disabled}` (mitte `disabled={true}`), `onChange` säilitab teksti.
* `AdrFormViewCard.tsx` / view-režiim — kõik uued väljad kuvada ka ainult-loe vaates.

**i18n** — `frontend/src/i18n/et.json` (`forms.adr.*`), uued/muudetud võtmed:

* `infringements.inspectionStatus` + `.status.{C,NC,NA}` (kood + tähendus), `.notCheckedReason`, `.infringementDetected`, `.record` („Rikkumine {{n}}"), `.addRecord`, `.removeRecord`
* `infringements.riskCategory` + `.riskCategoryOptions.{I,II,III}`
* `infringements.participants` + `.participantOptions.{Ci,C,Ce,L,P,F,To,U}` (kujul „Vedaja (C)")
* `infringements.regCode` + `.regCodeNone` („Ei ole määruse 2016/403 p 9 rikkumisliik"), `.regCodeDisabledHint`, `.regSeverityAuto`
* `otherInfringements.{title,addRow,empty}`
* `result.drivingBanApplied` („Sõidukeeld (direktiivi (EL) 2022/1999 artikkel 5)"), `result.transportInterruptionApplied`
* `exemption.notes` („Märkus (direktiivi 2008/68/EÜ erandid)"), `exemption.provisionIntro` („ADR erandi kohaldamine vastavalt ADR sättele:")
* `hintOnlyOnViolation` → „Täita ainult juhul, kui see on rikkumise puhul asjakohane."
* `dangerousGoods.unNumber` → „ÜRO number"; `containerType.title` jääb
* `result.proceedingReferenceNumber` — lisa `result.misdemeanourCaseNumber` („Väärteoasja number") tingimuslikuks kasutuseks

### F5b — `forms.form_search` vaade

* `DSL/Liquibase/changelog/20260903160000-form-search-adr-violation.sql` (+ `.xml`) — ADR `has_violation` reegel:
  praegu `ad.result_type <> 'ok'`; uus:
  `ad.result_type <> 'ok' OR ad.driving_ban_applied OR ad.transport_interruption_applied
   OR EXISTS (SELECT 1 FROM jsonb_array_elements(ad.infringements) cp
             WHERE cp->>'inspectionStatus'='C' AND (cp->>'infringementDetected')::boolean
               AND jsonb_array_length(COALESCE(cp->'records','[]'::jsonb)) > 0)
   OR EXISTS (SELECT 1 FROM jsonb_array_elements(ad.other_infringements) oi
             WHERE jsonb_array_length(COALESCE(oi->'records','[]'::jsonb)) > 0)`.
* Muster nagu `20260831120000-form-search-view-sp-violation.sql` (kogu vaade `CREATE OR REPLACE`).

### F7 — Dokumentatsioon

* `docs/user-guide/11-vorm-adr.md` — jaotised 5–11 ümber (uus rikkumiste struktuur: punkt → C/NC/NA → korratav rikkumiskirje riskikategooria / ADR punkt / vastutav osaleja / tingimuslik 2016/403 rikkumisliik; mitmene mahuti; erandi märkus; tulemuse lisameetmed; väärteoasja number); ekraanipildid regenereerida (`docs/screenshots/capture.mjs`).
* **Confluence** — „LJVIS2 kasutusjuhend" leht wiki.kemit.ee (ruum LIA) genereeritakse `docs/`-ist. Pärast `11-vorm-adr.md` uuendust: `CONFLUENCE_TOKEN=<token> python3 scripts/publish-guide-to-confluence.py` (vajab tokenit — käivitab Sten). Leht viiakse kooskõlla uue vormiga.
* `docs/andmehaldus/klassifikaatorid.md` — `ADR_CONTROL_CHECKPOINT`, `ADR_QUANTITY_UNIT`; eemalda `DANGEROUS_GOODS_INFRINGEMENTS_NEW` sektsioon.
* `docs/andmehaldus/rikkumiste-klassifikaatorid-2016-403.md` — rida jaotise 9 kohta uuenda (`ADR_CONTROL_CHECKPOINT`).
* `docs/planning/Tableau_guidlines.md` — **tehtud selle plaani commitis**: §5.5, §6.3, §6.4, §7.1, §11 (ADR rikkumiste struktuur + „ohtlike kaupade kogus ühiku kaupa, korras vs pole korras" retsept, `tableau.adr_dangerous_good` / `tableau.adr_infringement_record` vaated).
* `DSL/Liquibase/test/20260903100000-user-guide-fixture-forms.sql` — ADR näidisvorm uue kujuga.
* `docs/muudatused.md` — uus kirje (enne `push`'i; vt [memory: muudatuste-logi]).

### F8 — Testid (AC-de katmiseks, iga faasi commiti sees)

CI-jobid: `Validate DSL` (YAML/SQL süntaks), `E2E Tests` (Newman + Liquibase `update` CI-stackis), `Frontend — Lint / Unit Tests (vitest) / Build`.

| Issue | Test | Kus |
|---|---|---|
| #1, #2, #8 | Liquibase `update` CI-stackis läbib; `SELECT` kontrollib et `ADR_CONTROL_CHECKPOINT` (16 tase-1 + N tase-2) ja `ADR_QUANTITY_UNIT` (8) on olemas | E2E stack (`docker-compose.ci.yml` liquibase) + uus Postman-päring `GET /classifier-values?classifier=ADR_CONTROL_CHECKPOINT` |
| #3 | `DANGEROUS_GOODS_INFRINGEMENTS_NEW` ei eksisteeri pärast `update`-i | Postman: `GET /classifier-values?...` → tühi / 404 |
| #4 | migratsioon läbib; uued veerud olemas õige tüübiga; `chk_adr_result_type` lubab ainult 3 väärtust | E2E; Postman insert `result_type=driving_ban_art5` → 422 |
| #5 | `POST /v1/control-forms/adr-form/edit/save` uute väljadega (`infringements` uus kuju, `containerTypes`, `otherInfringements`, `exemptionNotes`, `drivingBanApplied`) → 200, `GET` tagastab samad | `tests/postman/collections/adr-form.collection.json` — uued/muudetud päringud |
| #6 | ADR-vorm tuvastatud rikkumiskirjega → `form_search.has_violation = true`; puhas → `false` | Postman: loo 2 ADR-vormi, `GET /v1/forms/search` kontrollib `hasViolation` |
| #7 | `useAdrForm` helperid: `setCheckpoint`, `addRecord`/`removeRecord`, severity tuletamine koodist, `C` eemaldamine osalejatest tühjendab `reg2016403Code`; `AddressFields` — välisriik lubab käsitsi maakonna/linna, tühi riigivalik; „Mahuti tüüp" checkbox mitmene | `frontend/src/features/control-forms/pages/adr-form/useAdrForm.test.ts`, `AddressFields.test.tsx` (uued vitest-failid) |
| #7 | i18n: kõik uued võtmed olemas `et.json`-is (ei jää `forms.adr...` toorelt) | olemasolev i18n-võtmete test kui on, muidu väike vitest |
| #9 | markdown-lint / lingikontroll kui CI-s on; muidu manuaalne | — |

Rollback: iga F1–F4 changeseti kõrvale `*-rollback.sql`; kontroll et `liquibase rollbackCount` töötab lokaalselt (ei ole CI-s, dok `muudatused`-i märkusesse).

---

## Muudatusettepanekute kaardistus (11 punkti)

| # | Ettepanek | Faas | Konkreetne muudatus |
|---|---|---|---|
| 1 | „Autojuhi abi andmed" jt vihjetekst → „Täita ainult juhul, kui see on rikkumise puhul asjakohane" | F6 | `et.json` `forms.adr.hintOnlyOnViolation` (üks võti, kasutatakse mitmes kaardis) |
| 2 | „ADR koolitustunnistuse numbrid" — sama tekst | F6 | sama võti (kaart kasutab juba `hintOnlyOnViolation`) |
| 3 | „Viimase peale-/mahalaadimise aadress ja kuupäev" | F6 | 3.1 sama vihjetekst; 3.2 eemalda `EE` vaikeväärtus (`useAdrForm`); 3.3 tühi esimene riigivalik (`AddressFields`); 3.4 välisriik → käsitsi maakond/linn (`AddressFields`) |
| 4 | „Järgmise peale-/mahalaadimise aadress" | F6 | sama nagu 3 (`nextLoadAddress`) |
| 5 | „Veetavate ohtlike kaupade andmed" | F2, F6 | 5.1 „ÜN-number" → „ÜRO number" (i18n `forms.adr.dangerousGoods.unNumber`), sama lisatava kauba real; 5.2 „Ühik" → klassifikaatori `Select` (`ADR_QUANTITY_UNIT`) |
| 6 | „Erandi kohaldamine" | F4, F6 | 6.1 Jah/Ei kohe pealkirja alla (juba nii, kontrolli); 6.2 lause „ADR erandi kohaldamine vastavalt ADR sättele:" + „ADRi punkt" väli; 6.3 uus „Märkus (direktiivi 2008/68/EÜ erandid)" (`exemption_notes`) |
| 7 | „Mahuti tüüp" — raadionupud → mitmene | F4, F6 | `container_types` JSONB massiiv; `ChoiceGroup inputType="checkbox"` |
| 8 | „Rikkumised" — täielik ümbertegemine | F1, F4, F6 | punktipõhine struktuur P12–P27 (`ADR_CONTROL_CHECKPOINT`); rea tasand C/NC/NA raadio + „Rikkumine tuvastatud Ei/Jah"; korratav rikkumiskirje: **riskikategooria I/II/III raadio** (üks), kohustuslik „Rikutud ADR punkt", mitmene „Vastutav osaleja" (Ci/C/Ce/L/P/F/To/U), tingimuslik „2016/403 rikkumisliik" (ainult kui osaleja = Vedaja C) + `NONE`; raskusaste tuletatud + eraldi salvestatud |
| 9 | „Muu rikkumine" — n+1 „Lisa uus muu rikkumine" | F4, F6 | `other_infringements` JSONB massiiv; `AdrOtherInfringementsSection`; sama rikkumiskirje struktuur, pealkiri vabatekst, rikkumisliik = kõik 24 + `NONE` |
| 10 | „Kontrolli tulemus" | F4, F6 | 10.1 sõidukeeld + veo katkestamine eraldi märkeruutudeks (`driving_ban_applied`, `transport_interruption_applied`), tulemuse raadio jääb {korras, väärteomenetlus, hoiatus}; 10.2 „Sõidukeeld (direktiivi (EL) 2022/1999 artikkel 5)" |
| 11 | Üldmenetluse selgitusväli → „Väärteoasja number" | F6 | tingimuslik silt kui `proceedingType === 'general'` |

---

## Epic ja issued (GitHub, kemit-ee/ljvis-2)

Epic: **„ADR muudatused — kliimaministri määruse vorm"** (`epic` label). Iga faas = eraldi `task` issue, määratud `sviljus`-le, lingitud epicu külge. Töö toimub ühel harul `feat/adr-vorm-klassifikaatorid`; iga faasi commit(id) viitavad issuele (`#<nr>`), CI roheliseks → issue AC-d märgitakse täidetuks → issue suletakse täiendava commitiga (`Closes #<nr>`). Lõpus üks PR `dev`-i vastu, mis paneb kinni ka epicu.

CI (`.github/workflows/ci.yml`) jookseb feature-harul ainult avatud PR-i korral → **draft PR luuakse kohe** esimese commiti järel ja hoitakse draftis kuni kõik faasid roheslised; siis „ready for review" → merge.

| Issue | Faas | Commit(id) |
|---|---|---|
| [#228](https://github.com/kemit-ee/ljvis-2/issues/228) ADR muudatused (epic) | — | — |
| #229 ADR-vormi rikkumiste klassifikaator | F1 | `feat(adr): ADR_CONTROL_CHECKPOINT klassifikaator (#229)` |
| #230 Ohtlike kaupade koguse ühiku klassifikaator | F2 | `feat(adr): ADR_QUANTITY_UNIT klassifikaator (#230)` |
| #231 DANGEROUS_GOODS_INFRINGEMENTS_NEW eemaldamine | F3 | `chore(adr): eemalda DANGEROUS_GOODS_INFRINGEMENTS_NEW (#231)` |
| #232 forms.adr_form andmemudel määruse vormi jaoks | F4 | `feat(adr): forms.adr_form veerud + infringements kuju (#232)` |
| #233 Backend: save/confirm/resql uued väljad | F5 | `feat(adr): ADR-vormi backend uued väljad (#233)` |
| #234 forms.form_search ADR has_violation reegel | F5b | `feat(adr): form_search ADR has_violation reegel (#234)` |
| #235 Frontend: rikkumiste plokk + mahuti + erand + tulemus + aadress | F6 | `feat(adr): ADR-vorm määruse kujule (#235)` |
| #236 Klassifikaatorite seemneväärtused | F1/F2 tase-2 | `feat(adr): ADR klassifikaatorite väärtused (#236)` |
| #237 Dokumentatsioon + Confluence + muudatused.md | F7 | `docs(adr): kasutusjuhend, klassifikaatorid, muudatused (#237)` |

Testid kirjutatakse **iga faasi commiti sees** (F8 loend), et CI kontrolliks vastava issue AC-d.

## Riskid

* **Lisa 1 sõnastus** — plaan tugineb lisale 2 + PDF-ile; punktinimed/ADR-viited kontrollida lõpliku RT-teksti vastu (F5/F0).
* **`AddressFields` on jagatud** autoveo katkestamise vormiga — tühja riigivaliku ja välisriigi käsitsi väljade muudatus mõjutab ka seda; kontrolli TI-vormi `useTransportInterruptionForm` vaikeväärtust ja view-kaarti.
* **`getByCode` mitme-snapshot'i probleem** (vt [memory: classifier-values-query-multi-snapshot-bug]) — uue klassifikaatori lisamisel veendu, et `list_classifier_value_data` alampäring on juba parandatud `dev`-is.
* **`infringements` kuju muutus** — kui `dev`-keskkonnas on testandmeid vana kujuga, siis view-kaart peab taluma mõlemat või testandmed puhastada.
