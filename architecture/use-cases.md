# LJVIS – Kasutuslood kasutajagruppide järgi

## Kasutajagrupid

| Grupp | Kirjeldus |
|-------|-----------|
| **Kodanik (avalik kasutaja)** | Autendib TARA kaudu, vaatab oma andmeid |
| **Inspektor** | Loob ja haldab kontrollivorme |
| **ERRU RR kasutaja** | Saadab rikkumisteated ERRU-sse |
| **ERRU Mainepäringu kasutaja** | Kontrollib vedaja head mainet |
| **ERRU Tegevusloa kontrolli kasutaja** | Kontrollib ühenduse tegevusluba |
| **ERRU Tehnokontrolli kasutaja** | Haldab teekontrolli teateid |
| **Statistikakasutaja** | Vaatab ja ekspordib statistikat |
| **Kohaliku asutuse administraator** | Haldab oma asutuse kasutajaid |
| **Süsteemiadministraator** | Täielik süsteemihaldus |
| **Välissüsteem (X-tee)** | Masinliidese päringud X-tee kaudu |
| **BgService (automatiseeritud)** | Taustaprotsessid, ei ole inimkasutaja |

---

## 1. Kodanik (avalik kasutaja)

> Autendib TARA OAuth-ga. Ei vaja DB kasutajakontot. Näeb ainult oma andmeid.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| K-01 | Sisselogimine TARA kaudu | Autendib end ID-kaardi või Mobiil-ID abil |
| K-02 | Keele vahetamine | Vahetab rakenduse kuvakeelt |
| K-03 | Väljalogmine | Lõpetab seansi |
| K-04 | Oma kontrollide vaatamine | Näeb enda kohta tehtud kontrollivormide kokkuvõtet |
| K-05 | Oma seotud ettevõtete vaatamine | Näeb, milliste ettevõtetega on seotud |
| K-06 | Oma rikkumiste vaatamine | Näeb enda rikkumiste ajalugu |

---

## 2. Inspektor

> Sisselogitud kasutaja, kellel on üks või mitu vormitüübi rolli. Loob ja haldab kontrollivorme.

### 2a. Üldised otsingu- ja vaatamise kasutuslood

| # | Kasutuslugu | Vajalik roll |
|---|-------------|--------------|
| I-01 | Isiku otsimine | `SearchPerson` |
| I-02 | Ettevõtte otsimine | `SearchCompany` |
| I-03 | Sõiduki otsimine | `SearchVehicle` |
| I-04 | Kontrollide otsimine | `SearchControls` |
| I-05 | Vormide otsimine | `SearchForms` |
| I-06 | Vormide otsimine koodi järgi | `SearchFormsByCode` |
| I-07 | Rikkumiste vaatamine ettevõtte järgi | `SearchViolationsByCompany` |
| I-08 | Rikkumiste vaatamine isiku järgi | `SearchViolationsByPerson` |
| I-09 | Ettevõtte rikkumised isiku järgi | `SearchCompanyViolationsByPerson` |
| I-10 | Eri-ülevaatusele saadetud sõidukid | `SearchSentToSpecialInspectionVehicles` |
| I-11 | Välisvedajate rikkumised | `ForeignCarriersViolationsSearch` |
| I-12 | Isiku andmete vaatamine | Autenditud kasutaja |
| I-13 | Ettevõtte andmete vaatamine | Autenditud kasutaja |
| I-14 | Sõiduki andmete vaatamine | Autenditud kasutaja |
| I-15 | Armatuurlaua vaatamine | Autenditud kasutaja |
| I-16 | Viimaste tehingute vaatamine | Autenditud kasutaja |

### 2b. X-tee päringud (reaalajas andmeotsing)

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| I-17 | Isiku otsimine X-tee kaudu | Pärib rahvastikuregistrist või muust allikast |
| I-18 | Ettevõtte otsimine X-tee kaudu | Pärib äriregistrist |
| I-19 | Riikide lühikoodide laadimine | Abiväärtused vormi täitmiseks |

### 2c. Kontrollivormid – maanteekontroll

