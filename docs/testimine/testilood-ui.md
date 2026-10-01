# UI-testilood (Playwright)

> **Genereeritud fail — ära muuda käsitsi.** Allikas: Playwrighti testijooksu tulemus `tests/playwright/tulemus/playwright-tulemus.json`, skript `scripts/generate-ui-testlood.py`. Testilugude ülesehitus ja meetod: [testilood.md](testilood.md).

| | |
|---|---|
| Viimase testimise kuupäev | 01.10.2026 |
| Testitud versioon (commit) | `caa78802` |
| Keskkond | CI-pinu `docker-compose.ci.yml`, frontend staatilise buildina (`vite preview`), Chromium |
| Teste | 133 — läbis 133, kukkus 0, korduskatsel läbis 0, vahele jäetud 0 |

Iga testilugu on Playwrighti automaattest, mis kirjutati voo käsitsi läbikäimise käigus ja kordab sama voogu brauseris. Sammud on testi `test.step` pealkirjad — sama tekst on iga jooksu raportis (`tulemus/<test>/kirjeldus.md`, HTML-raport). Kui test samme ei nimeta, on kontrollid testi koodis (viide „Spec“).

## Sisukord

| Prefiks | Moodul | Spec | Teste | Seotud nõuded |
|---|---|---|---|---|
| TL-SMK | [Sisselogimine, töölaud ja vormide avamine](#tl-smk-sisselogimine-töölaud-ja-vormide-avamine) | `smoke.spec.ts` | 11 | N-AUTH-01, N-AUTH-02, N-UI-01 |
| TL-KAS | [Kasutajate haldus](#tl-kas-kasutajate-haldus) | `users.spec.ts` | 7 | PA-01…PA-09, KH-01…KH-08 |
| TL-GRP | [Kasutajagruppide haldus](#tl-grp-kasutajagruppide-haldus) | `user-groups.spec.ts` | 5 | PA-10…PA-19, KH-09…KH-12 |
| TL-KLF | [Klassifikaatorite haldus](#tl-klf-klassifikaatorite-haldus) | `classifiers.spec.ts` | 6 | PK-01…PK-08 |
| TL-RSK | [Riskitasemed](#tl-rsk-riskitasemed) | `risk-scores.spec.ts` | 3 | N-RISK-01, N-RISK-02 |
| TL-TEA | [Teavitused ja saadetud kirjad](#tl-tea-teavitused-ja-saadetud-kirjad) | `notifications.spec.ts` | 5 | N-TEA-01…N-TEA-04 |
| TL-PKM | [Postkasti mallide ja vastuvõtjate seaded](#tl-pkm-postkasti-mallide-ja-vastuvõtjate-seaded) | `notification-template-mapping.spec.ts` | 2 | N-TEA-05 |
| TL-AUD | [Auditilogi](#tl-aud-auditilogi) | `audit-logs.spec.ts` | 5 | N-AUD-01…N-AUD-04 |
| TL-OTS | [Vormiotsing](#tl-ots-vormiotsing) | `form-search.spec.ts` | 5 | N-OTS-01…N-OTS-04 (LJVIS2-9) |
| TL-XTL | [X-tee logid (haldus)](#tl-xtl-x-tee-logid-haldus) | `xroad-etoimik-logs.spec.ts` | 9 | N-XTEE-10, N-XTEE-11 |
| TL-XTP | [X-tee pakutavad teenused](#tl-xtp-x-tee-pakutavad-teenused) | `xtee-teenused.spec.ts` | 7 | N-XTEE-01…N-XTEE-09 |
| TL-KON | [Koondvorm](#tl-kon-koondvorm) | `compound-form.spec.ts` | 14 | N-KON-01…N-KON-05 (#280) |
| TL-ALV | [Koondvormi alamvormid ja failid](#tl-alv-koondvormi-alamvormid-ja-failid) | `compound-subforms.spec.ts` | 9 | N-KON-06, N-SP-01, N-FAIL-01 |
| TL-TRM | [Transpordiameti kontrollkaart (TRAM)](#tl-trm-transpordiameti-kontrollkaart-tram) | `tram-form.spec.ts` | 16 | N-TRAM-01…N-TRAM-06 (ADR-002, #280) |
| TL-VRK | [Välisriigi kontrollkaart](#tl-vrk-välisriigi-kontrollkaart) | `foreign-violation.spec.ts` | 2 | N-VR-01, N-VR-02 |
| TL-TÖÖ | [Tööinspektsiooni kontrollkaart](#tl-töö-tööinspektsiooni-kontrollkaart) | `labour-inspection.spec.ts` | 3 | N-TI-01, N-TI-02 |
| TL-HEA | [Hea maine vorm](#tl-hea-hea-maine-vorm) | `good-repute.spec.ts` | 3 | N-HM-01, N-HM-02 |
| TL-ADR | [Ohtlike veoste (ADR) alamvorm](#tl-adr-ohtlike-veoste-adr-alamvorm) | `adr-form.spec.ts` | 4 | N-ADR-01, N-PRINT-01 (PR #310, #311) |
| TL-PRT | [Vormide printimine](#tl-prt-vormide-printimine) | `print-buttons.spec.ts` | 4 | N-PRINT-01 |
| TL-ERU | [ERRU vormid (CTUD, CGR, RSI, NCR)](#tl-eru-erru-vormid-ctud-cgr-rsi-ncr) | `erru.spec.ts` | 8 | N-ERRU-01…N-ERRU-04 |
| TL-RSI | [ERRU RSI teade](#tl-rsi-erru-rsi-teade) | `rsi.spec.ts` | 3 | N-ERRU-03 (LJVIS2-148) |
| TL-NU | [ERRU NU sobimatusteade](#tl-nu-erru-nu-sobimatusteade) | `nu.spec.ts` | 2 | N-ERRU-05 |

## TL-SMK Sisselogimine, töölaud ja vormide avamine

Spec: `tests/playwright/tests/smoke.spec.ts` · seotud nõuded: N-AUTH-01, N-AUTH-02, N-UI-01

### TL-SMK-01 Super Admin näeb ametniku töölauda

| | |
|---|---|
| Rühm | Sessioon ja armatuurlaud |
| Roll | piiratud õigustega kasutaja |
| Spec | `smoke.spec.ts:10` |
| Tulemus | **läbis** (0.6 s) |

Sammud ja oodatav tulemus:

1. ava avaleht
2. töölaud on nähtav

### TL-SMK-02 õigusteta kasutaja ei näe ametniku kaarte

| | |
|---|---|
| Rühm | Sessioon ja armatuurlaud |
| Roll | piiratud õigustega kasutaja |
| Spec | `smoke.spec.ts:21` |
| Tulemus | **läbis** (1.3 s) |

### TL-SMK-03 Koondvorm (/control-forms/compound/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.4 s) |

### TL-SMK-04 TRAM kontrollkaart (/control-forms/tram-control-card/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.4 s) |

### TL-SMK-05 Välisriigi rikkumine (/control-forms/foreign-violation/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.5 s) |

### TL-SMK-06 Tööinspektsioon (/control-forms/labour-inspection/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.4 s) |

### TL-SMK-07 Hea maine (/control-forms/good-repute/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.3 s) |

### TL-SMK-08 ERRU CTUD (/erru/ctud/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.4 s) |

### TL-SMK-09 ERRU CGR (/erru/cgr/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.3 s) |

### TL-SMK-10 ERRU RSI (/erru/rsi/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.3 s) |

### TL-SMK-11 ERRU NCR (/erru/ncr/new)

| | |
|---|---|
| Rühm | Loomislehed avanevad |
| Roll | peakasutaja (Super Admin) |
| Spec | `smoke.spec.ts:47` |
| Tulemus | **läbis** (0.4 s) |

## TL-KAS Kasutajate haldus

Spec: `tests/playwright/tests/users.spec.ts` · seotud nõuded: PA-01…PA-09, KH-01…KH-08

### TL-KAS-01 kasutajate nimekiri, otsing nime järgi ja detailvaade

| | |
|---|---|
| Rühm | Kasutajate haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `users.spec.ts:86` |
| Tulemus | **läbis** (0.8 s) |

Sammud ja oodatav tulemus:

1. ava kasutajate nimekiri
2. otsi ametnikku nime järgi "Tamm"
3. ava kasutaja detailvaade

### TL-KAS-02 otsing isikukoodi järgi leiab kasutaja

| | |
|---|---|
| Rühm | Kasutajate haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `users.spec.ts:110` |
| Tulemus | **läbis** (0.9 s) |

### TL-KAS-03 loomise vorm valideerib kohustuslikud väljad, isikukoodi ja e-posti

| | |
|---|---|
| Rühm | Kasutajate haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `users.spec.ts:118` |
| Tulemus | **läbis** (2.1 s) |

Sammud ja oodatav tulemus:

1. tühja vormi salvestamine näitab kohustuslike väljade vigu
2. lühike isikukood ja vigane e-post annavad veateate
3. olemasolev isikukood annab duplikaadi vea

### TL-KAS-04 uue kasutaja loomine, andmete muutmine, grupi sidumine ja deaktiveerimine

| | |
|---|---|
| Rühm | Kasutajate haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `users.spec.ts:142` |
| Tulemus | **läbis** (7.5 s) |

Sammud ja oodatav tulemus:

1. loo uus kasutaja (PPA)
2. uus kasutaja leitakse nimekirjast
3. muuda ametinimetust
4. seo kasutaja kasutajagrupiga "Officer Group"
5. deaktiveeri kasutaja: ligipääsu lõpp tänane kuupäev

### TL-KAS-05 grupiga kasutaja asutuse muutmine: kinnitusmodaal, tühistamine ja kinnitamine

| | |
|---|---|
| Rühm | Kasutajate haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `users.spec.ts:182` |
| Tulemus | **läbis** (5.7 s) |

Sammud ja oodatav tulemus:

1. vali muutmisel teine asutus ja salvesta → kinnitusmodaal
2. tühista modaal ja muutmine — asutus ja grupp jäävad alles
3. muuda uuesti ja kinnita "Jah, muuda" — asutus muutub, grupid eemaldatakse

### TL-KAS-06 näeb ainult oma asutuse (JUM) kasutajaid

| | |
|---|---|
| Rühm | Kasutajate haldus — lokaalne kontohaldur |
| Roll | lokaalne kontohaldur (Org Admin, JUM) |
| Spec | `users.spec.ts:216` |
| Tulemus | **läbis** (0.8 s) |

Sammud ja oodatav tulemus:

1. oma asutuse kasutaja on nimekirjas
2. teise asutuse (PPA) kasutajat ei leita

### TL-KAS-07 ametnik ei näe menüükirjet ega pääse kasutajate lehele

| | |
|---|---|
| Rühm | Kasutajate haldus — õigused |
| Roll | piiratud õigustega kasutaja |
| Spec | `users.spec.ts:230` |
| Tulemus | **läbis** (1.1 s) |

## TL-GRP Kasutajagruppide haldus

Spec: `tests/playwright/tests/user-groups.spec.ts` · seotud nõuded: PA-10…PA-19, KH-09…KH-12

### TL-GRP-01 nimekiri ja otsing

| | |
|---|---|
| Rühm | Kasutajagruppide haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `user-groups.spec.ts:60` |
| Tulemus | **läbis** (1.7 s) |

Sammud ja oodatav tulemus:

1. ava kasutajagruppide nimekiri
2. otsi gruppi nime järgi
3. ava grupi detailvaade

### TL-GRP-02 loomise vorm valideerib nime ja asutuse ning tühistamine küsib kinnitust

| | |
|---|---|
| Rühm | Kasutajagruppide haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `user-groups.spec.ts:81` |
| Tulemus | **läbis** (0.7 s) |

Sammud ja oodatav tulemus:

1. tühja vormi salvestamine näitab vigu
2. tühista → kinnitusmodaal → "Ei" jääb lehele
3. tühista → "Jah" viib nimekirja

### TL-GRP-03 grupi loomine, ümbernimetamine, asutuste ja õiguste muutmine

| | |
|---|---|
| Rühm | Kasutajagruppide haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `user-groups.spec.ts:105` |
| Tulemus | **läbis** (4.9 s) |

Sammud ja oodatav tulemus:

1. loo grupp asutusega PPA ja ühe õigusega
2. nimeta grupp ümber
3. lisa grupile teine asutus (JUM)
4. lisa grupile veel üks õigus
5. muudetud nimi on nimekirjas otsitav

### TL-GRP-04 kasutaja lisamine gruppi ja eemaldamine grupist

| | |
|---|---|
| Rühm | Kasutajagruppide haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `user-groups.spec.ts:156` |
| Tulemus | **läbis** (3.2 s) |

Sammud ja oodatav tulemus:

1. lisa gruppi ametnik Mari Tamm
2. eemalda kasutaja grupist (kinnitusmodaal)

### TL-GRP-05 ametnik ei pääse kasutajagruppide lehele

| | |
|---|---|
| Rühm | Kasutajagruppide haldus — õigused |
| Roll | piiratud õigustega kasutaja |
| Spec | `user-groups.spec.ts:183` |
| Tulemus | **läbis** (1.1 s) |

## TL-KLF Klassifikaatorite haldus

Spec: `tests/playwright/tests/classifiers.spec.ts` · seotud nõuded: PK-01…PK-08

### TL-KLF-01 nimekiri, otsing ja detailvaade

| | |
|---|---|
| Rühm | Klassifikaatorite haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `classifiers.spec.ts:37` |
| Tulemus | **läbis** (1.4 s) |

Sammud ja oodatav tulemus:

1. ava klassifikaatorite nimekiri
2. otsing koodi järgi kitsendab tulemusi
3. ava TEST klassifikaator — väärtuste tabel kuvatakse

### TL-KLF-02 "Kuva ainult kehtivad väärtused" peidab lõpetatud väärtuse

| | |
|---|---|
| Rühm | Klassifikaatorite haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `classifiers.spec.ts:55` |
| Tulemus | **läbis** (0.7 s) |

Sammud ja oodatav tulemus:

1. vaikimisi on aegunud VALUE_C peidetud
2. filtri eemaldamisel kuvatakse VALUE_C olekuga "Lõpetatud"

### TL-KLF-03 klassifikaatori selgituse muutmine

| | |
|---|---|
| Rühm | Klassifikaatorite haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `classifiers.spec.ts:70` |
| Tulemus | **läbis** (1.0 s) |

Sammud ja oodatav tulemus:

1. muuda selgitust ja salvesta
2. teade ja uus selgitus kuvatakse

### TL-KLF-04 väärtuse lisamine, duplikaadi kontroll ja kehtivuse lõpetamine

| | |
|---|---|
| Rühm | Klassifikaatorite haldus — peakasutaja |
| Roll | peakasutaja (Super Admin) |
| Spec | `classifiers.spec.ts:84` |
| Tulemus | **läbis** (4.4 s) |

Sammud ja oodatav tulemus:

1. lisa uus väärtus
2. sama koodiga väärtust ei saa teist korda lisada
3. lõpeta väärtuse kehtivus (kood ja nimetus pole muudetavad)
4. lõpetatud väärtus kaob kehtivate vaatest

### TL-KLF-05 kehtivuse lõpp, mis võrdub algusega, annab veateate (muudatust ei teatata õnnestunuks)

| | |
|---|---|
| Rühm | Klassifikaatorite haldus — kehtivusperioodi valideerimine |
| Roll | peakasutaja (Super Admin) |
| Spec | `classifiers.spec.ts:139` |
| Tulemus | **läbis** (2.0 s) |

Sammud ja oodatav tulemus:

1. sea kehtivuse lõpp võrdseks algusega ja salvesta
2. kasutajale kuvatakse viga, mitte "Klassifikaatori väärtus on muudetud"

### TL-KLF-06 ametnik ei pääse klassifikaatorite nimekirja

| | |
|---|---|
| Rühm | Klassifikaatorite haldus — õigused |
| Roll | piiratud õigustega kasutaja |
| Spec | `classifiers.spec.ts:165` |
| Tulemus | **läbis** (1.2 s) |

## TL-RSK Riskitasemed

Spec: `tests/playwright/tests/risk-scores.spec.ts` · seotud nõuded: N-RISK-01, N-RISK-02

### TL-RSK-01 nimekiri kuvab arvutatud riskitasemed

| | |
|---|---|
| Rühm | Riskitasemed |
| Roll | peakasutaja (Super Admin) |
| Spec | `risk-scores.spec.ts:38` |
| Tulemus | **läbis** (1.2 s) |

Sammud ja oodatav tulemus:

1. kõik neli testettevõtet on tabelis
2. Punane ettevõte kannab märget "Punane"

### TL-RSK-02 filtrid: ettevõtja nimi, registrikood ja riskitase; "Tühjenda" lähtestab

| | |
|---|---|
| Rühm | Riskitasemed |
| Roll | peakasutaja (Super Admin) |
| Spec | `risk-scores.spec.ts:50` |
| Tulemus | **läbis** (1.2 s) |

Sammud ja oodatav tulemus:

1. ettevõtja nime järgi "Nullpunkt"
2. "Tühjenda" taastab täisnimekirja
3. registrikoodi järgi 90000006 → Kollane
4. riskitaseme järgi "Kontrollimata" → ainult Valistatud

### TL-RSK-03 ametnik ei näe menüükirjet ega pääse lehele

| | |
|---|---|
| Rühm | Riskitasemed — õigused |
| Roll | piiratud õigustega kasutaja |
| Spec | `risk-scores.spec.ts:87` |
| Tulemus | **läbis** (1.2 s) |

## TL-TEA Teavitused ja saadetud kirjad

Spec: `tests/playwright/tests/notifications.spec.ts` · seotud nõuded: N-TEA-01…N-TEA-04

### TL-TEA-01 lugemata teavituse märkimine loetuks ja kella loendur

| | |
|---|---|
| Rühm | Rakendusesisesed teavitused |
| Roll | peakasutaja (Super Admin) |
| Spec | `notifications.spec.ts:46` |
| Tulemus | **läbis** (0.7 s) |

Sammud ja oodatav tulemus:

1. kellal on lugemata teavituste arv
2. teavitus A on märgitud "Lugemata"
3. "Märgi loetuks" eemaldab märke ja vähendab loendurit

### TL-TEA-02 "Märgi kõik loetuks" märgib kõik teavitused loetuks

| | |
|---|---|
| Rühm | Rakendusesisesed teavitused |
| Roll | peakasutaja (Super Admin) |
| Spec | `notifications.spec.ts:75` |
| Tulemus | **läbis** (0.9 s) |

Sammud ja oodatav tulemus:

1. vajuta "Märgi kõik loetuks"
2. ühtegi "Lugemata" märget ei jää ja kell on ilma loendurita

### TL-TEA-03 filtrid ja saatmise raport

| | |
|---|---|
| Rühm | Saadetud kirjad (väljuvate teavituste logi) |
| Roll | peakasutaja (Super Admin) |
| Spec | `notifications.spec.ts:102` |
| Tulemus | **läbis** (1.2 s) |

Sammud ja oodatav tulemus:

1. filtreeri teavituse tunnuse ja staatuse "Viga" järgi
2. olematu tunnus annab tühja tulemuse
3. "Tühista filtrid" lähtestab filtrid
4. "Saatmise raport" näitab saaja andmeid

### TL-TEA-04 vigase kirja uuesti saatmine lisab logisse uue rea

| | |
|---|---|
| Rühm | Saadetud kirjad (väljuvate teavituste logi) |
| Roll | peakasutaja (Super Admin) |
| Spec | `notifications.spec.ts:139` |
| Tulemus | **läbis** (1.6 s) |

Sammud ja oodatav tulemus:

1. "Saada uuesti" + kinnitusdialoog
2. samale adressaadile on logis nüüd kaks rida

### TL-TEA-05 ametnik näeb oma teavitusi, kuid mitte "Saadetud kirjad" sakki

| | |
|---|---|
| Rühm | Teavitused — õigused |
| Roll | piiratud õigustega kasutaja |
| Spec | `notifications.spec.ts:165` |
| Tulemus | **läbis** (0.4 s) |

## TL-PKM Postkasti mallide ja vastuvõtjate seaded

Spec: `tests/playwright/tests/notification-template-mapping.spec.ts` · seotud nõuded: N-TEA-05

### TL-PKM-01 desktop-kanali saaja lisamine ja eemaldamine

| | |
|---|---|
| Rühm | Postkasti mallide ja vastuvõtjate seaded — desktop saajad |
| Roll | peakasutaja (Super Admin) |
| Spec | `notification-template-mapping.spec.ts:36` |
| Tulemus | **läbis** (0.9 s) |

### TL-PKM-02 õigusteta kasutaja ei näe menüükirjet ega pääse otse lehele

| | |
|---|---|
| Rühm | Postkasti mallide ja vastuvõtjate seaded — desktop saajad |
| Roll | piiratud õigustega kasutaja |
| Spec | `notification-template-mapping.spec.ts:70` |
| Tulemus | **läbis** (1.9 s) |

## TL-AUD Auditilogi

Spec: `tests/playwright/tests/audit-logs.spec.ts` · seotud nõuded: N-AUD-01…N-AUD-04

### TL-AUD-01 otsing ja auditikirje detailvaade

| | |
|---|---|
| Rühm | Auditilogi |
| Roll | peakasutaja (Super Admin) |
| Spec | `audit-logs.spec.ts:36` |
| Tulemus | **läbis** (0.8 s) |

Sammud ja oodatav tulemus:

1. otsing markeri järgi leiab kõik kolm kirjet
2. ava kirje detailvaade

### TL-AUD-02 CSV eksport laadib alla semikooloniga eraldatud faili

| | |
|---|---|
| Rühm | Auditilogi |
| Roll | peakasutaja (Super Admin) |
| Spec | `audit-logs.spec.ts:56` |
| Tulemus | **läbis** (0.7 s) |

Sammud ja oodatav tulemus:

1. vajuta "Ekspordi CSV"
2. failinimi ja sisu vastavad ootusele

### TL-AUD-03 auditiahela terviklikkuse kontroll (API): peakasutaja 200, kohalik admin 403

| | |
|---|---|
| Rühm | Auditilogi |
| Roll | lokaalne kontohaldur (Org Admin, JUM) |
| Spec | `audit-logs.spec.ts:77` |
| Tulemus | **läbis** (0.0 s) |

Sammud ja oodatav tulemus:

1. Super Admin (audit.verify) saab kontrolli tulemuse
2. Org Admin (ainult audit.read.local) saab 403

### TL-AUD-04 ametnik ei näe menüükirjet ega pääse logide lehele

| | |
|---|---|
| Rühm | Auditilogi — asutusepõhine ulatus ja õigused |
| Roll | piiratud õigustega kasutaja |
| Spec | `audit-logs.spec.ts:105` |
| Tulemus | **läbis** (1.2 s) |

### TL-AUD-05 näeb ainult oma asutuse (JUM) auditikirjeid

| | |
|---|---|
| Rühm | Auditilogi — asutusepõhine ulatus ja õigused › lokaalne kontohaldur |
| Roll | lokaalne kontohaldur (Org Admin, JUM) |
| Spec | `audit-logs.spec.ts:94` |
| Tulemus | **läbis** (0.6 s) |

## TL-OTS Vormiotsing

Spec: `tests/playwright/tests/form-search.spec.ts` · seotud nõuded: N-OTS-01…N-OTS-04 (LJVIS2-9)

### TL-OTS-01 otsing sõiduki reg-nr, registrikoodi ja ettevõtte nime järgi

| | |
|---|---|
| Rühm | Vormiotsing |
| Roll | peakasutaja (Super Admin) |
| Spec | `form-search.spec.ts:62` |
| Tulemus | **läbis** (0.9 s) |

Sammud ja oodatav tulemus:

1. sõiduki registreerimismärgi järgi
2. "Tühjenda" lähtestab filtrid
3. ettevõtte registrikoodi järgi
4. ettevõtte nime järgi

### TL-OTS-02 filtrid: vormi tüüp, staatus ja kontrolli kuupäev kitsendavad tulemust

| | |
|---|---|
| Rühm | Vormiotsing |
| Roll | peakasutaja (Super Admin) |
| Spec | `form-search.spec.ts:93` |
| Tulemus | **läbis** (2.4 s) |

Sammud ja oodatav tulemus:

1. vormi tüüp "Koondvorm" + staatus "Salvestatud" → vorm leitakse
2. staatus "Avalikustatud" → vormi ei leita
3. kuupäevavahemik, mis sisaldab 01.02.2026 → vorm leitakse
4. kuupäevavahemik pärast kontrolli kuupäeva → vormi ei leita
5. vormi tüüp "Hea maine" → koondvormi ei leita

### TL-OTS-03 välisriigi kontrollkaardi filtrid ilmuvad ainult selle vormi tüübi korral

| | |
|---|---|
| Rühm | Vormiotsing |
| Roll | peakasutaja (Super Admin) |
| Spec | `form-search.spec.ts:135` |
| Tulemus | **läbis** (0.5 s) |

Sammud ja oodatav tulemus:

1. vaikimisi VR-filtreid pole
2. vormi tüüp "Välisriigi kontrollkaart" → VR-filtrid kuvatakse

### TL-OTS-04 "Vaata" avab leitud vormi

| | |
|---|---|
| Rühm | Vormiotsing |
| Roll | peakasutaja (Super Admin) |
| Spec | `form-search.spec.ts:148` |
| Tulemus | **läbis** (0.6 s) |

### TL-OTS-05 ainult välisriigi kontrollkaardi lugemisõigusega kasutaja ei näe koondvorme

| | |
|---|---|
| Rühm | Vormiotsing — õigused |
| Roll | piiratud õigustega kasutaja |
| Spec | `form-search.spec.ts:162` |
| Tulemus | **läbis** (0.7 s) |

## TL-XTL X-tee logid (haldus)

Spec: `tests/playwright/tests/xroad-etoimik-logs.spec.ts` · seotud nõuded: N-XTEE-10, N-XTEE-11

### TL-XTL-01 vaikefilter näitab eile-täna kirjeid, vanem kirje ei ole nähtav

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | peakasutaja (Super Admin) |
| Spec | `xroad-etoimik-logs.spec.ts:31` |
| Tulemus | **läbis** (1.2 s) |

### TL-XTL-02 "Kõik" checkbox eemaldamine tühjendab tabeli, tagasi märkimine taastab

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | peakasutaja (Super Admin) |
| Spec | `xroad-etoimik-logs.spec.ts:44` |
| Tulemus | **läbis** (0.8 s) |

### TL-XTL-03 ühe staatuse eemaldamine peidab vastavad read ja "Kõik" muutub märkimata

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | peakasutaja (Super Admin) |
| Spec | `xroad-etoimik-logs.spec.ts:60` |
| Tulemus | **läbis** (0.8 s) |

### TL-XTL-04 "Vaata päringut" avab modaali väljuva päringu sisuga

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | peakasutaja (Super Admin) |
| Spec | `xroad-etoimik-logs.spec.ts:76` |
| Tulemus | **läbis** (0.5 s) |

### TL-XTL-05 "Vaata vastust" avab modaali saabunud vastuse sisuga

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | peakasutaja (Super Admin) |
| Spec | `xroad-etoimik-logs.spec.ts:86` |
| Tulemus | **läbis** (0.7 s) |

### TL-XTL-06 vormi veeru link vastab compound-vormi URL-mustrile

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | peakasutaja (Super Admin) |
| Spec | `xroad-etoimik-logs.spec.ts:96` |
| Tulemus | **läbis** (1.2 s) |

### TL-XTL-07 kuupäevafilter: 10 päeva tagune vahemik näitab ainult vanemat kirjet

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | peakasutaja (Super Admin) |
| Spec | `xroad-etoimik-logs.spec.ts:109` |
| Tulemus | **läbis** (1.2 s) |

Sammud ja oodatav tulemus:

1. sea vahemik 11…9 päeva tagasi ja otsi
2. tulemuseks on ainult VT-006

### TL-XTL-08 vaate lüliti "kõiki" näitab ka teiste X-tee teenuste päringuid (RR)

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | peakasutaja (Super Admin) |
| Spec | `xroad-etoimik-logs.spec.ts:139` |
| Tulemus | **läbis** (0.8 s) |

Sammud ja oodatav tulemus:

1. tee rahvastikuregistri päring (kirjutab X-tee integratsioonilogi)
2. vaikimisi e-toimiku vaade: "Teenus" veergu pole
3. lülita "kõiki" — lisandub "Teenus" veerg ja RR päring
4. tagasi e-toimiku vaatesse

### TL-XTL-09 õigusteta kasutaja ei näe menüükirjet ega pääse otse lehele

| | |
|---|---|
| Rühm | E-toimiku X-tee logid |
| Roll | piiratud õigustega kasutaja |
| Spec | `xroad-etoimik-logs.spec.ts:168` |
| Tulemus | **läbis** (1.1 s) |

## TL-XTP X-tee pakutavad teenused

Spec: `tests/playwright/tests/xtee-teenused.spec.ts` · seotud nõuded: N-XTEE-01…N-XTEE-09

### TL-XTP-01 1. IsikuKontroll

| | |
|---|---|
| Rühm | X-tee pakutavad teenused |
| Roll | X-tee klient (turvaserver, X-Road-Client päis) |
| Spec | `xtee-teenused.spec.ts:69` |
| Tulemus | **läbis** (0.0 s) |

Sammud ja oodatav tulemus:

1. puuduv X-Road-Client päis → 403
2. vale kujuga X-Road-Client (3 osa) → 403
3. puuduv isikukood → 400
4. vale kujuga isikukood → 400
5. kehtiv päring → 200, vastuses kontrollid.item massiiv

### TL-XTP-02 2. IsikuEttevoteKontrollid

| | |
|---|---|
| Rühm | X-tee pakutavad teenused |
| Roll | X-tee klient (turvaserver, X-Road-Client päis) |
| Spec | `xtee-teenused.spec.ts:85` |
| Tulemus | **läbis** (0.0 s) |

Sammud ja oodatav tulemus:

1. puuduv X-Road-Client päis → 403
2. vale kujuga X-Road-Client (3 osa) → 403
3. vale kujuga isikukood → 400
4. kehtiv päring → 200, vastuses kontrollid.item massiiv

### TL-XTP-03 3. ErakorralineYVquery

| | |
|---|---|
| Rühm | X-tee pakutavad teenused |
| Roll | X-tee klient (turvaserver, X-Road-Client päis) |
| Spec | `xtee-teenused.spec.ts:98` |
| Tulemus | **läbis** (0.0 s) |

Sammud ja oodatav tulemus:

1. puuduv X-Road-Client päis → 403
2. vale kujuga X-Road-Client (3 osa) → 403
3. puuduv "alates" → 400
4. alates > kuni → 400
5. kehtiv päring → 200, vastuses targeted_for_inspection.item massiiv

### TL-XTP-04 4. ErakorralineYVconfirm

| | |
|---|---|
| Rühm | X-tee pakutavad teenused |
| Roll | X-tee klient (turvaserver, X-Road-Client päis) |
| Spec | `xtee-teenused.spec.ts:114` |
| Tulemus | **läbis** (0.0 s) |

Sammud ja oodatav tulemus:

1. puuduv X-Road-Client päis → 403
2. vale kujuga X-Road-Client (3 osa) → 403
3. tühi confirmed.item → 400
4. lubamatu code väärtus → 400
5. tundmatu inspection_id → 404

### TL-XTP-05 5. RegisterJobInspection (v1) — registreerimine ja idempotentsus

| | |
|---|---|
| Rühm | X-tee pakutavad teenused |
| Roll | X-tee klient (turvaserver, X-Road-Client päis) |
| Spec | `xtee-teenused.spec.ts:129` |
| Tulemus | **läbis** (0.0 s) |

Sammud ja oodatav tulemus:

1. puuduv X-Road-Client päis → 403
2. vale kujuga X-Road-Client (3 osa) → 403
3. vale kontrolli_kp → 400
4. kõik kohustuslikud väljad → 200
5. korduspäring sama kontrolli_id-ga → 200 (idempotentne)

### TL-XTP-06 6. RegisterJobInspection_v3 — v3 väljad ja valideerimine

| | |
|---|---|
| Rühm | X-tee pakutavad teenused |
| Roll | X-tee klient (turvaserver, X-Road-Client päis) |
| Spec | `xtee-teenused.spec.ts:154` |
| Tulemus | **läbis** (0.0 s) |

Sammud ja oodatav tulemus:

1. puuduv X-Road-Client päis → 403
2. vale kujuga X-Road-Client (3 osa) → 403
3. vale juhi_isikukood → 400
4. vale menetluse_liik → 400
5. kõik v3 väljad → 200

### TL-XTP-07 7–9. findUsage (Andmejälgija): heartbeat, usagePeriod, findUsage

| | |
|---|---|
| Rühm | X-tee pakutavad teenused |
| Roll | X-tee klient (turvaserver, X-Road-Client päis) |
| Spec | `xtee-teenused.spec.ts:186` |
| Tulemus | **läbis** (0.0 s) |

Sammud ja oodatav tulemus:

1. /v2/heartbeat → 200, status OK
2. /v2/usagePeriod → 200, periodStart on RFC 3339 aeg
3. /v2/findUsage ilma X-Road-UserId päiseta → 400
4. /v2/findUsage ilma userCode-ta → 400
5. /v2/findUsage vale limit → 400
6. /v2/findUsage kehtiv päring → 200, totalUsages + usages[]

## TL-KON Koondvorm

Spec: `tests/playwright/tests/compound-form.spec.ts` · seotud nõuded: N-KON-01…N-KON-05 (#280)

### TL-KON-01 tühja vormi esitamisel kuvatakse kohustuslike väljade vead

| | |
|---|---|
| Rühm | Koondvorm — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:27` |
| Tulemus | **läbis** (0.5 s) |

Sammud ja oodatav tulemus:

1. ava uus koondvorm
2. vajuta Salvesta ilma väljadeta
3. kohustuslike väljade vead on nähtavad
4. vormi ei salvestatud (URL ei muutunud)

### TL-KON-02 maantee valimisel muutub kilomeeter kohustuslikuks

| | |
|---|---|
| Rühm | Koondvorm — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:58` |
| Tulemus | **läbis** (0.9 s) |

Sammud ja oodatav tulemus:

1. vali maantee
2. salvesta ilma kilomeetrita → viga

### TL-KON-03 ettevõtte nime sisestamisel muutub riik kohustuslikuks

| | |
|---|---|
| Rühm | Koondvorm — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:72` |
| Tulemus | **läbis** (2.5 s) |

### TL-KON-04 sõiduki kategooria "Muu" nõuab täpsustust

| | |
|---|---|
| Rühm | Koondvorm — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:81` |
| Tulemus | **läbis** (0.8 s) |

Sammud ja oodatav tulemus:

1. vali kategooria "Muu"
2. täpsustuse väli ilmub
3. salvesta tühja täpsustusega → viga

### TL-KON-05 aadress ei tohi ületada 300 tähemärki

| | |
|---|---|
| Rühm | Koondvorm — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:95` |
| Tulemus | **läbis** (0.4 s) |

### TL-KON-06 täidetud üldosa ja autojuhi vorm salvestuvad ning kinnitamine on saadaval

| | |
|---|---|
| Rühm | Koondvorm — salvestamine |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:103` |
| Tulemus | **läbis** (4.8 s) |

### TL-KON-07 miinimumväljadega koondvorm salvestub ja väärtused püsivad

| | |
|---|---|
| Rühm | Koondvorm — salvestamine |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:133` |
| Tulemus | **läbis** (6.2 s) |

Sammud ja oodatav tulemus:

1. ava ja täida miinimumväljad
2. salvesta
3. lae vaade uuesti — sisestatud andmed on alles

### TL-KON-08 P2: kategooriad (e) M2 ja (f) M3 — sulgudes selgitus ei murra ridu

| | |
|---|---|
| Rühm | Koondvorm — #280 muudatused |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:172` |
| Tulemus | **läbis** (1.3 s) |

### TL-KON-09 P2: "Muu" täpsustusväli on "Muu" raadionupu vahetus läheduses

| | |
|---|---|
| Rühm | Koondvorm — #280 muudatused |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:188` |
| Tulemus | **läbis** (0.6 s) |

### TL-KON-10 P4: ettevõtte nime otsing kuvab "ei leitud" (X-tee mock)

| | |
|---|---|
| Rühm | Koondvorm — #280 muudatused |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:204` |
| Tulemus | **läbis** (1.9 s) |

### TL-KON-11 liiklusregistri otsing ja haagise tehnovorm ei vii üldosast ära

| | |
|---|---|
| Rühm | Koondvorm — PPA kasutusvoo parendused |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:221` |
| Tulemus | **läbis** (1.7 s) |

### TL-KON-12 saab koondvormi luua ja salvestada

| | |
|---|---|
| Rühm | Koondvorm — loomise õigus › ainult compound_form.write (ilma foreign_violation_form.write-ita) |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:251` |
| Tulemus | **läbis** (5.2 s) |

### TL-KON-13 näeb teadet „Teil puudub ligipääs sellele lehele"

| | |
|---|---|
| Rühm | Koondvorm — loomise õigus › ilma compound_form.write-ita |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:281` |
| Tulemus | **läbis** (0.3 s) |

### TL-KON-14 valitud vormide navigatsioon on nähtav ka alamvormi vahekaardil

| | |
|---|---|
| Rühm | Koondvorm — vormide navigatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-form.spec.ts:291` |
| Tulemus | **läbis** (0.4 s) |

## TL-ALV Koondvormi alamvormid ja failid

Spec: `tests/playwright/tests/compound-subforms.spec.ts` · seotud nõuded: N-KON-06, N-SP-01, N-FAIL-01

### TL-ALV-01 autojuhi sõidu-/puhkeaja alamvorm — veo liik ja kontrolli tulemus on kohustuslikud

| | |
|---|---|
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-subforms.spec.ts:15` |
| Tulemus | **läbis** (0.5 s) |

Sammud ja oodatav tulemus:

1. ava koondvorm autojuhi alamvormiga
2. vajuta Salvesta
3. veo liik ja kontrolli tulemus näitavad viga
4. koondvormi ei salvestatud

### TL-ALV-02 autojuhi sõidu-/puhkeaja alamvorm — sõidu- ja puhkeaja nõuete kontroll (rakendatakse/ei rakendata/ei kontrollitud) on kohustuslik

| | |
|---|---|
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-subforms.spec.ts:40` |
| Tulemus | **läbis** (0.6 s) |

Sammud ja oodatav tulemus:

1. ava koondvorm autojuhi alamvormiga
2. täida veo liik ja kontrolli tulemus, jäta rakendatavus valimata
3. vajuta Salvesta
4. sõidu- ja puhkeaja nõuete kontrolli viga on nähtav
5. koondvormi ei salvestatud

### TL-ALV-03 ADR alamvorm — koondvormi loomisvoos avaneb ja renderdab sisu

| | |
|---|---|
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-subforms.spec.ts:66` |
| Tulemus | **läbis** (0.4 s) |

### TL-ALV-04 sõiduki tehnoülevaatuse alamvorm — koondvormi loomisvoos avaneb

| | |
|---|---|
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-subforms.spec.ts:77` |
| Tulemus | **läbis** (0.3 s) |

### TL-ALV-05 PPA autojuhi vormil ei kuvata Transpordiameti liiniandmeid

| | |
|---|---|
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-subforms.spec.ts:86` |
| Tulemus | **läbis** (0.5 s) |

### TL-ALV-06 autojuhi veo liik ja veoklass kanduvad meeskonna liikme vormile

| | |
|---|---|
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-subforms.spec.ts:94` |
| Tulemus | **läbis** (0.8 s) |

### TL-ALV-07 sõidu- ja puhkeaja vormi faile saab lisada alles pärast esimest salvestamist

| | |
|---|---|
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-subforms.spec.ts:120` |
| Tulemus | **läbis** (0.5 s) |

### TL-ALV-08 sama numbriga autojuhi ja meeskonnaliikme vormi failid on eraldi

| | |
|---|---|
| Roll | peakasutaja (Super Admin) |
| Spec | `compound-subforms.spec.ts:131` |
| Tulemus | **läbis** (0.1 s) |

### TL-ALV-09 lugemisõiguseta kasutaja ei pääse uute vormide faililoendisse

| | |
|---|---|
| Rühm | Kontrollvormi failide lugemisõigused |
| Roll | piiratud õigustega kasutaja |
| Spec | `compound-subforms.spec.ts:147` |
| Tulemus | **läbis** (0.1 s) |

## TL-TRM Transpordiameti kontrollkaart (TRAM)

Spec: `tests/playwright/tests/tram-form.spec.ts` · seotud nõuded: N-TRAM-01…N-TRAM-06 (ADR-002, #280)

### TL-TRM-01 tühja vormi esitamisel kuvatakse kohustuslike väljade vead

| | |
|---|---|
| Rühm | TRAM kontrollkaart — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:26` |
| Tulemus | **läbis** (0.5 s) |

Sammud ja oodatav tulemus:

1. ava uus TRAM kaart
2. vajuta Salvesta
3. Üldosa kohustuslike väljade vead
4. juhi ees- ja perekonnanimi on kohustuslikud
5. URL ei muutunud

### TL-TRM-02 märkeruut eemaldab juhi nime ja sünniaja kohustuslikkuse

| | |
|---|---|
| Rühm | TRAM kontrollkaart — "Ei ole asjakohane" |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:60` |
| Tulemus | **läbis** (0.6 s) |

Sammud ja oodatav tulemus:

1. juhi nimeväljadel on kohustuslikkuse tärn
2. märgi "Ei ole asjakohane"
3. tärn kadus ees-/perekonnanimelt
4. salvestamisel ei nõuta juhi nime ega sünniaega

### TL-TRM-03 märgituna salvestub kaart ilma juhi nimeta

| | |
|---|---|
| Rühm | TRAM kontrollkaart — "Ei ole asjakohane" |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:100` |
| Tulemus | **läbis** (3.3 s) |

### TL-TRM-04 väljade DOM-järjekord: eesnimi → perekonnanimi → Eesti isikukood → nupp → välisriigi isikukood

| | |
|---|---|
| Rühm | TRAM kontrollkaart — juhi väljade järjekord + RR-otsing |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:120` |
| Tulemus | **läbis** (0.4 s) |

### TL-TRM-05 vigase Eesti isikukoodiga RR-otsing annab kliendipoolse vea (päringut ei tehta)

| | |
|---|---|
| Rühm | TRAM kontrollkaart — juhi väljade järjekord + RR-otsing |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:150` |
| Tulemus | **läbis** (1.9 s) |

### TL-TRM-06 sõidukijuhi sektsioon on samal vormil (ei ole eraldi vahekaart)

| | |
|---|---|
| Rühm | TRAM kontrollkaart — üks vorm, üks elutsükkel (ADR-002) |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:170` |
| Tulemus | **läbis** (0.4 s) |

### TL-TRM-07 Salvesta → Kinnita → Avalikusta

| | |
|---|---|
| Rühm | TRAM kontrollkaart — üks vorm, üks elutsükkel (ADR-002) |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:186` |
| Tulemus | **läbis** (6.9 s) |

Sammud ja oodatav tulemus:

1. loo + salvesta
2. Kinnita
3. Avalikusta

### TL-TRM-08 haagise pealkiri on "Haagis 1" ilma trellita

| | |
|---|---|
| Rühm | TRAM kontrollkaart — haagise pealkiri |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:222` |
| Tulemus | **läbis** (0.5 s) |

### TL-TRM-09 Veosevedu ja Sõitjatevedu raadionupud on nähtaval

| | |
|---|---|
| Rühm | TRAM kontrollkaart — veoliik (dok. jaotis „Veoliik") |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:235` |
| Tulemus | **läbis** (0.3 s) |

### TL-TRM-10 „Tühisõit" on eraldi märkeruut (mitte radio)

| | |
|---|---|
| Rühm | TRAM kontrollkaart — veoliik (dok. jaotis „Veoliik") |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:241` |
| Tulemus | **läbis** (0.3 s) |

### TL-TRM-11 „Sõitjatevedu" valimisel ilmuvad liini number ja liini nimetus

| | |
|---|---|
| Rühm | TRAM kontrollkaart — veoliik (dok. jaotis „Veoliik") |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:250` |
| Tulemus | **läbis** (0.5 s) |

Sammud ja oodatav tulemus:

1. vaikimisi Liini number ei ole nähtaval
2. vali Sõitjatevedu
3. Liini number ja Liini nimetus on nüüd nähtaval
4. Veosevedu valimisel peiduvad liini väljad uuesti

### TL-TRM-12 kõik kolm tulemust on nähtaval

| | |
|---|---|
| Rühm | TRAM kontrollkaart — kontrolli tulemus (dok. jaotis „Kontrolli tulemus ja menetlus") |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:279` |
| Tulemus | **läbis** (0.4 s) |

### TL-TRM-13 „Lisameede" ilmub ainult Hoiatus või Alustati puhul

| | |
|---|---|
| Rühm | TRAM kontrollkaart — kontrolli tulemus (dok. jaotis „Kontrolli tulemus ja menetlus") |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:292` |
| Tulemus | **läbis** (0.7 s) |

Sammud ja oodatav tulemus:

1. vaikimisi (Korras) Lisameede ei ole nähtaval
2. Hoiatus → Lisameede ilmub
3. Alustati → Lisameede jääb nähtavaks
4. Korras → Lisameede kaob

### TL-TRM-14 „Menetluse liik" ilmub ainult „Alustati väärteomenetlust" puhul

| | |
|---|---|
| Rühm | TRAM kontrollkaart — kontrolli tulemus (dok. jaotis „Kontrolli tulemus ja menetlus") |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:317` |
| Tulemus | **läbis** (0.6 s) |

Sammud ja oodatav tulemus:

1. vaikimisi Menetluse liik raadionupud ei ole nähtaval
2. Hoiatus ei näita menetluse liiki
3. Alustati → Menetluse liik raadionupud ilmuvad

### TL-TRM-15 salvestatud kaardil on vorminumber kujul tram-AAAA-NNNNN/versioon

| | |
|---|---|
| Rühm | TRAM kontrollkaart — vorminumber (dok. jaotis „Vorminumber") |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:344` |
| Tulemus | **läbis** (3.4 s) |

### TL-TRM-16 kinnitatud kaardil on väljad kirjutuskaitstud ja Kinnita nupp kadunud

| | |
|---|---|
| Rühm | TRAM kontrollkaart — vaatamisvaade (dok. jaotis „Vaatamisvaade") |
| Roll | peakasutaja (Super Admin) |
| Spec | `tram-form.spec.ts:374` |
| Tulemus | **läbis** (6.2 s) |

Sammud ja oodatav tulemus:

1. loo ja salvesta
2. kinnita
3. Kinnita nupp on kadunud
4. Avalikusta nupp on nähtaval
5. Salvesta nupp on kadunud (vaatamisvaade)
6. sõiduki registreerimismärk on kirjutuskaitstud

## TL-VRK Välisriigi kontrollkaart

Spec: `tests/playwright/tests/foreign-violation.spec.ts` · seotud nõuded: N-VR-01, N-VR-02

### TL-VRK-01 tühja vormi esitamisel kuvatakse kohustuslike väljade vead

| | |
|---|---|
| Rühm | Välisriigi rikkumine — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `foreign-violation.spec.ts:18` |
| Tulemus | **läbis** (0.6 s) |

Sammud ja oodatav tulemus:

1. ava vorm
2. vajuta Salvesta
3. kohustuslike väljade vead
4. vormi ei salvestatud

### TL-VRK-02 miinimumväljadega kaart salvestub

| | |
|---|---|
| Rühm | Välisriigi rikkumine — salvestamine |
| Roll | peakasutaja (Super Admin) |
| Spec | `foreign-violation.spec.ts:44` |
| Tulemus | **läbis** (1.6 s) |

## TL-TÖÖ Tööinspektsiooni kontrollkaart

Spec: `tests/playwright/tests/labour-inspection.spec.ts` · seotud nõuded: N-TI-01, N-TI-02

### TL-TÖÖ-01 tühja vormi esitamisel kuvatakse kohustuslike väljade vead

| | |
|---|---|
| Rühm | Tööinspektsiooni akt — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `labour-inspection.spec.ts:9` |
| Tulemus | **läbis** (0.4 s) |

Sammud ja oodatav tulemus:

1. ava vorm
2. vajuta Salvesta
3. kohustuslike väljade vead

### TL-TÖÖ-02 tulevikukuupäevaga akti ei salvestata

| | |
|---|---|
| Rühm | Tööinspektsiooni akt — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `labour-inspection.spec.ts:31` |
| Tulemus | **läbis** (2.2 s) |

### TL-TÖÖ-03 miinimumväljadega akt salvestub

| | |
|---|---|
| Rühm | Tööinspektsiooni akt — salvestamine |
| Roll | peakasutaja (Super Admin) |
| Spec | `labour-inspection.spec.ts:46` |
| Tulemus | **läbis** (1.0 s) |

## TL-HEA Hea maine vorm

Spec: `tests/playwright/tests/good-repute.spec.ts` · seotud nõuded: N-HM-01, N-HM-02

### TL-HEA-01 tühja vormi esitamisel kuvatakse kohustuslike väljade vead

| | |
|---|---|
| Rühm | Hea maine vorm — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `good-repute.spec.ts:14` |
| Tulemus | **läbis** (0.5 s) |

Sammud ja oodatav tulemus:

1. ava vorm
2. vajuta Salvesta
3. kohustuslike väljade vead
4. vormi ei salvestatud

### TL-HEA-02 sobimatuks tunnistamisel muutuvad perioodi väljad kohustuslikuks

| | |
|---|---|
| Rühm | Hea maine vorm — validatsioon |
| Roll | peakasutaja (Super Admin) |
| Spec | `good-repute.spec.ts:42` |
| Tulemus | **läbis** (0.4 s) |

Sammud ja oodatav tulemus:

1. vali "ei vasta nõuetele"
2. salvesta → perioodi viga

### TL-HEA-03 miinimumväljadega vorm salvestub

| | |
|---|---|
| Rühm | Hea maine vorm — salvestamine |
| Roll | peakasutaja (Super Admin) |
| Spec | `good-repute.spec.ts:57` |
| Tulemus | **läbis** (1.1 s) |

## TL-ADR Ohtlike veoste (ADR) alamvorm

Spec: `tests/playwright/tests/adr-form.spec.ts` · seotud nõuded: N-ADR-01, N-PRINT-01 (PR #310, #311)

### TL-ADR-01 ADR alamvorm salvestub ja kinnitatakse edukalt (PR #311 id-tüübi fix)

| | |
|---|---|
| Rühm | ADR alamvorm — kinnitamine |
| Roll | peakasutaja (Super Admin) |
| Spec | `adr-form.spec.ts:43` |
| Tulemus | **läbis** (7.5 s) |

Sammud ja oodatav tulemus:

1. loo koondvorm ADR alamvormiga
2. täida üldosa miinimumväljad
3. täida ADR alamvormi miinimumväljad
4. salvesta koondvorm
5. ava ADR vahekaart ja kinnita

### TL-ADR-02 uuel (salvestamata) koondvormil puudub ADR vahekaalil printimise nupp

| | |
|---|---|
| Rühm | ADR alamvorm — prindi nupp (PR #310) |
| Roll | peakasutaja (Super Admin) |
| Spec | `adr-form.spec.ts:113` |
| Tulemus | **läbis** (0.5 s) |

### TL-ADR-03 salvestatud ADR vormil on „Prindi" dropdown koos mõlema valikuga

| | |
|---|---|
| Rühm | ADR alamvorm — prindi nupp (PR #310) |
| Roll | peakasutaja (Super Admin) |
| Spec | `adr-form.spec.ts:127` |
| Tulemus | **läbis** (7.2 s) |

### TL-ADR-04 kinnitatud ADR vormil on „Prindi" dropdown vaatamisvaates

| | |
|---|---|
| Rühm | ADR alamvorm — prindi nupp (PR #310) |
| Roll | peakasutaja (Super Admin) |
| Spec | `adr-form.spec.ts:195` |
| Tulemus | **läbis** (6.7 s) |

## TL-PRT Vormide printimine

Spec: `tests/playwright/tests/print-buttons.spec.ts` · seotud nõuded: N-PRINT-01

### TL-PRT-01 salvestatud autojuhi SP alamvormil on „Prindi" dropdown kahe valikuga

| | |
|---|---|
| Rühm | Printimise nupud — autojuhi SP vorm |
| Roll | peakasutaja (Super Admin) |
| Spec | `print-buttons.spec.ts:70` |
| Tulemus | **läbis** (6.4 s) |

### TL-PRT-02 salvestatud meeskonnaliikme SP alamvormil on „Prindi" nupp

| | |
|---|---|
| Rühm | Printimise nupud — meeskonnaliikme SP vorm |
| Roll | peakasutaja (Super Admin) |
| Spec | `print-buttons.spec.ts:132` |
| Tulemus | **läbis** (6.0 s) |

### TL-PRT-03 salvestatud sõiduki tehnilise kontrollkaardil on „Prindi" nupp

| | |
|---|---|
| Rühm | Printimise nupud — sõiduki tehniline kontroll |
| Roll | peakasutaja (Super Admin) |
| Spec | `print-buttons.spec.ts:179` |
| Tulemus | **läbis** (6.5 s) |

### TL-PRT-04 salvestatud autoveo katkestamise alamvormil on „Prindi" nupp

| | |
|---|---|
| Rühm | Printimise nupud — autoveo katkestamine |
| Roll | peakasutaja (Super Admin) |
| Spec | `print-buttons.spec.ts:235` |
| Tulemus | **läbis** (6.0 s) |

## TL-ERU ERRU vormid (CTUD, CGR, RSI, NCR)

Spec: `tests/playwright/tests/erru.spec.ts` · seotud nõuded: N-ERRU-01…N-ERRU-04

### TL-ERU-01 leht avaneb ja renderdab vormi

| | |
|---|---|
| Rühm | ERRU CTUD (tegevusloa kontroll) |
| Roll | peakasutaja (Super Admin) |
| Spec | `erru.spec.ts:20` |
| Tulemus | **läbis** (0.4 s) |

### TL-ERU-02 tühja vormi esitamine ei salvesta ja kuvab valideerimisviteid

| | |
|---|---|
| Rühm | ERRU CTUD (tegevusloa kontroll) |
| Roll | peakasutaja (Super Admin) |
| Spec | `erru.spec.ts:32` |
| Tulemus | **läbis** (2.0 s) |

### TL-ERU-03 leht avaneb ja renderdab vormi

| | |
|---|---|
| Rühm | ERRU CGR (mainepäring) |
| Roll | peakasutaja (Super Admin) |
| Spec | `erru.spec.ts:20` |
| Tulemus | **läbis** (0.5 s) |

### TL-ERU-04 tühja vormi esitamine ei salvesta ja kuvab valideerimisviteid

| | |
|---|---|
| Rühm | ERRU CGR (mainepäring) |
| Roll | peakasutaja (Super Admin) |
| Spec | `erru.spec.ts:32` |
| Tulemus | **läbis** (2.0 s) |

### TL-ERU-05 leht avaneb ja renderdab vormi

| | |
|---|---|
| Rühm | ERRU RSI (tehnokontrolli teade) |
| Roll | peakasutaja (Super Admin) |
| Spec | `erru.spec.ts:20` |
| Tulemus | **läbis** (0.4 s) |

### TL-ERU-06 tühja vormi esitamine ei salvesta ja kuvab valideerimisviteid

| | |
|---|---|
| Rühm | ERRU RSI (tehnokontrolli teade) |
| Roll | peakasutaja (Super Admin) |
| Spec | `erru.spec.ts:32` |
| Tulemus | **läbis** (2.0 s) |

### TL-ERU-07 leht avaneb ja renderdab vormi

| | |
|---|---|
| Rühm | ERRU NCR (kontrollitulemuse teade) |
| Roll | peakasutaja (Super Admin) |
| Spec | `erru.spec.ts:20` |
| Tulemus | **läbis** (0.4 s) |

### TL-ERU-08 tühja vormi esitamine ei salvesta ja kuvab valideerimisviteid

| | |
|---|---|
| Rühm | ERRU NCR (kontrollitulemuse teade) |
| Roll | peakasutaja (Super Admin) |
| Spec | `erru.spec.ts:32` |
| Tulemus | **läbis** (2.0 s) |

## TL-RSI ERRU RSI teade

Spec: `tests/playwright/tests/rsi.spec.ts` · seotud nõuded: N-ERRU-03 (LJVIS2-148)

### TL-RSI-01 uus vorm kuvab 12 ERRU kontrollpunkti märkeruutudega

| | |
|---|---|
| Rühm | RSI teade |
| Roll | peakasutaja (Super Admin) |
| Spec | `rsi.spec.ts:6` |
| Tulemus | **läbis** (0.6 s) |

### TL-RSI-02 „Ei vasta nõuetele” avab põhjuste tabeli lubatud hinnangutega

| | |
|---|---|
| Rühm | RSI teade |
| Roll | peakasutaja (Super Admin) |
| Spec | `rsi.spec.ts:17` |
| Tulemus | **läbis** (0.7 s) |

### TL-RSI-03 RSI detailis kuvatakse printimise nupp ja print endpointi kasutatakse

| | |
|---|---|
| Rühm | RSI teade |
| Roll | peakasutaja (Super Admin) |
| Spec | `rsi.spec.ts:29` |
| Tulemus | **läbis** (0.4 s) |

## TL-NU ERRU NU sobimatusteade

Spec: `tests/playwright/tests/nu.spec.ts` · seotud nõuded: N-ERRU-05

### TL-NU-01 nimekiri kuvab NU teate ja avab detailvaate

| | |
|---|---|
| Rühm | NU sobimatusteated |
| Roll | peakasutaja (Super Admin) |
| Spec | `nu.spec.ts:47` |
| Tulemus | **läbis** (0.5 s) |

### TL-NU-02 aegunud vormiversioon kuvab konflikti ja saadab expectedVersion väärtuse

| | |
|---|---|
| Rühm | NU sobimatusteated |
| Roll | peakasutaja (Super Admin) |
| Spec | `nu.spec.ts:94` |
| Tulemus | **läbis** (0.5 s) |

