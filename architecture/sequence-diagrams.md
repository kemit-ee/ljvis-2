# LJVIS1 – Andmevoogude sequence diagrammid

## 1. Kasutaja autentimine (TARA)

```mermaid
sequenceDiagram
    actor Kasutaja
    participant Browser
    participant LJVIS as LJVIS veebirakendus<br/>(TaraController)
    participant TARA as TARA autentimisteenus

    Kasutaja->>Browser: Avab sisselogimislehe
    Browser->>LJVIS: GET /Users/Tara
    LJVIS-->>Browser: Sisselogimisvaade

    Kasutaja->>Browser: Klõpsab "Logi sisse"
    Browser->>LJVIS: GET /Users/Tara/Authorize
    LJVIS->>LJVIS: Genereerib state (CSRF kaitse)
    LJVIS-->>Browser: Redirect → TARA /authorize?state=...

    Browser->>TARA: GET /authorize (ID-kaart / Mobiil-ID)
    Kasutaja->>TARA: Autendib end
    TARA-->>Browser: Redirect → /Users/Tara/AuthorizeCallback?code=...&state=...

    Browser->>LJVIS: GET /AuthorizeCallback?code=...&state=...
    LJVIS->>LJVIS: Kontrollib state väärtust
    LJVIS->>TARA: POST /token (code + redirect_uri)
    TARA-->>LJVIS: access_token + id_token
    LJVIS->>TARA: GET /userinfo
    TARA-->>LJVIS: isikukood, nimi

    LJVIS->>LJVIS: Otsib kasutaja andmebaasist (isikukoodi järgi)
    alt Kasutaja leitud ja rolligrupp olemas
        LJVIS->>LJVIS: Loob FormsAuthentication küpsis
        LJVIS-->>Browser: Redirect → /Dashboard
    else Kasutaja puudub / pole grupis
        LJVIS-->>Browser: Veateade, tagasi sisselogimislehele
    end
```

---

## 2. Kontrollivormi loomine ja kinnitamine (maanteekontroll)

```mermaid
sequenceDiagram
    actor Inspektor
    participant UI as LJVIS veebiliides
    participant Controller as FormsController
    participant DB as SQL Server<br/>(ControlForm, ControlFormValue)
    participant Versions as Versions tabel

    Inspektor->>UI: Täidab kontrollivormi (sõiduk, juht, rikkumised)
    UI->>Controller: POST /Forms/Form/Save
    Controller->>DB: INSERT ControlForm (stage=Draft)
    Controller->>DB: INSERT ControlFormValue[] (juhi andmed, rikkumised, otsus)
    DB-->>Controller: ControlForm.Id
    Controller-->>UI: Salvestatud (Draft)

    Inspektor->>UI: Kinnitab vormi
    UI->>Controller: POST /Forms/Form/Confirm
    Controller->>DB: UPDATE ControlForm<br/>stage=Confirmed, UnitedFormPart=true,<br/>QualificationsReceived=false
    Controller->>Versions: INSERT (muutus, kasutajanimi, aeg)
    Controller-->>UI: Kinnitatud – ootab E-toimiku vastust
```

---

## 3. E-toimiku kvalifikatsioonide päring – ControlForm (BgService)

```mermaid
sequenceDiagram
    participant Timer as BgService taimer<br/>(igapäevane / igatunniline)
    participant EtoimikSvc as EtoimikService
    participant DB as SQL Server<br/>(ControlForm, ControlFormValue, EtoimikLog)
    participant Versions as Versions tabel
    participant Etoimik as E-toimik (X-tee v6)
    participant Mail as Meiliteenus

    Timer->>EtoimikSvc: Run()

    EtoimikSvc->>DB: SELECT ControlForm<br/>WHERE stage=Confirmed<br/>AND UnitedFormPart=true<br/>AND QualificationsReceived=false
    DB-->>EtoimikSvc: Kinnitatud vormide loend

    EtoimikSvc->>DB: SELECT ControlFormValue<br/>(juhi isikukood, nimi, sünniaeg,<br/>menetlusnumbrid)
    DB-->>EtoimikSvc: Vormi väärtused

    loop Iga kinnitatud vorm
        EtoimikSvc->>Etoimik: AnnaIsikuKvalifikatsioonid.v3<br/>(isikukood + menetlusnumbrid)
        Etoimik-->>EtoimikSvc: XML vastus (rikkumised / lõpetatud menetlused)

        EtoimikSvc->>DB: INSERT EtoimikLog<br/>(requestXml, responseXml, success)

        alt Menetlus lõpetatud (paragrahv match)
            EtoimikSvc->>DB: INSERT ControlFormValue<br/>(CONTROL_VERDICT_VIOLATION_ETOIMIK_ENDED)
        else Süüdistus / kahtlustus leitud
            EtoimikSvc->>DB: INSERT ControlFormValue<br/>(CONTROL_VERDICT_VIOLATION_ETOIMIK)
        end

        EtoimikSvc->>DB: UPDATE ControlForm<br/>QualificationsReceived=true,<br/>stage=Published, FormVersion++
        EtoimikSvc->>Versions: INSERT (muutus, kasutaja="E-toimik service", aeg)
        EtoimikSvc->>Mail: SendDidntPassInspectionEmails()<br/>SendVehicleWeightMeasuredNotification()
    end
```

---

