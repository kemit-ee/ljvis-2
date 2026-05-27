# RESQL Files — Specification Format Reference

This file defines the exact output format for the `generate-resql-files` skill.

## Preflight Gate (mandatory before generation)

Before writing any SQL/YML files, the skill must:

1. Read epic + subtasks from GitHub issues.
2. Read and validate `docs/data_model.md` against epic/subtask needs.
3. Read `docs/db_errorhandling_rules.md` and derive failure-handling, verify-after-write, rollback and partial-success rules from it.
4. Create or update `docs/imp/epic_XX_dsl_plan.md` before generation starts.
5. Create or update `docs/imp/master_dsl_plan.md` with an Estonian summary and link to the epic plan.
6. Enforce architecture constraints:
   - read models rely on `*_latest` fat snapshot tables,
   - no SQL `JOIN`,
   - append-only writes (`INSERT` only, no `UPDATE`, no `DELETE`).
   - verify-after-write is mandatory for write flows,
   - partial-success handling must be explicit,
   - rollback/recovery paths must be planned.
7. Show preflight summary (`canContinue`, missing items, proposed changes) and proceed automatically if `canContinue: yes`.
8. If model gaps exist (`canContinue: no`), prepare model updates and PR flow towards `feature/planning`, report to user, and stop — do not generate files until gaps are resolved.

## Branching Rule (mandatory)

Generated DSL artifacts must be produced on branch `feature/epic_NN_dsl` where `NN` is the epic issue number in two-digit form.
If the branch does not exist, create it and checkout automatically.
Generating DSL artifacts on any other branch is forbidden.

## File Path Derivation Rule (mandatory)

**Target file paths for generated artifacts MUST come exclusively from:**
1. The exact file list in `docs/imp/epic_XX_dsl_plan.md` (the authoritative blueprint), AND
2. The fixed folder schema in SKILL.md Step 5.

**Existing files in `DSL/Resql/` and `DSL/Ruuter/` are read ONLY to understand naming/versioning conventions — never to infer or derive target paths for new files.**

Violating this rule causes files to land in wrong directories. Before writing any file, confirm its path matches the blueprint. If the path is absent from the blueprint, add it first.

Metadata source fallback rule:
- Prefer `planning/docs/permissions-matrix.md`, fallback to `docs/permissions-matrix.md`.
- Prefer `planning/docs/errors.json`, fallback to `docs/errors.json`.
- `docs/db_errorhandling_rules.md` is mandatory.
- `docs/imp/epic_XX_dsl_plan.md` is mandatory before SQL/YML generation.
- `docs/imp/master_dsl_plan.md` must be updated when a new epic plan is introduced.

Issue update rule after delivery:
- Create/find dedicated task issue under the epic titled exactly `DSL files for "<clean epic name>" (Epic NN)`.
  - Use only clean epic name (without `EPIC - NN -` prefix).
  - Example: `DSL files for "Klassifikaatorite haldamine" (Epic 09)`.
- The dedicated task issue body must be exactly: `Create DSL files accordig to "Epic name (link)" and its subtasks.`
- Commit messages must include that dedicated DSL task reference (e.g. `Refs #123`).
- PR target branch is `dev`. PR description must include `Resolves #<dsl_task_issue_number>` so DSL task closes on PR merge.
- Epic issue must remain open; do not add close keywords for epic.
- Do not write DSL file delivery info to epic issue body or unrelated tickets.
- Add comment only on the dedicated DSL task issue with format:
  - `Commit: <commit_url_or_sha>`
  - `Created files: <number>`
  - `Updated files: <number>`
- Include PR link in the same dedicated DSL task comment when available.

---

## 1. Output File: `README.md`

**Location:** `docs/<epic_kataloog>/README.md`

### 1.1 YAML Frontmatter

```yaml
---
epic: EPIC NN - <Epic Title>
document_type: resql_queries
generated: YYYY-MM-DD
version: 1.0
mode: create | update
---
```

Frontmatter järele lisatakse kohe viide paigaldusjuhendile:

```markdown
> **Paigaldusjuhend:** [paigaldusjuhend.md](./paigaldusjuhend.md) — siit leiad täpsed juhised failide kopeerimiseks tootmiskeskkonda.
```

### 1.2 Document Structure

