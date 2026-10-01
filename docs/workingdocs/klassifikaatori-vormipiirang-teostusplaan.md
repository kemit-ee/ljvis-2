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
3. Vormitüübi koodid on `features/classifiers/formScope.ts` → `FORM_TYPE_CODE`.
   - `formRoutes.ts` → `classifierCode`-i **ei kasutata**. `trailer_technical_form`-il
     see puudub meelega: väli juhib ka töölaua „Lisa vorm" menüüd
     (`getAvailableFormKeys`) ja `SP_TRAILER_TECH` on `DASHBOARD_MANUAL_ADD`.
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
| DMapper `map_classifier_value(s).handlebars` | `formTypes` massiiv admin-vaadete vastusesse |

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
| `PUT/v1/classifiers/value.yml` | allowlist `formTypes` (array); `extractRequestData`: `form_type_codes: "${(incoming.body.formTypes ?? []).join(',')}"`; pärast `updateClassifierValue` samm `setFormScope` → `set_classifier_value_form_scope`. **Kui `formTypes` puudub, jäetakse piirang muutmata** (vanemad kliendid / skriptid) |
| `POST/v1/classifiers/value.yml` | Sama loomisel; `classifier_value_id` võetakse insert'i vastusest |
| auditikirje (`buildAuditContent`) | PUT: vana piirang loetakse enne muutmist (`get_classifier_value`). Kirjelduses ja `log_content`-is on `formTypesOld` → `formTypes` |
| `GET/v1/classifier-values.yml`, `GET/v1/citizen/classifier-values.yml` | Muudatust pole, uus väli tuleb Resql-ist kaasa |

Kontrollid: `dsl-lint` (allowlisti katvus, vt PR #260/#284), Newman/`DSL-tests`
klassifikaatori stsenaariumi laiendamine.

## F4 — Frontend: filtreerimine vormidel

1. **`features/classifiers/types.ts`**: `ClassifierEntry.formTypes: string[]` ja
   `ClassifierValue.formTypes?: string[]`. **`adapters.ts`**: `formTypes: data.formTypes ?? []`.
2. **`formScope.ts`**: `FORM_TYPE_CODE`, `isAvailableForForm`, `filterForForm` ja
   admin-UI valikute koostaja `buildFormScopeOptions`.
3. **`ClassifierProvider.tsx`**: `ClassifierScopeProvider` + `useClassifierScopeActive`.
   - Muutmisrežiimis piiratakse `getByCode()`, `getChildren()` ja `values` (viimast
     kasutavad DOC_RIGHT_CHECK/DRIVING_VIOLATION nimekirjad otse).
   - `getValue()` / `label()` jäävad filtreerimata.
   - Skoop arvutatakse alati juurkontekstist (`RootClassifierContext`), seega
     pesastatud skoop ei filtreeri juba filtreeritud nimekirja.
4. **Filter kehtib ainult muutmisrežiimis.** Vaaterežiim ehitab sildid samadest
   nimekirjadest, sama loogika nagu `isValid !== false` puhul.
   - `App.tsx`: 31 vormimarsruuti on mähitud `ClassifierScopeProvider`-iga (VR, TI, hea
     maine, TRAM, koondvormi konteinerlehed `SP_COMPOUND`-ina).
   - Lehed: `useClassifierScopeActive(isEditActive)` (VR, TI, hea maine, TRAM,
     koondvorm) / `useClassifierScopeActive(compoundEditActive)` (koondvormi
     konteinerlehed) / `useClassifierScopeActive(true)` (loomislehed).
   - Alamvormide muutmiskomponendid (`DriveRestFormCreatePage`, `AdrFormCreatePage`,
     `TechnicalCheckFormCreatePage`, `TransportInterruptionFormCreatePage`) on
     mähitud oma skoobiga, mis on alati aktiivne. Autojuht/meeskonnaliige valitakse
     `type` järgi, TRAM-i puhul (`authority="TRAM"`) `TRAM_KONTROLLKAART`.
     Sõiduk/haagis valitakse `type` järgi.
   - Alamvormide `…ViewCard`-id on alati `readOnly` ja jäävad skoobita.
   - Kodaniku vaated ja otsing ei ole skoobi sees, seega filtrit pole.

## F5 — Frontend: admin-UI

1. **`ClassifierValueInfoCard.tsx`** (loomine ja muutmine): uus väli **„Piira vormidele"**
   - TEDI `Select` `multiple` + `selectableGroups`;
   - valikud tulevad `buildFormScopeOptions(getByCode('FORM_TYPE'), …)`-ist.
     Tipptaseme vormid on lihtvalikud. SP_COMPOUND on rühm, mille esimene valik on
     „… — üldandmed" (koondvorm ise) ja järgnevad alamvormid. Rühma päisega saab
     valida kõik korraga;
   - aegunud vormitüüp kuvatakse ainult siis, kui see on juba valitud. Orvuks jäänud
     kood kuvatakse kujul „KOOD (vormitüüpi enam pole)";
   - kohatäide „Kõik vormid", abitekst „Kui ühtegi vormi pole valitud, on väärtus
     kasutusel kõigil vormidel.";
   - koodid saadetakse sorteeritult (auditikirje vana/uus võrdlus).
2. **`useClassifierValueForm.ts`**: `formTypes` initialValues-isse ja mõlemasse
   payload'i. **`classifiers/api.ts`**: `formTypes` PUT/POST body-sse.
3. **`ClassifierDetailPage`** väärtuste tabel: veerg „Vormid" (tühja korral „Kõik",
   muidu vormitüüpide nimed).