| # | Kasutuslugu | Vajalik roll |
|---|-------------|--------------|
| I-20 | Teeäärse kontrollikaardi loomine | `RoadControlCard` |
| I-21 | Teeäärse kontrollikaardi (2012) loomine | `RoadControlCard2012` |
| I-22 | Ohtliku veo vormi loomine | `DangerousDelivery` |
| I-23 | Ohtliku veo vormi (2012) loomine | `DangerousDelivery2012` |
| I-24 | Välismaalase rikkumise vormi loomine | `ForeignViolate` |
| I-25 | Veovahendi tehnoülevaatuse vormi loomine | `Roadworthiness` |
| I-26 | Tehnoülevaatuse vormi (2012) loomine | `Roadworthiness2012` |
| I-27 | Kütusevõtuki vormi loomine | `FuelSample` |
| I-28 | Transpordi peatamise vormi loomine | `TransportInterruption` |
| I-29 | Vormi salvestamine mustandina | Sama roll kui loomine |
| I-30 | Vormi kinnitamine | Sama roll kui loomine |
| I-31 | Vormi redigeerimine (enda loodud) | `EditOwnData` |
| I-32 | Vormi kustutamine (enda loodud) | `DeleteOwnData` |
| I-33 | Vormi redigeerimine (oma asutus) | `EditOwnEstablishmentData` |
| I-34 | Vormi kustutamine (oma asutus) | `DeleteOwnEstablishmentData` |
| I-35 | Vormi suunamine teisele kasutajale | `AllowControlFormRedirecting` |
| I-36 | Haldusmenetluse sektsiooni uuendamine | `AllowUpdateControlFormAdministrativeProcedureSection` |
| I-37 | Dokumendikontrolli vormi loomine/vaatamine | Forms area |
| I-38 | Kiirusmõõtja vormi loomine | Forms area |

### 2d. Töökontroll (JobInspection)

| # | Kasutuslugu | Vajalik roll |
|---|-------------|--------------|
| I-39 | Töökontrolli vormi loomine | `JobInspection` |
| I-40 | Töökontrolli vormi redigeerimine | `JobInspection` |
| I-41 | Töökontrollide otsimine ja filtreerimine | `JobInspection` |
| I-42 | Töökontrolli menetluse andmete vaatamine | `JobInspection` |

### 2e. Hea maine kontroll (Good Repute)

| # | Kasutuslugu | Vajalik roll |
|---|-------------|--------------|
| I-43 | Hea maine kontrolli vormi loomine | `GoodRepute` |

### 2f. Riskihinnang

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| I-44 | Riskihinnangu vaatamine | Autenditud kasutaja |
| I-45 | Riskihinnangu eksportimine Excelisse | Autenditud kasutaja |

### 2g. Arhiiv

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| I-46 | Arhiivi sirvamine ja otsimine | Autenditud kasutaja |
| I-47 | Arhiivianalüüsi loomine | Autenditud kasutaja |

---

## 3. ERRU RR kasutaja (rikkumisteated)

> Grupp `ROLE_GROUP_ERRU_INF`. Haldab rikkumisteateid ERRU süsteemiga.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| E1-01 | Rikkumisteadete loendi vaatamine | Kõik sissetulevad/väljaminevad teated |
| E1-02 | Rikkumisteadete otsimine | Filtreerimine kuupäeva, ettevõtte jms järgi |
| E1-03 | MS→ERRU rikkumisteate loomine | Saadab rikkumisteate ERRU-sse |
| E1-04 | Rikkumisteate esitamine | Kinnitab ja saadab teate |
| E1-05 | Olemasoleva rikkumisteate laadimine | Vaatab/muudab eelnevalt loodud teadet |

---

## 4. ERRU Mainepäringu kasutaja (CheckGoodRepute)

> Grupp `ROLE_GROUP_ERRU_CGR`. Kontrollib vedajate head mainet ERRU kaudu.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| E2-01 | Mainepäringu sõnumi loomine | Algatab hea maine kontrollpäringu |
| E2-02 | Mainepäringute loendi vaatamine | Näeb kõiki päringuid ja nende staatuseid |
| E2-03 | Mainepäringu vastuse vaatamine | Näeb ERRU vastust |

---

## 5. ERRU Tegevusloa kontrolli kasutaja (CheckCommunityLicence)

> Grupp `ROLE_GROUP_ERRU_CCL`. Kontrollib ühenduse tegevuslube.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| E3-01 | Tegevusloa kontrollpäringu loomine | Algatab tegevusloa kontrolli |
| E3-02 | Tegevusloa teadete loend | Vaatab kõiki päringuid |
| E3-03 | Tegevusloa teadete otsimine | Filtreerimine |
| E3-04 | Tegevusloa kontrollvastuse vaatamine | Näeb ERRU vastust |

---

## 6. ERRU Teknokontrolli kasutaja (RoadSideInspection)

> Grupp `ROLE_GROUP_ERRU_RSI`. Haldab teekontrolli teateid ERRU-ga.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| E4-01 | Teekontrolli teadete loend | Kõik sissetulevad/väljaminevad teated |
| E4-02 | Teekontrolli teadete otsimine | Filtreerimine |
| E4-03 | Teekontrolli teate detailide vaatamine | Täpne info ühe teate kohta |
| E4-04 | Vastuse saabumise kontrollimine | Kontrollib, kas ERRU on vastanud |