```
# EPIC NN — RESQL Päringud ja Ruuter Ruutingud

> Paigaldusjuhend: [paigaldusjuhend.md](./paigaldusjuhend.md)

## 1. Ülevaade
## 2. Kaustastruktuur
## 3. Päringute ja ruutingute nimekiri
## 4. Arhitektuuri vastavus
## 5. Mock andmed
## 6. Versioonimine
## 7. Muudatuste logi
```

---

## 2. Section Definitions

### Section 1: Ülevaade

Lühike kokkuvõte (3–5 lauset):
- Mitu päringut loodi
- Milliseid tabeleid kasutatakse
- Millised HTTP meetodid
- Mis jäi välja (kui midagi)

### Section 2: Kaustastruktuur

Näita failipuu kujul kõiki loodud faile:

```
DSL/Resql/
  POST/
    <moodul>/
      <entiteet>/
        v1/
          <operatsioon>.sql
          mock_<operatsioon>.sql
    state_updater/               ← *_latest snapshot rebuild (ei versiooni kihti)
      <entiteet>/
        build.sql
        mock_build.sql
  GET/
    <moodul>/
      <entiteet>/
        v1/
          <operatsioon>.sql        ← ainult parameetrita listid
          mock_<operatsioon>.sql
DSL/Ruuter/
  api/
    POST/
      v1/admin/
        <entiteet>/
          .guard                 ← ligipääsukontroll endpointi kaustale
          <operatsioon>.yml
          mock_<operatsioon>.yml
    GET/
      v1/admin/
        <entiteet>/
          .guard
          <operatsioon>.yml      ← ainult parameetrita listid
          mock_<operatsioon>.yml
docs/<epic_kataloog>/
  README.md
  paigaldusjuhend.md
docs/
  db_errorhandling_rules.md
  imp/
    epic_XX_dsl_plan.md
    master_dsl_plan.md
```

`state_updater` SQL-id on sisemised RESQL endpointid — neil ei ole Ruuter YML-faile ega `.guard` faile. Ruuter vood kutsuvad neid otse `[#LOCAL_RESQL]/ljvis2/state_updater/<entiteet>/build` kaudu.

`docs/imp/epic_XX_dsl_plan.md` peab sisaldama kogu vajalikku infot, et teine LLM agent suudaks sama epicu DSL artefaktid reprodutseerida.

### Section 3: Päringute nimekiri

Iga päringu kohta eraldi alamjaotis:

```markdown
### 3.N `POST/<moodul>/<entiteet>/<operatsioon>`

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Resql/POST/<moodul>/<entiteet>/v1/<operatsioon>.sql` |
| **Mock failitee** | `DSL/Resql/POST/<moodul>/<entiteet>/v1/mock_<operatsioon>.sql` |
| **HTTP meetod** | POST / GET |
| **Kirjeldus** | Mida päring teeb (1 lause) |
| **Sisendparameetrid** | `:param1` (tüüp), `:param2` (tüüp) — või *puuduvad* |
| **Väljundväljad** | `fieldName` (tüüp), `fieldName2` (tüüp) |
| **Seotud tabelid** | `tabel1`, `tabel2` |
| **Seotud taskid** | Task 1, Task 3 |
| **Versioon** | v1 |

**SQL (production):**
```sql
-- <operatsioon>: <lühikirjeldus parameetritest>
<SQL lausend>
```

**SQL (mock):**
```sql
-- mock_<operatsioon>: tagastab hardcoded testandmed
SELECT
  'väärtus' AS "fieldName",
  ...
```

**Ruuter DSL (production):**
```yaml
# <operatsioon>.yml — <lühikirjeldus>
validate: ...
call_db:
  url: "[#LOCAL_RESQL]/ljvis2/v1/<moodul>/<entiteet>/<operatsioon>"
  ...
```

