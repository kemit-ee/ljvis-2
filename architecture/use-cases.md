# LJVIS – Kasutuslood kasutajagruppide järgi

## Kasutajagrupid

| Grupp | Kirjeldus |
|-------|-----------|
| **Kodanik (avalik kasutaja)** | Autendib TARA kaudu, vaatab oma andmeid |
| **Inspektor** | Loob ja haldab kontrollivorme |
| **ERRU RR kasutaja** | Saadab rikkumisteated ERRU-sse |
| **ERRU Mainepäringu kasutaja** | Kontrollib vedaja head mainet |
| **ERRU Tegevusloa kontrolli kasutaja** | Kontrollib ühenduse tegevusluba |
| **ERRU Tehnokontrolli teadete kasutaja** | Haldab teekontrolli teateid |
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
| K-04 | Oma andmete kokkuvõtte vaatamine | Näeb ülevaadet oma seotud ettevõtetest ja rikkumistest (`/PublicRequests`) |
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
| I-12 | Vormiandmete põhine otsing | `FormWideSearchList` |
| I-13 | Kontrollivormide statistika | `ControlFormStatistics` |
| I-14 | Hea maine nõudele mittevastavate veokorraldajate otsing | Autenditud kasutaja |
| I-15 | Isiku andmete vaatamine | Autenditud kasutaja |
| I-16 | Ettevõtte andmete vaatamine | Autenditud kasutaja |
| I-17 | Sõiduki andmete vaatamine | Autenditud kasutaja |
| I-18 | Armatuurlaua vaatamine | Autenditud kasutaja |
| I-19 | Viimaste tehingute vaatamine | Autenditud kasutaja |

> **NB:** `SearchController` ja `StatisticsController` ei kasuta serveripoolset `[LjvisAuthenticate]` atribuuti otsingutegevuste jaoks. Ligipääsu kontroll toimub menüünähtavuse kaudu.

### 2b. X-tee päringud (reaalajas andmeotsing)

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| I-20 | Isiku otsimine X-tee kaudu | Pärib rahvastikuregistrist või muust allikast |
| I-21 | Ettevõtte otsimine X-tee kaudu | Pärib äriregistrist |
| I-22 | Sõiduki andmete pärimine X-tee kaudu | Pärib Liiklusregistrist (`FindSoiduk`) |
| I-23 | Riikide lühikoodide laadimine | Abiväärtused vormi täitmiseks |

### 2c. Kontrollivormid – maanteekontroll

| # | Kasutuslugu | Vajalik roll |
|---|-------------|--------------|
| I-24 | Teeäärse kontrollikaardi loomine | `RoadControlCard` |
| I-25 | Teeäärse kontrollikaardi (2012) loomine | `RoadControlCard2012` |
| I-26 | Teeäärse kontrollikaardi (2015) loomine | `RoadControlCard2015` |
| I-27 | Ohtliku veo vormi loomine | `DangerousDelivery` |
| I-28 | Ohtliku veo vormi (2012) loomine | `DangerousDelivery2012` |
| I-29 | Ohtliku veo vormi (2015) loomine | `DangerousDelivery2015` |
| I-30 | Välismaalase rikkumise vormi loomine | `ForeignViolate` |
| I-31 | Veovahendi tehnoülevaatuse vormi loomine | `Roadworthiness` |
| I-32 | Tehnoülevaatuse vormi (2012) loomine | `Roadworthiness2012` |
| I-33 | Tehnoülevaatuse vormi (2015) loomine | `Roadworthiness2015` |
| I-34 | Kütusevõtuki vormi loomine | `FuelSample` |
| I-35 | Transpordi peatamise vormi loomine | `TransportInterruption` |
| I-36 | Vormi salvestamine mustandina | Sama roll kui loomine |
| I-37 | Vormi kinnitamine (`Confirm`) | Sama roll kui loomine |
| I-38 | Vormi avalikustamine (`Disclose`) | Sama roll kui loomine |
| I-39 | Vormide hulgi-avalikustamine (`Avalikusta`) | Sama roll kui loomine |
| I-40 | Vormi redigeerimine (enda loodud) | `EditOwnData` |
| I-41 | Vormi kustutamine | `AdministrateLocalAccountManager` |
| I-42 | Vormi redigeerimine (oma asutus) | `EditOwnEstablishmentData` |
| I-43 | Vormi suunamine teisele kasutajale | `AllowControlFormRedirecting` |
| I-44 | Haldusmenetluse sektsiooni uuendamine | `AllowUpdateControlFormAdministrativeProcedureSection` |
| I-45 | Dokumendikontrolli vormi loomine/vaatamine | Forms area |

> **NB:** Vormi kustutamine (I-41) nõuab koodis `[LjvisAuthenticate(AdministrateLocalAccountManager)]`, mitte vormitüübirolli. Redigeerimine (I-40, I-42) kontrollitakse serveripoolselt vormitüübi rolli kaudu (`Authorization.IsInRole(formTypeName)`).

### 2d. Töökontroll (JobInspection)

| # | Kasutuslugu | Vajalik roll |
|---|-------------|--------------|
| I-46 | Töökontrolli vormi loomine | `JobInspection` |
| I-47 | Töökontrolli vormi redigeerimine | `JobInspection` |
| I-48 | Töökontrollide otsimine ja filtreerimine | `JobInspection` |
| I-49 | Töökontrolli menetluse andmete vaatamine | `JobInspection` |

### 2e. Hea maine kontroll (Good Repute)

| # | Kasutuslugu | Vajalik roll |
|---|-------------|--------------|
| I-50 | Hea maine kontrolli vormi loomine | `GoodRepute` |

### 2f. Riskihinnang

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| I-51 | Riskihinnangu vaatamine | Autenditud kasutaja |
| I-52 | Riskihinnangu eksportimine Excelisse | Autenditud kasutaja |

