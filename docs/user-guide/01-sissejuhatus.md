# Sissejuhatus

## Süsteemi ülesehitus

Järgmine joonis näitab LJVIS2 peamisi komponente, eraldi teenuseid ja nendevahelisi seoseid.

```mermaid
flowchart LR
    U[Kasutaja\nveebibrauser] --> F[Frontend\nReact + TypeScript + Vite]
    F --> R[Ruuter\navalik API]
    F -. OIDC .-> T[TIM / TARA]
    R --> Q[Resql]
    R --> M[DataMapper]
    R --> P[pdf-creator\nPython PDF-teenus]
    R --> X[XTR\nX-tee]
    R --> N[Nysiis\nERRU]
    R --> S[S3 proxy\nmanused]
    Q --> D[(PostgreSQL 17)]
    I[Ruuter internal] --> D
    C[CronManager] --> I
```

LJVIS2 (Liiklusjärelvalve infosüsteem 2) on veebipõhine tööriist transpordiametnikele ja ettevõtjatele. Selle abil dokumenteeritakse liiklus-, tööinspektsiooni- ja tehnilisi kontrolle, hallatakse kasutajaid ning vaadatakse auditilogi.

## Kellele juhend on mõeldud

- **Ametnikele**, kes täidavad kontrollakte (nt tee kontroll, tööinspektsioon, tehniline kontroll).
- **Administraatoritele**, kes haldavad süsteemi kasutajaid, gruppe, õigusi ja klassifikaatoreid.
- **Ettevõtja esindajatele**, kes vaatavad oma ettevõtte riskitaset ja protokolle.

Ettevõtja esindaja näeb sisselogimisel kodaniku töölauda, kus on koondatud tema ettevõtetega
seotud kontrollid ja protokollid:

![Kodaniku töölaud](images/01-sissejuhatus/01-kodaniku-toolaud.png)

## Peamised funktsioonid

- TARA autentimine
- Kontrollaktide vormid
- Failide manustamine
- Kasutajate ja õiguste haldus
- Klassifikaatorite haldus
- Auditilogi
- Riskihindamine
- ERRU-teated (hea maine, tehnokontroll, kontrollitulemuse teavitused)

## Süsteemi arhitektuur ühe pilguga

```mermaid
flowchart TD
    A[Kasutaja brauser] -->|TARA| B[LJVIS2 frontend]
    B --> C[Ruuter DSL]
    C --> D[RESQL andmebaas]
    C --> E[X-tee liidesed]
    C --> F[Auditilogi]
```
