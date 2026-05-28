---
version: 0.1.3
generated: 2026-05-13
---

# Logimise spetsifikatsioon

## 1. Eesmärk

Määratleda, mida ja kuidas logitakse. Tagada päringute jälgitavus, audit, jõudluse mõõtmine ja turvaanalüüs.

## 2. Reguleerimisala

- Kõik rakenduse komponendid kasutavad sama logimise formaati.
- Spetsifikatsioon kehtib kõigi back-end teenuste ja serveripoolse päringukäsitluse kohta.

## 3. Vorming

- Logikirje on üks JSON-objekt rea kohta (NDJSON), UTF-8 kodeering.

## 4. Kohustuslikud väljad

| Väli      | Tüüp                           | Kirjeldus                                                         |
| --------- | ------------------------------ | ----------------------------------------------------------------- |
| timestamp | string (ISO 8601, UTC)         | Kirje tekkimise hetk.                                             |
| level     | enum: DEBUG, INFO, WARN, ERROR | Kirje tähtsus.                                                    |
| requestId | string (UUID v4)               | Päringu unikaalne ID.                                             |
| service   | string                         | Kirjet kirjutava komponendi nimi.                                 |
| userId    | string                         | Tegevuse algataja kasutaja-ID; anonüümseks päringuks `anonymous`. |
| endpoint  | string (`METHOD /path`)        | Päringu sihtendpoint.                                             |
| message   | string                         | Inimloetav lühi-kokkuvõte sündmusest.                             |

## 5. Päringute korrelatsioon

- `requestId` — esimese vastuvõtva komponendi poolt loodud UUID.
- `receivedRequestId` — sissetuleva HTTP päise `X-Request-ID` väärtus, kui see on olemas.
- Iga väljaminev päring sisaldab `X-Request-ID` päises sama `requestId` väärtust.

## 6. Keelatud andmed

Logikirjesse ei tohi sattuda:

- paroolid;
- autentimise / sessiooni token'id (sh JWT);
- isikukoodid;
- muud isiku- või turvatundlikud andmed (terviseandmed, biomeetria, salajased võtmed jms).

## 7. Logitavad sündmused