### 2g. Arhiiv

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| I-53 | Arhiivi sirvamine ja otsimine | Autenditud kasutaja |
| I-54 | Arhiivianalüüsi loomine | Autenditud kasutaja |

---

## 3. ERRU RR kasutaja (rikkumisteated)

> Grupp `ROLE_GROUP_ERRU_INF`. Haldab rikkumisteateid ERRU süsteemiga.

| # | Kasutuslugu | Kirjeldus |
|---|-------------|-----------|
| E1-01 | Rikkumisteadete loendi vaatamine | Kõik sissetulevad/väljaminevad teated |
| E1-02 | Rikkumisteadete otsimine | Filtreerimine kuupäeva, ettevõtte jms järgi (osa `Index` filtreerimisest) |
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

## 6. ERRU Tehnokontrolli teadete kasutaja (RoadSideInspection)

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
| S-01 | Statistikaraporti vaatamine | Koondaruanne kontrollivormidest (`StatisticsController`) |
| S-02 | Statistika eksportimine Excelisse | Laadib alla tabeli (`DashboardController` / `DownloadStatistics`) |
| S-03 | CVS-andmete aruande vaatamine | Avab CVS-aruande vaate (`ReportController.Cvs`) |

> **NB:** `StatisticsController` ei kasuta serveripoolset `[LjvisAuthenticate]` atribuuti. Ligipääsu kontroll toimub `DashboardController.HasAccessToStatisticFiles()` ja menüünähtavuse kaudu.

---

## 8. Kohaliku asutuse administraator

> Roll `AdministrateLocalAccountManager`. Haldab kasutajaid ainult oma asutuses.
>
> NB: Koodis kasutab `UserController.Index` atribuuti `[LjvisAuthenticate(AdministrateAllUsers, AdministrateLocalAccountManager)]` — kohalik admin siseneb `AdministrateLocalAccountManager` kaudu, mis filtreerib automaatselt oma asutuse kasutajate järgi.

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
| SA-02 | Kasutaja loomine/muutmine/deaktiveerimine | Täielik kasutajahaldus (kustutamist ei ole – kasutaja deaktiveeritakse kehtivusaja kaudu) |
| SA-03 | Rollide ja rolligruppide vaatamine | Näeb kogu õiguste maatriksit (nõuab `Ametikoht == "ADMIN"`, mitte rolli) |
| SA-04 | Rolli lisamine rolligruppi | Muudab rolligrupi õigusi |
| SA-05 | Rolli eemaldamine rolligrupist | Kitsendab rolligrupi õigusi |
| SA-06 | Uue rolligrupi loomine | Loob uue õiguste komplekti |
| SA-07 | Rolligrupi kustutamine | Eemaldab olemasoleva grupi |
| SA-08 | Klassifikaatorite vaatamine | Näeb süsteemi viiteväärtusi |
| SA-09 | Klassifikaatorite muutmine | Muudab/lisab viiteväärtusi |
| SA-10 | Klassifikaatorite järjestamine | Muudab kuvajärjekorda |
| SA-11 | Tootmislogisse sisenemine | `AdministrateProductionLog` – `ElmahController` / `EtoimikController` |
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
| X-01 | Isiku kontrollide pärimine | `IsikuKontroll` (koodis `[Obsolete]`) |
| X-02 | Ettevõtte ja isiku rikkumiste pärimine | `IsikuEttevoteKontrollid` (SOAP-is ilma diakriitikuta) |
| X-03 | Erakorralise ülevaatuse algatamine | `ErakorralineYlevaatus` (koodis `[Obsolete]`) |
| X-04 | Erakorralise ülevaatuse kinnitamine | `ErakorralineYlevaatusTehtud` |
| X-05 | Töökontrolli registreerimine (v1) | `RegisterJobInspection` |
| X-06 | Töökontrolli registreerimine (v2) | `RegisterJobInspectionV2` |

---

## 11. BgService (automatiseeritud taustaprotsessid)

> Ei ole inimkasutaja. Käivitub ajalise plaani alusel. Sagedus on konfigureeritav `BgService` tasemel (`ActionManager.cs` / `Service1.cs`).

| # | Kasutuslugu | Kirjeldus | Sagedus |
|---|-------------|-----------|---------|
| B-01 | E-toimiku kvalifikatsioonide pärimine (ControlForm) | Pärib kinnitatud vormide kohta menetlusandmeid | Iga päev / iga tund |
| B-02 | E-toimiku kvalifikatsioonide pärimine (JobInspection) | Sama, RavenDB töökontrollidele | Iga päev / iga tund |
| B-03 | Tehnoülevaatuse andmete sünkroonimine | Pärib Liiklusregistrist sõidukite ülevaatuse kuupäevi | Iga päev / iga tund |
| B-04 | E-meili teavituste saatmine | Saadab meilid kontrolli mitteläbimise kohta | Automaatne (B-01 osana) |
| B-05 | Sõiduki kaalumise teavituse saatmine | Saadab meili kaalumistulemuse kohta | Automaatne (B-01 osana) |

---

---

# Sequence diagrammid kasutajagruppide kaupa

---

## K – Kodanik (avalik kasutaja)

### K-01…K-03 · Sisselogimine ja väljalogmine (TARA)

