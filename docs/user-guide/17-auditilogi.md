# Auditilogi vaatamine

Auditilogi kuvab süsteemis toimunud olulisi tegevusi. See on abivahend, mille abil saab jälgida, kes millal mida tegi.

## Ligipääs

Auditilogi avamiseks valige menüüst **Haldus → Logid**.

Õigus: `audit.read`

![Auditilogi loend](images/17-auditilogi/01-auditilogi-loend.png)

## Mida logitakse

Auditilogi salvestab järgmised sündmused:

- kasutaja vaatamine ja muutmine
- kasutajagrupi muutmine
- klassifikaatori väärtuse muutmine
- vormide loomine, vaatamine ja muutmine
- autentimissündmused

## Logi kirje koostis

Iga kirje sisaldab:

| Väli | Selgitus |
|---|---|
| Sündmuse tüüp | Näiteks `user.create`, `form.view` |
| Kategooria | Kasutaja, vorm, klassifikaator jne |
| Tegija nimi | Kes tegevuse sooritas |
| Tegija isikukoodi räsi | Pseudonüümistatud isikukood |
| Kirjeldus | Inimloetav selgitus |
| Lisainfo | JSON-formaadis detailid |
| Ajatempel | Millal tegevus toimus |

## Logi otsimine

Auditilogi lehel saate:

- filtreerida sündmuse tüübi järgi
- otsida tegija nime järgi
- valida kuupäevavahemiku
- sorteerida ajatemplite järgi
- avada detailvaate, kus näidatakse täpsemaid andmeid ja JSON-i

Rea lõpus oleval lingil **Vaata** avaneb auditikirje detailvaade:

![Auditikirje detailvaade](images/17-auditilogi/02-auditilogi-detail.png)

```mermaid
flowchart LR
    A[Auditilogi] --> B[Filter]
    B --> C[Sündmuse tüüp]
    B --> D[Kasutaja]
    B --> E[Ajavahemik]
    A --> F[Detailvaade]
    F --> G[JSON lisainfo]
```

## Räsiahela kontroll

Auditilogi kirjed on seotud räsiahelaga. Räsiahela kontroll aitab tuvastada logikirjete muutmist või kustutamist. Kontrollimiseks on vaja õigust `audit.verify`. Vt [administraatori juhendi auditilogi peatükki](../admin-guide/05-auditilogi.md).

## Näited sündmustest

| Sündmus | Selgitus |
|---|---|
| `user.create` | Uus kasutaja loodud |
| `user.update` | Kasutaja andmed muudetud |
| `user_group.update` | Kasutajagrupi andmed muudetud |
| `classifier_value.update` | Klassifikaatori väärtus muudetud |
| `form.create` | Uus vorm loodud |
| `form.view` | Vormi vaadati |
