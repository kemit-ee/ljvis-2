# Klassifikaatori väärtuste piiramine vormidele — teostusplaan

Arhitektuuriotsus: [`architecture-decisions.md` → ADR-011](architecture-decisions.md).
Haru: `feat/klassifikaator-vormipiirang` (`dev` baasil).

**Eesmärk:** admin-kasutaja saab klassifikaatori väärtuse juures mitmikvalikuga määrata,
millistel vormidel see väärtus valikus kuvatakse. Kui midagi pole valitud, on väärtus
kasutusel kõigil vormidel (nii nagu praegu).

---

## F0 — Ettevalmistus (koodi ei muuda)

1. Kinnitada ADR-011.
2. Valdkonnaga läbi käia esimesed piiratavad väärtused: klassifikaator, väärtus ja
   vormid. Sellest saab F7 testandmestik ja kasutusjuhendi näide.
3. Kontrollida, et igal vormil, mis piirangut vajab, on `formRoutes.ts`-is
   `classifierCode`.
   - `trailer_technical_form`-il see praegu **puudub** (FORM_TYPE-is on olemas
     `SP_TRAILER_TECH`). Lisada F4 käigus.
   - ERRU vormidel (CTUD, CGR, RSI, NCR, NU) FORM_TYPE koodi ei ole. Need jäävad
     esimesest etapist välja (vt ADR-011 → Tagajärjed).

## F1 — Liquibase

**Failid:**

- `DSL/Liquibase/changelog/<TS>-classifier-value-form-scope.sql` (+ `.xml`, `-rollback.sql`)

> `<TS>` peab olema hilisem kui viimane olemasolev prefiks (praegu `20261123110000`), sest
> `includeAll` järjestab failid nime järgi.

**Sisu (idempotentne):**

```sql
CREATE TABLE IF NOT EXISTS classifier.classifier_value_form_scope (
    classifier_value_key BIGINT       NOT NULL,
    form_type_code       VARCHAR(50)  NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by           VARCHAR(100),
    PRIMARY KEY (classifier_value_key, form_type_code)
);
CREATE INDEX IF NOT EXISTS idx_cvfs_form_type_code
    ON classifier.classifier_value_form_scope (form_type_code);
```

- FK-d ei ole: `classifier_value_key` ei ole snapshot-tabelis unikaalne ja FORM_TYPE on
  samuti klassifikaator. Terviklust tagab Resql (F2).
- Andmeid ei migreerita. Tühi tabel tähendab, et kõik väärtused on kõigile vormidele
  lubatud.
- Rollback: `DROP TABLE IF EXISTS classifier.classifier_value_form_scope;`
- Kui on vaja Tableau / `tableau` skeemi vaadet (ADR-009), tehakse see eraldi. Esimeses
  etapis seda ei tehta.

## F2 — Resql (`DSL/Resql/ljvis/POST/classifier/`)

| Fail | Muudatus |
|---|---|
| `list_classifier_value_data.sql` | Uus väljund `form_types` (`type: array`): `COALESCE((SELECT array_agg(form_type_code ORDER BY form_type_code) FROM classifier.classifier_value_form_scope s WHERE s.classifier_value_key = v.classifier_value_key), ARRAY[]::TEXT[])` |
| `get_classifier_value.sql` | Sama `form_types` väljund admin-UI muutmisvaate jaoks |
| `get_classifier_values.sql` | `form_types` admin-nimekirja veeruks (valikuline, vt F5) |
| **uus** `set_classifier_value_form_scope.sql` | Asendab nimekirja tervikuna, vt allpool |
| `update_classifier_value.sql` | **Veaparandus:** `latest` CTE-sse lisada `parent_key`, `description`, mis kantakse INSERT-is üle |

`set_classifier_value_form_scope.sql`. Parameetrid antakse samamoodi nagu
`user_group/set_user_group_organisations.sql`-is: komadega eraldatud string ja
`string_to_array`.