**Ruuter DSL (mock):**
```yaml
# mock_<operatsioon>.yml — kutsub mock RESQL endpointi
call_mock:
  url: "[#LOCAL_RESQL]/ljvis2/v1/<moodul>/<entiteet>/mock_<operatsioon>"
  ...
```
```

### Section 4: Arhitektuuri vastavus

Kontrollnimekiri iga reegli kohta:

| Reegel | Staatus | Märkused |
|--------|---------|----------|
| Ainult INSERT ja SELECT | ✅ / ⚠️ / ❌ | |
| JOIN keelatud (sub-query asemel) | ✅ / ⚠️ / ❌ | |
| Üks fail = üks päring | ✅ / ⚠️ / ❌ | |
| POST parameetritega päringutele | ✅ / ⚠️ / ❌ | |
| camelCase väljumisnimed | ✅ / ⚠️ / ❌ | |
| INSERT tagastab SELECT-iga kinnituse | ✅ / ⚠️ / ❌ | |
| State muutus → INSERT `_state` tabelisse | ✅ / ⚠️ / ❌ | |
| Mock failid olemas kõigile päringutele | ✅ / ⚠️ / ❌ | |
| Ruuter URL → RESQL SQL fail olemas | ✅ / ⚠️ / ❌ | |
| Verify-after-write on kirjeldatud | ✅ / ⚠️ / ❌ | |
| Rollback / recovery voog on kirjeldatud | ✅ / ⚠️ / ❌ | |
| Partial success on kaetud | ✅ / ⚠️ / ❌ | |
| Latest state reegel on määratud | ✅ / ⚠️ / ❌ | |

Soovituslik sanity-check käsk enne commit'i:

```bash
for f in $(find DSL/Ruuter/api -name '*.yml'); do
  method=$(echo "$f" | sed -E 's|^DSL/Ruuter/api/([^/]+)/.*|\1|')
  grep -o '\[#LOCAL_RESQL\]/[^" ]*' "$f" | while read -r url; do
    rel=$(echo "$url" | sed 's|^\[#LOCAL_RESQL\]/||')
    project=$(echo "$rel" | cut -d'/' -f1)
    segment2=$(echo "$rel" | cut -d'/' -f2)
    test "$project" = "ljvis2" || echo "MISSING_PROJECT: $f -> $url"
    if [ "$segment2" = "state_updater" ]; then
      entity=$(echo "$rel" | cut -d'/' -f3)
      operation=$(echo "$rel" | cut -d'/' -f4)
      test -f "DSL/Resql/${method}/state_updater/${entity}/${operation}.sql" || echo "MISSING: $f -> $url"
    else
      version="$segment2"
      module=$(echo "$rel" | cut -d'/' -f3)
      entity=$(echo "$rel" | cut -d'/' -f4)
      operation=$(echo "$rel" | cut -d'/' -f5)
      test -f "DSL/Resql/${method}/${module}/${entity}/${version}/${operation}.sql" || echo "MISSING: $f -> $url"
    fi
  done