```mermaid
sequenceDiagram
    actor Kodanik
    participant UI as LJVIS
    participant TARA

    Kodanik->>UI: Avab avaliku portaali
    UI-->>Kodanik: Sisselogimisleht (isPublicRequest=true)

    Kodanik->>UI: Klõpsab „Logi sisse"
    UI->>UI: Genereerib CSRF state
    UI-->>Kodanik: Redirect → TARA /authorize

    Kodanik->>TARA: Autendib (ID-kaart / Mobiil-ID)
    TARA-->>UI: AuthorizeCallback?code=...&state=...

    UI->>TARA: POST /token (code)
    TARA-->>UI: access_token + id_token
    UI->>TARA: GET /userinfo
    TARA-->>UI: isikukood, nimi

    UI->>UI: SetUser(profileInfo) sessioonile
    Note right of UI: Ei nõua DB kasutajakontot
    UI-->>Kodanik: Redirect → /PublicRequests

    Kodanik->>UI: Klõpsab „Logi välja" (K-03)
    UI->>UI: Seanss tühjendatakse
    UI-->>Kodanik: Väljalogimise kinnitus
```

### K-04…K-06 · Oma andmete vaatamine

```mermaid
sequenceDiagram
    actor Kodanik
    participant UI as LJVIS (PublicRequestsController)
    participant DB as SQL Server

    Note over Kodanik,DB: Kasutaja on juba sisse logitud (TARA sessioon)

    Kodanik->>UI: GET /PublicRequests (K-04)
    UI-->>Kodanik: Kokkuvõtteleht (ettevõtted + rikkumised)

    Kodanik->>UI: GET /PublicRequests/UserCompanies (K-05)
    UI->>DB: SELECT ettevõtted isikukoodi järgi
    DB-->>UI: Ettevõtete loend
    UI-->>Kodanik: Ettevõtete vaade

    Kodanik->>UI: GET /PublicRequests/GetViolations (K-06)
    UI->>DB: SELECT kontrollivormid isikukoodi järgi
    DB-->>UI: Rikkumiste loend
    UI-->>Kodanik: Rikkumiste vaade
```

---

## I – Inspektor

### I-01…I-19 · Otsing ja andmete vaatamine

```mermaid
sequenceDiagram
    actor Inspektor
    participant UI as LJVIS (SearchController)
    participant DB as SQL Server
    participant Log as UserLogger

    Inspektor->>UI: GET /Search/SearchPerson?eesnimi=...
    UI->>Log: LogAction("Isiku otsing", parameetrid)
    UI->>DB: SELECT ControlForm JOIN ControlFormValue<br/>WHERE juhi andmed vastavad kriteeriumitele
    DB-->>UI: Kontrollivormide loend
    UI-->>Inspektor: Isiku otsingutulemused

    Inspektor->>UI: GET /Search/SearchCompany?regCode=...
    UI->>Log: LogAction("Ettevõte otsing", parameetrid)
    UI->>DB: SELECT vormid ettevõtte reg-koodi järgi
    DB-->>UI: Tulemused
    UI-->>Inspektor: Ettevõtte otsingutulemused

    Inspektor->>UI: GET /Search/SearchVehicle?registryid=...
    UI->>Log: LogAction("Sõiduki otsing", parameetrid)
    UI->>DB: SELECT vormid reg-numbri / sõidukiklassi järgi
    DB-->>UI: Tulemused
    UI-->>Inspektor: Sõiduki otsingutulemused
```

### I-20…I-23 · Reaalajas X-tee päringud vormi täitmisel

```mermaid
sequenceDiagram
    actor Inspektor
    participant UI as LJVIS (XTeeController)
    participant Tunnel as X-tee turvaserver<br/>test.liiklusvalve.ee/xtee/tunnel
    participant RR as Rahvastikuregister<br/>GOV/70008440/rr
    participant BR as Äriregister<br/>GOV/70000310/arireg

    Inspektor->>UI: POST /XTee/FindPerson (isikukood)
    Note over UI,Tunnel: Klient: ee-test/GOV/70003158/ljvis
    UI->>Tunnel: SOAP – RR404_isik/v3<br/>(ee-test/GOV/70008440/rr/RR404_isik/v3)
    Tunnel->>RR: RR404_isik päring
    RR-->>Tunnel: Isiku põhiandmed (nimi, aadress jms)
    Tunnel-->>UI: SOAP vastus
    UI-->>Inspektor: Eeltäidetud isiku andmed vormis

    Inspektor->>UI: POST /XTee/FindCompany (nimi / reg-kood)
    UI->>Tunnel: SOAP – arireg/lihtandmed_v1/v1<br/>(ee-test/GOV/70000310/arireg/lihtandmed_v1/v1)
    Tunnel->>BR: lihtandmed_v1 päring
    BR-->>Tunnel: Ettevõtte lihtandmed (nimi, reg-kood, aadress)
    Tunnel-->>UI: SOAP vastus
    UI-->>Inspektor: Eeltäidetud ettevõtte andmed vormis

    opt Ettevõtte detailandmed (reg-koodi järgi)
        UI->>Tunnel: SOAP – arireg/detailandmed_v1/v1
        Tunnel->>BR: detailandmed_v1 päring
        BR-->>Tunnel: Täisandmed koos aadressiga
        Tunnel-->>UI: SOAP vastus
    end

    opt Esindusõiguste kontroll (isikukood → ettevõtted)
        UI->>Tunnel: SOAP – arireg/esindus_v1/v1
        Tunnel->>BR: esindus_v1 päring
        BR-->>Tunnel: Seotud ettevõtete loend
        Tunnel-->>UI: SOAP vastus
    end

    Inspektor->>UI: POST /XTee/FindSoiduk (reg-number) (I-22)
    UI->>Tunnel: SOAP – liiklusregister/paring2/v2
    Tunnel-->>UI: Sõiduki mark, mudel, VIN, kategooria
    UI-->>Inspektor: Eeltäidetud sõiduki andmed vormis
```

### I-24…I-39 · Kontrollivormi loomine, kinnitamine ja avalikustamine

