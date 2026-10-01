# Testilood

Testilugu kirjeldab ühte kontrollitavat kasutus- või süsteemivoogu. Selles
dokumendis on testilugude ülesehitus ja moodulite kaupa koond. Üksikud testilood
koos sammude ja viimase tulemusega on kahes genereeritud failis:

- **UI-testilood** (kasutajavood brauseris, Playwright): [testilood-ui.md](testilood-ui.md)
- **API-testilood** (Newman, DSL, X-tee mock, lepingutestid; iga kontroll eraldi):
  [apitestid.md](apitestid.md)

Mõlemad genereeritakse päris testijooksu väljundist (vt [testiplaan](testiplaan.md) §7),
nii et testiloo kirjeldus ja selle tulemus ei saa teineteisest lahkneda.

## 1. Testiloo ülesehitus

| Väli | Sisu | UI-testilugu | API-testilugu |
|---|---|---|---|
| ID | unikaalne tunnus | `TL-<moodul>-NN` (nt `TL-KAS-03`) | kollektsioon + järjekorranumber (nt `users` #12) |
| Moodul ja rühm | mida testitakse | spec + `describe` | kollektsioon + kaust |
| Seotud nõuded | jälgitavus | nõude ID-d ([testiraport](testiraport.md) §5) | testiraport §5 |
| Roll | kelle õigustega | peakasutaja, lokaalne kontohaldur, ametnik, õigusteta, X-tee klient | päringu autentimine (testiplaan §5.3) |
| Eeltingimused | andmed ja olek enne testi | §2 + testi `beforeAll` (nt seemnekirjed) | kollektsiooni `[Setup]` päringud |
| Sammud ja oodatav tulemus | mida tehakse ja mida kontrollitakse | `test.step` pealkirjad | päring + `pm.test` kontroll |
| Tulemus | viimase jooksu tulemus | läbis / KUKKUS + kestus | läbis / KUKKUS + veateade |
| Viide | automaattesti asukoht | `tests/playwright/tests/<spec>:<rida>` | `tests/postman/collections/<kollektsioon>.collection.json` |

**Meetod.** Iga kasutajavoog käiakse arenduse käigus rakenduses käsitsi läbi ja
kinnitatakse Playwrighti testiga, mis kordab sama voogu. Testiloo sammud on testi
koodis nimetatud (`test.step`) ja kuvatakse igas jooksu raportis
(`tests/playwright/tulemus/<test>/kirjeldus.md`). Nii on käsitsi kontrollitud voog
korratav ja selle viimane tulemus on alati tõendatav.

## 2. Üldised eeltingimused

1. CI-pinu on üles tõstetud puhta andmebaasiga (`docker-compose.ci.yml`), kõik
   migratsioonid rakendatud ja testseemned laaditud (testiplaan §5.1–5.2).
2. Testkasutajad on olemas ja sisse logitud dev-login kaudu (testiplaan §5.3).
3. Frontend jookseb staatilise buildina (`vite preview`) CI-pinu API vastu.
4. Testandmed, mida test muudab, luuakse testi alguses unikaalsena; seemne
   kasutajaid ja gruppe ei muudeta.

## 3. UI-testilood moodulite kaupa

Viimase jooksu tulemus: [testilood-ui.md](testilood-ui.md) (päises kuupäev ja versioon).

| Prefiks | Moodul | Testid kontrollivad | Spec |
|---|---|---|---|
| TL-SMK | Sisselogimine, töölaud, vormide avamine | sessioon ja roll, ametniku töölaud, kõik loomislehed avanevad JS-vigadeta, õigusteta kasutaja ei näe ametniku kaarte | `smoke.spec.ts` |
| TL-KAS | Kasutajate haldus | nimekiri ja otsing (nimi, isikukood), loomise valideerimine (kohustuslikud väljad, isikukood, e-post, duplikaat), loomine, muutmine, grupi sidumine, deaktiveerimine, asutuse muutmise kinnitus, lokaalse kontohalduri ulatus, ligipääsukeeld | `users.spec.ts` |
| TL-GRP | Kasutajagruppide haldus | nimekiri ja otsing, valideerimine, tühistamise kinnitus, loomine, ümbernimetamine, asutuste ja õiguste muutmine, liikmete lisamine ja eemaldamine, ligipääsukeeld | `user-groups.spec.ts` |
| TL-KLF | Klassifikaatorite haldus | nimekiri ja otsing, selgituse muutmine, väärtuse lisamine, duplikaatkoodi keeld, kehtivuse lõpetamine, kehtivate filter, kehtivusperioodi valideerimine, ligipääsukeeld | `classifiers.spec.ts` |
| TL-RSK | Riskitasemed | arvutatud riskitasemed, filtrid (nimi, registrikood, tase), filtrite lähtestamine, ligipääsukeeld | `risk-scores.spec.ts` |
| TL-TEA | Teavitused | lugemata/loetud, kella loendur, „Märgi kõik loetuks“, saadetud kirjade filtrid, saatmise raport, uuesti saatmine, ametnikul sakk puudub | `notifications.spec.ts` |
| TL-PKM | Postkasti mallide seaded | desktop-kanali saajate lisamine ja eemaldamine, ligipääsukeeld | `notification-template-mapping.spec.ts` |
| TL-AUD | Auditilogi | otsing, detailvaade, CSV eksport, auditiahela terviklikkus (API), asutusepõhine ulatus, ligipääsukeeld | `audit-logs.spec.ts` |
| TL-OTS | Vormiotsing | otsing reg-nr, registrikoodi, nime järgi; tüübi, staatuse, kuupäeva filtrid; VR-filtrid; vormi avamine; õigusepõhine ulatus | `form-search.spec.ts` |
| TL-XTL | X-tee logid | vaikefilter, staatusefiltrid, kuupäevavahemik, „kõiki“ vaade (RR päring), päringu/vastuse modaalid, vormi link, ligipääsukeeld | `xroad-etoimik-logs.spec.ts` |
| TL-XTP | X-tee pakutavad teenused | 9 teenust: ligipääs (403), valideerimine (400), edukas päring, idempotentsus, AJ (findUsage, usagePeriod, heartbeat) | `xtee-teenused.spec.ts` |
| TL-KON | Koondvorm | validatsioon, salvestamine ja andmete püsivus, #280 muudatused, liiklusregistri ja äriregistri otsing, loomise õigus, vormide navigatsioon | `compound-form.spec.ts` |
| TL-ALV | Alamvormid ja failid | SP juhi ja meeskonnaliikme vorm, ADR ja tehnoülevaatuse alamvorm, failide lisamine ja eraldatus, failide lugemisõigus | `compound-subforms.spec.ts` |
| TL-TRM | Transpordiameti kontrollkaart | validatsioon, „Ei ole asjakohane“, RR-otsing, üks vorm ja elutsükkel (ADR-002), veoliik, kontrolli tulemus, vorminumber, vaatamisvaade | `tram-form.spec.ts` |
| TL-VRK | Välisriigi kontrollkaart | validatsioon, salvestamine | `foreign-violation.spec.ts` |
| TL-TÖÖ | Tööinspektsiooni kontrollkaart | validatsioon, tulevikukuupäev, salvestamine | `labour-inspection.spec.ts` |
| TL-HEA | Hea maine vorm | validatsioon, tingimuslikud väljad, salvestamine | `good-repute.spec.ts` |
| TL-ADR | ADR alamvorm | salvestamine ja kinnitamine, printimise nupp | `adr-form.spec.ts` |
| TL-PRT | Printimine | SP, tehnokontrolli ja autoveo katkestamise vormide printimisnupud | `print-buttons.spec.ts` |
| TL-ERU | ERRU vormid | CTUD, CGR, RSI, NCR: leht avaneb, tühja vormi valideerimine | `erru.spec.ts` |
| TL-RSI | ERRU RSI | 12 kontrollpunkti, „Ei vasta nõuetele“ põhjused, printimine | `rsi.spec.ts` |
| TL-NU | ERRU NU | nimekiri ja detail, versioonikonflikt (`expectedVersion`) | `nu.spec.ts` |

Lisaks: ADR alamvormi käsitsi testistsenaariumid (LJVIS2-141) —
[adr-vorm-test-stsenaariumid.md](../workingdocs/adr-vorm-test-stsenaariumid.md).

## 4. API-testilood moodulite kaupa

Iga rida on üks Newmani kollektsioon (testilood on selle päringud). Kõik
kontrollid koos viimase tulemusega: [apitestid.md](apitestid.md) §3.

| Moodul | Testilood kontrollivad | Kollektsioon |
|---|---|---|
| Asutused, õigused | nimekirjad ja õiguste kataloog, autentimata ja õiguseta ligipääsu keeld | `organisations`, `permissions` |
| Kasutajad | otsing, lugemine, loomine, muutmine, gruppide sidumine, isikukoodi kontroll, peakasutaja vs lokaalne ulatus | `users` |
| Kasutajagrupid | otsing, loomine, nime/asutuste/õiguste muutmine, liikmed, ulatus | `user-groups` |
| Klassifikaatorid | nimekirjad, klassifikaatori ja väärtuste muutmine, kehtivus, koodi kontroll | `classifiers` |
| Koondvorm | õiguste piirid, elutsükkel salvestatud → kinnitatud → avalikustatud, versioonireeglid, administraatori uuesti salvestamine (regressioon) | `compound-form` |
| SP vormid (juht, meeskonnaliige) | õigused, valideerimine, elutsükkel, lugemine id ja koondvormi järgi | `driverest-forms` |
| TRAM kontrollkaart | õigused, numbriseeria, elutsükkel, „juht ei ole asjakohane“, kuupäeva valideerimine, eToimiku automaatne avalikustamine | `tram-control-card` |
| Tööinspektsioon | õigused, valideerimine, elutsükkel, lukustus pärast kinnitamist, kustutamine | `labour-inspection` |
| Välisriigi kontrollkaart | õigused, valideerimine, elutsükkel, lukustus, NCR-ist loomine, teavitus avalikustamisel | `foreign-violation-form` |
| ERRU CTUD, CGR, RSI, NCR, NU | õigused, valideerimismaatriks, XSD-valikud, saatmine Hub-mocki vastu (Found/NotFound/Timeout/transpordiviga), uuesti saatmine, sissetulevad teated, idempotentsus | `erru-ctud`, `erru-cgr`, `erru-rsi`, `erru-ncr`, `erru-nu` |
| ERRU XML-adapter | ERRU 3.5 XML vastuvõtt, korduvkohaletoimetamine, XSD-tagasilükkamine, NotifyUnfitness täisahel | `erru-xml-adapter` |
| Tehnovormid, autoveo katkestamine, ADR, hea maine | õigused, valideerimine, elutsükkel, lukustatud andmete uuesti salvestamine, suurtähtede reegel | `technical-check-forms`, `transport-interruption`, `adr-form`, `good-repute-form` |
| Vormiotsing | õiguseta 403, filtrid, lehekülgede vahetus, sortimine, kustutatud vormid peidetud, üks rida mitme versiooni kohta | `form-search` |
| X-tee pakutavad teenused | vt [X-tee testprotokoll](../xtee/08-testprotokoll.md) | `xroad-provide-query`, `xroad-provide-write` |
| Riskitasemed | arvutamine ja salvestamine, ERRU riskiklassi vastendus, halduse nimekiri ja filtrid, kodaniku otspunkt, kontrollide jaotus | `risk-scores` |
| Kodaniku vaade | esindusõiguse vahetus, kodaniku töölaud | `citizen-representation` |
| Ajastatud tööd | öine kasutajate deaktiveerimine, eToimiku otsuste sünkroon ja avalikustamine, ülevaatuse kehtivuse sünkroon, riskiskooride ümberarvutus | `cron-jobs` |
| Teavitused | rakendusesisesed teavitused, Postkasti saadetud kirjade logi, uuesti saatmine, õigused | `notifications` |
| Auditilogi | õigused, asutusepõhine ulatus, eksport, ahela kontroll (ainult peakasutaja) | `audit-log` |
| Töölaud | kokkuvõte (enda ja asutuse vormid), ulatus õiguse järgi | `dashboard` |

## 5. Muud testilood

| Liik | Asukoht | Kirjeldus |
|---|---|---|
| Ruuteri töövoogude stsenaariumid | `DSL-tests/`, `DSL-tests-internal/` | sessioon, marsruutimine, ERRU NU salvestamine/saatmine (samaaegsus, transpordiviga, ACK), RSI koostamine, Postkasti mallid, AJ teenused; loetelu [apitestid.md](apitestid.md) §4 |
| X-tee arendaja-mock | `DSL-mock-tests/xtee.test.yml` | 69 stsenaariumi, [apitestid.md](apitestid.md) §5 |
| Lepingutestid | `tests/contract/` | ERRU NU 3.5 XSD vs andmebaasi reeglid, mutatsioonitestid, mocki liivakasti turvalisus |
| Andmebaasitestid | `tests/sql/` | NU samaaegsus päris transaktsioonidega, SP → ERRU punktid |
| Ühiktestid | `frontend/src/**/*.test.ts(x)` | 13 faili, 75 testi |