4. **i18n** `et.json` + `en.json`: `classifiers.formScope.{label,help,placeholder,column,all,parentOwn,orphan}`.
5. `frontend/package.json` versiooni **MINOR** tõus (1.7.3 → 1.8.0).

## F6 — Testid

- **Unit (vitest):**
  - `formScope.test.ts`: `isAvailableForForm` / `filterForForm` (tühi = kõik, piiratud
    ainult loetletud vormil); `buildFormScopeOptions` (rühm koos vanemaga, aegunud
    ainult valituna, orb lõpus).
  - `ClassifierScopeProvider.test.tsx`: skoobita kõik väärtused; vaaterežiimis filtrit
    pole; muutmisrežiimis ainult lubatud valikud, `getValue` leiab peidetud väärtuse
    sildi; pesastatud skoop arvutatakse filtreerimata nimekirjast.
- **DSL-tests** (`DSL-tests/classifier/value-form-scope.test.yml`, mock-http): PUT
  `formTypes`-iga, tühja `formTypes`-iga ja ilma `formTypes`-ita (piirangut ei muudeta);
  POST `formTypes`-iga ja tühja `formTypes`-iga.
- **Newman** (`tests/postman/collections/classifiers.collection.json`, CI E2E): piirangu
  seadmine (tundmatu kood ignoreeritakse), PUT ilma `formTypes`-ita jätab piirangu
  alles, tühjendamine. Iga sammu järel GET kontrollib `formTypes`-i ja nime ülekannet.
- **Resql** käsitsi andmebaasis (transaktsioon + ROLLBACK): `set_classifier_value_form_scope`
  (lisamine, asendamine, tühjendamine, tundmatu kood); `update_classifier_value` kannab
  üle `parent_key` ja `description`.
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `dsl-lint`, `dsl-test`.

## F7 — Käsitsi kontroll (docker-compose)

1. Piirata üks jagatud väärtus (näiteks TACHOGRAPH_TYPES-i üks väärtus) ainult
   `TRAM_KONTROLLKAART`-ile. Kontrollida, et TRAM-il on väärtus nähtav ja PPA
   autojuhi vormil mitte.
2. Avada vana PPA vorm, kus see väärtus on salvestatud. Vaates peab silt kuvatama.
   Muutmisrežiimis on väärtus valikutest kadunud, aga salvestatud väärtus jääb vormi
   andmetesse ja salvestamine peab õnnestuma.
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