| # | Epic | Task | Sündmuse kirjeldus |
|---|------|------|--------------------|
| 11 | Kasutajate haldamine | Kasutajate nimekiri | Kasutajate nimekirja avamine salvestatakse auditilogisse. |
| 12 | Kasutajate haldamine | Kasutajate nimekiri | Logikirje võimaldab tagantjärele tuvastada, kes ja millal nimekirja vaatas ning millise ulatusega (kõik asutused või oma asutus). |
| 13 | Kasutajate haldamine | Kasutajate nimekiri | Kui kasutaja kasutas otsingut, salvestatakse üksnes see, et otsingut kasutati — otsingusõne sisu ennast auditilogisse ei salvestata (isikuandmete kaitse põhjustel). |
| 14 | Kasutajate haldamine | Kasutaja loomine ja muutmine | Kasutaja andmete vaatamine (kes avas millise kasutaja detailvaate). |
| 15 | Kasutajate haldamine | Kasutaja loomine ja muutmine | Uue kasutaja loomine (sh isikukoodi räsi, asutuse tunnus). |
| 16 | Kasutajate haldamine | Kasutaja loomine ja muutmine | Kasutaja andmete muutmine (sh muudetud väljade loend). |
| 17 | Kasutajate haldamine | Kasutaja loomine ja muutmine | Asutuse muutmine (endine ja uue asutuse tunnus, eemaldatud kasutajagruppide loend). |
| 18 | Kasutajate haldamine | Kasutaja loomine ja muutmine | Olekumuutused (oleku üleminek ja selle põhjus). |
| 19 | Kasutajate haldamine | Kasutaja loomine ja muutmine | Isikukoodi logitakse ainult räsina — cleartext kujul isikukoodi auditilogisse ei salvestata. |
| 20 | Kasutajate haldamine | Kasutajale kasutajagrupi määramine | Kasutajagrupi lisamine kasutajale (lisatud grupi(de) nimekiri). |
| 21 | Kasutajate haldamine | Kasutajale kasutajagrupi määramine | Kasutajagrupi eemaldamine kasutajalt (eemaldatud grupi nimi). |
| 22 | Kasutajate haldamine | Kasutajale kasutajagrupi määramine | Iga logikirje sisaldab: toimingu tegija, aeg, sihtkasutaja tunnus ja muudetud grupi(de) tunnused. |
| 1 | Kasutajate haldamine | Kasutajagruppide nimekiri | Kasutajagruppide nimekirja avamine salvestatakse auditilogisse. |
| 2 | Kasutajate haldamine | Kasutajagruppide nimekiri | Logikirje võimaldab tagantjärele tuvastada, kes ja millal nimekirja vaatas ning millise ulatusega (kõik asutused või oma asutus). |
| 3 | Kasutajate haldamine | Kasutajagruppide nimekiri | Kui kasutaja kasutas otsingut, salvestatakse üksnes see, et otsingut kasutati, koos otsingusõna pikkusega — otsingusõne sisu ennast auditilogisse ei salvestata (isikuandmete kaitse põhjustel). |
| 4 | Kasutajate haldamine | Kasutajagrupi loomine | Iga eduka kasutajagrupi loomise kohta salvestatakse auditilogisse kirje, mis võimaldab tagantjärele tuvastada, kes ja millal uue grupi lõi, millise nimega, milliste asutustega ning milliste õigustega. |
| 5 | Kasutajate haldamine | Kasutajagrupi loomine | Logitakse ka **arvutatud (mitte salvestatud)** "Kõik asutused" lipu väärtus, et oleks jälgitav, kas grupp loodi kavatsetult kogu süsteemi katvana. Lipu väärtus tuletatakse kujul `organisationIds.size == count(organisation)` ja salvestatakse audit-labelina `labels.all_organisations`; ühtegi DB-veergu ei muudeta. |
| 6 | Kasutajate haldamine | Kasutajagrupi muutmine | Grupi detailvaate avamine (kes avas millise grupi). |
| 7 | Kasutajate haldamine | Kasutajagrupi muutmine | Akordioni salvestamine — grupi nimetuse muutmine, seotud asutuste muutmine (lisatud ja eemaldatud asutuste loend), õiguste muutmine (lisatud ja eemaldatud õiguste loend). |
| 8 | Kasutajate haldamine | Kasutajagrupi muutmine | Koos logitakse ka **arvutatud (mitte salvestatud)** "Kõik asutused" lipu uus väärtus, et oleks jälgitav, kas grupp katab kogu süsteemi. Lipp arvutatakse lugemise ajal `count(active user_group_organisation) == count(organisation)` reegliga; salvestatakse audit-labelina `labels.all_organisations`, mitte `user_group` veeruna. |
| 9 | Kasutajate haldamine | Kasutajagrupi muutmine | Kasutajate lisamine gruppi (modaalist lisatud kasutajate loend). |
| 10 | Kasutajate haldamine | Kasutajagrupi muutmine | Kasutaja eemaldamine grupist. |
| 23 | Kasutajate haldamine | Kasutaja deaktiveerimise öine protsess | Auditilogisse salvestatakse iga kasutaja deaktiveerimise kohta eraldi kirje. |
| 24 | Kasutajate haldamine | Kasutaja deaktiveerimise öine protsess | Lisaks salvestatakse vealogisse teave protsessi käigus tekkinud vigade kohta (ebaõnnestunud kasutajad koos veapõhjustega) ja protsessi koondstatistika (edukate ja ebaõnnestunud deaktiveerimiste arv). |
| 25 | Klassifikaatorite haldamine | Klassifikaatorite nimekiri | Klassifikaatorite nimekirja iga avamine logitakse. |
| 26 | Klassifikaatorite haldamine | Klassifikaatorite nimekiri | Samuti logitakse iga kord, kui kasutajal puudub vajalik õigus ja ligipääs keelatakse. |
| 27 | Klassifikaatorite haldamine | Klassifikaatori vaatamine | Klassifikaatori üksikvaate iga avamine logitakse. |
| 28 | Klassifikaatorite haldamine | Klassifikaatori vaatamine | Samuti logitakse iga kord, kui kasutajal puudub vajalik õigus ja ligipääs keelatakse. |
| 29 | Klassifikaatorite haldamine | Klassifikaatori andmete muutmine | Klassifikaatori nimetuse ja/või selgituse iga edukas muudatus logitakse koos muudetud väljade loeteluga (ainult väljanimed, mitte väärtused). |
| 30 | Klassifikaatorite haldamine | Klassifikaatori andmete muutmine | Samuti logitakse iga kord, kui kasutajal puudub vajalik õigus ja ligipääs keelatakse. |
| 31 | Klassifikaatorite haldamine | Klassifikaatori väärtuste haldamine | Iga edukas väärtuse lisamine ja iga edukas kehtivuse lõpetamine logitakse. |
| 32 | Klassifikaatorite haldamine | Klassifikaatori väärtuste haldamine | Samuti logitakse iga kord, kui kasutajal puudub vajalik õigus ja ligipääs keelatakse. |
