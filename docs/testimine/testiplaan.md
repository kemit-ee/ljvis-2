# Testiplaan

LJVIS2 (Liiklusjärelevalve infosüsteem) Täitja-poolse testimise plaan: eesmärgid,
ulatus, testitasemed, keskkonnad, kriteeriumid ja tulemuste asukohad. Plaan
kirjeldab testimist nii, nagu see projektis tegelikult toimub; tulemused on
[testiraportis](testiraport.md).

| Dokument | Sisu |
|---|---|
| **Testiplaan** (see dokument) | eesmärgid, ulatus, meetod, keskkonnad, kriteeriumid |
| [Testilood](testilood.md) | testilugude ülesehitus ja moodulite kaupa koond; UI-testilood: [testilood-ui.md](testilood-ui.md) |
| [Testiraport](testiraport.md) | eesmärgid, tegevused, tulemused, testitud nõuete nimekiri, leitud vead |
| [API-testide nimekiri](apitestid.md) | kõik API-testid (Newman, DSL, X-tee mock, lepingutestid) koos tulemustega |
| [X-tee testprotokoll](../xtee/08-testprotokoll.md) | pakutavate ja kasutatavate X-tee teenuste testid ja tulemused |

## 1. Eesmärk

Täitja vastutab, et tarnitav tarkvara on testitud ulatuses, mis on mõistlikult
vajalik järgmiste omaduste tagamiseks. Iga omaduse jaoks on plaanis kindel
testitüüp ja tõend:

| Omadus | Kuidas testitakse | Tõend |
|---|---|---|
| **Funktsionaalsus** | kasutajavood brauseris (Playwright), äriloogika API tasemel (Newman), Ruuteri töövoogude loogika (dsl-test) | [testilood-ui.md](testilood-ui.md), [apitestid.md](apitestid.md) |
| **Regressioon** | kõik automaattestid jooksevad CI-s iga muudatusega `dev` ja `main` harusse; parandatud vigadele lisatakse test | CI jooksud, testides viited Jira/GitHubi numbritele |
| **Integratsioonid** | X-tee pakutavad teenused (API + arendaja-mock), kasutatavad teenused mocki vastu, ERRU (XSD-leping, XML-adapter, Hub-mock), Postkast | [X-tee testprotokoll](../xtee/08-testprotokoll.md), ERRU kollektsioonid |
| **Töökindlus** | samaaegsus ja versioonikonfliktid (NU, alamvormid), transpordivead ja korduskatsed (ERRU, Postkast), ajastatud tööd (cron), auditiahela terviklikkus | `tests/sql/test_nu_concurrency.py`, `DSL-tests/erru/`, `cron-jobs` kollektsioon |
| **Turvaline kasutuselevõtt** | autentimine, õigused ja asutusepõhine ulatus igas moodulis, sisendi valideerimine, kaitsmata marsruutide puudumine, saladuste ja haavatavuste skannid | õiguste testid igas specis/kollektsioonis, guard-audit, dsl-lint, Trivy, CodeQL, ZAP |

## 2. Ulatus

### 2.1 Testitavad osad

- **Kasutajaliides** (React, `frontend/`): kontrollvormid (koondvorm ja alamvormid,
  TRAM, välisriigi kontrollkaart, tööinspektsioon, hea maine, ADR, SP, tehnovormid,
  autoveo katkestamine), ERRU vormid (CTUD, CGR, RSI, NCR, NU), vormiotsing,
  töölaud, teavitused, riskitasemed, haldus (kasutajad, kasutajagrupid,
  klassifikaatorid, auditilogi, X-tee logid, Postkasti mallide seaded).
- **API ja äriloogika** (Ruuter DSL `DSL/Ruuter/`, Resql `DSL/Resql/`): kõik avaliku
  gateway otspunktid, sisemine Ruuter (`DSL/Ruuter.internal/`: cron, X-tee
  pakutavad teenused, teavitused).
- **Andmebaas** (PostgreSQL + Liquibase): migratsioonid rakenduvad puhtale baasile
  igas CI jooksus; andmepiirangud ja SQL-funktsioonid kontrollitakse lepingu- ja
  SQL-testidega.
- **Integratsioonid**: X-tee (pakutavad ja kasutatavad teenused, XTR), ERRU
  (MOVEHUB, XML-adapter), Postkast 2.0, TARA (mock), PDF-genereerimine.

### 2.2 Väljaspool ulatust

