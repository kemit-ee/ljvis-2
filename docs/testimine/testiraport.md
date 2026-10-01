# Testiraport

Täitja-poolse testimise raport: eesmärgid, tegevused, tulemused, testitud nõuete
nimekiri ja leitud vead. Meetod ja kriteeriumid on [testiplaanis](testiplaan.md).

| | |
|---|---|
| Viimase testimise kuupäev | 01.10.2026 |
| Testitud versioon | rakenduse kood commit `3acdcd97` (PR #497, frontend 1.7.4); hiljem `dev`-i lisandunud muudatused (#490–#494) on testitud oma CI jooksudes |
| Keskkond | CI-pinu `docker-compose.ci.yml`, iga testitase puhta andmebaasiga |
| Koostaja | Täitja arendusmeeskond |

## 1. Kokkuvõte

Kõik testitasemed jooksid ühel versioonil läbi **ilma ühegi kukkunud testita**:

| Tase | Teste | Läbis | Kukkus | Tõend |
|---|---|---|---|---|
| UI (Playwright) | 133 testi, 21 speci | 133 | 0 | [testilood-ui.md](testilood-ui.md) |
| API (Newman) | 29 kollektsiooni, 1033 päringut, 2265 kontrolli | 2265 | 0 | [apitestid.md](apitestid.md) |
| Ruuteri töövood (`dsl-test`) | 52 stsenaariumi | 52 | 0 | [apitestid.md](apitestid.md) §4 |
| X-tee arendaja-mock | 69 stsenaariumi | 69 | 0 | [apitestid.md](apitestid.md) §5, [X-tee testprotokoll](../xtee/08-testprotokoll.md) |
| Lepingutestid (ERRU NU XSD) | 16 ühiktesti, 29 lepingukontrolli, 125 XSD-st tuletatud käitumiskontrolli | kõik | 0 | §3.4 |
| Andmebaasitestid | NU mustandi kooskõla, NU valideerimine, SP → ERRU punktid, NU samaaegsus | kõik | 0 | §3.4 |
| Auditiahela terviklikkus | 447 sündmust pärast kõiki API-teste | terviklik | — | §3.4 |
| Ühiktestid (Vitest) | 13 faili, 75 testi | 75 | 0 | §3.5 |
| Staatiline analüüs ja turve | dsl-lint, guard-audit, Trivy, CodeQL, ZAP | vt §3.6 | 0 viga | §3.6 |

Testimise käigus leiti ja parandati **5 viga** (§6.1); parandused on samas
versioonis ja neid katavad testid. Avatud kohad on §6.2.

## 2. Eesmärgid

Testimise eesmärk oli tõendada, et tarnitav tarkvara toimib nõuetekohaselt
järgmistes aspektides (testiplaan §1):

1. **Funktsionaalsus** — kõik kasutajavood ja API otspunktid töötavad nõuete järgi,
   sh valideerimine ja andmete püsivus.
2. **Regressioon** — varem parandatud vead ei kordu; kogu komplekt jookseb igal muudatusel.
3. **Integratsioonid** — X-tee pakutavad ja kasutatavad teenused, ERRU, Postkast.
4. **Töökindlus** — samaaegsus, versioonikonfliktid, transpordivead, korduskatsed,
   ajastatud tööd, auditiahela terviklikkus.
5. **Turvaline kasutuselevõtt** — autentimine, õigused ja asutusepõhine ulatus
   igas moodulis, sisendi valideerimine, kaitsmata marsruute ega saladusi ei ole.

## 3. Tegevused ja tulemused

### 3.1 Kasutajavoogude testimine (käsitsi + Playwright)

**Tegevus.** Iga kasutajavoog käidi arenduse käigus rakenduses käsitsi läbi ja
kinnitati Playwrighti testiga, mis kordab sama voogu (testiplaan §3.1). Enne
seda raportit lisati UI-testid ka haldusmoodulitele (kasutajad, kasutajagrupid,
klassifikaatorid, riskitasemed, teavitused, auditilogi), vormiotsingule ja X-tee
pakutavatele teenustele (PR #497). Täisjooks tehti puhtal CI-pinul
(`bash tests/playwright/run.sh`).

**Tulemus.** 133/133 läbis, korduskatseid ei olnud vaja (flaky 0), kestus 202 s.

| Moodul | Teste | Tulemus |
|---|---|---|
| Sisselogimine, töölaud, vormide avamine | 11 | läbis |
| Kasutajate haldus | 7 | läbis |
| Kasutajagruppide haldus | 5 | läbis |
| Klassifikaatorite haldus | 6 | läbis |
| Riskitasemed | 3 | läbis |
| Teavitused, Postkasti mallid | 5 + 2 | läbis |
| Auditilogi | 5 | läbis |
| Vormiotsing | 5 | läbis |
| X-tee logid, X-tee pakutavad teenused | 9 + 7 | läbis |
| Koondvorm ja alamvormid | 14 + 9 | läbis |
| TRAM, välisriigi kontrollkaart, tööinspektsioon, hea maine | 16 + 2 + 3 + 3 | läbis |
| ADR, printimine | 4 + 4 | läbis |
| ERRU (CTUD, CGR, RSI, NCR, NU) | 8 + 3 + 2 | läbis |

Iga testi sammud ja tulemus: [testilood-ui.md](testilood-ui.md). GitHub CI
jooksutab UI-teste iga muudatusega (job `ui-tests`); viimane `dev` haru jooks
01.10.2026 läbis (89 testi, enne PR #497 lisatud teste).

### 3.2 API- ja integratsioonitestid (Newman)

**Tegevus.** `bash tests/postman/run-all.sh`: puhas CI-pinu, ERRU lepingu ja
andmebaasi kontrollid, seejärel 29 kollektsiooni järjest; iga kollektsioon
autendib oma rollid ja loob oma andmed.

**Tulemus.** 1033 päringut, 2265 kontrolli, **kõik läbisid**. Täielik loetelu
(iga päring ja kontroll eraldi): [apitestid.md](apitestid.md). Testitüüpide
kaupa: turvakontrollid (401/403, asutusepõhine ulatus) on igas
moodulikollektsioonis; integratsioon ja töökindlus ERRU (5 + XML-adapter),
X-tee, teavituste ja cron-kollektsioonides.

### 3.3 X-tee teenused

Pakutavad teenused (9 otspunkti), arendaja-mock ja kasutatavad teenused:
[X-tee testprotokoll](../xtee/08-testprotokoll.md). Kõik automaattestid
läbisid. Kõik kasutatavad X-tee päringud on lisaks käsitsi kontrollitud dev
keskkonnas päris testteenuste vastu kasutajaliidese kaudu ning arendaja masinast
KeMIT-i dev turvaserveri (`*.ml.ee`) kaudu.

### 3.4 Lepingu-, andmebaasi- ja töökindlustestid

| Test | Mida tõendab | Tulemus |
|---|---|---|
| `tests/contract/test_erru_contract.py` | ERRU NU lepingukontrolli mutatsioonitestid (kontroll tabab rikkumised) | 16/16 OK |
| `tests/contract/check_erru_contract.py` | ERRU NU 3.5 XSD reeglid vastavad andmebaasi piirangutele | 29 kontrolli OK; 125 XSD-st tuletatud käitumiskontrolli OK |
| `tests/sql/erru-nu-validation-and-exchange.sql` jt | NU mustandi kooskõla, valideerimine, EN regressioon | läbis |
| `tests/sql/test_nu_concurrency.py` | NU samaaegsed muudatused päris transaktsioonidega (optimistlik lukustus) | läbis |
| `tests/sql/sp-erru-points.sql` | SP rikkumistest ERRU punktide tuletamine | läbis |
| `tests/erru-adapter/test_migrations.py` | ERRU XML-adapteri migratsioonid | läbis |
| Auditiahela kontroll (`get_logs_verify`) | iga auditikirje räsiahel on katkematu pärast kõiki teste | 447 sündmust, terviklik |
| `DSL-tests/erru/nu-send`, `nu-transport` | samaaegne saatmine, transpordiviga, ACK | läbis |

### 3.5 Ühiktestid

Vitest: 13 faili, 75 testi, kõik läbisid (kuupäevade sisestus, WebSocketi
taasühendus, vormide serialiseerimine ja valideerimine, failide üleslaadimine,
esindusõiguse vahetus).

### 3.6 Staatiline analüüs ja turvatestid

| Kontroll | Tulemus |
|---|---|
| `dsl-lint --require-guard` (602 Ruuteri faili) | 0 viga (95 hoiatust: kättesaamatud varusammud) |
| Guard-audit (kaitsmata avalikud marsruudid) | 0 kaitsmata marsruuti (CI dev 01.10.2026) |
| Trivy (saladused repos) | leide ei olnud (CI dev 01.10.2026) |
| CodeQL (Java, JS/TS, Actions) | analüüs õnnestus (01.10.2026) |
| OWASP ZAP baseline (CI-pinu vastu) | FAIL 0, WARN 1 („Storable and Cacheable Content“ 404 vastustel), PASS 66 |
| `npm audit --audit-level=high` | mitteblokeeriv, tulemus CI logis |
| Grawlr DAST | GitHub CI-s ei käivitu (sihtmärgi aadress muutub igal jooksul; vt §6.2) |

Viimane CI jooks `dev` harus (01.10.2026): kõik jobid rohelised —
<https://github.com/kemit-ee/ljvis-2/actions/runs/36886452388>.

## 4. Tulemuste asukohad

| Tulemus | Asukoht |
|---|---|
| UI-testide kokkuvõte ja tõendid (kirjeldus, ekraanipilt, trace kukkumisel) | `tests/playwright/tulemus/` (jooksu artefakt), CI artefakt `playwright-tulemus` (14 päeva) |
| UI-testilood koos tulemusega | [testilood-ui.md](testilood-ui.md) |
| Newmani raportid | `tests/postman/reports/*.{html,json}` (jooksu artefakt), Confluence „LJVIS 2 - Testimine“ → „E2E testitulemused“ |
| Kõik API-testid koos tulemusega | [apitestid.md](apitestid.md) |
| CI jooksud | GitHub Actions, töövoog `CI` |
| Selle raportiga seotud jooksu kokkuvõte | [tulemused/2026-10-01/](tulemused/2026-10-01/KOKKUVÕTE.md) |

## 5. Testitud nõuete nimekiri

Formaalset nõuete kataloogi repos ei ole. Nõuded on koondatud neist allikatest:
- kasutuslood PA, KH, SP, PK ([use-cases-ljvis.md](../workingdocs/use-cases-ljvis.md));
- kasutusjuhendi ja administraatori juhendi funktsioonid;
- õiguste maatriks ([permissions-matrix.md](../workingdocs/permissions-matrix.md));
- X-tee teenuste juhend;
- Jira võtmed (`LJVIS2-NNN`) ja GitHubi issue'd, millele testid viitavad.

Mooduli nõuded on tähistatud `N-<MOODUL>-NN`.

Staatus: **Testitud** = vähemalt üks automaattest katab nõuet ja läbis viimases
jooksus. **Testitud (käsitsi)** = automaattest puudub, kontrollitud käsitsi.

### 5.1 Kasutajate ja kasutajagruppide haldus (EPIC 02)

| Nõue | Kirjeldus | Testid | Staatus |
|---|---|---|---|
| PA-01 | Kasutajate nimekiri (kõik asutused) | TL-KAS-01; Newman `users` (admin search) | Testitud |
| PA-02 | Kasutajate otsing (nimi; ka isikukood) | TL-KAS-01, TL-KAS-02; `users` (search filter) | Testitud |
| PA-03 | Kasutaja detailvaade | TL-KAS-01; `users` (GET admin) | Testitud |
| PA-04 | Uue kasutaja loomine (valideerimine, duplikaat) | TL-KAS-03, TL-KAS-04; `users` (insert, 422, duplikaat) | Testitud |
| PA-05 | Isikuandmete muutmine | TL-KAS-04; `users` (PUT) | Testitud |
| PA-06 | Ligipääsuperioodi muutmine | TL-KAS-04 (deaktiveerimine lõppkuupäevaga) | Testitud |
| PA-07 | Asutuse muutmine (eemaldab grupid, kinnitus) | TL-KAS-05 | Testitud |
| PA-08 | Kasutajale grupi määramine | TL-KAS-04, TL-KAS-05; `users` (PUT groups) | Testitud |
| PA-09 | Kasutajalt grupi eemaldamine | TL-KAS-05 (asutuse muutmisel); TL-GRP-04 (grupist eemaldamine) | Testitud |
| PA-10 | Kasutajagruppide nimekiri | TL-GRP-01; `user-groups` | Testitud |
| PA-11 | Kasutajagruppide otsing | TL-GRP-01, TL-GRP-03 | Testitud |
| PA-12 | Kasutajagrupi detailvaade | TL-GRP-01; `user-groups` (GET) | Testitud |
| PA-13 | Kasutajagrupi liikmed | TL-GRP-04; `user-groups` (users) | Testitud |
| PA-14 | Uue grupi loomine (nimi, asutused, õigused, valideerimine) | TL-GRP-02, TL-GRP-03; `user-groups` (POST, 422) | Testitud |
| PA-15 | Grupi nime muutmine | TL-GRP-03; `user-groups` (rename) | Testitud |
| PA-16 | Grupi asutuste muutmine | TL-GRP-03; `user-groups` (organisations) | Testitud |
| PA-17 | Grupi õiguste muutmine | TL-GRP-03; `user-groups` (permissions) | Testitud |
| PA-18 | Kasutaja lisamine gruppi | TL-GRP-04; `user-groups` (add user) | Testitud |
| PA-19 | Kasutaja eemaldamine grupist | TL-GRP-04; `user-groups` (remove user) | Testitud |
| KH-01…KH-03 | Oma asutuse kasutajate nimekiri, otsing, detail | TL-KAS-06; `users` (local search, ainult JUM) | Testitud |
| KH-04…KH-06 | Kasutaja loomine ja muutmine oma asutuses | `users` (local admin insert oma asutusse) | Testitud |
| KH-07, KH-08 | Grupi määramine ja eemaldamine (oma asutus) | `users` (PUT groups) — kohaliku rolliga UI-test puudub | Testitud (API) |
| KH-09…KH-12 | Oma asutuse gruppide vaatamine ja liikmed | `user-groups` (local admin) | Testitud |
| SP-01…SP-04 | Öine deaktiveerimine: tuvastus, grupid eemaldatakse, olek mitteaktiivne, idempotentsus | Newman `cron-jobs` (LJVIS2-12, 9 päringut) | Testitud |
| N-AUTH-01 | Ligipääs ainult õigusega: iga haldusvaade keelab õiguseta kasutaja | TL-KAS-07, TL-GRP-05, TL-KLF-06, TL-RSK-03, TL-AUD-05, TL-XTL-09, TL-PKM-02; 401/403 kontrollid kõigis kollektsioonides | Testitud |
| N-AUTH-02 | Sessioon ja roll; õigusteta kasutaja ei näe ametniku funktsioone | TL-SMK-01, TL-SMK-02; `DSL-tests/auth/session` | Testitud |

### 5.2 Klassifikaatorid (EPIC 04)

| Nõue | Kirjeldus | Testid | Staatus |
|---|---|---|---|
| PK-01, PK-02 | Klassifikaatorite nimekiri ja otsing | TL-KLF-01; `classifiers` | Testitud |
| PK-03…PK-05 | Detailvaade, päis, väärtuste nimekiri, kehtivate filter | TL-KLF-01, TL-KLF-02; `classifiers` | Testitud |
| PK-06 | Nimetuse/selgituse muutmine | TL-KLF-03; `classifiers` (update) | Testitud |
| PK-07 | Uue väärtuse lisamine (kood unikaalne klassifikaatori piires) | TL-KLF-04; `classifiers` (create, code exists) | Testitud |
| PK-08 | Väärtuse kehtivuse lõpetamine; periood peab olema korrektne | TL-KLF-04, TL-KLF-05 | Testitud |

### 5.3 Kontrollvormid

| Nõue | Kirjeldus | Testid | Staatus |
|---|---|---|---|
| N-UI-01 | Kõik vormide loomislehed avanevad vigadeta | TL-SMK-03…TL-SMK-11 | Testitud |
| N-KON-01 | Koondvormi üldosa valideerimine (kohustuslikud ja tingimuslikud väljad) | TL-KON-01…05 | Testitud |
| N-KON-02 | Koondvormi salvestamine ja andmete püsivus | TL-KON-06, 07; `compound-form` | Testitud |
| N-KON-03 | Elutsükkel salvestatud → kinnitatud → avalikustatud, versioonireeglid, lukustus | `compound-form`; TL-TRM-07 | Testitud |
| N-KON-04 | #280 muudatused (kategooriad, „Muu“, ettevõtte otsing, liiklusregister) | TL-KON-08…11 | Testitud |
| N-KON-05 | Koondvormi loomise õigus | TL-KON-12, 13 | Testitud |
| N-KON-06 | Alamvormid koondvormi voos (SP, ADR, tehnoülevaatus) | TL-ALV-01…06; `driverest-forms`, `technical-check-forms` | Testitud |
| N-SP-01 | SP juhi ja meeskonnaliikme vorm, kohustuslikud väljad | TL-ALV-01, 02, 06; `driverest-forms` | Testitud |
| N-FAIL-01 | Failide lisamine, eraldatus ja lugemisõigus | TL-ALV-07…09 | Testitud |
| N-TRAM-01…06 | TRAM kontrollkaart: valideerimine, „Ei ole asjakohane“, RR-otsing, üks vorm (ADR-002), veoliik, tulemus, vorminumber, vaatamisvaade | TL-TRM-01…16; `tram-control-card` | Testitud |
| N-VR-01, 02 | Välisriigi kontrollkaart: valideerimine, salvestamine, elutsükkel, teavitus | TL-VRK-01, 02; `foreign-violation-form` | Testitud |
| N-TI-01, 02 | Tööinspektsiooni kontrollkaart: valideerimine, tulevikukuupäev, elutsükkel | TL-TÖÖ-01…03; `labour-inspection` | Testitud |
| N-HM-01, 02 | Hea maine vorm: valideerimine, tingimuslikud väljad, salvestamine | TL-HEA-01…03; `good-repute-form` | Testitud |
| N-ADR-01 | ADR alamvorm: salvestamine, kinnitamine, rikkumised (LJVIS2-141) | TL-ADR-01; `adr-form` | Testitud |
| N-KV-01 | Autoveo katkestamise vorm | `transport-interruption`; TL-PRT-04 | Testitud |
| N-PRINT-01 | Vormide printimine (täidetud ja tühi vorm) | TL-PRT-01…04, TL-ADR-02…04, TL-RSI-03 | Testitud |

### 5.4 ERRU

| Nõue | Kirjeldus | Testid | Staatus |
|---|---|---|---|
| N-ERRU-01 | CTUD tegevusloa kontroll: vorm, saatmine, vastused, uuesti saatmine | TL-ERU (CTUD); `erru-ctud` | Testitud |
| N-ERRU-02 | CGR mainepäring: XSD-valikud, ZZ saatmine, sissetulev | TL-ERU (CGR); `erru-cgr` | Testitud |
| N-ERRU-03 | RSI tehnokontrolli teade: kontrollpunktid, valideerimine, saatmine (LJVIS2-147/148) | TL-ERU (RSI), TL-RSI-01…03; `erru-rsi`; `DSL-tests/erru/rsi-build` | Testitud |
| N-ERRU-04 | NCR kontrollitulemuse teade: vastuse katvus, olekud | TL-ERU (NCR); `erru-ncr` | Testitud |
| N-ERRU-05 | NU sobimatusteade: õigused, saatmine, idempotentne vastuvõtt, versioonikonflikt | TL-NU-01, 02; `erru-nu`; NU lepingu- ja samaaegsustestid | Testitud |
| N-ERRU-06 | ERRU XML-adapter: vastuvõtt, korduvkohaletoimetamine, XSD | `erru-xml-adapter` | Testitud |

### 5.5 Otsing, töölaud, riskitasemed, teavitused, auditilogi

| Nõue | Kirjeldus | Testid | Staatus |
|---|---|---|---|
| N-OTS-01 | Vormiotsing tunnuste järgi (reg-nr, registrikood, nimi, juht) | TL-OTS-01; `form-search` | Testitud |
| N-OTS-02 | Filtrid (tüüp, staatus, kuupäev) ja lähtestamine | TL-OTS-02; `form-search` | Testitud |
| N-OTS-03 | VR-spetsiifilised filtrid | TL-OTS-03 | Testitud |
| N-OTS-04 | Tulemused õiguse järgi; kustutatud ei kuvata; üks rida versioonide kohta | TL-OTS-05; `form-search` | Testitud |
| N-DASH-01 | Ametniku töölaud (enda ja asutuse vormid) | TL-SMK-01; `dashboard` | Testitud |
| N-RISK-01 | Riskiskooride arvutus ja riskiklassid (määrus 2022/695) | `risk-scores`; `cron-jobs` (öine ümberarvutus) | Testitud |
| N-RISK-02 | Riskitasemete nimekiri ja filtrid halduses | TL-RSK-01…03; `risk-scores` | Testitud |
| N-TEA-01 | Rakendusesisesed teavitused, loetuks märkimine | TL-TEA-01, 02; `notifications` | Testitud |
| N-TEA-02 | Saadetud kirjade logi ja filtrid | TL-TEA-03; `notifications` | Testitud |
| N-TEA-03 | Saatmise raport ja uuesti saatmine | TL-TEA-03, 04; `notifications` | Testitud |
| N-TEA-04 | Teavituste nähtavus õiguste järgi | TL-TEA-05; `notifications` | Testitud |
| N-TEA-05 | Postkasti mallide ja saajate seadistus | TL-PKM-01, 02; `DSL-tests/notification/template-mapping-save` | Testitud |
| N-AUD-01 | Auditilogi otsing ja detail | TL-AUD-01; `audit-log` | Testitud |
| N-AUD-02 | Auditilogi eksport (CSV) | TL-AUD-02; `audit-log` | Testitud |
| N-AUD-03 | Asutusepõhine ulatus (`audit.read.local`) | TL-AUD-04; `audit-log` | Testitud |
| N-AUD-04 | Auditiahela terviklikkus (`audit.verify`, ainult peakasutaja) | TL-AUD-03; `audit-log`; täisahela kontroll pärast teste (§3.4) | Testitud |
| N-CIT-01 | Kodaniku vaade ja esindusõigus | `citizen-representation` | Testitud |

### 5.6 X-tee

| Nõue | Kirjeldus | Testid | Staatus |
|---|---|---|---|
| N-XTEE-01…06 | Pakutavad teenused IsikuKontroll, IsikuEttevoteKontrollid, ErakorralineYVquery/confirm, RegisterJobInspection v1/v3 | TL-XTP-01…06; `xroad-provide-query`, `xroad-provide-write`; arendaja-mock | Testitud |
| N-XTEE-07…09 | findUsage (AJ): /v2/findUsage, /v2/usagePeriod, /v2/heartbeat | TL-XTP-07; `DSL-tests-internal/xroad/aj`; arendaja-mock | Testitud |
| N-XTEE-10 | X-tee päringute logi halduses (filtrid, sisu, vormi link) | TL-XTL-01…07, 09 | Testitud |
| N-XTEE-11 | Kõigi X-tee teenuste logi vaade | TL-XTL-08 | Testitud |
| N-XTEE-12 | Kasutatavad teenused: RR, äriregister, liiklusregister, eToimik, Postkast, ERRU | [X-tee testprotokoll](../xtee/08-testprotokoll.md) §4 | Testitud |
| N-XTEE-13 | Kasutatav teenus MTR | käsitsi dev keskkonnas | Testitud (käsitsi) |
| N-XTEE-14 | Arendaja-mock: leping, liivakasti turvalisus, drift | `DSL-mock-tests`, `check_xtee_mock.py`, `generate-xtee-mock.py --check` | Testitud |

### 5.7 Mittefunktsionaalsed nõuded

| Nõue | Kirjeldus | Testid | Staatus |
|---|---|---|---|
| N-SEC-01 | Kõik avalikud marsruudid on kaitstud (guard) | guard-audit, `dsl-lint --require-guard` | Testitud |
| N-SEC-02 | Repos ei ole saladusi | Trivy | Testitud |
| N-SEC-03 | Koodi turvaanalüüs | CodeQL | Testitud |
| N-SEC-04 | Rakenduse baseline-turvaskann | ZAP baseline (FAIL 0) | Testitud |
| N-SEC-05 | Sisendi valideerimine serveris (422/400 veakoodidega) | valideerimiskontrollid kõigis kollektsioonides | Testitud |
| N-REL-01 | Samaaegsed muudatused ei kirjuta üksteist üle (versioonikontroll) | `test_nu_concurrency.py`, `DSL-tests/erru/nu-save`, TL-NU-02 | Testitud |
| N-REL-02 | Väliste teenuste tõrked käsitletakse (timeout, transpordiviga, korduskatse) | `erru-*`, `DSL-tests/erru/nu-transport`, `notifications` | Testitud |
| N-REL-03 | Ajastatud tööd on idempotentsed | `cron-jobs` | Testitud |
| N-DB-01 | Andmebaasi migratsioonid rakenduvad puhtale baasile | iga CI jooks (Liquibase) | Testitud |
| N-DB-02 | Andmepiirangud ja XSD-reeglid on kooskõlas | `check_erru_contract.py`, `test_erru_contract.py` | Testitud |

## 6. Leitud vead ja avatud kohad

### 6.1 Testimise käigus leitud ja parandatud vead

Haldusmoodulite UI-testide lisamisel leiti 5 viga. Kõik on parandatud
PR-is #497 ja neid katab test, mis enne parandust kukkus.

| # | Viga | Mõju | Parandus | Test |
|---|---|---|---|---|
| 1 | Kasutajate otsing ei leidnud isikukoodi järgi | administraator ei leidnud kasutajat isikukoodiga, kuigi juhend lubab | isikukood lisati kasutajate ja grupi liikmete otsingusse | TL-KAS-02 |
| 2 | Tänase ligipääsu lõpuga kasutaja olek näitas „Aktiivne“ | olekumärgis oli lõpupäeval vale (ajavööndi viga); öine deaktiveerimine toimus õigesti | olek arvutatakse kalendripäevade järgi | TL-KAS-04 |
| 3 | Klassifikaatori väärtuse kehtivusperioodi viga teatati õnnestumisena | muudatus kadus vaikselt | perioodi kontroll ka muutmisel; Ruuter kontrollib andmebaasi vastust | TL-KLF-05 |
| 4 | Klassifikaatorisse sai lisada sama koodiga väärtuse | rippmenüü kuvas duplikaatidest ühe | kood on klassifikaatori piires unikaalne, vorm näitab viga | TL-KLF-04 |
| 5 | X-tee logide vaate lüliti ei uuendanud tabelit | „kõiki“ vaade näitas e-toimiku kirjeid | filter rakendatakse kohe | TL-XTL-08 |

Samas käigus parandati kaks testide endi puudust:
- „menüüpunkti ei kuvata“ kontrollid otsisid vale rolliga elementi ja läbisid alati;
- `run.sh` jättis seemned rakendamata, kui masinas puudus `psql`.

### 6.2 Avatud kohad

| # | Kirjeldus | Mõju | Plaan |
|---|---|---|---|
| 1 | Kasutaja loomise vormis võivad kohe pärast isikukoodi päringut korraga (kleepides) sisestatud väljade väärtused kaotsi minna | tavalise trükkimisega ei kordu; vorm näitab „Kohustuslik väli“ ja ei salvesta, andmeid ei rikuta | uurida asünkroonse valideerimise järjekorda |
| 2 | Loendilehed ei hülga hilinenud vastuseid | väga kiirel filtreerimisel võib hetkeks kuvada eelmise päringu tulemuse | päringute tühistamine loendihookis |
| 3 | MTR päringutel automaattest puudub | kontrollitud käsitsi dev keskkonnas | lisada Playwrighti test X-tee mocki vastu |
| 4 | Playwrighti UI-testid ei ole CI `quality-gate`'i osa | punane UI-test ei blokeeri ühendamist (issue avatakse automaatselt) | lisada `ui-tests` gate'i |
| 5 | Grawlr DAST ei käivitu GitHub CI-s | sihtmärk on Grawlris registreeritud, kuid Grawlr vajab avalikult ligipääsetavat, võtmega kaitstud ja püsiva aadressiga sihtmärki; CI-pinu aadress muutub igal jooksul | suunata skann püsivale testkeskkonnale |
| 6 | ZAP baseline'i HTML-raport jäi CI-s salvestamata | pseudoprobleem: skann töötas ja tulemus on logis | parandatud (`chmod` enne skanni); kinnitub järgmises CI jooksus |
| 7 | Koormustestid puuduvad | jõudlus suurte andmemahtude korral kinnitamata | vt testiplaan §2.2 |