```sql
WITH wanted AS (
    SELECT DISTINCT unnest(string_to_array(NULLIF(:form_type_codes, ''), ',')) AS code
),
valid AS (  -- ainult olemasolevad FORM_TYPE koodid
    SELECT w.code FROM wanted w
    WHERE EXISTS (
        SELECT 1 FROM classifier.classifier_value cv
        JOIN classifier.classifier c ON c.classifier_key = cv.classifier_key
        WHERE c.code = 'FORM_TYPE' AND cv.code = w.code)
),
del AS (
    DELETE FROM classifier.classifier_value_form_scope s
    WHERE s.classifier_value_key = :classifier_value_id::BIGINT
      AND s.form_type_code NOT IN (SELECT code FROM valid)
    RETURNING s.form_type_code
),
ins AS (
    INSERT INTO classifier.classifier_value_form_scope (classifier_value_key, form_type_code, created_by)
    SELECT :classifier_value_id::BIGINT, code, :created_by FROM valid
    ON CONFLICT DO NOTHING
    RETURNING form_type_code
)
SELECT (SELECT count(*) FROM del) AS removed, (SELECT count(*) FROM ins) AS added;
```

- `classifier_value_id` antakse `type: integer` (resql 0.2.0 reegel, vt PR #251).
- Tühi `form_type_codes` kustutab kõik read, mis tähendab, et väärtus on taas kõigile
  lubatud.

## F3 — Ruuter

| Fail | Muudatus |
|---|---|
| `PUT/v1/classifiers/value.yml` | allowlist `formTypes` (array); `extractRequestData`: `form_type_codes: "${(incoming.body.formTypes ?? []).join(',')}"`; pärast `updateClassifierValue` uus samm `setFormScope` → `set_classifier_value_form_scope` |
| `POST/v1/classifiers/value.yml` | Sama loomisel; `classifier_value_id` võetakse insert'i vastusest |
| `GET/templates/classifier/calculate-validity-changed-fields.yml` (või uus mall) | Muudetud väljade hulka `formTypes` vana → uus, et auditikirje näitaks muudatust |
| `GET/v1/classifier-values.yml`, `GET/v1/citizen/classifier-values.yml` | Muudatust pole, uus väli tuleb Resql-ist kaasa |

Kontrollid: `dsl-lint` (allowlisti katvus, vt PR #260/#284), Newman/`DSL-tests`
klassifikaatori stsenaariumi laiendamine.

## F4 — Frontend: filtreerimine vormidel

1. **`features/classifiers/types.ts`**: `ClassifierEntry.formTypes: string[]` ja
   `ClassifierValue.formTypes?: string[]`.
2. **`adapters.ts`**: `formTypes: data.formTypes ?? []` (mõlemad allikad).
3. **Uus `ClassifierScopeProvider`** (`features/classifiers/ClassifierScopeContext.tsx`):
   - prop `formType: string`;
   - `useClassifiers()` loeb konteksti. `getByCode()` ja `getChildren()` filtreerivad
     reegliga `v.formTypes.length === 0 || v.formTypes.includes(formType)`;
   - `getValue()` / `label()` jäävad **filtreerimata**;
   - konteksti puudumisel (admin, otsing, töölaud) filtrit ei rakendata.
4. **`useClassifierLabel.options()`**: lisada valikuline parameeter `keep?: string | string[]`.
   Parajasti valitud kood lisatakse valikutesse ka siis, kui see on vormile piiratud
   (sama muster nagu aegunud väärtustel, kui see on olemas). Kontrollida
   `Select`-väljadega kohti, kus väärtus tuleb salvestatud vormist.
5. **Vormilehed** mähitakse konteksti, `formType` võetakse `formRoutes.ts` →
   `classifierCode`:
   - TI (`labour_inspection_form`), VR (`foreign_violation_form`), hea maine,
     haldusmenetlus;
   - koondvorm + SP alamvormid (driver, teammate, vehicle/trailer technical, ADR,
     transport interruption). **Iga alamvorm saab oma koodi**, mitte `SP_COMPOUND`-i;
   - TRAM kontrollkaart (`TRAM_KONTROLLKAART`);
   - `trailer_technical_form`-ile lisada `classifierCode: 'SP_TRAILER_TECH'`.
6. **Kõne-kohtade audit:** leida `getByCode(...).find(...)` mustrid, mida kasutatakse
   sildi leidmiseks. Need tuleb asendada `getValue()`-ga, sest muidu peidaks kontekst
   ka salvestatud väärtuse nime (`grep -rn "getByCode(" frontend/src`).
7. PDF / vaatamisrežiim: kasutab silte, seega muudatust ei vaja. Kontrollida üle.

## F5 — Frontend: admin-UI

1. **`ClassifierValueInfoCard.tsx`**: uus väli **„Piira vormidele"**
   - TEDI `Select` `multiple` (`@tedi-design-system/react` → `tedi/components/form/select`);
   - valikud tulevad `getByCode('FORM_TYPE')`-st, **rühmitatud** hierarhia järgi:
     „Veondusjärelevalve (SP)" rühmas SP alamvormid, rühma saab valida korraga;
     ülejäänud tipptasemel väärtused eraldi;
   - abitekst: „Kui ühtegi vormi pole valitud, on väärtus kasutusel kõigil vormidel.";
   - vaatamisrežiimis kuvatakse valitud vormid `Tag`-idena, tühja valiku korral tekst
     „Kõik vormid";
   - orvuks jäänud koodi (FORM_TYPE väärtust enam pole) kuvatakse hoiatusega.
2. **`useClassifierValueForm.ts`** / **`ClassifierValueCreatePage`**: `formTypes`
   initialValues-isse ja payload'i. **`classifiers/api.ts`**: `formTypes` PUT/POST body-sse.
3. **`ClassifierDetailPage`** väärtuste tabel: veerg „Vormid" (tühja korral „Kõik").
   Valikuline, aga annab ülevaate ilma iga väärtust avamata.
4. **i18n** `et.json` + `en.json`: `classifiers.value.formScope.label`, `.help`,
   `.all`, `.orphan`, `.groupSp`.
5. `frontend/package.json` versiooni **MINOR** tõus (uus funktsionaalsus).

## F6 — Testid

- **Unit (vitest):** `ClassifierScopeProvider`. Kontrollida: tühi `formTypes` tähendab,
  et väärtus on nähtav; piiratud väärtus peidetakse teisel vormil; `getValue` leiab
  peidetud väärtuse; `options({ keep })` hoiab valitud väärtuse alles; konteksti
  puudumisel filtrit pole.
- **Unit:** admin-kaardi mitmikvalik. Tühi valik saadab `formTypes: []`, rühmavalik
  saadab kõik alamkoodid.
- **DSL-tests / Newman:** väärtuse muutmine koos `formTypes`-iga, seejärel GET
  `/v1/classifier-values` tagastab õige massiivi. Tühjaks tegemine eemaldab read.
  Vigane kood ignoreeritakse.
- **Regressioon:** `update_classifier_value` kannab üle `parent_key` ja `description`
  (FORM_TYPE `DASHBOARD_MANUAL_ADD` jääb pärast nime muutmist alles).
- `npx tsc --noEmit`, `npm run lint`, `npm test`.

## F7 — Käsitsi kontroll (docker-compose)

1. Piirata üks jagatud väärtus (näiteks TACHOGRAPH_TYPES-i üks väärtus) ainult
   `TRAM_KONTROLLKAART`-ile. Kontrollida, et TRAM-il on väärtus nähtav ja PPA
   autojuhi vormil mitte.
2. Avada vana PPA vorm, kus see väärtus on salvestatud. Silt peab kuvatama ja väärtus
   peab olema valikus alles. Salvestamine peab õnnestuma.
3. Eemaldada piirang. Väärtus peab olema jälle kõigil vormidel nähtav (pärast lehe
   uuesti laadimist, sest provider laeb väärtused ühe korra).
4. Auditilogis peab olema kirje vana ja uue vormide nimekirjaga.

## F8 — Dokumentatsioon

- Kasutusjuhendi klassifikaatorite peatükk: uus väli, ekraanipilt, näide.
- `docs/muudatused.md`.
- `AGENTS.md`: lühike lõik „Klassifikaatori vormipiirang" (tabel, semantika, provider).
- Confluence pärast merge'i.

---

## Lahtised küsimused

| # | Küsimus | Vaikevastus plaanis |
|---|---|---|
| 1 | Kas `SP_COMPOUND` valimine peaks hõlmama kõiki alamvorme (pärilus)? | Ei. Rühmavalik UI-s annab sama mugavuse, aga andmed jäävad selgesõnaliseks |
| 2 | Kas vaja on serveripoolset valideerimist `save.yml`-ides? | Esimeses etapis ei |
| 3 | Kas ERRU vormid (RSI, NCR…) vajavad piirangut? | Esimeses etapis ei. Vajaduse korral lisatakse FORM_TYPE koodid |
| 4 | Kas STRUCTURE_UNIT-i `description` silt viia üle samale mudelile (organisatsioonipõhine)? | Eraldi otsus / PR |