```mermaid
sequenceDiagram
    actor Inspektor
    participant UI as LJVIS (FormsController)
    participant Auth as Rollkontroll
    participant DB as SQL Server
    participant Versions as Versions tabel

    Inspektor->>UI: GET /Forms/Form/Create?type=RoadControlCard
    UI->>Auth: Kontrollib rolli (RoadControlCard)
    Auth-->>UI: Lubatud

    UI->>DB: SELECT klassifikaatorid, abitabelid
    DB-->>UI: Vormi abiväärtused
    UI-->>Inspektor: Tühi kontrollivorm

    Inspektor->>UI: POST /Forms/Form/Save (vormi andmed)
    UI->>DB: INSERT ControlForm (stage=Draft)
    UI->>DB: INSERT ControlFormValue[] (juhi andmed,<br/>sõiduki andmed, rikkumised, otsus)
    DB-->>UI: ControlForm.Id
    UI-->>Inspektor: Salvestatud (mustandrežiim)

    Inspektor->>UI: POST /Forms/Form/Confirm (I-37)
    UI->>DB: UPDATE ControlForm<br/>stage=Confirmed<br/>UnitedFormPart=true<br/>QualificationsReceived=false
    UI->>Versions: INSERT (muutus, kasutaja, aeg)
    UI-->>Inspektor: Vorm kinnitatud – ootab E-toimiku vastust

    Inspektor->>UI: GET /Forms/Form/Disclose (I-38)
    UI->>DB: UPDATE ControlForm stage=Published
    UI-->>Inspektor: Vorm avalikustatud
```

### I-40…I-43 · Vormi redigeerimine, kustutamine ja suunamine

```mermaid
sequenceDiagram
    actor Inspektor
    participant UI as LJVIS (FormsController)
    participant Auth as Rollkontroll
    participant DB as SQL Server
    participant Versions as Versions tabel

    Inspektor->>UI: GET /Forms/Form/Update/{id}
    UI->>Auth: IsInRole(formTypeName)
    Auth-->>UI: Lubatud
    UI->>DB: SELECT ControlForm + ControlFormValue
    DB-->>UI: Olemasolev vorm
    UI-->>Inspektor: Täidetud redaktsioonivorm

    Inspektor->>UI: POST /Forms/Form/Update (muudetud andmed)
    UI->>DB: UPDATE ControlFormValue[]
    UI->>DB: UPDATE ControlForm (FormVersion++, Version++)
    UI->>Versions: INSERT (vana seis, kasutaja, aeg)
    UI-->>Inspektor: Muudatused salvestatud

    opt Vormi kustutamine (I-41)
        Inspektor->>UI: POST /Forms/Form/Delete
        UI->>Auth: AdministrateLocalAccountManager
        Auth-->>UI: Lubatud
        UI->>DB: DELETE ControlForm
        UI-->>Inspektor: Vorm kustutatud
    end

    opt Vormi suunamine teisele kasutajale (I-43)
        Inspektor->>UI: POST /Forms/Form/Redirect (sihtKasutaja)
        UI->>Auth: AllowControlFormRedirecting
        Auth-->>UI: Lubatud
        UI->>DB: UPDATE ControlForm (AssignedTo = sihtKasutaja)
        UI-->>Inspektor: Vorm suunatud
    end
```

### I-46…I-49 · Töökontrolli haldamine

```mermaid
sequenceDiagram
    actor Inspektor
    participant UI as LJVIS (JobInspectionController)
    participant Auth as Rollkontroll (JobInspection)
    participant Raven as RavenDB

    Inspektor->>UI: GET /Forms/JobInspection/Create
    UI->>Auth: Kontrollib JobInspection rolli
    Auth-->>UI: Lubatud
    UI-->>Inspektor: Tühi töökontrolli vorm

    Inspektor->>UI: POST /Forms/JobInspection/Create (andmed)
    UI->>Raven: INSERT JobInspectionV2<br/>(stage=Draft, InfringementProceedings=[...])
    Raven-->>UI: InspectionId
    UI-->>Inspektor: Salvestatud

    Inspektor->>UI: POST kinnitamine
    UI->>Raven: UPDATE JobInspectionV2 (stage=Confirmed)
    UI-->>Inspektor: Kinnitatud – ootab E-toimiku vastust

    Inspektor->>UI: GET /Forms/JobInspection/Search
    UI->>Raven: QUERY JobInspectionV2 (filtrid)
    Raven-->>UI: Kontrollide loend
    UI-->>Inspektor: Otsingutulemused
```

### I-51…I-54 · Riskihinnang ja arhiiv

```mermaid
sequenceDiagram
    actor Inspektor
    participant UI as LJVIS
    participant DB as SQL Server

    Inspektor->>UI: GET /RiskAssessment
    UI->>DB: SELECT riskihinnangu andmed (kontrollivormid, rikkumised)
    DB-->>UI: Koondandmed
    UI-->>Inspektor: Riskihinnangu vaade

    opt Eksport (I-52)
        Inspektor->>UI: POST /RiskAssessment/Export
        UI->>DB: SELECT täisandmed
        DB-->>UI: Andmekogum
        UI-->>Inspektor: Excel-fail (allalaadimine)
    end

    Inspektor->>UI: GET /Archive (I-53)
    UI->>DB: SELECT arhiveeritud analüüsid
    DB-->>UI: Arhiivi loend
    UI-->>Inspektor: Arhiivi vaade

    opt Uue analüüsi loomine (I-54)
        Inspektor->>UI: POST /Archive/Create (parameetrid)
        UI->>DB: INSERT ArchiveAnalysis
        UI-->>Inspektor: Analüüs loodud
    end
```

---

## E1 – ERRU RR kasutaja (rikkumisteated)

### E1-01…E1-05 · Rikkumisteate loomine ja saatmine ERRU-sse

