# LJVIS1 – Andmevoogude sequence diagrammid

## 1. Kasutaja autentimine (TARA)

```mermaid
sequenceDiagram
    actor Kasutaja
    participant Browser as Brauser (React SPA)
    participant TIM
    participant TARA as TARA autentimisteenus
    participant Ruuter
    participant Resql

    Kasutaja->>Browser: Avab sisselogimislehe, valib rolli (ametnik / kodanik)
    Browser->>Browser: sessionStorage.loginIntent = intent
    Browser->>TIM: GET /tim/auth/login/tara?redirect_uri=<origin><TARA_CALLBACK_PATH>
    TIM->>TIM: Genereerib state (ühekordne) ja nonce
    TIM-->>Browser: authorization_url

    Browser->>TARA: Suunab authorization_url-ile (ID-kaart / Mobiil-ID / Smart-ID)
    Kasutaja->>TARA: Autendib end
    TARA-->>Browser: Redirect → /auth/callback?code=...&state=...

    Browser->>Browser: AuthCallback loeb code, state ja loginIntent
    Browser->>Ruuter: POST /api/auth/oauth-callback {code, state, intent}
    Ruuter->>TIM: GET /auth/callback/tara?code=...&state=...
    TIM->>TARA: Vahetab code tokenite vastu (token_endpoint)
    TARA-->>TIM: id_token
    TIM->>TIM: Kontrollib state, allkirja, iss, aud, exp, nonce
    TIM-->>Ruuter: session_id + user_profile (user_id = EE<isikukood>)

    Ruuter->>Ruuter: Eemaldab isikukoodilt "EE" eesliite
    Ruuter->>TIM: POST /jwt/custom/generate (personalCode, authMethod=TARA)
    TIM-->>Ruuter: customJwtCookie (kehtib 8 h)

    opt intent = officer ja kasutajakonto olemas
        Ruuter->>Resql: user/get_user_organisation_by_personal_code
        Resql-->>Ruuter: userAccountId, organisationId
        Ruuter->>Ruuter: Kirjutab auditisündmuse auth.login.success
    end

    Ruuter-->>Browser: 200 + Set-Cookie (customJwtCookie)
    opt intent = citizen
        Browser->>Ruuter: Vahetab esinduse → citizen-self
    end
    Browser->>Browser: Redirect → /

    alt TARA viga, vigane state või vahetus ebaõnnestub
        Browser-->>Kasutaja: "TARA pole saadaval" + link sisselogimislehele
    end
```

> Callback-teed `/auth/callback` ja `/auth/tara-callback` töötavad mõlemad (frontend [App.tsx](../frontend/src/App.tsx)); `redirect_uri` tee tuleb keskkonnamuutujast `TARA_CALLBACK_PATH` (`/config.json`), vaikimisi `/auth/callback`. Kasutatav väärtus peab olema TIM-i `allowed_redirect_uris` loendis ja registreeritud TARA kliendil.

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

## 7. Avalik päring (kodaniku vaade)

```mermaid
sequenceDiagram
    actor Kodanik
    participant Browser as Brauser (React SPA)
    participant TIM
    participant TARA
    participant Ruuter
    participant Resql as Resql / DB

    Kodanik->>Browser: Avab portaali, valib "Kodanik"
    Browser->>Browser: sessionStorage.loginIntent = citizen
    Browser->>TIM: GET /tim/auth/login/tara?redirect_uri=<origin><TARA_CALLBACK_PATH>
    TIM-->>Browser: authorization_url
    Browser->>TARA: Suunab TARA-sse
    Kodanik->>TARA: Autendib end
    TARA-->>Browser: Redirect → /auth/callback?code=...&state=...

    Browser->>Ruuter: POST /api/auth/oauth-callback {code, state, intent=citizen}
    Ruuter->>TIM: GET /auth/callback/tara (code vahetus, isikukood)
    Ruuter-->>Browser: Set-Cookie (customJwtCookie)
    Note right of Ruuter: DB kasutajakontot ei nõuta;<br/>ametniku auditisündmust ei kirjutata
    Browser->>Ruuter: Esinduse vahetus → citizen-self
    Browser->>Browser: Redirect → / (kodaniku töölaud)

    Kodanik->>Browser: Vaatab oma kontrolliandmeid
    Browser->>Ruuter: GET /api/... (JWT küpsisega)
    Ruuter->>Ruuter: Tuvastab esinduse (citizen-self / company)
    Ruuter->>Resql: Päring isikukoodi järgi
    Resql-->>Ruuter: Kontrolliandmed
    Ruuter-->>Browser: Kontrolliandmete vaade (ainult lugemine)
```