## 4. E-toimiku kvalifikatsioonide päring – JobInspection (BgService)

```mermaid
sequenceDiagram
    participant Timer as BgService taimer
    participant EtoimikSvc as EtoimikService
    participant Raven as RavenDB<br/>(JobInspectionV2)
    participant DB as SQL Server<br/>(EtoimikLog)
    participant Etoimik as E-toimik (X-tee v6)

    Timer->>EtoimikSvc: Run() [kui EtoimikIncludeJobInspections=true]

    EtoimikSvc->>Raven: QUERY JobInspectionV2<br/>WHERE stage=Confirmed<br/>AND InfringementProceedings != null<br/>AND EtoimikViolation = null<br/>AND EtoimikViolationEnded = null
    Raven-->>EtoimikSvc: Kontrollide loend

    loop Iga töökontroll
        EtoimikSvc->>Etoimik: AnnaIsikuKvalifikatsioonid.v3<br/>(menetlusnumbrid + isik)
        Etoimik-->>EtoimikSvc: XML vastus

        EtoimikSvc->>DB: INSERT EtoimikLog<br/>(IsJobInspection=true, JobInspection_id)

        alt Menetlus lõpetatud
            EtoimikSvc->>Raven: UPDATE JobInspectionV2<br/>EtoimikViolationEnded = tulemus<br/>stage = Published
        else Süüdistus leitud
            EtoimikSvc->>Raven: UPDATE JobInspectionV2<br/>EtoimikViolation = tulemus<br/>stage = Published
        end
    end
```

---

## 5. Sõiduki tehnoülevaatuse sünkroonimine (MntSyncService / BgService)

```mermaid
sequenceDiagram
    participant Timer as BgService taimer
    participant MntSvc as MntSyncService
    participant DB as SQL Server<br/>(ControlForm, ControlFormValue, Versions)
    participant MNT as Maanteeamet / Liiklusregister<br/>(X-tee päring2)

    Timer->>MntSvc: Run()

    MntSvc->>DB: SELECT ControlForm<br/>(sünkroonimist vajavad vormid)
    DB-->>MntSvc: Vormide loend (reg-numbrid)

    loop Iga sõiduk
        MntSvc->>MNT: GetVehicleTechnicalConditionStatusByRegNumber(regNr)
        MNT-->>MntSvc: Tehnoülevaatuse kuupäev + tulemus

        alt Tulemus positiivne
            MntSvc->>DB: UPDATE ControlFormValue<br/>(tehnoülevaatuse kuupäev)
            MntSvc->>DB: INSERT Versions (audit)
        end
    end
```

---

## 6. X-tee sissetulev teenus – IsikuKontroll / IsikuEttevõteKontrollid

```mermaid
sequenceDiagram
    actor Välissüsteem as Välissüsteem<br/>(X-tee liige)
    participant XTee as X-tee turvaserver
    participant Dispatcher as ServiceDispatcher<br/>(Ljvis.XTeeService)
    participant DB as SQL Server<br/>(ControlForm, ControlFormValue)
    participant BR as Äriregister (X-tee)

    Välissüsteem->>XTee: SOAP päring (MP4 protocol)<br/>IsikuKontroll / IsikuEttevõteKontrollid
    XTee->>Dispatcher: Edastab päringu (X-tee päisega)

    alt IsikuKontroll (isikukoodi järgi)
        Dispatcher->>DB: SELECT kontrollivormid isikukoodi järgi
        DB-->>Dispatcher: Vastav kontrollide loend
    else IsikuEttevõteKontrollid (ettevõtte järgi)
        Dispatcher->>DB: SELECT kontrollivormid reg-numbri järgi
        DB-->>Dispatcher: Rikkumiste loend (sõiduk, juht, otsus)
    else ErakorralineYlevaatus (erakorraline ülevaatus)
        Dispatcher->>DB: INSERT ControlForm (erakorralise ülevaatuse taotlus)
        DB-->>Dispatcher: Uue vormi ID
    end

    Dispatcher-->>XTee: SOAP vastus (XML)
    XTee-->>Välissüsteem: Vastus
```

---

## 7. Avalik päring (PublicRequests – kodaniku vaade)

```mermaid
sequenceDiagram
    actor Kodanik
    participant Browser
    participant LJVIS as LJVIS (PublicRequestsController)
    participant TARA as TARA autentimine
    participant DB as SQL Server

    Kodanik->>Browser: Avab avaliku päringu lehe
    Browser->>LJVIS: GET /PublicRequests
    LJVIS-->>Browser: Sisselogimisvaade (isPublicRequest=true)

    Kodanik->>Browser: Autendib TARA kaudu
    Browser->>LJVIS: GET /Tara/Authorize?isPublicRequest=true
    LJVIS->>TARA: Suunab TARA-sse
    TARA-->>LJVIS: AuthorizeCallback (isikukood)

    LJVIS->>LJVIS: SetUser(profileInfo) sessioonile<br/>(ei nõua DB kasutajat)

    LJVIS-->>Browser: Redirect → /PublicRequests

    Kodanik->>Browser: Pärib oma kontrolliandmeid
    Browser->>LJVIS: GET /PublicRequests/...
    LJVIS->>DB: SELECT kontrollivormid isikukoodi järgi
    DB-->>LJVIS: Kontrolliandmed
    LJVIS-->>Browser: Kontrolliandmete vaade
```