```mermaid
sequenceDiagram
    actor Kasutaja as ERRU RR kasutaja
    participant UI as LJVIS (InfringementNewController)
    participant Auth as InfringementAuthorize
    participant DB as SQL Server
    participant MsgStore as MessageStoreService
    participant ERRU as ERRU Messenger

    Kasutaja->>UI: GET /Infringement (E1-01)
    UI->>Auth: Kontrollib ROLE_GROUP_ERRU_INF
    Auth-->>UI: Lubatud
    UI->>DB: SELECT rikkumisteated (kõik staatused)
    DB-->>UI: Teadete loend
    UI-->>Kasutaja: Rikkumisteadete nimekiri

    Kasutaja->>UI: GET /InfringementNew/CreateMs2Erru (E1-03)
    UI->>DB: SELECT klassifikaatorid, rikkumistüübid
    DB-->>UI: Abiväärtused
    UI-->>Kasutaja: Tühi MS→ERRU vorm

    Kasutaja->>UI: POST /InfringementNew/SubmitMs2Erru (SendMessage)
    UI->>UI: Valideerib rikkumiste kollektsiooni
    UI->>ERRU: HTTP POST ERRU sõnum (ERRU105 XML)
    ERRU-->>UI: Töötlemise kinnitus
    UI->>MsgStore: Salvestab sõnumi (DocumentId)
    UI->>DB: INSERT InfringementMessage<br/>(status=TeadeSaadetud, DocumentId)
    UI-->>Kasutaja: Redirect → /Infringement

    Kasutaja->>UI: GET /InfringementNew/LoadMs2Erru/{id} (E1-05)
    UI->>DB: SELECT InfringementMessage (id järgi)
    UI->>MsgStore: Load(DocumentId) → päringu XML
    opt Vastus saabunud
        UI->>MsgStore: Load(ResponseMessageId) → vastuse XML
    end
    UI-->>Kasutaja: Teate detailvaade (staatus + sisu)
```

---

## E2 – ERRU Mainepäringu kasutaja (CheckGoodRepute)

### E2-01…E2-03 · Hea maine kontrollpäringu saatmine

```mermaid
sequenceDiagram
    actor Kasutaja as ERRU CGR kasutaja
    participant UI as LJVIS (CheckGoodReputeNewController)
    participant Auth as CheckGoodReputeAuthorize
    participant DB as SQL Server
    participant ERRU as ERRU Messenger

    Kasutaja->>UI: GET /CheckGoodReputeNew/Create (E2-01)
    UI->>Auth: Kontrollib ROLE_GROUP_ERRU_CGR
    Auth-->>UI: Lubatud
    UI->>DB: SELECT järgmine ID, asutuse nimi
    DB-->>UI: businessCaseId = "EE-CGR-{aasta}-{id}"
    UI-->>Kasutaja: Tühi hea maine vorm

    Kasutaja->>UI: POST /CheckGoodReputeNew/Create (täidetud vorm)
    UI->>UI: Lisab workflowId (GUID), kuupäeva, saaja riigi
    UI->>ERRU: HTTP POST CheckGoodRepute päring (ERRU105 XML)
    ERRU-->>UI: Töötlemise kinnitus (async)
    UI->>UI: Thread.Sleep (ERRU vastuse viivitus)
    Note right of UI: Teadlik tehniline võlg:<br/>blokeeriv ooteaeg (ErruHelper.ERRU_MESSENGER_RESPONSE_DELAY)
    UI->>DB: SELECT InfringementMessage (workflowId järgi)
    UI->>DB: UPDATE CheckGoodReputeMessage (UserId = praegune kasutaja)
    UI-->>Kasutaja: Redirect → mainepäringute loend

    Kasutaja->>UI: GET /CheckGoodRepute (E2-02)
    UI->>DB: SELECT kõik CGR teated
    DB-->>UI: Teadete loend koos staatustega
    UI-->>Kasutaja: Mainepäringute loend

    Kasutaja->>UI: GET /CheckGoodRepute/Details/{id} (E2-03)
    UI->>DB: SELECT teate detailid + vastuse andmed
    DB-->>UI: Teate sisu
    UI-->>Kasutaja: Vastuse detailvaade
```

---

## E3 – ERRU Tegevusloa kontrolli kasutaja (CheckCommunityLicence)

### E3-01…E3-04 · Tegevusloa kontrollpäringu haldamine

```mermaid
sequenceDiagram
    actor Kasutaja as ERRU CCL kasutaja
    participant UI as LJVIS (CheckCommunityLicenceController)
    participant Auth as CheckCommunityLicenceAuthorize
    participant DB as SQL Server
    participant ERRU as ERRU Messenger

    Kasutaja->>UI: GET /CheckCommunityLicence (E3-02)
    UI->>Auth: Kontrollib ROLE_GROUP_ERRU_CCL
    Auth-->>UI: Lubatud
    UI->>DB: SELECT CCL teated (kõik staatused)
    DB-->>UI: Teadete loend
    UI-->>Kasutaja: Tegevusloa teadete nimekiri

    Kasutaja->>UI: GET /CheckCommunityLicence/Search?... (E3-03)
    UI->>DB: SELECT teated filtreeritult
    DB-->>UI: Filtreeritud loend
    UI-->>Kasutaja: Otsingutulemused

    Kasutaja->>UI: POST tegevusloa kontrollpäringu saatmine (E3-01)
    UI->>ERRU: HTTP POST CCL päring (ERRU105 XML)
    ERRU-->>UI: Kinnitus
    UI->>DB: INSERT CheckCommunityLicenceMessage (status=TeadeSaadetud)
    UI-->>Kasutaja: Redirect → loend

    Kasutaja->>UI: GET detailvaade (E3-04)
    UI->>DB: SELECT teate + vastuse andmed
    DB-->>UI: Vastuse XML
    UI-->>Kasutaja: ERRU vastuse detailvaade
```

---

## E4 – ERRU Tehnokontrolli teadete kasutaja (RoadSideInspection)