---

## 7. Statistikakasutaja

> Grupp `ROLE_GROUP_STATISTICS`. Statistika eksporditööriistad.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| S-01 | Statistikaraporti vaatamine | Koondaruanne kontrollivormidest |
| S-02 | Statistika eksportimine Excelisse | Laadib alla tabeli |
| S-03 | CVS-i andmete vaatamine | Avab CVS-andmefaili |

---

## 8. Kohaliku asutuse administraator

> Roll `AdministrateOwnEstablishmentUsers`. Haldab kasutajaid ainult oma asutuses.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| A1-01 | Oma asutuse kasutajate loend | Näeb kasutajaid oma piires |
| A1-02 | Uue kasutaja lisamine | Lisab uue kasutaja oma asutusesse |
| A1-03 | Kasutaja andmete muutmine | Muudab kasutaja infot |
| A1-04 | Kasutajale rolligrupi määramine | Määrab kasutajale õigused |

---

## 9. Süsteemiadministraator

> Roll `AdministrateAllUsers` + `AllowQueries`. Täielik ligipääs.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| SA-01 | Kõikide kasutajate haldamine | Kasutajate loend kõigist asutustest |
| SA-02 | Kasutaja loomine/muutmine/kustutamine | Täielik kasutajahaldus |
| SA-03 | Rollide ja rolligruppide vaatamine | Näeb kogu õiguste maatriksit |
| SA-04 | Rolli lisamine rolligruppi | Muudab rolligrupi õigusi |
| SA-05 | Rolli eemaldamine rolligrupist | Kitsendab rolligrupi õigusi |
| SA-06 | Uue rolligrupi loomine | Loob uue õiguste komplekti |
| SA-07 | Rolligrupi kustutamine | Eemaldab olemasoleva grupi |
| SA-08 | Klassifikaatorite vaatamine | Näeb süsteemi viiteväärtusi |
| SA-09 | Klassifikaatorite muutmine | Muudab/lisab viiteväärtusi |
| SA-10 | Klassifikaatorite järjestamine | Muudab kuvajärjekorda |
| SA-11 | Tootmislogiisse sisenemine | `AdministrateProductionLog` |
| SA-12 | DB sünkroonimispäringu käivitamine | `AllowQueries` – otsepäring andmebaasile |
| SA-13 | Sünkroonimise lähtestamine | Lähtestab sync-oleku |
| SA-14 | Raportite loend | Näeb kõiki süsteemiraporteid |
| SA-15 | Raporti käivitamine | `RunReports` |
| SA-16 | ERRU/SSRS raportite vaatamine | `ViewReports` |
| SA-17 | Erakorralise ülevaatuse vormi haldamine | Admin kontroll |

---

## 10. Välissüsteem (X-tee inbound)

> Masinliides. Autendib X-tee turvaserveri kaudu (SOAP/MP4).

| # | Kasutuslugu | X-tee teenus |
|---|-------------|--------------|
| X-01 | Isiku kontrollide pärimine | `IsikuKontroll` |
| X-02 | Ettevõtte ja isiku rikkumiste pärimine | `IsikuEttevõteKontrollid` |
| X-03 | Erakorralise ülevaatuse algatamine | `ErakorralineYlevaatus` |
| X-04 | Erakorralise ülevaatuse kinnitamine | `ErakorralineYlevaatusTehtud` |
| X-05 | Töökontrolli registreerimine (v1) | `RegisterJobInspection` |
| X-06 | Töökontrolli registreerimine (v2) | `RegisterJobInspectionV2` |

---

## 11. BgService (automatiseeritud taustaprotsessid)

> Ei ole inimkasutaja. Käivitub ajalise plaani alusel.

| # | Kasutuslugu | Kirjeldus | Sagedus |
|---|-------------|-----------|---------|
| B-01 | E-toimiku kvalifikatsioonide pärimine (ControlForm) | Pärib kinnitatud vormide kohta menetlusandmeid | Iga päev / iga tund |
| B-02 | E-toimiku kvalifikatsioonide pärimine (JobInspection) | Sama, RavenDB töökontrollidele | Iga päev / iga tund |
| B-03 | Tehnoülevaatuse andmete sünkroonimine | Pärib Liiklusregistrist sõidukite ülevaatuse kuupäevi | Iga päev / iga tund |
| B-04 | E-meili teavituste saatmine | Saadab meilid kontrolli mitteläbimise kohta | Automaatne (B-01 osana) |
| B-05 | Sõiduki kaalumise teavituse saatmine | Saadab meili kaalumistulemuse kohta | Automaatne (B-01 osana) |