done
```

**URL kujud:**
- Tavalised: `[#LOCAL_RESQL]/ljvis2/v1/<moodul>/<entiteet>/<operatsioon>` → `DSL/Resql/<meetod>/<moodul>/<entiteet>/v1/<operatsioon>.sql`
- `state_updater`: `[#LOCAL_RESQL]/ljvis2/state_updater/<entiteet>/build` → `DSL/Resql/POST/state_updater/<entiteet>/build.sql` (ilma `v<N>/` kihita)

Kui väljundis on `MISSING:`, tuleb failitee joondada enne merge'i.

Lisaks tuleb kontrollida, et `docs/imp/epic_XX_dsl_plan.md` kirjeldab:
- täpset faililoendit,
- Ruuteri detailset äriloogikat,
- permission matrix põhist ligipääsutabelit,
- failure-handling ja state-management voogu,
- Mermaid diagrammi Ruuteri kontrollidest,
- checklisti enne genereerimist.

### Section 5: Mock andmed

Iga mock päringu kohta — millised konkreetsed testandmed tagastatakse ja miks (nt realistlikud eesti nimed, isikukoodid, kuupäevad).

Formaat:

```markdown
### mock_<operatsioon>

Tagastab N rida. Testistsenaarium: <mida testib>.

| Väli | Mock väärtus | Selgitus |
|------|-------------|----------|
| `id` | `1001` | Testkasutaja ID |
| `displayName` | `"Mart Tamm"` | Eesti nimi |
| `personalCode` | `"38001010000"` | Eesti isikukood formaat |
| `status` | `"active"` | Aktiivne olek |
```

### Section 6: Versioonimine

```markdown
## 6. Versioonimine

| Fail | Versioon | Staatus | Eelnev versioon |
|------|---------|---------|-----------------|
| `POST/iam/account/create.sql` | v1 | aktiivne | — |
| `POST/iam/account/get_by_id.sql` | v1 | aktiivne | — |
```

**Versioonimine reegel:**
- Esimene fail on `<operatsioon>.sql` (ilma versiooninumbrita = v1)
- Järgmine muudatus loob `<operatsioon>_v2.sql`
- Vana fail jääb alles (ei kustutata)
- Aktiivne = kõrgeim versiooninumber
- Erand: kui teenus ei ole kasutusel ja kasutaja kinnitab cleanup-migratsiooni, võib teha otsese ümbertõstmise/ülekirjutuse ilma aliaseta

### Section 7: Muudatuste logi

```markdown
## 7. Muudatuste logi

| Versioon | Kuupäev | Muudatus | Autor |
|---------|---------|---------|-------|
| 1.0 | YYYY-MM-DD | Esialgne loomine | cascade |
```

---

## 3. SQL File Format Rules

### Production SQL File

```sql
-- <sisendparameetrid kui on: param1: tüüp, param2: tüüp>
<ÜKSAINUS SQL lausend>
```

- Esimene rida on alati kommentaar sisendparameetritega (või `-- no params`)
- Muutujad: `:camelCaseNimi`
- Väljundaliased: `AS "camelCaseName"` kõigile väljadele
- INSERT lõpeb alati SELECT-iga (tagastab lisatud rea)
- Alamlausetel (sub-query) on lubatud kasutada `(SELECT ... FROM ...)` struktuuri

### Mock SQL File

```sql
-- mock: <lühikirjeldus mida tagastatakse>
SELECT
  <hardcoded_value> AS "fieldName",
  ...
[UNION ALL SELECT ...]  -- lisaread listide jaoks
```

- Failinime algus: `mock_`
- Sama väljundstruktuur mis production päringul (identsed aliased)
- Vähemalt 2–3 rida list-päringute jaoks
- Realistlikud eesti testandmed (nimed, isikukoodid, kuupäevad)

---

## 3.5 state_updater SQL File Format

`state_updater` SQL failid järgivad tavalist SQL faili formaati, kuid:
- Failinimi on alati `build.sql` (mock: `mock_build.sql`)
- Ei ole `v1/` versiooni kihti
- `build.sql` teeb `INSERT INTO <entiteet>_latest` (fat snapshot), lõpetab `SELECT`-iga lisatud rea kinnituseks
- Väljundaliased peavad täpselt vastama snapshot tabeli veergudele `AS "camelCase"` kujul
- `mock_build.sql` tagastab hardcoded realistlikud andmed (sama väljundstruktuur mis `build.sql`)

**Näidis `build.sql`:**
```sql
-- classifierId: BIGINT
INSERT INTO classifier_latest (classifier_id, code, name, description, created_at, created_by)
SELECT
  c.id,
  c.code,
  cns.name,
  cns.description,
  now(),
  :createdBy
FROM classifier c
  , (SELECT name, description FROM classifier_name_state
     WHERE classifier_id = :classifierId
     ORDER BY created_at DESC, id DESC LIMIT 1) cns
WHERE c.id = :classifierId
RETURNING
  id AS "id",
  classifier_id AS "classifierId",
  code AS "code",
  name AS "name",
  description AS "description",
  created_at AS "createdAt";
```

**RESQL URL kuju (Ruuterist kutsudes):**
```
[#LOCAL_RESQL]/ljvis2/state_updater/<entiteet>/build
```

---

## 4. Naming Conventions

| Element | Formaat | Näide |
|---------|---------|-------|
| Moodul | `snake_case` | `iam`, `auth`, `kontrollivorm` |
| Entiteet | `snake_case` (ainsus) | `account`, `session`, `kontrollakt` |
| Operatsioon | `snake_case` verb | `create`, `get_by_id`, `list`, `set_status`, `get_current_status` |
| Mock prefix | `mock_` + operatsioon | `mock_create`, `mock_get_by_id` |
| Version suffix | `_v2`, `_v3` jne | `create_v2`, `get_by_id_v3` |
| SQL muutujad | `:camelCase` | `:extId`, `:personalCode` |
| SQL aliased | `"camelCase"` | `AS "displayName"`, `AS "createdAt"` |

---

## 5. Paigaldusjuhend (`paigaldusjuhend.md`)

Iga epicu dokumentatsioonikausta `docs/<epic_kataloog>/` luuakse `paigaldusjuhend.md`, mis selgitab täpselt, millised failid loodi otse `DSL/Resql/` ja `DSL/Ruuter/` alla.

```markdown
---
epic: EPIC NN — <pealkiri>
document_type: paigaldusjuhend
generated: YYYY-MM-DD
---

# EPIC NN — RESQL ja Ruuter Paigaldusjuhend

## Ülevaade

Kõik selle EPICu RESQL ja Ruuter DSL failid luuakse otse vastavatesse süsteemikataloogidesse `DSL/Resql/` ja `DSL/Ruuter/`.

## SQL failid (RESQL)

| Allikas | Sihtkoht |
|---------|----------|
| `DSL/Resql/POST/<moodul>/<entiteet>/v1/<fail>.sql` | `DSL/Resql/POST/<moodul>/<entiteet>/v1/<fail>.sql` |
| `DSL/Resql/GET/<moodul>/<entiteet>/v1/<fail>.sql` | `DSL/Resql/GET/<moodul>/<entiteet>/v1/<fail>.sql` |

**Märkus:** `mock_` prefiksiga failid kopeeritakse samasse kataloogi.

## Ruuter DSL failid

| Allikas | Sihtkoht |
|---------|----------|
| `DSL/Ruuter/api/POST/v1/admin/<entiteet>/<fail>.yml` | `DSL/Ruuter/api/POST/v1/admin/<entiteet>/<fail>.yml` |
| `DSL/Ruuter/api/GET/v1/admin/<entiteet>/<fail>.yml` | `DSL/Ruuter/api/GET/v1/admin/<entiteet>/<fail>.yml` |

## Guard failid

| Allikas | Sihtkoht |
|---------|----------|
| `DSL/Ruuter/api/POST/v1/admin/<entiteet>/.guard` | `DSL/Ruuter/api/POST/v1/admin/<entiteet>/.guard` |
| `DSL/Ruuter/api/GET/v1/admin/<entiteet>/.guard` | `DSL/Ruuter/api/GET/v1/admin/<entiteet>/.guard` |

## Paigaldamise järjekord

1. Kopeeri SQL failid `DSL/Resql/` alla
2. Käivita `docker compose restart resql` (RESQL laeb failid automaatselt)
3. Kopeeri Ruuter YML ja `.guard` failid `DSL/Ruuter/` alla
4. Ruuter rakendab muudatused automaatselt (restart ei ole vajalik)
5. Kontrolli logidest, et uued endpointid on saadaval

## Viited

- Andmemudel: `docs/data_model.md`
- Permissions: `planning/docs/permissions-matrix.md` (fallback `docs/permissions-matrix.md`)
- Errors: `planning/docs/errors.json` (fallback `docs/errors.json`)
- Päringute dokumentatsioon: `docs/<epic_kataloog>/README.md`
```

---

## 6. Guard Failide Dokumentatsioon (sektsioonis 3)

Iga `.guard` faili kohta lisatakse päringute nimekirja sektsiooni alamjaotis:

```markdown
### .guard — <moodul>

| Väli | Väärtus |
|------|---------|
| **Failitee** | `DSL/Ruuter/api/<http_method>/v1/admin/<entiteet>/.guard` |
| **Rakendub** | Kõigile `<entiteet>/` kausta endpointidele |
| **Nõutud permission** | `permission.code` (vt permission matrix) |
| **Lubatud rollid** | `admin`, `kontohaldur` jne |
| **Scope enforcement** | Jah / Ei — kontohaldur piiratud oma asutusele |
| **Anonüümne lubatud** | Jah / Ei |
```

Kui moodulil on mitu erinevat ligipääsutaset (nt üks kaustale, teine alamkaustale), dokumenteeritakse mõlemad eraldi.

---

## 6. Andmebaasi Keeldude Tabel (kohustuslik kontroll)

Enne failide kirjutamist kontrolli iga päringu vastavust:

| Keeld | Kontroll |
|-------|---------|
| `UPDATE` keelatud | Otsi igast SQL failist `UPDATE` — ei tohi esineda |
| `DELETE` keelatud | Otsi igast SQL failist `DELETE` — ei tohi esineda |
| `JOIN` keelatud | Otsi igast SQL failist `JOIN` — ei tohi esineda; kasuta sub-SELECT |
| Mitu lauset failis keelatud | Iga fail peab lõppema ühe `;`-ga (välja arvatud CTE-d mis on ühe lausendi osa) |
| GET keelatud parameetritega | GET failis ei tohi olla `:muutuja` viiteid ning GET Ruuteri flow ei tohi RESQL-ile sisendit edasi anda |
