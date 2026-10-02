# Lõpliku migratsiooni raport (mall)

**Kasutus:** täidetakse pärast tootmisjooksu (cutover T+4). Hanke järgi loetakse migratsioon
lõpetatuks alles pärast kõikide kvaliteedinõuete täitmist ja selle raporti esitamist.
Mall täidetakse väärtustega tegelikust jooksust; **ühtegi lahtrit ei täideta ettekirjutatud väärtusega.**

## 1. Üldandmed

| Omadus | Väärtus |
|---|---|
| Migratsiooni kuupäev ja ajavahemik (algus–lõpp) | |
| `RUN_ID` (tootmisjooks) | |
| Koodi versioon (`code_hash`, Git tag) | |
| Lähtekoopia tunnus (`SOURCE_LABEL`), koopia ajahetk | |
| Ajapiir (`CUTOFF`), valitud aastate arv | |
| Sihtbaasi varukoopia (asukoht, taastekatse kuupäev) | |
| Hooldusakna kestus (planeeritud / tegelik) | |

## 2. Maht

| Vormitüüp | Lähtes ulatuses | Migreeritud | Välja jäetud (põhjus) | Vahe |
|---|---|---|---|---|
| Hea maine | | | | |
| Veo katkestamine | | | | |
| Välisriigi rikkumine | | | | |
| Tehniline kontroll (sõiduk / haagis) | | | | |
| Sõidu- ja puhkeaeg (juht / teine juht) | | | | |
| ADR | | | | |
| Tööinspektsiooni kontrollakt (V1 / V2) | | | | |
| Koondvormid | | | | |
| **Kokku** | | | | |
| Manused (failid / maht) | | | | |

## 3. Kvaliteedikriteeriumid

| ID | Kriteerium | Tulemus (OK / EI TÄIDA) | Tõend (fail, päring, kuupäev) |
|---|---|---|---|
| K1 – K12 | vt [03-andmekvaliteet.md](03-andmekvaliteet.md) | | |

## 4. Kõrvalekalded ja lahendamata punktid

| # | Kirjeldus | Mõju | Otsus ja otsustaja | Tegevus / tähtaeg |
|---|---|---|---|---|
| | | | | |

## 5. Vastuvõtt

| Kontroll | Tulemus | Kontrollija | Kuupäev |
|---|---|---|---|
| Valimkontroll (K10) | | | |
| Funktsionaalne vastuvõtt (K12) | | | |
| Manuste kontroll | | | |

## 6. Go / no-go

| Otsus | Kuupäev | Otsustaja | Alus |
|---|---|---|---|
| | | | |

## 7. Pärast üleminekut

| Tegevus | Vastutaja | Tähtaeg |
|---|---|---|
| LJVIS 1 kirjutuskaitse ja säilitusaeg | | |
| `staging.*` ja `migration.source_snapshot` puhastamine (isikuandmed) | | |
| Raportikaustade ja varukoopiate säilitus / kustutus | | |
| Arhiveerimise sisselülitamine ([juhend](../admin-guide/13-arhiveerimine.md)) | | |

## 8. Lisad

- `summary.json`, `finding.csv`, `disposition.csv`, `quality_report.csv` (kaitstud kanalis, sisaldavad isikuandmeid)
- Valimkontrolli tabel
- Go/no-go protokoll

## 9. Allkirjad

| Roll | Nimi | Allkiri | Kuupäev |
|---|---|---|---|
| Andmeomanik | | | |
| Täitja | | | |
| Projektijuht | | | |