### E4-01…E4-04 · Teekontrolli teadete haldamine

```mermaid
sequenceDiagram
    actor Kasutaja as ERRU RSI kasutaja
    participant UI as LJVIS (RoadSideInspectionController)
    participant Auth as RoadSideInspectionAuthorize
    participant DB as SQL Server

    Kasutaja->>UI: GET /RoadSideInspection (E4-01)
    UI->>Auth: Kontrollib ROLE_GROUP_ERRU_RSI
    Auth-->>UI: Lubatud
    UI->>DB: SELECT RSI teated (sissetulevad + väljaminevad)
    DB-->>UI: Teadete loend
    UI-->>Kasutaja: Teekontrolli teadete nimekiri

    Kasutaja->>UI: GET /RoadSideInspection/Search?... (E4-02)
    UI->>DB: SELECT teated (businessCaseId / kuupäev /<br/>kasutaja / riik / suund järgi)
    DB-->>UI: Filtreeritud loend
    UI-->>Kasutaja: Otsingutulemused

    Kasutaja->>UI: GET /RoadSideInspection/Details/{id} (E4-03)
    UI->>DB: SELECT RSI teate täisandmed
    DB-->>UI: Teate sisu (XML + metaandmed)
    UI-->>Kasutaja: Detailvaade

    Kasutaja->>UI: GET /RoadSideInspection/IsResponseReceived/{id} (E4-04)
    UI->>DB: SELECT teate staatus
    DB-->>UI: Staatus (vastus saabunud / ootel)
    UI-->>Kasutaja: Staatuse indikaator
```

---

## S – Statistikakasutaja

### S-01…S-03 · Statistika ja raportid

```mermaid
sequenceDiagram
    actor Kasutaja as Statistikakasutaja
    participant UI as LJVIS (StatisticsController / ReportController)
    participant Auth as Rollkontroll
    participant DB as SQL Server
    participant SSRS as SSRS raportiserverMNT

    Kasutaja->>UI: GET /Statistics/StatisticsReport (S-01)
    Note right of Auth: NB: StatisticsController-l puudub<br/>serveripoolne [LjvisAuthenticate].<br/>Ligipääsu kontroll menüü kaudu.
    UI->>Auth: HasAccessToStatisticFiles()
    Auth-->>UI: Lubatud
    UI->>DB: SELECT kontrollivormide koondandmed<br/>(periood, asutus, vormitüüp)
    DB-->>UI: Statistilised andmed
    UI-->>Kasutaja: Statistikaraport

    Kasutaja->>UI: GET /Dashboard → DownloadStatistics (S-02)
    UI->>DB: SELECT täisandmed
    DB-->>UI: Andmekogum
    UI-->>Kasutaja: Excel-fail (allalaadimine)

    Kasutaja->>UI: GET /Report/List (S-01 variant)
    UI->>Auth: ViewReports / RunReports
    Auth-->>UI: Lubatud
    UI-->>Kasutaja: Saadaolevate raportite loend

    Kasutaja->>UI: GET /Report/ReportViewer?id=... (S-03)
    UI->>SSRS: Pärib rapordi (SSRS URL)
    SSRS-->>UI: Renderdatud raport
    UI-->>Kasutaja: Rapordi vaade
```

---

## A1 – Kohaliku asutuse administraator

### A1-01…A1-04 · Oma asutuse kasutajate haldamine

```mermaid
sequenceDiagram
    actor Admin as Kohaliku asutuse admin
    participant UI as LJVIS (UserController)
    participant Auth as LjvisAuthenticate<br/>(AdministrateAllUsers,<br/>AdministrateLocalAccountManager)
    participant DB as SQL Server

    Admin->>UI: GET /Users/User/Index (A1-01)
    UI->>Auth: Kontrollib AdministrateLocalAccountManager
    Auth-->>UI: Lubatud (ainult oma asutus)
    UI->>DB: SELECT kasutajad WHERE asutus = praeguneAsutus
    DB-->>UI: Kasutajate loend
    UI-->>Admin: Kasutajate nimekiri

    Admin->>UI: GET /Users/User/AddUser (A1-02)
    UI-->>Admin: Uue kasutaja vorm

    Admin->>UI: POST /Users/User/AddUser (kasutaja andmed)
    UI->>DB: INSERT User (isikukood, nimi, asutus)
    UI-->>Admin: Kasutaja loodud

    Admin->>UI: POST /Users/User/Edit (A1-03 / A1-04)
    UI->>DB: UPDATE User (andmed / rolligrupp)
    UI-->>Admin: Muudatused salvestatud
```

---

## SA – Süsteemiadministraator

### SA-01…SA-07 · Kasutajate ja rollide haldamine

```mermaid
sequenceDiagram
    actor SA as Süsteemiadministraator
    participant UI as LJVIS (UserController / RoleController)
    participant Auth as LjvisAuthenticate<br/>(AdministrateAllUsers)
    participant DB as SQL Server

    SA->>UI: GET /Users/User/Index (SA-01)
    UI->>Auth: Kontrollib AdministrateAllUsers
    Auth-->>UI: Lubatud (kõik asutused)
    UI->>DB: SELECT kõik kasutajad kõigist asutustest
    DB-->>UI: Kasutajate täisloend
    UI-->>SA: Kõikide kasutajate nimekiri

    SA->>UI: GET /Role/RoleGroupMatrix (SA-03)
    Note right of SA: Nõuab Ametikoht=="ADMIN",<br/>mitte AdministrateAllUsers rolli
    UI->>DB: SELECT RoleGroup[], Role[], RoleGroup_Role[]
    DB-->>UI: Õiguste maatriks
    UI-->>SA: Rollide ja rolligruppide maatriks

    SA->>UI: POST /Role/AddRoleToRoleGroup (SA-04)
    UI->>DB: INSERT RoleGroup_Role (rolligrupp, roll)
    UI-->>SA: Roll lisatud

    SA->>UI: POST /Role/RemoveRoleFromRoleGroup (SA-05)
    UI->>DB: DELETE RoleGroup_Role
    UI-->>SA: Roll eemaldatud

    SA->>UI: POST /Role/AddRoleGroup (SA-06)
    UI->>DB: INSERT RoleGroup (nimi, kood)
    UI-->>SA: Uus rolligrupp loodud

    SA->>UI: POST /Role/RemoveRoleGroup (SA-07)
    UI->>DB: DELETE RoleGroup
    UI-->>SA: Rolligrupp kustutatud
```