- **Koormus- ja jõudlustestimine** — ei kuulu funktsionaalse testikomplekti (Playwright/Newman) alla;
  see on eraldi komplekt: [jõudlustestid](joudlustestid.md) (k6, `tests/performance/`).
- **Väliste süsteemide endi testimine** (RR, äriregister, liiklusregister, MTR,
  eToimik, ERRU Hub, Postkast) — testitakse LJVIS2 liidestust nende mockide või
  testkeskkondade vastu, mitte väliste süsteemide käitumist.
- **Taristu** (Kubernetes, turvaserver, varundus) — kuulub paigaldus- ja
  hooldusjuhendi ning hanke infra-osa alla
  ([admin-deployment-guide](../workingdocs/admin-deployment-guide.md)).
- **Brauserite ühilduvus** — automaattestid jooksevad Chromiumis.

## 3. Testimise meetod

### 3.1 Kasutajavood: käsitsi läbimine + Playwright

Iga kasutajavoog käiakse arenduse käigus rakenduses käsitsi läbi ja kinnitatakse
Playwrighti automaattestiga, mis kordab sama voogu brauseris (sammud, sisendid,
oodatav tulemus). Nii on käsitsi kontrollitud voog fikseeritud korratava testina
ja selle tulemus on igal jooksul tõendatav:

- **sammud ja oodatav tulemus** — testi `test.step` pealkirjad ja kontrollid
  (`tests/playwright/tests/*.spec.ts`), dokumenteeritud
  [testilood-ui.md](testilood-ui.md)-s;
- **viimase testimise kuupäev ja versioon** — jooksu kokkuvõte
  (`tests/playwright/tulemus/KOKKUVÕTE.md`) ja CI artefakt `playwright-tulemus`;
- **tõend ebaõnnestumisel** — iga kukkunud testi kohta kirjeldus, ekraanipilt,
  trace ja lehe URL (`tests/playwright/tulemus/<test>/`).

Testandmed luuakse igal jooksul unikaalsena (isikukood, nimed, koodid), seemne
kasutajaid ja gruppe ei muudeta; rollid on eraldi sessioonides (§5.3).

### 3.2 API- ja integratsioonitestid

- **Newman** (Postman-kollektsioonid `tests/postman/collections/`, 29 tk): iga
  otspunkti edukas voog, valideerimisvead, õiguste kontroll (401/403), asutusepõhine
  ulatus, andmete püsivus ja versioonid, regressioonid.
- **dsl-test** (`DSL-tests/`, `DSL-tests-internal/`): Ruuteri töövoogude
  harud ilma andmebaasita, väliste teenuste vastused mockitud (nt ERRU
  transpordiviga, samaaegne saatmine).
- **X-tee arendaja-mock** (`DSL-mock-tests/xtee.test.yml`): avaliku mocki leping
  ja vastused; drift-kontroll OpenAPI vastu.
- **Lepingutestid** (`tests/contract/`): ERRU NU 3.5 XSD reeglid vs andmebaasi
  piirangud (sh mutatsioonitestid), X-tee mocki liivakasti turvalisus.
- **SQL-testid** (`tests/sql/`): NU samaaegsus päris transaktsioonidega,
  SP → ERRU punktide tuletamine.

### 3.3 Ühiktestid

Vitest (`frontend/src/**/*.test.ts(x)`): kuupäevade sisestus, WebSocketi
taasühendus, vormide serialiseerimine ja valideerimine, failide üleslaadimine.

### 3.4 Staatiline analüüs ja turvatestid

