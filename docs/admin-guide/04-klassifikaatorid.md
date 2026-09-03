# Klassifikaatorite haldus

Klassifikaatorid on süsteemi viitede loendid. Näiteks riigid, maakonnad, teed, rikkumiste koodid, sanktsioonid ja ametikohad.

## Ligipääs

Menüü → **Haldus → Klassifikaatorid**

Õigus: `classifier.list`

## Klassifikaatorite nimekiri

Nimekiri kuvab kõik süsteemi klassifikaatorid. Iga klassifikaatori juures on:

- kood
- nimetus
- kehtivusperiood
- väärtuste arv

![Klassifikaatorite loend](images/04-klassifikaatorid/01-klassifikaatorite-loend.png)

```mermaid
flowchart TD
    A[Klassifikaatorite nimekiri] --> B[Otsing]
    A --> C[Sorteerimine]
    A --> D[Detailvaade]
    D --> E[Väärtuste nimekiri]
    E --> F[Muuda kehtivust]
    E --> G[Muuda järjekorda]
```

## Klassifikaatori väärtused

Avage klassifikaator, et näha selle andmeid ja väärtuste tabelit:

![Klassifikaatori detailvaade](images/04-klassifikaatorid/02-klassifikaatori-detail.png)

Iga väärtus sisaldab:

| Väli | Selgitus |
|---|---|
| Kood | Unikaalne tunnus |
| Nimetus | Inimloetav nimetus |
| Kehtiv alates | Kuupäev, millest väärtus kehtib |
| Kehtiv kuni | Kuupäev, millest väärtus ei kehti |
| Järjekord | Kuvamise järjekord loendites |

Uue väärtuse lisamiseks klõpsa detailvaates **+ Lisa väärtus**:

![Klassifikaatori väärtuse lisamine](images/04-klassifikaatorid/03-vaartuse-lisamine.png)

## Klassifikaatori väärtuse muutmine

Saate muuta:

- kehtivusaega
- järjekorranumbrit

Koodi ja nimetuse muutmine võib mõjutada vormides juba sisestatud andmeid, seega tehke seda ettevaatlikult.

## Levinud klassifikaatorid

| Klassifikaator | Kasutus |
|---|---|
| Riigid | Vormide riigi valikud |
| Maakonnad | Aadressi- ja kontrolliandmed |
| Teed | Liitvormi tee valikud |
| Rikkumiste koodid | EL määruse rikkumised |
| Sanktsioonid | Sanktsioonide valikud |
| Ametikohad | Inspektorite ametikohad |

## API

Klassifikaatorite pärimiseks kasutatakse endpointi `/v1/classifiers/catalogue` või `/v1/classifiers/bundle`.