### SA-08…SA-10 · Klassifikaatorite haldamine

```mermaid
sequenceDiagram
    actor SA as Süsteemiadministraator
    participant UI as LJVIS (Admin/ClassifierController)
    participant DB as SQL Server

    SA->>UI: GET /Admin/Classifier/Index (SA-08)
    UI->>DB: SELECT kõik klassifikaatorid
    DB-->>UI: Klassifikaatorite loend
    UI-->>SA: Klassifikaatorite nimekiri

    SA->>UI: GET /Admin/Classifier/Edit/{id} (SA-09)
    UI->>DB: SELECT klassifikaatori väärtused
    DB-->>UI: Klassifikaator
    UI-->>SA: Redigeerimisvaade

    SA->>UI: POST /Admin/Classifier/Edit (salvestamine)
    UI->>DB: UPDATE Classifier
    UI-->>SA: Muudatused salvestatud

    SA->>UI: POST /Admin/Classifier/Sort (SA-10)
    UI->>DB: UPDATE Classifier SET SortOrder = ...
    UI-->>SA: Järjestus uuendatud
```

### SA-12…SA-13 · DB sünkroonimispäring

```mermaid
sequenceDiagram
    actor SA as Süsteemiadministraator
    participant UI as LJVIS (Admin/SyncController)
    participant Auth as LjvisAuthenticate(AllowQueries)
    participant DB as SQL Server

    SA->>UI: GET /Admin/Sync/Index (SA-12)
    UI->>Auth: Kontrollib AllowQueries rolli
    Auth-->>UI: Lubatud
    UI-->>SA: Sünkroonimise päringuvorm

    SA->>UI: POST /Admin/Sync/Index (SQL päring)
    UI->>DB: Täidab administraatori SQL päringu
    DB-->>UI: Tulemused
    UI-->>SA: Päringu tulemused

    SA->>UI: GET /Admin/Sync/Reset (SA-13)
    UI->>DB: UPDATE sync_state = lähtestatud
    UI-->>SA: Sünkroonimine lähtestatud
```

---

## X – Välissüsteem (X-tee inbound)

### X-01…X-06 · X-tee sissetulevad teenused

> LJVIS toimib siin X-tee **teenuseosutajana**.  
> WSDL: `Ljvis.XTeeService/ljvis.wsdl` · Protokoll: Message Protocol 4.0 (SOAP)  
> Teenuse identifikaator: `{Instance}/GOV/70003158/ljvis/<teenus>`

```mermaid
sequenceDiagram
    actor Välis as Välissüsteem<br/>(X-tee liige)
    participant XTee as X-tee turvaserver
    participant Dispatcher as ServiceDispatcher<br/>Ljvis.XTeeService<br/>GOV/70003158/ljvis
    participant DB as SQL Server
    participant Raven as RavenDB

    Note over Välis,Dispatcher: Kõik päringud: SOAP MP4 + X-tee turvaserver päis (UserId, Service, Client)

    Välis->>XTee: IsikuKontroll(isikukood) (X-01)
    Note right of Välis: {Instance}/GOV/70003158/ljvis/IsikuKontroll
    XTee->>Dispatcher: Edastab valideeritud päringu
    Dispatcher->>DB: SELECT ControlForm + ControlFormValue<br/>WHERE juhi isikukood = päring.isikukood
    DB-->>Dispatcher: Kontrolliandmed
    Dispatcher-->>XTee: IsikuKontrollResponse (XML)
    XTee-->>Välis: Isiku kontrollide loend

    Välis->>XTee: IsikuEttevõteKontrollid(isikukood) (X-02)
    Note right of Välis: {Instance}/GOV/70003158/ljvis/IsikuEttevoteKontrollid
    XTee->>Dispatcher: Edastab päringu
    Dispatcher->>DB: SELECT rikkumised ettevõtte reg-numbri<br/>ja isikukoodi järgi
    DB-->>Dispatcher: Rikkumiste loend (sõiduk, juht, otsus, kuupäev)
    Dispatcher-->>XTee: IsikuEttevõteKontrollidResponse (XML)
    XTee-->>Välis: Ettevõtte rikkumised

    Välis->>XTee: ErakorralineYlevaatus (X-03)
    Note right of Välis: {Instance}/GOV/70003158/ljvis/ErakorralineYlevaatus
    XTee->>Dispatcher: Edastab päringu
    Dispatcher->>DB: INSERT ControlForm<br/>(tüüp=erakorraline ülevaatus, stage=Draft)
    DB-->>Dispatcher: Uue vormi ID
    Dispatcher-->>XTee: ErakorralineYlevaatusResponse (vormId)
    XTee-->>Välis: Ülevaatuse registreerimine õnnestus

    Välis->>XTee: ErakorralineYlevaatusTehtud (X-04)
    Note right of Välis: {Instance}/GOV/70003158/ljvis/ErakorralineYlevaatusTehtud
    XTee->>Dispatcher: Edastab kinnituspäringu (vormId)
    Dispatcher->>DB: UPDATE ControlForm stage=Confirmed
    DB-->>Dispatcher: OK
    Dispatcher-->>XTee: Kinnituse vastus
    XTee-->>Välis: Ülevaatus kinnitatud

    Välis->>XTee: RegisterJobInspection (X-05)
    Note right of Välis: {Instance}/GOV/70003158/ljvis/RegisterJobInspection
    XTee->>Dispatcher: Edastab töökontrolli andmed (v1)
    Dispatcher->>Raven: INSERT JobInspection (v1)
    Raven-->>Dispatcher: InspectionId
    Dispatcher-->>XTee: RegisterJobInspectionResponse
    XTee-->>Välis: Töökontroll registreeritud (v1)

    Välis->>XTee: RegisterJobInspectionV2 (X-06)
    Note right of Välis: {Instance}/GOV/70003158/ljvis/RegisterJobInspectionV2
    XTee->>Dispatcher: Edastab töökontrolli andmed
    Dispatcher->>Raven: INSERT JobInspectionV2<br/>(stage=Confirmed, InfringementProceedings=[...])
    Raven-->>Dispatcher: InspectionId
    Dispatcher-->>XTee: RegisterJobInspectionV2Response (inspectionId)
    XTee-->>Välis: Töökontroll registreeritud
```