| Kontroll | Tööriist | Millal | Blokeeriv |
|---|---|---|---|
| DSL-i süntaks, kättesaamatud sammud, tühjad SQL-failid | `validate-dsl` job | iga PR/push | jah |
| Kaitsmata (guard'ita) avalikud marsruudid | `guard-audit` job (Ruuter käivitatakse mõlema DSL-puuga) | iga PR/push | jah |
| DSL-i lint (sh kohustuslik guard) | `dsl-lint --require-guard` | iga PR/push | jah |
| Saladused repos | Trivy secret scan | iga PR/push | `main` harus jah |
| Koodianalüüs (Java, JS/TS, Actions) | CodeQL | iga PR `dev`-i + iganädalaselt | ei (tulemused GitHub Security vaates) |
| Rakenduse baseline-skann | OWASP ZAP baseline (CI-pinu vastu) | iga E2E jooks | ei |
| Sõltuvuste haavatavused | `npm audit --audit-level=high` | iga PR/push | ei |
| DAST | Grawlr | pärast edukat CI-d `main`/`dev` harus | jah (skoor ≥ 80, ≤ 5 kukkunud rünnakut) |

## 4. Testitasemed ja tööriistad

| Tase | Tööriist | Asukoht | Teste | CI job |
|---|---|---|---|---|
| UI / süsteem | Playwright (Chromium) | `tests/playwright/` | 21 speci, 133 testi | `ui-tests` |
| API / integratsioon | Newman | `tests/postman/` | 29 kollektsiooni | `e2e` |
| Töövoogude loogika | Ruuter `dsl-test` | `DSL-tests/`, `DSL-tests-internal/` | 52 stsenaariumi | `dsl-lint` |
| X-tee arendaja-mock | Ruuter `dsl-test` | `DSL-mock-tests/` | 69 stsenaariumi | `dsl-lint` |
| Leping | Python unittest | `tests/contract/` | 16 testi + 29 NU kontrolli | `validate-dsl`, `e2e` |
| Andmebaas | SQL, Python | `tests/sql/` | samaaegsus, punktid | `e2e` |
| Ühik | Vitest | `frontend/src/` | 13 faili, 75 testi | `frontend-unit-tests` |

Testide arv on viimase jooksu seisuga ([testiraport](testiraport.md) §3).

## 5. Keskkonnad ja testandmed

### 5.1 CI-pinu

`docker-compose.ci.yml` tõstab üles kogu süsteemi (PostgreSQL + Liquibase,
Resql, Ruuter, sisemine Ruuter, TIM, DataMapper, PDF, TARA-mock, XTR + X-tee mock,
ERRU XML-adapter + Hub-mock, Postkasti mock). Iga jooks algab **puhta
andmebaasiga**: kõik migratsioonid rakendatakse nullist, seejärel testseemned.
Sama pinu kasutavad Newman (`ljvis-ci`) ja Playwright (`ljvis-pw`).

### 5.2 Testandmed

- `tests/bootstrap/seed_test_data.sql` — asutused (CBO, JUM, PPA), grupid,
  testkasutajad, klassifikaatorite baas.
- `tests/bootstrap/seed_classifiers.sql` — rippmenüüde klassifikaatorid.
- `tests/bootstrap/seed_xroad_etoimik_logs.sql` — X-tee logide vaate andmed.
- `DSL/Liquibase/test/` — riskiskoori, NCR ja SP failide fixture'id.
- Testid loovad oma andmed jooksu ajal unikaalsete tunnustega; ainult sünteetilised
  andmed, päris isikuandmeid ei kasutata.

### 5.3 Testkasutajad ja rollid

| Roll | Isikukood | Õigused |
|---|---|---|
| Peakasutaja (Super Admin) | 60001019906 | kõik, sh haldus ja ERRU |
| Lokaalne kontohaldur (Org Admin) | 60001017727 | JUM: kasutajad/grupid oma asutuses, `audit.read.local`, välisriigi kontrollkaardi lugemine |
| Ametnik | 60002020202 | kontrollvormide loomine ja lugemine, haldusõigusteta |
| Ainult koondvormi õigusega | 60003030303 | `compound_form.write` |
| Ilma koondvormi õiguseta | 60004040404 | muud vormid, koondvormi loomisõiguseta |
| Õigusteta (kodanik) | 60001017869 | ametniku õigused puuduvad |

Sisselogimine käib testikeskkonnas dev-login otspunkti kaudu (`tests/dsl/dev-login.yml`,
ainult CI-pinus), mis väljastab TIM-allkirjastatud JWT.

### 5.4 Muud keskkonnad

- **dev** (`dev.liiklusvalve.ee`) — süsteem on ühendatud päris testteenustega
  (X-tee testkeskkond, ERRU acceptance Hub). Kõik kasutatavad X-tee päringud on
  siin käsitsi kontrollitud kasutajaliidese kaudu. Lisaks on X-tee päringuid
  kontrollitud arendaja masinast ühendusega KeMIT-i dev turvaserverisse
  (`*.ml.ee` domeenis), ilma LJVIS2 kasutajaliideseta.
- **X-tee arendaja-mock** (`https://dev.liiklusvalve.ee/developer`) — liidestujate
  iseseisev testimine ([docs/developer](../developer/README.md)).

## 6. Sisenemis- ja väljumiskriteeriumid

**Sisenemine** (muudatus läheb testimisse): PR `dev` harusse; DSL, frontend või
testide muudatus käivitab CI automaatselt.

**Väljumine** (muudatuse võib ühendada):

- CI `quality-gate` on roheline: DSL valideerimine, guard-audit, dsl-lint ja
  dsl-testid, kõik Newmani kollektsioonid, Trivy, frontendi lint, ühiktestid ja
  build;
- Playwrighti UI-testid on rohelised (job `ui-tests`; ebaõnnestumisel avatakse
  GitHubi issue sildiga `playwright-failure`);
- TypeScript kontroll (`npx tsc --noEmit`) on veatu;
- uue funktsionaalsuse või parandatud vea jaoks on lisatud või uuendatud test.

**Tarneeelne kontroll** (enne lõpptarnet): kõigi testitasemete täisjooks ühel
versioonil, tulemused [testiraportis](testiraport.md) ja
[API-testide nimekirjas](apitestid.md).

## 7. Testide käivitamine ja dokumentide uuendamine

```bash
# UI-testid (tõstab CI-pinu, seemned, build, Playwright, teardown)
bash tests/playwright/run.sh                      # KEEP_STACK=1 jätab pinu alles

# API-testid (puhas CI-pinu + 29 kollektsiooni; JSON-raportid tests/postman/reports/)
bash tests/postman/run-all.sh tests/postman/ci-stack-environment.json

# Ruuteri DSL-stsenaariumid ja X-tee mock
docker run --rm -v "$PWD:/w" -w /w --entrypoint dsl-test turnerrainer/ruuter:0.10.1-rc \
  --dsl DSL/Ruuter --tests DSL-tests --constants constants.ini
bash scripts/test-xtee-mock.sh

# Ühiktestid
cd frontend && npm test -- --run

# Genereeritud dokumentide uuendamine pärast jooksu
python3 scripts/generate-api-test-report.py --commit <sha> --date <AAAA-KK-PP> \
  --dsl-log <dsl-test väljund> --xtee-mock-log <mocki väljund> --contract-log <logi>
python3 scripts/generate-ui-testlood.py --commit <sha>
```

## 8. Defektihaldus

- Testidega leitud viga registreeritakse GitHubi issue'na või parandatakse samas
  PR-is; parandusega koos lisatakse test, mis viga varem tabas (testi nimes või
  kommentaaris viide Jira võtmele `LJVIS2-NNN` või GitHubi numbrile).
- CI UI-testide ebaõnnestumisel avab töövoog automaatselt issue sildiga
  `playwright-failure` (korduval kukkumisel lisab kommentaari).
- Kasutajale nähtavad parandused kirjeldatakse [muudatuste logis](../muudatused.md).
- Teadaolevad parandamata probleemid: [known-issues](../workingdocs/known-issues.md)
  ja [testiraport](testiraport.md) §6.

## 9. Vastutus

Täitja arendusmeeskond kirjutab ja hooldab teste, käitab need CI-s ja enne
tarnet ning koostab testiraporti. Tellija vastuvõtutestimine (UAT) toimub
Tellija protsessi järgi; selleks on kasutada [kasutusjuhend](../user-guide/01-sissejuhatus.md),
testilood ja testkeskkond.

## 10. Riskid ja piirangud

| Risk / piirang | Mõju | Leevendus |
|---|---|---|
| UI-testid ei ole veel `quality-gate`'i osa (`continue-on-error`) | punane UI-test ei blokeeri ühendamist | automaatne `playwright-failure` issue; tarneeelne täisjooks |
| Grawlr DAST ei käivitu GitHub CI-s | dünaamiline turvaskann jääb CI-s tegemata | sihtmärk on Grawlris registreeritud, kuid teenus vajab avalikult ligipääsetavat, võtmega kaitstud ja **püsiva aadressiga** sihtmärki; CI-pinu aadress muutub igal jooksul. Lahendus: skann suunata püsivale testkeskkonnale |
| ZAP baseline ei salvestanud HTML-raportit (konteineri kasutajal puudus kausta kirjutusõigus) | **pseudoprobleem**: skann ise jookseb ja annab tulemuse (CI logis FAIL/WARN/PASS koond), puudus ainult artefakt `zap-report` | parandatud: CI annab enne skanni kaustale kirjutusõiguse (`chmod 777 zap-reports`) |
| Väliste süsteemide testkeskkondade kättesaadavus | integratsioonitestid jooksevad CI-s mockide vastu | päris testteenuste vastu on X-tee päringud käsitsi kontrollitud dev keskkonnas (UI kaudu ja KeMIT-i dev turvaserveri kaudu, §5.4) |
| Koormustestid on kirjutatud, kuid jooksutamata | jõudlus suurte andmemahtude korral kinnitamata | [joudlustestid.md](joudlustestid.md) |