---

## B – BgService (automatiseeritud taustaprotsessid)

### B-01…B-05 · E-toimiku päring ja tehnoülevaatuse sünkroonimine

```mermaid
sequenceDiagram
    participant Timer as BgService taimer
    participant EtoimikSvc as EtoimikService
    participant MntSvc as MntSyncService
    participant DB as SQL Server
    participant Raven as RavenDB
    participant Etoimik as E-toimik (X-tee)
    participant MNT as Liiklusregister (X-tee)
    participant Mail as Meilisõnumid

    Timer->>EtoimikSvc: Run() [igapäevane / igatunniline]

    Note over EtoimikSvc,Etoimik: X-tee klient: ee-test/GOV/70003158/ljvis<br/>Tunnel: test.liiklusvalve.ee/xtee/tunnel

    EtoimikSvc->>DB: SELECT ControlForm<br/>stage=Confirmed, UnitedFormPart=true,<br/>QualificationsReceived=false (B-01)
    DB-->>EtoimikSvc: Kinnitatud vormide loend

    loop Iga vorm
        EtoimikSvc->>Etoimik: SOAP – etoimik/AnnaIsikuKvalifikatsioonid/v5<br/>(ee-test/GOV/70000310/etoimik/AnnaIsikuKvalifikatsioonid/v5)<br/>Keha: isikukood + menetlusnumbrid (CaseNumber / ReferenceNumber)
        Note right of Etoimik: Lõpetamise paragrahv: § 75
        Etoimik-->>EtoimikSvc: XML vastus (Alus → Paragrahv, süüdistused)

        EtoimikSvc->>DB: INSERT EtoimikLog (requestXml, responseXml, success)

        alt Paragrahv § 75 leitud → menetlus lõpetatud
            EtoimikSvc->>DB: INSERT ControlFormValue<br/>key=CONTROL_VERDICT_VIOLATION_ETOIMIK_ENDED
        else Süüdistus / kahtlustus leitud
            EtoimikSvc->>DB: INSERT ControlFormValue<br/>key=CONTROL_VERDICT_VIOLATION_ETOIMIK
        end

        EtoimikSvc->>DB: UPDATE ControlForm<br/>QualificationsReceived=true, stage=Published, FormVersion++
        EtoimikSvc->>DB: INSERT Versions (audit, kasutaja="E-toimik service")
        EtoimikSvc->>Mail: SendDidntPassInspectionEmails() (B-04)
        EtoimikSvc->>Mail: SendVehicleWeightMeasuredNotification() (B-05)
    end

    EtoimikSvc->>Raven: QUERY JobInspectionV2<br/>stage=Confirmed, EtoimikViolation=null (B-02)
    Raven-->>EtoimikSvc: Töökontrollide loend

    loop Iga töökontroll
        EtoimikSvc->>Etoimik: SOAP – etoimik/AnnaIsikuKvalifikatsioonid/v5<br/>(ee-test/GOV/70000310/etoimik/AnnaIsikuKvalifikatsioonid/v5)
        Etoimik-->>EtoimikSvc: XML vastus
        EtoimikSvc->>DB: INSERT EtoimikLog (IsJobInspection=true, JobInspection_id)
        EtoimikSvc->>Raven: UPDATE JobInspectionV2<br/>(EtoimikViolation / EtoimikViolationEnded)<br/>stage=Published
    end

    Timer->>MntSvc: Run() (B-03)
    MntSvc->>DB: SELECT ControlForm (tehnoülevaatust vajavad)
    DB-->>MntSvc: Sõidukite reg-numbrid

    loop Iga sõiduk
        MntSvc->>MNT: SOAP – liiklusregister/yvkehtivus/v1<br/>(ee-test/GOV/70001490/liiklusregister/yvkehtivus/v1)<br/>Parameeter: VehicleRegNumber
        MNT-->>MntSvc: Tehnoülevaatuse kuupäev + tulemus (verdict)
        alt Tulemus positiivne
            MntSvc->>DB: UPDATE ControlFormValue (ülevaatuse kuupäev)
            MntSvc->>DB: INSERT Versions (audit)
        end
    end

    opt Sõiduki andmete päring (vormi täitmisel)
        Note over MntSvc,MNT: Kasutatakse ka liiklusregister/paring2/v2
        MntSvc->>MNT: SOAP – liiklusregister/paring2/v2<br/>(ee-test/GOV/70001490/liiklusregister/paring2/v2)<br/>Parameeter: VehicleRegNumber / VinCode
        MNT-->>MntSvc: Sõiduki mark, mudel, VIN, kategooria, keretüüp
    end
```
